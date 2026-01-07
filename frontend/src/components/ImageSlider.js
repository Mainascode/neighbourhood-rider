import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect } from "react";
import useMeasure from "react-use-measure";

const images = [
  "biker.jpeg",
  "biker2.jpeg",
  "biker5.jpeg",
  "biker4.jpeg", // Repeat for seamless feeling if needed, or just loop
];

export default function ImageSlider() {
  const [ref, { width }] = useMeasure();
  const xTranslation = useMotionValue(0);

  // Simple auto-scroll setup or just drag. 
  // For this "dense" UI, a horizontal scroll loop is nice.

  useEffect(() => {
    let controls;
    let finalPosition = -width / 2 - 8;

    // Animate continuously
    if (width > 0) {
      controls = animate(xTranslation, [0, finalPosition], {
        ease: "linear",
        duration: 25,
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 0,
      });
    }

    return () => controls?.stop();
  }, [xTranslation, width]);

  return (
    <div className="h-[400px] w-full overflow-hidden relative rounded-2xl shadow-2xl group">
      <motion.div
        drag="x" // Allow drag
        dragConstraints={{ left: 0, right: 0 }} // Free drag but snaps back? Or just continuous?
        style={{ x: xTranslation }}
        ref={ref}
        className="flex gap-4 cursor-grab active:cursor-grabbing absolute left-0"
        onHoverStart={() => {
          // Optional: pause on hover logic would go here
        }}
      >
        {[...images, ...images, ...images].map((src, idx) => (
          <div key={idx} className="relative w-[300px] h-[400px] flex-shrink-0 rounded-xl overflow-hidden border-2 border-riderBlue/10">
            <img
              src={src}
              alt="Rider"
              className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500 hover:scale-110"
            />
          </div>
        ))}
      </motion.div>

      {/* Overlay Gradient for smooth edges */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-riderBlack/90 to-transparent pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-riderBlack/90 to-transparent pointer-events-none"></div>
    </div>
  );
}
