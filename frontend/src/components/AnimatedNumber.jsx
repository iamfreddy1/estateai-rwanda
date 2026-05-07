// ============================================
// ANIMATED NUMBER COMPONENT
// ============================================
// Smoothly counts from 0 (or previous value) up to `value` over `duration` ms.
// Used for showing the predicted price in a "money counting up" effect.

import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ value, duration = 1200, format = (n) => n }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    const start = startRef.current;
    const target = Number(value) || 0;
    const startTime = performance.now();
    let frame;

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(step);
      else startRef.current = target;
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span>{format(Math.round(display))}</span>;
}

export default AnimatedNumber;
