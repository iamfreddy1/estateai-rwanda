// ============================================
// ANIMATED NUMBER (counts up smoothly)
// ============================================

import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";

export default function AnimatedNumber({
  value, duration = 1200, format = (n) => n, style,
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    const start = startRef.current;
    const target = Number(value) || 0;
    const startTime = Date.now();
    let interval;

    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      setDisplay(current);
      if (progress >= 1) {
        clearInterval(interval);
        startRef.current = target;
      }
    }

    interval = setInterval(tick, 16);   // ~60fps
    return () => clearInterval(interval);
  }, [value, duration]);

  return <Text style={style}>{format(Math.round(display))}</Text>;
}
