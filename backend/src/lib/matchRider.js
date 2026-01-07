import Rider from "../models/Rider.js";

export async function findNearestRiders(lng, lat, radiusKm = 5) {
  return Rider.find({
    isAvailable: true,
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

    if (pickup && (pickup[0] !== 0 || pickup[1] !== 0)) {
      riders = await findNearestRiders(pickup[0], pickup[1], 10); // 10km radius
    } else {
      // Placeholder location order -> Find any available rider
      riders = await Rider.find({ isAvailable: true, status: "approved" }).limit(5);
    }

    if (riders.length > 0) {
      // Pick first (nearest or random)
      const bestRider = riders[0];

      // Update Order
      order.riderId = bestRider._id; // Rider model links to User via userId
      order.status = "assigned"; // Or 'pending_acceptance' if we had that flow
      await order.save();

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
