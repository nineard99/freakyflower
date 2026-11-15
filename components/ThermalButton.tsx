'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

// Thermal design system — ปุ่ม "ร้อน" ปุ่มเดียวต่อหน้าจอ (action หลักของหน้านั้น)
// สนามความร้อนวาดบน canvas ความละเอียดต่ำ แล้ว blur ด้วย CSS · สีมาจาก token --heat-0…5

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  size?: 's' | 'm' | 'l';
  status?: 'idle' | 'loading';
  full?: boolean;
  /** หยุดการไหลตอนนิ่ง (ใช้เมื่อปุ่มอยู่หลัง overlay) */
  still?: boolean;
  /** ไอคอน Lucide ท้ายป้าย (เส้น 2.2px ให้อ่านออกบนสนามความร้อน) */
  icon?: IconName;
  /** ความร้อนของสนาม 0–1 (ค่าเริ่ม 1) — ค่อยๆ อุ่นขึ้น/เย็นลงเมื่อค่าเปลี่ยน */
  intensity?: number;
};

const RAMP_POS = [0, 0.3, 0.52, 0.74, 0.88, 1];
const FALLBACK = ['#e2b0f2', '#f07fd0', '#f7c45e', '#f48a5e', '#f06a5c', '#ec5a5a'];

function rgb(s: string, fb: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(s.trim()) ?? /^#([0-9a-f]{6})$/i.exec(fb)!;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function buildLut(cs: CSSStyleDeclaration) {
  const stops = FALLBACK.map((fb, i) => rgb(cs.getPropertyValue(`--heat-${i}`), fb));
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < 4 && t > RAMP_POS[k + 1]) k++;
    const f = Math.min(1, Math.max(0, (t - RAMP_POS[k]) / (RAMP_POS[k + 1] - RAMP_POS[k])));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * f;
  }
  return lut;
}

// value noise 2D แบบเบาๆ
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function ThermalButton({ children, size = 'm', status = 'idle', full, still, icon, intensity = 1, disabled, className, onClick, type = 'button', ...rest }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatTarget = Math.min(1, Math.max(0, intensity));
  const live = useRef({ disabled: !!disabled, loading: status === 'loading', still: !!still, heat: heatTarget });
  live.current = { disabled: !!disabled, loading: status === 'loading', still: !!still, heat: heatTarget };
  const fx = useRef({ hover: 0, hoverTarget: 0, tx: 0.5, ty: 0.5, px: 0.5, py: 0.5, ripples: [] as { x: number; y: number; age: number }[] });

  useEffect(() => {
    const btn = btnRef.current!, canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cs = getComputedStyle(btn);
    const lut = buildLut(cs);
    const cool = rgb(cs.getPropertyValue('--paper-sunken'), '#e8e4da');
    let img: ImageData | null = null, W = 0, H = 0, t = Math.random() * 50, last = 0, raf = 0, visible = true, coolMix = 0, heat = live.current.heat;

    const resize = () => {
      W = btn.offsetWidth; H = btn.offsetHeight;
      if (!W || !H) return;
      canvas.width = Math.max(8, Math.round((W + 12) / 5));
      canvas.height = Math.max(6, Math.round((H + 12) / 2.5));
      img = ctx.createImageData(canvas.width, canvas.height);
    };

    const draw = () => {
      if (!img) return;
      const f = fx.current, { width: cols, height: rows, data } = img;
      const aspect = H ? W / H : 3;
      const sweep = live.current.loading ? (t * 0.9) % 1.6 - 0.3 : -9;
      const chill = (1 - heat) * 0.34; // intensity ต่ำ → สนามถอยไปทางลาเวนเดอร์/ชมพู
      for (let j = 0; j < rows; j++) {
        const y = j / (rows - 1);
        for (let i = 0; i < cols; i++) {
          const x = i / (cols - 1);
          let v = 0.34 - chill
            + 0.42 * noise(x * aspect * 0.9 + t * 0.22, y * 1.4 - t * 0.12)
            + 0.22 * noise(x * aspect * 2.1 - t * 0.35, y * 2.6 + t * 0.2);
          const dx = (x - f.px) * aspect, dy = y - f.py;
          v += f.hover * 0.42 * Math.exp(-(dx * dx + dy * dy) / 0.9);
          for (const r of f.ripples) {
            const d = Math.hypot(x * aspect - r.x, y - r.y) - r.age * 3.2;
            v += 0.5 * (1 - r.age) * Math.exp(-(d * d) / 0.08);
          }
          if (sweep > -9) { const s = x - sweep; v += 0.45 * Math.exp(-(s * s) / 0.02); }
          const k = Math.round(Math.min(1, Math.max(0, v)) * 255) * 3, p = (j * cols + i) * 4;
          data[p] = lut[k] + (cool[0] - lut[k]) * coolMix;
          data[p + 1] = lut[k + 1] + (cool[1] - lut[k + 1]) * coolMix;
          data[p + 2] = lut[k + 2] + (cool[2] - lut[k + 2]) * coolMix;
          data[p + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      btn.style.setProperty('--glow-a', String((0.12 + 0.18 * heat + f.hover * 0.25) * (1 - coolMix)));
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = now - last;
      if (elapsed < 33 || !visible) return; // ~30fps พอ
      const dt = Math.min(0.1, elapsed / 1000);
      last = now;
      const f = fx.current, L = live.current;
      const frozen = reduced || (L.still && !f.hoverTarget && !L.loading);
      if (!frozen) t += dt * (L.loading ? 2.2 : 1);
      f.hover += (f.hoverTarget - f.hover) * (reduced ? 1 : Math.min(1, dt * 8));
      f.px += (f.tx - f.px) * Math.min(1, dt * 6);
      f.py += (f.ty - f.py) * Math.min(1, dt * 6);
      f.ripples = f.ripples.filter((r) => (r.age += dt * 1.4) < 1);
      coolMix += ((L.disabled ? 0.82 : 0) - coolMix) * Math.min(1, dt * 6);
      heat += (L.heat - heat) * (reduced ? 1 : Math.min(1, dt * 2.5));
      draw();
    };

    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(btn);
    const io = new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; });
    io.observe(btn);
    resize(); draw();
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = btnRef.current!.getBoundingClientRect();
    fx.current.tx = (e.clientX - r.left) / r.width;
    fx.current.ty = (e.clientY - r.top) / r.height;
  };

  return (
    <button
      {...rest}
      ref={btnRef}
      type={type}
      className={`hot${full ? ' hot--block' : ''}${className ? ` ${className}` : ''}`}
      data-size={size}
      disabled={disabled}
      aria-busy={status === 'loading' || undefined}
      onPointerEnter={(e) => { fx.current.hoverTarget = 1; point(e); }}
      onPointerLeave={() => { fx.current.hoverTarget = 0; }}
      onPointerMove={point}
      onClick={(e) => {
        if (disabled || status === 'loading') { e.preventDefault(); return; }
        const f = fx.current, r = btnRef.current!.getBoundingClientRect();
        const kb = e.detail === 0; // กดจากคีย์บอร์ด → ripple จากกลางปุ่ม
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) f.ripples.push({ x: (kb ? 0.5 : f.tx) * (r.width / r.height), y: kb ? 0.5 : f.ty, age: 0 });
        if (f.ripples.length > 5) f.ripples.shift();
        onClick?.(e);
      }}
    >
      <canvas ref={canvasRef} className="hot__field" aria-hidden />
      <span className="hot__label">
        {children}
        {icon && <Icon name={icon} size={size === 's' ? 16 : size === 'l' ? 20 : 18} strokeWidth={2.2} />}
      </span>
    </button>
  );
}
