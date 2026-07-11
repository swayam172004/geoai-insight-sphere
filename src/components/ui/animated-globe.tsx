import { motion } from "framer-motion";

export function AnimatedGlobe() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <div className="absolute inset-0 animate-pulse-glow rounded-full" />
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.55 0.16 220), oklch(0.2 0.05 260) 60%, oklch(0.1 0.02 265))",
          boxShadow:
            "inset -30px -30px 80px oklch(0.05 0.02 265), 0 0 80px -10px oklch(0.7 0.2 295 / 0.5)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full opacity-70">
          <defs>
            <radialGradient id="cont" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.6" />
            </radialGradient>
          </defs>
          <g fill="url(#cont)">
            <path d="M40 70 Q60 50 90 60 T140 70 Q150 90 130 100 T80 110 Q50 105 40 90 Z" />
            <path d="M60 130 Q90 120 120 135 T160 140 Q150 160 120 160 T70 155 Z" />
            <path d="M150 40 Q170 45 175 60 T160 80 Q145 75 150 55 Z" />
          </g>
        </svg>
      </motion.div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-primary/20"
          style={{ transform: `rotateX(70deg) rotateZ(${i * 60}deg) scale(${1 + i * 0.1})` }}
        />
      ))}
    </div>
  );
}