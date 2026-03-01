import Rider from "../models/Rider.js";

export async function findNearestRiders(lng, lat, radiusKm = 5) {
  const twoMinutesAgo = new Date(Date.now() - 120 * 1000);
  return Rider.find({
    isOnline: true,
    isAvailable: true,
    status: "ONLINE_AVAILABLE",
    lastSeen: { $gt: twoMinutesAgo },
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000
      }
    }
  }).limit(5);
}

export async function assignBestRider(order) {
  try {
    // 1. Need Lat/Lng of Order. If Bot Order with [0,0], use random/first available.
    const pickup = order.pickup?.location?.coordinates;
    let riders = [];
    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);

    if (pickup && (pickup[0] !== 0 || pickup[1] !== 0)) {
      riders = await findNearestRiders(pickup[0], pickup[1], 10); // 10km radius
    } else {
      // Placeholder location order -> Find any available rider
      riders = await Rider.find({ isOnline: true, isAvailable: true, status: "ONLINE_AVAILABLE", lastSeen: { $gt: twoMinutesAgo } }).limit(5);
    }

    if (riders.length > 0) {
      // Pick first (nearest or random)
      const bestRider = riders[0];

      console.log(`✅ Auto-Assigned Order ${order._id} to Rider ${bestRider.name}`);
      return bestRider;
    }

    console.log(`⚠️ No riders available for Order ${order._id}`);
    return null;
  } catch (err) {
    console.error("Auto-Assign Logic Error:", err);
    return null;
  }
}
