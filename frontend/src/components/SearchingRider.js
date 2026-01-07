import { useEffect } from "react";
import { socket } from "../lib/socket";
import { motion } from "framer-motion";
import { FaMapMarkerAlt, FaMotorcycle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

export default function SearchingRider() {
  const { user } = useAuth();

  useEffect(() => {
    socket.emit("client:searching", {
      userId: user?.id,
      name: user?.name || "Guest",
    });
  }, [user]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-riderBlack/95">
      <div className="text-center relative">
        {/* Pulsing Map Marker */}
        <div className="relative inline-block">
          <motion.div
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 bg-riderBlue rounded-full blur-xl"
          ></motion.div>
          <FaMapMarkerAlt className="text-6xl text-riderMaroon relative z-10" />
        </div>

        {/* Orbiting Rider */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-48 h-48 border border-riderBlue/20 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 bg-riderBlack p-2 rounded-full border border-riderBlue/50">
            <FaMotorcycle className="text-2xl text-riderBlue" />
          </div>
        </motion.div>

        <h3 className="mt-12 text-2xl font-bold text-riderLight">
          Inatafuta Rider wa Mtaa...
        </h3>
        <p className="text-gray-600 mt-2 animate-pulse">
          Connecting you to the nearest rider.
        </p>
      </div>
    </div>
  );
}
