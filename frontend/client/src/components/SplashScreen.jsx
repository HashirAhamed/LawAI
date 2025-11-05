import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen({ show, logoSrc = "/logo.png" }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo with pop animation */}
          <motion.img
            src={logoSrc}
            alt="Logo"
            className="w-48 h-48 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          {/* Subtle ripple ring */}
          <motion.div
            className="absolute rounded-full border border-gray-300/50"
            initial={{ scale: 0.8, opacity: 0.2 }}
            animate={{ scale: 1.3, opacity: 0 }}
            transition={{
              duration: 1.2,
              ease: "easeOut",
              repeat: Infinity,
            }}
            style={{
              width: "7rem",
              height: "7rem",
            }}
          />

          {/* Tagline */}
          <motion.p
            className="mt-6 text-gray-700 text-sm sm:text-base font-medium tracking-wide"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            Your Legal Ally
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
