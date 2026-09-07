"use client";

import { motion } from "framer-motion";
import Logo from "./Logo";

export default function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-14px] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #64ddff, transparent 30%, #f6a9f3, transparent 70%, #64ddff)",
            maskImage:
              "radial-gradient(circle, transparent 62%, black 64%, black 100%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 62%, black 64%, black 100%)",
          }}
        />
        <Logo size={84} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex items-center gap-2 text-sm tracking-[0.3em] text-muted uppercase"
      >
        <span>{label}</span>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1 w-1 rounded-full bg-teal"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </span>
      </motion.div>
    </div>
  );
}
