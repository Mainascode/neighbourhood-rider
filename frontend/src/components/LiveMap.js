import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const LIBRARIES = ["places"];

export default function LiveMap({ role, order, socket, riderLocation, deliveryLocation }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES
    });

    const [map, setMap] = useState(null);
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [riderPos, setRiderPos] = useState(riderLocation || null);
    const [userPos, setUserPos] = useState(deliveryLocation || { lat: -1.2921, lng: 36.8219 });
    // const [eta, setEta] = useState(null); // Unused for now, removed to fix lint

    // Update internal state if props change
    useEffect(() => {
        if (riderLocation) setRiderPos(riderLocation);
    }, [riderLocation]);

    useEffect(() => {
        if (deliveryLocation) setUserPos(deliveryLocation);
    }, [deliveryLocation]);

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
                (err) => console.error("Geo Error:", err),
                {
                    enableHighAccuracy: true,
                    maximumAge: 0, // Force fresh location
                    timeout: 10000 // Wait 10s max
                }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [role, order, socket]);

    // 2. Calculate Directions
    const directionsRendererRef = useRef(null);

    // 2. Initialize Directions Service & Renderer ONCE
    useEffect(() => {
        if (map && window.google) {
            // Initialize Renderer once
            if (!directionsRendererRef.current) {
                directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                    suppressMarkers: false, // User requested this be false in Step 2
                    preserveViewport: true,
                });
                directionsRendererRef.current.setMap(map);
            }
        }
    }, [map]);

    // 3. Calculate Directions & Update Renderer
    const lastRoutedRef = useRef(null);

    useEffect(() => {
        if (isLoaded && riderPos && userPos && directionsRendererRef.current) {
            if (!window.google) return;

            // Step 4: Optimization - Do NOT re-call DirectionsService every GPS update
            // simple distance check (approx 50m threshold to re-route)
            if (lastRoutedRef.current) {
                const latDiff = Math.abs(riderPos.lat - lastRoutedRef.current.lat);
                const lngDiff = Math.abs(riderPos.lng - lastRoutedRef.current.lng);
                // 0.0005 degrees is roughly 50 meters
                if (latDiff < 0.0005 && lngDiff < 0.0005) {
                    return; // Skip re-routing, just update marker (handled by React state)
                }
            }

            const directionsService = new window.google.maps.DirectionsService();

            directionsService.route({
                origin: riderPos,
                destination: userPos,
                travelMode: window.google.maps.TravelMode.BICYCLING,
            }, (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    directionsRendererRef.current.setDirections(result);
                    lastRoutedRef.current = riderPos;
                } else {
                    console.error("Directions error:", status);
                }
            });
        }
    }, [isLoaded, riderPos, userPos, map]);


    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

    const center = useMemo(() => {
        return riderPos || userPos;
    }, [riderPos, userPos]);

    if (!isLoaded) return <div className="h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-3xl">Loading Map...</div>;

    return (
        <div className="h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border border-riderBlue/20 relative z-10 bg-riderBlack/20 backdrop-blur-sm group">
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={center}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    mapTypeId: "roadmap",
                    disableDefaultUI: true,
                }}
            >
                {/* Custom Markers handled below */}

                {/* 🏠 User Location Marker (Home) */}
                {userPos && (
                    <Marker
                        position={userPos}
                        icon={{
                            path: window.google?.maps?.SymbolPath?.CIRCLE,
                            scale: 8,
                            fillColor: "#DC2626", // Red for Destination
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 2,
                        }}
                        label={{ text: "🏠", fontSize: "20px", className: "map-label" }} // Emoji label
                    />
                )}

                {/* 🏍️ Rider Location Marker (Moto) */}
                {riderPos && (
                    <Marker
                        position={riderPos}
                        icon={{
                            path: window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW,
                            scale: 6,
                            fillColor: "#2563EB", // Blue for Rider
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 2,
                            rotation: 0, // In future we can pass bearing/heading here
                        }}
                        label={{ text: "🏍️", fontSize: "24px", className: "map-label" }} // Emoji label
                        zIndex={100} // Keep rider on top
                    />
                )}
            </GoogleMap>



            {/* Recenter Button */}
            <button
                className="absolute bottom-6 right-6 bg-white text-gray-700 p-3 rounded-full shadow-lg z-[100] hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
                onClick={() => map && map.panTo(riderPos || userPos)}
                title="Recenter Map"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
            </button>
        </div>
    );
}
