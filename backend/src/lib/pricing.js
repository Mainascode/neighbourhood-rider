import axios from "axios";
import DistanceCache from "../models/DistanceCache.js";
import SystemSetting from "../models/SystemSetting.js";

function getEathour() {
    const formatter = new Intl.DateTimeFormat("en-KE", {
        timeZone: "Africa/Nairobi",
        hour: "numeric",
        hour12: false,
    });
    return Number(formatter.format(new Date()));
}

function getDynamicDeliveryFee(isRaining) {
    const hour = getEathour();

    if (hour >= 6 && hour < 9) {
        return isRaining ? 120 : 100;
    }

    if (hour >= 9 && hour < 17) {
        return isRaining ? 70 : 50;
    }

    if (hour >= 18 && hour < 22) {
        return isRaining ? 120 : 100;
    }

    return isRaining ? 120 : 100;
}

export async function calculateOrderPricing(goodsTotal, pickup, dropoff, overrides = {}) {
    // 0. Fetch System Settings
    let settings = await SystemSetting.findOne({ key: "global_config" });
    if (!settings) {
        // Create default if not exists
        settings = await SystemSetting.create({});
    }

    const dynamicDeliveryFee = overrides.deliveryFee ?? getDynamicDeliveryFee(Boolean(settings.isRaining));

    let distanceKm = 0;
    let duration = null;
    let etaMinutes = null;

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
                etaMinutes = parseDurationToMinutes(duration);
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
                        etaMinutes = parseDurationToMinutes(duration);

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
            etaMinutes = estimateEtaMinutesFromDistance(distanceKm);
        }
    }
    if (!etaMinutes && distanceKm > 0) {
        etaMinutes = estimateEtaMinutesFromDistance(distanceKm);
    }

    const deliveryFee = Math.ceil(dynamicDeliveryFee);
    const totalCost = goodsTotal + deliveryFee;

    return {
        pricing: {
            goodsTotal,
            deliveryFee,
            serviceFee: 0,
            totalCost,
            distanceKm: parseFloat(distanceKm.toFixed(2)),
            duration,
            etaMinutes
        },
        distribution: {
            vendorPayout: goodsTotal,
            vendorGross: goodsTotal,
            vendorCommission: 0,
            riderPayout: deliveryFee,
            adminRevenue: totalCost,
            splits: {
                vendor: goodsTotal,
                rider: deliveryFee,
                admin: totalCost
            }
        }
    };
}

function parseDurationToMinutes(durationText) {
    if (!durationText || typeof durationText !== "string") return null;
    const text = durationText.toLowerCase();
    const hoursMatch = text.match(/(\d+)\s*hour/);
    const minsMatch = text.match(/(\d+)\s*min/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    const total = hours * 60 + mins;
    return Number.isFinite(total) && total > 0 ? total : null;
}

function estimateEtaMinutesFromDistance(distanceKm) {
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
    const avgSpeedKmh = 25; // conservative urban estimate
    return Math.max(1, Math.ceil((distanceKm / avgSpeedKmh) * 60));
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
