'use client';

import { useEffect, useRef, useState } from 'react';

// ตัวเลขวิ่งไปหาค่าใหม่ (ยอดเงิน) — ปิด motion ในเครื่อง = เปลี่ยนทันที
export function useCountUp(target: number, ms = 500) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now(), a = from.current;
    if (a === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); from.current = target; return; }
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms), e = 1 - (1 - t) ** 3;
      const cur = Math.round(a + (target - a) * e);
      from.current = cur;
      setV(cur);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
