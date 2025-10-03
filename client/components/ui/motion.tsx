import { motion, MotionProps, Variants } from "framer-motion";
import { forwardRef } from "react";

// Optimized motion variants for common animations
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -30, scale: 1.05 }
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -30, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 30, scale: 1.05 }
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 30, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -30, scale: 1.05 }
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.2 }
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -50 }
};

// Optimized transition presets
export const springTransition = {
  type: "spring" as const,
  stiffness: 100,
  damping: 20,
  duration: 0.6
};

export const smoothTransition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
};

export const quickTransition = {
  duration: 0.2,
  ease: "easeOut" as const
};

// Reusable motion components
export const MotionDiv = forwardRef<HTMLDivElement, MotionProps & { children: React.ReactNode }>(
  ({ children, ...props }, ref) => (
    <motion.div ref={ref} {...props}>
      {children}
    </motion.div>
  )
);

export const MotionButton = forwardRef<HTMLButtonElement, MotionProps & { children: React.ReactNode }>(
  ({ children, ...props }, ref) => (
    <motion.button ref={ref} {...props}>
      {children}
    </motion.button>
  )
);

export const MotionSection = forwardRef<HTMLElement, MotionProps & { children: React.ReactNode }>(
  ({ children, ...props }, ref) => (
    <motion.section ref={ref} {...props}>
      {children}
    </motion.section>
  )
);

// Stagger animation utility
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

// Hover animations
export const hoverScale = {
  whileHover: { 
    scale: 1.05,
    y: -2,
    transition: { duration: 0.2 }
  },
  whileTap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

export const hoverLift = {
  whileHover: { 
    y: -4,
    transition: { duration: 0.3 }
  }
};

export const hoverRotate = {
  whileHover: { 
    rotate: 5,
    transition: { duration: 0.3 }
  }
};

// Performance optimized motion wrapper
export const OptimizedMotion = {
  div: motion.div,
  button: motion.button,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  main: motion.main,
  nav: motion.nav,
  aside: motion.aside,
  footer: motion.footer
};

MotionDiv.displayName = "MotionDiv";
MotionButton.displayName = "MotionButton";
MotionSection.displayName = "MotionSection";
