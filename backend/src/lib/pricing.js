import axios from "axios";
import DistanceCache from "../models/DistanceCache.js";

export async function calculateOrderPricing(goodsTotal, pickup, dropoff) {
    const BASE_FEE = 50;
    const SERVICE_FEE = 30;

    let distanceKm = 0;
    let duration = null;

    if (pickup && dropoff && pickup.lat && pickup.lng && dropoff.lat && dropoff.lng) {
        try {
            // 1. Generate Cache Keys (Round to ~1km precision, 2 decimal places)
            const pickupArea = `Lat: ${Number(pickup.lat).toFixed(2)}, Lng: ${Number(pickup.lng).toFixed(2)}`;
            const dropoffArea = `Lat: ${Number(dropoff.lat).toFixed(2)}, Lng: ${Number(dropoff.lng).toFixed(2)}`;

            // 2. Check Cache
            const cachedRoute = await DistanceCache.findOne({ pickup_area: pickupArea, dropoff_area: dropoffArea });

            if (cachedRoute) {
                console.log(`✅ Distance Cache Hit: ${pickupArea} -> ${dropoffArea}`);
                distanceKm = cachedRoute.distance_km;
                duration = cachedRoute.duration;
            } else {
                console.log(`⚠️ Distance Cache Miss: ${pickupArea} -> ${dropoffArea}. Calling Google API...`);
                // 3. Call Google Directions API
                const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY; // Using same key as frontend for now
                if (GOOGLE_API_KEY) {
                    const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
                        params: {
                            origin: `${pickup.lat},${pickup.lng}`,
                            destination: `${dropoff.lat},${dropoff.lng}`,
                            key: GOOGLE_API_KEY
                        }
                    });

                    if (response.data.status === "OK" && response.data.routes.length > 0) {
                        const leg = response.data.routes[0].legs[0];
                        distanceKm = leg.distance.value / 1000; // Meters to Km
                        duration = leg.duration.text;

                        // 4. Save to Cache
                        await DistanceCache.create({
                            pickup_area: pickupArea,
                            dropoff_area: dropoffArea,
                            distance_km: distanceKm,
                            duration
                        });
                        console.log("💾 Route Cached.");
                    } else {
                        throw new Error("Google API No Route");
                    }
                } else {
                    throw new Error("No Google API Key");
                }
            }
        } catch (err) {
            console.error("❌ Distance Calculation Error (Falling back to Haversine):", err.message);
            distanceKm = haversineDistance(pickup, dropoff);
        }
    }

    // Tiered Pricing Logic
    // 0-5 km  → 30/km
    // >5 km   → 40/km (Applied to the distance exceeding 5km)

    let distanceCost = 0;
    const dist = Math.max(1, distanceKm); // Minimum 1km

    if (dist <= 5) {
        distanceCost = dist * 30;
    } else {
        distanceCost = (5 * 30) + ((dist - 5) * 40);
    }

    const deliveryFee = Math.ceil(BASE_FEE + distanceCost);

    const totalCost = goodsTotal + deliveryFee + SERVICE_FEE;

    return {
        pricing: {
            goodsTotal,
            deliveryFee,
            serviceFee: SERVICE_FEE,
            totalCost,
            distanceKm: parseFloat(distanceKm.toFixed(2)),
            duration
        },
        distribution: {
            vendorPayout: goodsTotal,
            riderPayout: deliveryFee,
            adminRevenue: SERVICE_FEE,
            splits: {
                vendor: goodsTotal,
                rider: deliveryFee,
                admin: SERVICE_FEE
            }
        }
    };
}

function haversineDistance(coords1, coords2) {
    function toRad(x) {
        return x * Math.PI / 180;
    }

    const R = 6371; // Earth radius in km

    const dLat = toRad(coords2.lat - coords1.lat);
    const dLon = toRad(coords2.lng - coords1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
