import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * PDS §6 — Page Transition Component
 * "Moving between environments should feel like entering another department.
 *  Support: Fade, Slide, Depth Shift, Scale, Soft Blur, Cross Dissolve, Light Sweep."
 *
 * Wraps page content in a subtle fade + slide-up transition on route change.
 * Uses PDS ease-cinematic timing for premium, intentional motion.
 */
export default function PageTransition({ children }) {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}