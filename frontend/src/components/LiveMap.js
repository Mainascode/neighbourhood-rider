import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet Icon
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const riderIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448606.png", // Motorbike
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20],
    className: "drop-shadow-xl"
});

const userIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // House/Pin
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
    className: "drop-shadow-xl"
});

// Helper to validate coordinates
const isValidPos = (pos) => pos && typeof pos.lat === "number" && typeof pos.lng === "number";

// Map Controller for Bounds & FlyTo
function MapController({ riderPos, userPos }) {
    const map = useMap();

    useEffect(() => {
        if (!riderPos && !userPos) return;

        if (riderPos && userPos) {
            // Fit bounds to show both (Uber style)
            const bounds = L.latLngBounds([
                [riderPos.lat, riderPos.lng],
                [userPos.lat, userPos.lng]
            ]);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 1 });
        } else if (riderPos) {
            map.flyTo([riderPos.lat, riderPos.lng], 15, { duration: 1.5 });
        } else if (userPos) {
            map.flyTo([userPos.lat, userPos.lng], 15, { duration: 1.5 });
        }
    }, [riderPos, userPos, map]);

    return null;
}



export default function LiveMap({ role, order, socket, riderLocation, deliveryLocation }) {
    // State
    const [riderPos, setRiderPos] = useState(riderLocation || null);
    const [userPos] = useState(deliveryLocation || { lat: -1.2921, lng: 36.8219 });
    const [routePositions, setRoutePositions] = useState([]);
    const [eta, setEta] = useState(null); // { time: "10 min", dist: "5 km" }

    // Update internal state if props change (for User view)
    useEffect(() => {
        if (riderLocation) setRiderPos(riderLocation);
    }, [riderLocation]);

    // 1. Rider Logic: Send Location
    useEffect(() => {
        if (role === "rider" && order?._id) {
            if (!navigator.geolocation) return;

            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const newPos = { lat: latitude, lng: longitude };
                    setRiderPos(newPos);

                    // Emit to socket
                    socket.emit("rider:location", {
                        orderId: order._id,
                        lat: latitude,
                        lng: longitude,
                    });
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [role, order, socket]);

    // 2. Routing & ETA Logic (OSRM)
    useEffect(() => {
        if (!riderPos || !userPos) return;

        const fetchRoute = async () => {
            // OSRM Public Demo Server
            const url = `https://router.project-osrm.org/route/v1/driving/${riderPos.lng},${riderPos.lat};${userPos.lng},${userPos.lat}?overview=full&geometries=geojson`;
            try {
                const res = await fetch(url);
                const data = await res.json();

                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]); // Flip to [lat, lng]
                    setRoutePositions(coords);

                    // Calculate ETA
                    const durationMins = Math.ceil(route.duration / 60);
                    const distanceKm = (route.distance / 1000).toFixed(1);
                    setEta({ time: `${durationMins} min`, dist: `${distanceKm} km` });
                }
            } catch (err) {
                console.error("Routing error", err);
            }
        };

        // Debounce to avoid spamming OSRM
        const timer = setTimeout(fetchRoute, 1000);
        return () => clearTimeout(timer);
    }, [riderPos, userPos]);

    const focus = riderPos || userPos;

    return (
        <div className="h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border border-riderBlue/20 relative z-10 bg-riderBlack/20 backdrop-blur-sm group">
            <MapContainer
                center={[focus.lat, focus.lng]}
                zoom={14}
                scrollWheelZoom={true}
                className="h-full w-full opacity-100 transition-opacity"
                zoomControl={false} // Custom control looks better
            >
                {/* Uber-like Clean Map Tiles (CartoDB Positron) */}
                <TileLayer
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                <MapController riderPos={isValidPos(riderPos) ? riderPos : null} userPos={isValidPos(userPos) ? userPos : null} />

                {/* Route Line - Thick & Uber Black/Blue */}
                {routePositions.length > 0 && (
                    <>
                        {/* Outer Glow/Border */}
                        <Polyline positions={routePositions} color="white" weight={8} opacity={0.8} />
                        {/* Inner Line */}
                        <Polyline positions={routePositions} color="#2563EB" weight={5} opacity={1} />
                    </>
                )}

                {/* User Dropoff */}
                {isValidPos(userPos) && (
                    <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
                        <Popup className="rounded-xl">
                            <div className="text-center font-sans">
                                <h3 className="font-bold text-riderMaroon text-sm">Drop Off</h3>
                                <p className="text-xs text-gray-500">Destination</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Rider Live Location */}
                {isValidPos(riderPos) && (
                    <Marker position={[riderPos.lat, riderPos.lng]} icon={riderIcon} zIndexOffset={100}>
                        <Popup className="rounded-xl">
                            <div className="text-center font-sans">
                                <h3 className="font-bold text-riderBlue text-sm">Rider</h3>
                                <p className="text-xs text-gray-500">Active Trip</p>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Uber-style Floating Status Card */}
            <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl z-[1000] border border-gray-100/50 flex flex-col gap-2 transition-all">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {role === "rider" ? "Your Status" : "Arriving In"}
                        </p>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                            {eta ? eta.time : "Calculated..."}
                        </h2>
                    </div>
                    {/* Icon Circle */}
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl animate-pulse">
                        🏍️
                    </div>
                </div>

                {eta && (
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 border-t border-gray-100 pt-2 mt-1">
                        <span>📏 {eta.dist} away</span>
                        <span>•</span>
                        <span>📍 On the way</span>
                    </div>
                )}

                {/* Loading Bar */}
                {!eta && (
                    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-riderBlue w-1/3 animate-loading-bar"></div>
                    </div>
                )}
            </div>

            {/* Recenter Button */}
            <button
                className="absolute bottom-6 right-6 bg-white text-gray-700 p-3 rounded-full shadow-lg z-[1000] hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
                onClick={() => setRiderPos({ ...riderPos })} // Trigger effect
                title="Recenter Map"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
            </button>
        </div>
    );
}
