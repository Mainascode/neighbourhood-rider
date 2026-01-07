// src/pages/rider/RiderMap.js
import { useEffect, useState } from "react";
import { socket } from "../../lib/socket";

export default function RiderMap() {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    navigator.geolocation.watchPosition(p => {
      const coords = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
      };
      setPos(coords);
      socket.emit("rider:location", coords);
    });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-xl font-bold mb-4">Live Rider Location</h1>
      {pos && (
        <p>
          Lat: {pos.lat} | Lng: {pos.lng}
        </p>
      )}
    </div>
  );
}
