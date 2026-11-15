import { FLOWERS, PAPERS, RIBBONS, sizeOf, type Design, type Item, type StemKind } from './catalog';

/* วาดช่อดอกไม้เป็น SVG markup ในพื้นที่ 400×520
   ลำดับชั้น: (ฟิล์มใสถ้าเลือก d.film) กระดาษด้านหลัง → ก้าน+ใบ → หัวดอก → กระดาษด้านหน้า + ริบบิ้น
   ขนาดกระดาษปรับตามตำแหน่งดอกไม้ (ช่อเล็ก = กรวยแคบ, ช่อใหญ่ = บานกว้าง)
   ใช้ทั้งบนหน้าเว็บ (dangerouslySetInnerHTML) และตอน export เป็น PNG
   ทุก id ใน <defs> มี uid นำหน้า เพราะหน้าเดียวมีหลายช่อ */

export const STAGE_W = 400;
export const STAGE_H = 520;
export const TIE = { x: 200, y: 372 }; // จุดรวบก้าน / ผูกริบบิ้น
const HEAD = 40; // รัศมีหัวดอกโดยประมาณที่ขนาด 1

export function shade(hex: string, p: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = p < 0 ? 0 : 255, k = Math.abs(p);
  r = Math.round(r + (t - r) * k); g = Math.round(g + (t - g) * k); b = Math.round(b + (t - b) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const f1 = (n: number) => n.toFixed(1);

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* ---------- ขอบเขตกระดาษ ---------- */
type Geo = { L: number; R: number; T: number; F: number; W: number; H: number };

function geometry(items: Item[]): Geo {
  let l = TIE.x - 30, r = TIE.x + 30, t = 200, b = 280;
  items.forEach((it, i) => {
    const rr = HEAD * sizeOf(it.type);
    if (i === 0) { l = it.x - rr; r = it.x + rr; t = it.y - rr; b = it.y + rr * 0.95; return; }
    l = Math.min(l, it.x - rr); r = Math.max(r, it.x + rr);
    t = Math.min(t, it.y - rr); b = Math.max(b, it.y + rr * 0.95);
  });
  const L = Math.max(10, Math.min(l - 34, TIE.x - 82));
  const R = Math.min(390, Math.max(r + 34, TIE.x + 82));
  const T = Math.max(12, Math.min(t - 20, TIE.y - 175));
  const F = Math.min(Math.max(b - 8, T + 80), TIE.y - 56); // ขอบบนกระดาษด้านหน้า (ใต้หัวดอกล่างสุด)
  return { L, R, T, F, W: R - L, H: F - T };
}

/* ---------- defs ---------- */
function newsPattern(id: string, angle: number, seed: number, base: string) {
  const r = rng(seed);
  let lines = '';
  for (const x0 of [6, 51, 96]) {
    let y = 22;
    while (y < 108) {
      if (r() < 0.07) { y += 4.5; continue; } // ขึ้นย่อหน้า
      const w = r() < 0.12 ? 38 * (0.3 + r() * 0.5) : 38;
      lines += `<rect x="${x0}" y="${f1(y)}" width="${f1(w)}" height="1.15"/>`;
      y += 2.9;
    }
  }
  const head = ['MEANWHILE', 'Original', 'Business'][seed % 3];
  return `<pattern id="${id}" width="140" height="112" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">` +
    `<rect width="140" height="112" fill="${base}"/>` +
    `<g fill="#4a3a2a" opacity=".38">${lines}</g>` +
    `<text x="6" y="15" font-family="Georgia,'Times New Roman',serif" font-size="10" font-weight="700" fill="#3b2e22" opacity=".62">${head}</text>` +
    `<rect x="6" y="18" width="128" height=".8" fill="#3b2e22" opacity=".4"/></pattern>`;
}

function defs(uid: string, d: Design) {
  const p = PAPERS[d.paper] ?? PAPERS[0];
  const news = p.kind === 'news'
    ? [-9, 13, -3].map((a, i) => newsPattern(`${uid}np${i}`, a, i + 3, p.color)).join('')
    : '';
  return `<defs>${news}` +
    `<linearGradient id="${uid}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>` +
    `<linearGradient id="${uid}sd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>` +
    `<filter id="${uid}ps" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#3c1e3c" flood-opacity=".28"/></filter>` +
    `<linearGradient id="${uid}lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7aaa58"/><stop offset="1" stop-color="#3a6729"/></linearGradient>` +
    `<filter id="${uid}pp" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#3c2a1e" flood-opacity=".22"/></filter>` +
    `</defs>`;
}

/* ---------- กระดาษ ---------- */
function paperFill(uid: string, d: Design, k: number) {
  const p = PAPERS[d.paper] ?? PAPERS[0];
  return p.kind === 'news' ? `url(#${uid}np${k % 3})` : p.color;
}

function sheet(uid: string, d: Design, path: string, k: number, side = false) {
  const p = PAPERS[d.paper] ?? PAPERS[0];
  return `<path d="${path}" fill="${paperFill(uid, d, k)}" stroke="${shade(p.color, -0.2)}" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="${path}" fill="url(#${uid}${side ? 'sd' : 'sh'})"/>`;
}

// ขอบกระดาษม้วน (เส้นสว่างตามขอบบน)
const curl = (path: string, color: string) =>
  `<path d="${path}" fill="none" stroke="${shade(color, 0.35)}" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>`;

export function backLayer(uid: string, d: Design) {
  const { L, R, T, W, H } = geometry(d.items);
  const p = PAPERS[d.paper] ?? PAPERS[0];
  const bl = TIE.x - 14, br = TIE.x + 14, by = TIE.y;
  const cTop = `M${f1(L + 0.22 * W)} ${f1(T + 0.04 * H)}Q${TIE.x} ${f1(T - 0.06 * H)} ${f1(R - 0.22 * W)} ${f1(T + 0.02 * H)}`;
  const lTop = `M${f1(L - 6)} ${f1(T + 0.5 * H)}Q${f1(L + 0.12 * W)} ${f1(T + 0.2 * H)} ${f1(L + 0.44 * W)} ${f1(T + 0.12 * H)}`;
  const rTop = `M${f1(R - 0.42 * W)} ${f1(T + 0.1 * H)}Q${f1(R - 0.1 * W)} ${f1(T + 0.16 * H)} ${f1(R + 6)} ${f1(T + 0.46 * H)}`;

  let out = '';
  if (d.film) {
    out += `<path d="M${bl - 6} ${by + 4}L${f1(L - 14)} ${f1(T + 0.32 * H)}L${f1(L + 0.12 * W)} ${f1(T - 16)}Q${TIE.x} ${f1(T - 34)} ${f1(R - 0.12 * W)} ${f1(T - 16)}L${f1(R + 14)} ${f1(T + 0.32 * H)}L${br + 6} ${by + 4}Z" fill="#fff" fill-opacity=".2" stroke="#fff" stroke-opacity=".85" stroke-width="1.2"/>`;
  }
  out += `<g filter="url(#${uid}pp)">`;
  out += sheet(uid, d, `M${bl} ${by}L${cTop.slice(1)}L${br} ${by}Z`, 0);
  out += sheet(uid, d, `M${br} ${by}L${lTop.slice(1)}L${bl + 8} ${by}Z`, 1, true);
  out += sheet(uid, d, `M${bl} ${by}L${rTop.slice(1)}L${br - 8} ${by}Z`, 2, true);
  out += '</g>';
  out += curl(cTop, p.color) + curl(lTop, p.color) + curl(rTop, p.color);
  return out;
}

export function frontLayer(uid: string, d: Design) {
  const { L, R, F, W, H } = geometry(d.items);
  const p = PAPERS[d.paper] ?? PAPERS[0];
  const rb = (RIBBONS[d.ribbon] ?? RIBBONS[0])[1];
  const bl = TIE.x - 16, br = TIE.x + 16, by = TIE.y;
  const drop = by - F;

  const mainTop = `M${f1(L + 0.05 * W)} ${f1(F - 0.05 * H)}Q${TIE.x} ${f1(F + 0.3 * drop)} ${f1(R - 0.05 * W)} ${f1(F - 0.05 * H)}`;
  const flapTop = `M${f1(L + 0.02 * W)} ${f1(F + 0.04 * H)}L${f1(TIE.x + 0.14 * W)} ${f1(F + 0.6 * drop)}`;

  let out = `<g filter="url(#${uid}pp)">`;
  // หางกระดาษใต้ริบบิ้น
  out += sheet(uid, d, `M${bl} ${by - 4}L${TIE.x - 26} 506Q${TIE.x} 512 ${TIE.x + 26} 506L${br} ${by - 4}Z`, 1, true);
  out += sheet(uid, d, `${mainTop}L${br} ${by}L${bl} ${by}Z`, 2);
  out += sheet(uid, d, `${flapTop}L${br} ${by}L${bl} ${by}Z`, 0, true);
  out += '</g>';
  out += curl(mainTop, p.color) + curl(flapTop, p.color);
  // รอยพับ
  out += `<path d="M${TIE.x - 4} ${f1(F + 0.32 * drop)}L${TIE.x - 2} ${by}M${f1(TIE.x + 0.22 * W)} ${f1(F + 0.02 * drop)}L${br - 2} ${by}" stroke="${shade(p.color, -0.25)}" stroke-width=".8" opacity=".5" fill="none"/>`;

  if (d.film) {
    const cTop = `M${f1(L - 10)} ${f1(F - 0.2 * H)}Q${TIE.x} ${f1(F + 0.1 * drop)} ${f1(R + 10)} ${f1(F - 0.2 * H)}`;
    out += `<path d="${cTop}L${br + 4} ${by}L${TIE.x + 30} 512L${TIE.x - 30} 512L${bl - 4} ${by}Z" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-opacity=".85" stroke-width="1.2"/>`;
    out += `<path d="M${f1(L + 0.1 * W)} ${f1(F - 0.08 * H)}L${TIE.x - 8} ${by - 10}M${f1(R - 0.16 * W)} ${f1(F - 0.1 * H)}L${TIE.x + 12} ${by - 14}M${TIE.x + 14} ${by + 30}L${TIE.x + 22} 500" stroke="#fff" stroke-width="2" opacity=".55" stroke-linecap="round" fill="none"/>`;
  }
  return out + ribbon(rb);
}

function ribbon(rb: string) {
  const rs = shade(rb, rb === '#ffffff' ? -0.2 : -0.28), hi = shade(rb, 0.45);
  return `<g transform="translate(${TIE.x} ${TIE.y + 2}) rotate(-6) scale(1.3)">` +
    `<rect x="-20" y="-6" width="40" height="11" rx="2" fill="${rb}" stroke="${rs}" stroke-width="1"/>` +
    // หางริบบิ้นยาว
    `<path d="M-3 3C-12 30-34 52-26 104L-16 101C-22 56-2 34 4 6Z" fill="${rb}" stroke="${rs}" stroke-width="1"/>` +
    `<path d="M3 3C16 26 40 40 38 88L28 90C28 50 10 30-3 6Z" fill="${rb}" stroke="${rs}" stroke-width="1"/>` +
    // ห่วงโบว์
    `<path d="M0 0C-12-24-50-26-48-4C-46 14-16 12 0 0Z" fill="${rb}" stroke="${rs}" stroke-width="1.1"/>` +
    `<path d="M0 0C12-24 50-26 48-4C46 14 16 12 0 0Z" fill="${rb}" stroke="${rs}" stroke-width="1.1"/>` +
    `<path d="M-6-4C-16-16-36-18-40-8M6-4C16-16 36-18 40-8" stroke="${rs}" stroke-width=".8" fill="none" opacity=".6"/>` +
    `<path d="M-30-16C-22-20-12-16-6-8M30-16C22-20 12-16 6-8" stroke="${hi}" stroke-width="1.6" fill="none" opacity=".7"/>` +
    `<ellipse rx="8" ry="7" fill="${shade(rb, -0.05)}" stroke="${rs}" stroke-width="1.1"/></g>`;
}

/* ---------- ก้าน + ใบ ----------
   ก้านเริ่มที่โคนดอก (หมุนตามดอก) โค้งลงมารวบที่ริบบิ้น วาด 3 ชั้น (เงา/เนื้อ/ไฮไลต์) ให้ดูกลม
   รายละเอียดตามชนิด: กุหลาบมีกลีบเลี้ยง หนาม ใบประกอบขอบหยัก, ทานตะวันใบรูปหัวใจ,
   คาร์เนชันมีกระเปาะเลี้ยงยาว ข้อ และใบเรียวคู่, เยอบีร่าก้านเรียบไม่มีใบ ฯลฯ */

type Tone = [string, string, string]; // เงา, เนื้อ, ไฮไลต์
export const TONE: Record<StemKind, Tone> = {
  rose: ['#2c5422', '#41702d', '#7aa858'],
  sunflower: ['#3a6022', '#557d33', '#93b968'],
  carnation: ['#486c58', '#69907a', '#a9c6b3'],
  gerbera: ['#4b7832', '#6a9946', '#a9cd86'],
  spray: ['#4b7638', '#5f8c48', '#86ad68'],
};
export const WIDTH: Record<StemKind, number> = { rose: 5, sunflower: 8, carnation: 4, gerbera: 5, spray: 2.6 };

// ระยะจากกลางหัวดอกถึงโคน (หน่วยก่อน scale)
const STEM_D = { spray: 46, other: 34 };

type Pt = { x: number; y: number };
const qAt = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
const qAng = (a: Pt, c: Pt, b: Pt, t: number) =>
  (Math.atan2(2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y), 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x)) * 180) / Math.PI;

// ใบหนึ่งใบ ชี้ไปทาง +x ยาว len กว้าง w (ขอบหยักถ้า serr)
function leafPath(len: number, w: number, serr: boolean, round = 0.8) {
  const N = 14, top: string[] = [], bot: string[] = [];
  for (let k = 1; k < N; k++) {
    const t = k / N;
    const hw = w * Math.sin(Math.PI * t) ** round * (1 - 0.3 * t) * (serr && k % 2 ? 1.13 : 1);
    top.push(`${f1(t * len)} ${f1(-hw)}`);
    bot.unshift(`${f1(t * len)} ${f1(hw)}`);
  }
  return `M0 0L${top.join('L')}L${f1(len)} 0L${bot.join('L')}Z`;
}
function leaf(p: Pt, ang: number, len: number, w: number, uid: string, opt: { serr?: boolean; round?: number; fill?: string } = {}) {
  const veins = [0.3, 0.5, 0.7].map((t) => `M${f1(t * len)} 0L${f1(t * len + len * 0.14)} ${f1(-w * 0.55)}M${f1(t * len)} 0L${f1(t * len + len * 0.14)} ${f1(w * 0.55)}`).join('');
  return `<g transform="translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(ang)})">` +
    `<path d="${leafPath(len, w, !!opt.serr, opt.round)}" fill="${opt.fill ?? `url(#${uid}lf)`}" stroke="#2f5523" stroke-width=".6"/>` +
    `<path d="M0 0L${f1(len * 0.94)} 0${veins}" stroke="#2f5523" stroke-width=".55" opacity=".55" fill="none"/></g>`;
}
// ใบประกอบกุหลาบ: ก้านใบ + ใบย่อย 3 ใบ
function roseLeaf(p: Pt, ang: number, z: number, uid: string) {
  const rad = (ang * Math.PI) / 180, pl = 12 * z;
  const tip = { x: p.x + Math.cos(rad) * pl, y: p.y + Math.sin(rad) * pl };
  const mid = { x: p.x + Math.cos(rad) * pl * 0.55, y: p.y + Math.sin(rad) * pl * 0.55 };
  return `<path d="M${f1(p.x)} ${f1(p.y)}L${f1(tip.x)} ${f1(tip.y)}" stroke="#355f27" stroke-width="${f1(1.2 * z)}"/>` +
    leaf(mid, ang - 55, 17 * z, 6.4 * z, uid, { serr: true }) +
    leaf(mid, ang + 55, 17 * z, 6.4 * z, uid, { serr: true }) +
    leaf(tip, ang, 23 * z, 8.4 * z, uid, { serr: true });
}

function stem(it: Item, i: number, uid: string) {
  const f = FLOWERS[it.type];
  if (!f) return '';
  const z = sizeOf(it.type), kind = f.stem;
  const rad = (it.r * Math.PI) / 180;
  const d = (kind === 'spray' ? STEM_D.spray : STEM_D.other) * z; // จากกลางดอกถึงโคน (ตรงกับ itemTransform)
  const a: Pt = { x: it.x - Math.sin(rad) * d, y: it.y + Math.cos(rad) * d };
  const b: Pt = { x: TIE.x + Math.max(-9, Math.min(9, (it.x - TIE.x) * 0.1)), y: TIE.y + 4 };
  const c: Pt = { x: (a.x + b.x) / 2 + (a.x - b.x) * 0.1, y: (a.y + b.y) / 2 };
  const tail = { x: TIE.x + (it.x - TIE.x) * 0.16, y: 500 };
  const path = `M${f1(a.x)} ${f1(a.y)}Q${f1(c.x)} ${f1(c.y)} ${f1(b.x)} ${f1(b.y)}L${f1(tail.x)} ${tail.y}`;
  const [dark, mid, hi] = TONE[kind];
  const w = WIDTH[kind] * Math.max(0.8, z);
  const side = i % 2 ? 1 : -1;
  const up = (t: number) => qAng(a, c, b, t) + 180; // ทิศชี้ขึ้นไปหาดอก

  let out = `<g>`;
  // ใบที่อยู่หลังก้าน
  if (kind === 'sunflower') out += leaf(qAt(a, c, b, 0.32), up(0.32) + side * 58, 46 * z, 22 * z, uid, { serr: true, round: 0.55 });
  // ก้าน 3 ชั้น
  out += `<path d="${path}" stroke="${dark}" stroke-width="${f1(w)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (kind !== 'spray') {
    out += `<path d="${path}" transform="translate(${f1(-w * 0.12)} 0)" stroke="${mid}" stroke-width="${f1(w * 0.6)}" fill="none" stroke-linecap="round"/>`;
    out += `<path d="${path}" transform="translate(${f1(-w * 0.26)} 0)" stroke="${hi}" stroke-width="${f1(w * 0.2)}" fill="none" opacity=".8" stroke-linecap="round"/>`;
  }

  if (kind === 'rose') {
    // หนาม
    [0.18, 0.36, 0.54].forEach((t, k) => {
      const p = qAt(a, c, b, t), s2 = (k + i) % 2 ? 1 : -1, ang = qAng(a, c, b, t);
      out += `<g transform="translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(ang)})"><path d="M-2.4 ${f1(s2 * w * 0.4)}L2.4 ${f1(s2 * w * 0.4)}L-2.8 ${f1(s2 * (w * 0.4 + 3.6))}Z" fill="#7d5636"/></g>`;
    });
    out += roseLeaf(qAt(a, c, b, 0.26), up(0.26) + side * 48, z, uid);
    out += roseLeaf(qAt(a, c, b, 0.46), up(0.46) - side * 52, z * 0.9, uid);
    // กลีบเลี้ยง + ฐานรองดอก
    const down = it.r + 90;
    out += [-62, -30, 0, 30, 62].map((s3) => leaf(a, down + s3, 13 * z, 2.2 * z, uid, { fill: '#3d6a2c', round: 0.6 })).join('');
    out += `<ellipse cx="${f1(a.x)}" cy="${f1(a.y)}" rx="${f1(5 * z)}" ry="${f1(4.2 * z)}" fill="#4c7a35" stroke="#2f5523" stroke-width=".6"/>`;
  } else if (kind === 'carnation') {
    // ข้อ + ใบเรียวคู่
    [0.32, 0.56].forEach((t) => {
      const p = qAt(a, c, b, t);
      out += `<ellipse cx="${f1(p.x)}" cy="${f1(p.y)}" rx="${f1(w * 0.75)}" ry="${f1(w * 0.45)}" fill="${mid}"/>`;
      out += leaf(p, up(t) - 30, 24 * z, 2.6 * z, uid, { fill: '#6f957f', round: 0.5 }) + leaf(p, up(t) + 30, 24 * z, 2.6 * z, uid, { fill: '#6f957f', round: 0.5 });
    });
    // กระเปาะเลี้ยงยาว
    out += `<g transform="translate(${f1(a.x)} ${f1(a.y)}) rotate(${it.r})"><path d="M${f1(-4.8 * z)} ${f1(-6 * z)}L${f1(4.8 * z)} ${f1(-6 * z)}L${f1(3 * z)} ${f1(18 * z)}L${f1(-3 * z)} ${f1(18 * z)}Z" fill="#7aa08a" stroke="#486c58" stroke-width=".6"/>` +
      `<path d="M0 ${f1(-5 * z)}V${f1(17 * z)}M${f1(-2.4 * z)} ${f1(-5 * z)}L${f1(-1.6 * z)} ${f1(17 * z)}M${f1(2.4 * z)} ${f1(-5 * z)}L${f1(1.6 * z)} ${f1(17 * z)}" stroke="#4f735f" stroke-width=".5"/></g>`;
  } else if (kind === 'sunflower') {
    out += leaf(qAt(a, c, b, 0.5), up(0.5) - side * 60, 40 * z, 19 * z, uid, { serr: true, round: 0.55 });
    out += `<ellipse cx="${f1(a.x)}" cy="${f1(a.y - 3 * z)}" rx="${f1(10 * z)}" ry="${f1(6 * z)}" fill="#557d33" stroke="#3a6022" stroke-width=".6"/>`;
  } else if (kind === 'gerbera') {
    out += `<ellipse cx="${f1(a.x)}" cy="${f1(a.y)}" rx="${f1(5.5 * z)}" ry="${f1(3.6 * z)}" fill="${mid}"/>`;
  }
  return out + '</g>';
}

export function stemsLayer(uid: string, d: Design) {
  return d.items.map((it, i) => stem(it, i, uid)).join('');
}

/* ---------- หัวดอก ----------
   ปกติ: กลางรูปอยู่ที่ (it.x, it.y) · รูปที่มี head (เช่น ยิปโซถ่ายแนวนอน): หมุนรูปให้กิ่งชี้ขึ้น แล้ววางโคนกิ่งไว้ที่ปลายก้าน */
export const itemTransform = (it: Item) => {
  const base = `translate(${f1(it.x)} ${f1(it.y)}) rotate(${it.r}) scale(${sizeOf(it.type)})`;
  const h = FLOWERS[it.type]?.head;
  if (!h) return `${base} translate(-50 -50)`;
  return `${base} translate(0 ${STEM_D.spray}) rotate(${h.turn}) translate(${-h.base[0]} ${-h.base[1]})`;
};

/* ---------- ทั้งช่อ (ใช้ตอน export) ---------- */
export function bouquetMarkup(d: Design, uid: string, href: (it: Item) => string) {
  const heads = d.items.map((it) =>
    `<g transform="${itemTransform(it)}"><image href="${href(it)}" width="100" height="100" filter="url(#${uid}ps)"/></g>`).join('');
  return defs(uid, d) + backLayer(uid, d) + stemsLayer(uid, d) + heads + frontLayer(uid, d);
}

export { defs as defsLayer };
