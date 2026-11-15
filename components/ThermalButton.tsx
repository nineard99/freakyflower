'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

// Thermal design system — ปุ่ม "ร้อน" ปุ่มเดียวต่อหน้าจอ (action หลักของหน้านั้น)
// พอร์ตตรงจาก HeatEngine ใน bundle.js ของ design system: สนามความร้อนไหลตอนนิ่ง · ตามเคอร์เซอร์ตอน hover
// · กดแล้วปุ่มยุบ + ระลอกความร้อน · halo เต้นเฉพาะโฟกัสจากคีย์บอร์ด · โหลด = แถบความร้อนกวาด · ปิดใช้งาน = เย็นลง
// สีมาจาก token --heat-0…5 / --paper-sunken (อ่านซ้ำทุก 1.5 วินาที)

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  size?: 's' | 'm' | 'l';
  status?: 'idle' | 'loading';
  full?: boolean;
  /** หยุดการไหลตอนนิ่ง (ใช้เมื่อปุ่มอยู่หลัง overlay) — hover/กด/โหลด ยังตอบสนอง */
  still?: boolean;
  /** ไอคอน Lucide ท้ายป้าย (เส้น 2.2px ให้อ่านออกบนสนามความร้อน) */
  icon?: IconName;
};

type Live = { disabled: boolean; loading: boolean; still: boolean };
type RGB = [number, number, number];

const RAMP_POS = [0, 0.3, 0.52, 0.74, 0.88, 1];
const DEFAULT_RAMP = ['#e2b0f2', '#f07fd0', '#f7c45e', '#f48a5e', '#f06a5c', '#ec5a5a'];
// ค่าปรับแต่งของ design system — ปล่อยไว้ที่ 1 ตามคำแนะนำ (intensity · speed · smear · grain)
const INTEN = 1, SPEED = 1, SMEAR = 1, GRAIN = 1;

function parseColor(str: string, fallback?: string): RGB {
  const s = String(str || '').trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})\b/i.exec(s);
  if (m) {
    let x = m[1];
    if (x.length === 3) x = x[0] + x[0] + x[1] + x[1] + x[2] + x[2];
    return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
  }
  m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  if (m) return [+m[1], +m[2], +m[3]];
  return fallback ? parseColor(fallback) : [0, 0, 0];
}

class HeatEngine {
  private ctx: CanvasRenderingContext2D | null = null;
  private t = Math.random() * 50;
  private seed = 1 + Math.floor(Math.random() * 2000000000);
  private hover = 0; private hoverTarget = 0;
  private px = 0.5; private py = 0.5; private tx = 0.5; private ty = 0.5;
  private press = 0; private pressed = false; private pressPulse = 0;
  private ripples: { x: number; y: number; age: number }[] = [];
  private haloOp = 0; private focusVis = false; private pointerFocus = false;
  private visible = true; private last = 0; private tokenClock = 0;
  private W = 0; private H = 0; private img: ImageData | null = null;
  private reduced = false;
  private raf = 0;
  private ro: ResizeObserver | null = null;
  private io: IntersectionObserver | null = null;
  private lut = new Uint8ClampedArray(256 * 3);
  private mixC: RGB = [232, 228, 218];
  private glowC: RGB = [240, 106, 92];
  private perm = new Uint8Array(512);
  private vals = new Float32Array(256);

  constructor(private btn: HTMLButtonElement, private canvas: HTMLCanvasElement, private halo: HTMLSpanElement, private live: { current: Live }) {
    try { this.ctx = canvas.getContext('2d'); } catch { this.ctx = null; }
    try { this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* ignore */ }
    this.buildNoise();
    this.readTokens();
    try { this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(btn); } catch { this.ro = null; }
    try { this.io = new IntersectionObserver((en) => { this.visible = en[en.length - 1].isIntersecting; }); this.io.observe(btn); } catch { this.io = null; }
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  private readTokens() {
    const cs = getComputedStyle(this.btn);
    const stops = RAMP_POS.map((pos, i) => [pos, ...parseColor(cs.getPropertyValue(`--heat-${i}`), DEFAULT_RAMP[i])]);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const A = stops[k], B = stops[k + 1];
      const f = Math.min(1, Math.max(0, (t - A[0]) / (B[0] - A[0])));
      for (let c = 0; c < 3; c++) this.lut[i * 3 + c] = A[c + 1] + (B[c + 1] - A[c + 1]) * f;
    }
    this.mixC = parseColor(cs.getPropertyValue('--paper-sunken'), '#e8e4da');
    this.glowC = parseColor(cs.getPropertyValue('--heat-4'), DEFAULT_RAMP[4]);
  }

  private buildNoise() {
    let s = this.seed;
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1), tmp = base[i]; base[i] = base[j]; base[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = base[i & 255];
    for (let i = 0; i < 256; i++) { s = (s * 16807) % 2147483647; this.vals[i] = (s % 10000) / 10000; }
  }

  // value noise 3D (x, y, เวลา)
  private noise(x: number, y: number, z: number) {
    const p = this.perm, v = this.vals;
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const X = xi & 255, Y = yi & 255, Z = zi & 255;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf), q = zf * zf * (3 - 2 * zf);
    const a = p[X] + Y, aa = p[a] + Z, ab = p[a + 1] + Z;
    const b = p[X + 1] + Y, ba = p[b] + Z, bb = p[b + 1] + Z;
    const x1 = v[p[aa]] + u * (v[p[ba]] - v[p[aa]]);
    const x2 = v[p[ab]] + u * (v[p[bb]] - v[p[ab]]);
    const x3 = v[p[aa + 1]] + u * (v[p[ba + 1]] - v[p[aa + 1]]);
    const x4 = v[p[ab + 1]] + u * (v[p[bb + 1]] - v[p[ab + 1]]);
    const y1 = x1 + w * (x2 - x1), y2 = x3 + w * (x4 - x3);
    return y1 + q * (y2 - y1);
  }

  private resize() {
    if (!this.ctx) return;
    const W = this.btn.offsetWidth, H = this.btn.offsetHeight;
    if (!W || !H) return;
    this.W = W; this.H = H;
    const cols = Math.max(8, Math.round((W + 12) / 5));
    const rows = Math.max(6, Math.round((H + 12) / 2.5));
    if (this.canvas.width !== cols) this.canvas.width = cols;
    if (this.canvas.height !== rows) this.canvas.height = rows;
    try { this.img = this.ctx.createImageData(cols, rows); } catch { this.img = null; }
    this.draw();
  }

  private pointer(e: { clientX: number; clientY: number }) {
    const r = this.btn.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.tx = (e.clientX - r.left) / r.width;
    this.ty = (e.clientY - r.top) / r.height;
  }

  private spawn(x: number, y: number) {
    if (this.reduced) { this.pressPulse = 0.2; return; }
    const aspect = this.H ? this.W / this.H : 3;
    this.ripples.push({ x: x * aspect, y, age: 0 });
    if (this.ripples.length > 6) this.ripples.shift();
  }

  enter(e: React.PointerEvent) { this.hoverTarget = 1; this.pointer(e); }
  leave() { this.hoverTarget = 0; this.pressed = false; }
  move(e: React.PointerEvent) { this.pointer(e); }
  down(e: React.PointerEvent) { this.pointerFocus = true; this.pressed = true; this.pointer(e); this.px = this.tx; this.py = this.ty; }
  up() { this.pressed = false; }
  click(e: React.MouseEvent) {
    if (this.live.current.disabled) return;
    if (e.detail === 0) { this.spawn(0.5, 0.5); this.pressPulse = 0.16; } // กดจากคีย์บอร์ด → ระลอกจากกลางปุ่ม
    else this.spawn(this.tx, this.ty);
  }
  focus() { this.focusVis = !this.pointerFocus; this.pointerFocus = false; }
  blur() { this.focusVis = false; }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    if (!this.last) this.last = now;
    const elapsed = now - this.last;
    if (elapsed < 30) return; // ~30fps พอ
    const dt = Math.min(0.1, elapsed / 1000);
    this.last = now;
    if (!this.visible) return;
    this.tokenClock += dt;
    if (this.tokenClock > 1.5) { this.tokenClock = 0; this.readTokens(); }
    if (!this.img) { this.resize(); if (!this.img) return; }
    const L = this.live.current;
    const off = L.disabled;
    const moving = !L.still || this.hover > 0.02 || L.loading || this.press > 0.02 || this.ripples.length > 0;
    if (!this.reduced && !off && moving) this.t += dt * SPEED;
    const hoverTarget = off ? 0 : this.hoverTarget;
    this.hover += (hoverTarget - this.hover) * Math.min(1, dt * 6);
    this.px += (this.tx - this.px) * Math.min(1, dt * 9);
    this.py += (this.ty - this.py) * Math.min(1, dt * 9);
    if (this.pressPulse > 0) this.pressPulse -= dt;
    const pressT = !off && (this.pressed || this.pressPulse > 0) ? 1 : 0;
    this.press += (pressT - this.press) * Math.min(1, dt * 18);
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].age += dt;
      if (this.ripples[i].age > 1.6) this.ripples.splice(i, 1);
    }
    this.draw();
    this.decorate(dt);
  };

  // ปุ่มยุบตอนกด · เงาเรืองแสงตามความร้อน · halo โฟกัสเต้นช้าๆ
  private decorate(dt: number) {
    const off = this.live.current.disabled;
    const heat = Math.max(this.hover, this.press);
    const g = this.glowC;
    this.btn.style.transform = `scale(${(1 - 0.045 * this.press).toFixed(4)})`;
    this.btn.style.boxShadow = off
      ? 'inset 0 0 0 1px var(--line)'
      : `0 12px 36px -12px rgba(${g[0]},${g[1]},${g[2]},${(0.28 + 0.5 * heat).toFixed(3)}), inset 0 0 0 1px rgba(255,255,255,0.28)`;
    const show = !off && this.focusVis;
    const pulse = this.reduced ? 1 : 0.72 + 0.28 * Math.sin(this.t * 3.2);
    this.haloOp += ((show ? pulse : 0) - this.haloOp) * Math.min(1, dt * 10);
    this.halo.style.opacity = this.haloOp.toFixed(3);
  }

  private draw() {
    const ctx = this.ctx, img = this.img;
    if (!ctx || !img || !this.H) return;
    const L = this.live.current;
    const off = L.disabled, loading = L.loading;
    const lut = this.lut, mix = this.mixC;
    const { width: cols, height: rows, data } = img;
    const W = this.W, H = this.H, cw = W + 12, ch = H + 12;
    const t = this.t, aspect = W / H, cxm = aspect * 0.5;
    const pX = this.px * aspect, pY = this.py;
    const hov = this.hover * INTEN;
    const sweep = ((t * 0.5) % 1.6 - 0.3) * aspect;
    const pressBoost = this.press * 0.12 * INTEN;
    const rs = this.ripples, nr = rs.length;
    for (let j = 0; j < rows; j++) {
      const Y = (((j + 0.5) / rows) * ch - 6) / H;
      // เส้นสแกนเหลื่อมกันเล็กน้อย ให้ภาพเหมือนกล้องถ่ายความร้อน
      const jit = (this.noise(j * 0.37, 7.1, t * 1.3) - 0.5) * SMEAR * 0.5 + (this.noise(j * 0.11, 3.3, t * 0.4) - 0.5) * SMEAR * 0.3;
      const scan = (j % 2 === 0 ? 0.022 : -0.022) * SMEAR;
      for (let i = 0; i < cols; i++) {
        const X = (((i + 0.5) / cols) * cw - 6) / H;
        const Xs = X + jit;
        let f: number;
        if (off) {
          f = 0.05 + this.noise(Xs * 1.2, Y * 2.4, 3.0) * 0.12;
        } else {
          const n1 = this.noise(Xs * 1.1 + t * 0.12, Y * 2.2 - t * 0.05, t * 0.22);
          const n2 = this.noise(Xs * 2.3 - t * 0.08, Y * 4.6, t * 0.35 + 11);
          f = 0.33 + ((n1 * 0.68 + n2 * 0.32) - 0.5) * 0.95;
          const dcx = (X - cxm) / (aspect * 0.55), dcy = (Y - 0.5) / 0.6;
          f += 0.14 * Math.exp(-(dcx * dcx + dcy * dcy));
          const wv = this.noise(Xs * 5.5 + t * 0.9, 1.7, t * 0.3);
          const dy = (Y - 0.5) / (0.06 + wv * 0.22);
          f += Math.exp(-dy * dy) * wv * 0.22;
          if (hov > 0.001) {
            const hx = (Xs - pX) * 0.55, hy = Y - pY;
            f += hov * (0.62 * Math.exp(-(hx * hx + hy * hy) / 0.22) + 0.1);
          }
          for (let r = 0; r < nr; r++) {
            const rp = rs[r];
            const rx = X - rp.x, ry = Y - rp.y;
            const d = Math.sqrt(rx * rx + ry * ry);
            const k = (d - rp.age * 2.4) / 0.22;
            f += INTEN * (Math.exp(-k * k) * Math.exp(-rp.age * 2.2) * 0.75 + Math.exp(-rp.age * 7) * 0.45 * Math.exp(-d * d / 0.4));
          }
          if (loading) { const lx = (Xs - sweep) / 0.38; f += 0.55 * Math.exp(-lx * lx); }
          f += pressBoost;
        }
        f += scan;
        if (GRAIN > 0) f += (Math.random() - 0.5) * 0.11 * GRAIN;
        let idx = (f * 255) | 0;
        if (idx < 0) idx = 0; else if (idx > 255) idx = 255;
        const o = (j * cols + i) * 4, l3 = idx * 3;
        let cr = lut[l3], cg = lut[l3 + 1], cb = lut[l3 + 2];
        if (off) { cr = cr * 0.35 + mix[0] * 0.65; cg = cg * 0.35 + mix[1] * 0.65; cb = cb * 0.35 + mix[2] * 0.65; }
        data[o] = cr; data[o + 1] = cg; data[o + 2] = cb; data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.io?.disconnect();
  }
}

export function ThermalButton({
  children, size = 'm', status = 'idle', full, still, icon, disabled, className, type = 'button',
  onClick, onPointerEnter, onPointerLeave, onPointerMove, onPointerDown, onPointerUp, onFocus, onBlur, ...rest
}: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const engRef = useRef<HeatEngine | null>(null);
  const loading = status === 'loading';
  const live = useRef<Live>({ disabled: !!disabled, loading, still: !!still });
  live.current = { disabled: !!disabled, loading, still: !!still };

  useEffect(() => {
    const eng = new HeatEngine(btnRef.current!, canvasRef.current!, haloRef.current!, live);
    engRef.current = eng;
    return () => { eng.destroy(); engRef.current = null; };
  }, []);

  return (
    <span className={`hot${full ? ' hot--block' : ''}${className ? ` ${className}` : ''}`}>
      <span ref={haloRef} className="hot__halo" aria-hidden />
      <button
        {...rest}
        ref={btnRef}
        type={type}
        className="hot__btn"
        data-size={size}
        disabled={disabled}
        aria-busy={loading || undefined}
        onPointerEnter={(e) => { engRef.current?.enter(e); onPointerEnter?.(e); }}
        onPointerLeave={(e) => { engRef.current?.leave(); onPointerLeave?.(e); }}
        onPointerMove={(e) => { engRef.current?.move(e); onPointerMove?.(e); }}
        onPointerDown={(e) => { engRef.current?.down(e); onPointerDown?.(e); }}
        onPointerUp={(e) => { engRef.current?.up(); onPointerUp?.(e); }}
        onFocus={(e) => { engRef.current?.focus(); onFocus?.(e); }}
        onBlur={(e) => { engRef.current?.blur(); onBlur?.(e); }}
        onClick={(e) => {
          if (disabled || loading) { e.preventDefault(); return; }
          engRef.current?.click(e);
          onClick?.(e);
        }}
      >
        <canvas ref={canvasRef} className="hot__field" aria-hidden />
        <span className="hot__label">
          <span>{children}</span>
          {icon && <Icon name={icon} size={size === 's' ? 16 : size === 'l' ? 20 : 18} strokeWidth={2.2} />}
        </span>
      </button>
    </span>
  );
}
