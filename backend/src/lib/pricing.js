import axios from "axios";
import DistanceCache from "../models/DistanceCache.js";
import SystemSetting from "../models/SystemSetting.js";

export async function calculateOrderPricing(goodsTotal, pickup, dropoff) {
    // 0. Fetch System Settings
    let settings = await SystemSetting.findOne({ key: "global_config" });
    if (!settings) {
        // Create default if not exists
        settings = await SystemSetting.create({});
    }

    const BASE_FEE = settings.riderBaseFee;
    const PER_KM_FEE = settings.riderPerKmFee;
    const SERVICE_FEE = settings.serviceFee;
    const COMMISSION_RATE = settings.vendorCommissionRate / 100; // Convert % to decimal

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
    // 0-5 km  → Base Rate
    // >5 km   → Base Rate + Extra
    // For now using simple logic based on previous code but utilizing dynamic variable
    // Previous logic: 
    // 0-5 km -> 30/km? The previous code had 30/km for <5 and 40/km for >5. 
    // Let's simplify/standardize to use the setting for now, or keep the tier logic but use the setting as the base multiplier.
    // To match previous logic exactly while using settings is tricky if settings is just one number.
    // Let's assume riderPerKmFee is the base rate (previous 30).

    let distanceCost = 0;
    const dist = Math.max(1, distanceKm); // Minimum 1km

    // Keeping the hardcoded tier multiplier logic 'structure' but using the setting value as the base?
    // User asked for "updated according to how system is set". 
    // Let's strictly use the settings values to be "dynamic".
    // Cost = Base + (Dist * PerKm)

    // HOWEVER, to avoid breaking expected earnings too much, let's try to map it.
    // Previous:
    // <= 5km: dist * 30
    // > 5km: 150 + (dist-5)*40

    // New Logic (Simpler, controllable):
    // Cost = (Dist * PER_KM_FEE)
    // If we want to keep it exactly as complex, we need more settings. 
    // For now, I'll implement a standard Logi: Base + (Km * Rate) which is standard for delivery.
    // But the previous code didn't use `BASE_FEE` (50) in the distance calculation itself, it added it at the end.
    // `const deliveryFee = Math.ceil(BASE_FEE + distanceCost);`

    if (dist <= 5) {
        distanceCost = dist * PER_KM_FEE;
    } else {
        // Assume slightly higher rate for long distance or just same rate? 
        // Let's use PER_KM_FEE + 10 for > 5km to keep the "premium" logic if desirable, 
        // OR just use PER_KM_FEE flat.
        // Let's stick to the settings. If they want tiered, they can ask. 
        // I will use PER_KM_FEE for all km to make the setting meaningful.
        distanceCost = dist * PER_KM_FEE;
    }

    const deliveryFee = Math.ceil(BASE_FEE + distanceCost);

    // Vendor Calculation
    const vendorGross = goodsTotal;
    const vendorCommission = Math.ceil(goodsTotal * COMMISSION_RATE);
    const vendorNet = vendorGross - vendorCommission;

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
            vendorPayout: vendorNet, // Actual amount to wallet balance
            vendorGross, // Recorded for ledger
            vendorCommission, // Recorded for ledger
            riderPayout: deliveryFee,
            adminRevenue: SERVICE_FEE + vendorCommission, // Admin gets service fee + commission
            splits: {
                vendor: vendorNet,
                rider: deliveryFee,
                admin: SERVICE_FEE + vendorCommission
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
