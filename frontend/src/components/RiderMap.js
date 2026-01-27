import { useEffect, useState, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { socket } from "../lib/socket";

const LIBRARIES = ["places"];

export default function RiderMap({ orderId }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [map, setMap] = useState(null);
  const [pos, setPos] = useState(null);

  // Watch Position and Emit Updates
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const coords = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        };
        setPos(coords);

        if (orderId) {
          socket.emit("rider:location", {
            orderId,
            ...coords
          });
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [orderId]);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="h-64 w-full flex items-center justify-center bg-gray-100 rounded-xl">Loading Map...</div>;

  if (!pos) return <div className="h-64 w-full flex items-center justify-center bg-gray-100 rounded-xl text-gray-500">Acquiring Location...</div>;

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden shadow-lg border border-gray-200 mt-4 relative">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={pos}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        <Marker position={pos} icon={{
          url: "https://cdn-icons-png.flaticon.com/512/3448/3448606.png",
          scaledSize: new window.google.maps.Size(40, 40)
        }} />
      </GoogleMap>

      <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg text-xs text-center border border-gray-100 shadow-sm">
        <p className="font-mono text-gray-600">
          LAT: {pos.lat.toFixed(5)} | LNG: {pos.lng.toFixed(5)}
        </p>
        <p className="text-green-600 font-bold">● Broadcasting Location</p>
      </div>
    </div>
  );
}
