import { FLOWERS, sizeOf, type Item } from './catalog';

/* จัดวางดอกอัตโนมัติ (โหมด "ให้ร้านจัดให้") — ใช้ทำภาพตัวอย่างเท่านั้น ร้านจัดจริงเอง
   ดอกหลัก: วนเป็นเกลียวแบบเมล็ดทานตะวันรอบกลางช่อ (ใหญ่สุดอยู่กลาง สลับชนิด/สีไม่ให้กองกัน)
   ดอกรอง: เรียงเป็นวงโค้งด้านบน-ข้าง ด้านหลังดอกหลัก */

export type Counts = Record<string, number>; // "ชนิด|สี" → จำนวน

const GOLDEN = (137.5 * Math.PI) / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// หยิบสลับทีละกลุ่ม: กุหลาบแดง, ทานตะวัน, กุหลาบแดง, ... ให้ชนิดกระจายทั่วช่อ
function roundRobin(keys: [string, number][]) {
  const left = keys.map(([k, n]) => [k, n] as [string, number]);
  const out: string[] = [];
  while (left.some(([, n]) => n > 0)) {
    for (const g of left) if (g[1] > 0) { out.push(g[0]); g[1]--; }
  }
  return out;
}

export function arrange(counts: Counts): Item[] {
  const entries = Object.entries(counts).filter(([k, n]) => n > 0 && FLOWERS[k.split('|')[0]]);
  const byRole = (role: string) =>
    entries.filter(([k]) => FLOWERS[k.split('|')[0]].role === role)
      .sort((a, b) => sizeOf(b[0].split('|')[0]) - sizeOf(a[0].split('|')[0]));

  const mains = roundRobin(byRole('main'));
  const fillers = roundRobin(byRole('filler'));
  const items: Item[] = [];
  let id = 1;
  const push = (k: string, x: number, y: number, r: number) => {
    const [type, color] = k.split('|');
    items.push({ id: id++, type, color, x: Math.round(clamp(x, 44, 356)), y: Math.round(clamp(y, 70, 300)), r: Math.round(r) });
  };

  const avg = mains.length ? mains.reduce((a, k) => a + sizeOf(k.split('|')[0]), 0) / mains.length : 0.9;
  const step = 50 * avg; // ระยะห่างระหว่างดอกหลัก
  const cx = 200, cy = 262 - Math.min(70, Math.sqrt(mains.length) * 20);
  const mainPos = mains.map((k, i) => {
    const rr = step * Math.sqrt(i), a = i * GOLDEN - Math.PI / 2;
    return { k, x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.82 };
  });
  const outer = mainPos.reduce((m, p) => Math.max(m, Math.hypot(p.x - cx, (p.y - cy) / 0.82)), 0) + 46 * avg;

  // ดอกรองอยู่ด้านหลัง → push ก่อน
  fillers.forEach((k, i) => {
    if (!mains.length) { // ไม่มีดอกหลัก: ดอกรองล้วน วนเกลียวกลางช่อ
      const rr = 34 * Math.sqrt(i), a = i * GOLDEN - Math.PI / 2;
      push(k, cx + Math.cos(a) * rr, 220 + Math.sin(a) * rr * 0.85, (i % 2 ? 1 : -1) * 10);
      return;
    }
    const t = fillers.length === 1 ? 0.5 : i / (fillers.length - 1);
    const deg = -160 + t * 140; // โค้งด้านบน จากซ้ายไปขวา
    const a = (deg * Math.PI) / 180;
    push(k, cx + Math.cos(a) * outer * 0.92, cy + Math.sin(a) * outer * 0.85, clamp(deg + 90, -35, 35));
  });
  // ดอกหลัก: ดอกที่อยู่ต่ำวาดทีหลัง (อยู่หน้า)
  mainPos.sort((a, b) => a.y - b.y).forEach((p, i) => push(p.k, p.x, p.y, ((i * 7) % 15) - 7));
  return items;
}
