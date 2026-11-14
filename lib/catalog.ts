/* ============================================================
   Only Flower — ข้อมูลร้าน / ดอกไม้ / แบบสำเร็จ
   แก้ราคา สี ชื่อ หรือเพิ่มดอกไม้ได้ที่ไฟล์นี้ไฟล์เดียว
   รูปดอกไม้อยู่ที่ public/flowers/<ชนิด>-<สี>.webp (พื้นหลังโปร่งใส)
   ============================================================ */

export const CONFIG = {
  shopName: 'Only Flower',
  maxItems: 45, // จำนวนชิ้นสูงสุดต่อช่อ
  lineId: '@onlyflower', // TODO: ใส่ LINE OA จริง
  phone: '08x-xxx-xxxx', // TODO: ใส่เบอร์จริง
};

/* ---------- Pre-order วันลอยกระทง (หน้าแรก) ---------- */
// รับช่อได้วันเดียว เฉพาะเวลาทำการ — ลูกค้าเลือกเวลารับเป็นช่วงละ step นาที
// แก้เวลาแล้วต้องแก้ PICKUP_FROM / PICKUP_TO ใน scripts/loykrathong-apps-script.gs ให้ตรงกันด้วย
export const PICKUP = { date: '24 พ.ย.', from: '14:00', to: '21:30', step: 30 };
const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
export const PICKUP_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let t = toMin(PICKUP.from); t <= toMin(PICKUP.to); t += PICKUP.step) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return out;
})();

export const LOYKRATHONG = {
  title: 'Pre-order วันลอยกระทง',
  detail: `เลือกช่อ กรอกข้อมูล โอนตาม QR แล้วแนบสลิป · รับช่อที่หน้าร้านวันที่ ${PICKUP.date} เวลา ${PICKUP.from}–${PICKUP.to} น.`,
  qrImage: '/loykrathong-qr.png', // วางรูป QR ชำระเงินที่ public/loykrathong-qr.png
  accountName: '', // TODO: ชื่อบัญชีที่แสดงใต้ QR (ไม่ใส่ก็ได้)
  endpoint: '', // TODO: URL Web app ของ Google Apps Script (ดู scripts/loykrathong-apps-script.gs)
};

export type FlowerColor = { id: string; name: string; hex: string };
export type Role = 'main' | 'filler';
export const ROLES: { id: Role; name: string; hint: string }[] = [
  { id: 'main', name: 'ดอกหลัก', hint: 'ดอกเด่นของช่อ' },
  { id: 'filler', name: 'ดอกรอง', hint: 'ดอกเล็กแซมให้ช่อฟู' },
];
// ลักษณะก้าน/ใบที่วาดต่อจากหัวดอก
export type StemKind = 'rose' | 'sunflower' | 'carnation' | 'gerbera' | 'spray';
export type Flower = {
  name: string;
  en: string;
  price: number;
  unit: string;
  role: Role;
  size: number; // ขนาดจริงในช่อ (ล็อก ลูกค้าปรับไม่ได้) — 1 = กว้างราว 100px บนพื้นที่ 400×520
  stem: StemKind;
  colors: FlowerColor[];
};

const c = (id: string, name: string, hex: string): FlowerColor => ({ id, name, hex });

/* ราคาเป็นตัวอย่าง แก้ได้ · ขนาดเทียบกับกุหลาบ (หัวกว้างราว 6–7 ซม.) */
export const FLOWERS: Record<string, Flower> = {
  rose: {
    name: 'กุหลาบ', en: 'Rose', price: 60, unit: 'ดอก', role: 'main', size: 0.9, stem: 'rose',
    colors: [c('red', 'แดง', '#c8274a'), c('pink', 'ชมพู', '#e9559a'), c('peach', 'ชมพูพีช', '#f4b9a8'), c('white', 'ขาว', '#f6f1e6'), c('yellow', 'เหลือง', '#f1d65a')],
  },
  sunflower: { name: 'ทานตะวัน', en: 'Sunflower', price: 80, unit: 'ดอก', role: 'main', size: 1.15, stem: 'sunflower', colors: [c('yellow', 'เหลือง', '#f6c514'), c('orange', 'เหลืองส้ม', '#f0a417')] },
  gerbera: {
    name: 'เยอบีร่า', en: 'Gerbera', price: 45, unit: 'ดอก', role: 'main', size: 0.98, stem: 'gerbera',
    colors: [c('orange', 'ส้ม', '#f7901e'), c('pink', 'ชมพูแซลมอน', '#f27b7b'), c('lightpink', 'ชมพูอ่อน', '#f3c6d3'), c('yellow', 'เหลือง', '#f5c016'), c('red', 'แดง', '#e8411c')],
  },
  carnation: {
    name: 'คาร์เนชัน', en: 'Carnation', price: 45, unit: 'ดอก', role: 'main', size: 0.72, stem: 'carnation',
    colors: [c('pink', 'ชมพู', '#f28fb0'), c('red', 'แดง', '#b81d2c'), c('white', 'ขาวขอบชมพู', '#f7e9ee')],
  },

  gypsophila: { name: 'ยิปโซ', en: "Baby's breath", price: 40, unit: 'กำ', role: 'filler', size: 0.95, stem: 'spray', colors: [c('white', 'ขาว', '#ffffff')] },
  statice: { name: 'สแตติส', en: 'Statice', price: 35, unit: 'กำ', role: 'filler', size: 0.75, stem: 'spray', colors: [c('purple', 'ม่วง', '#7a62c9'), c('white', 'ขาว', '#eeeaf0')] },
  daisy: { name: 'เดซี่', en: 'Daisy', price: 35, unit: 'ดอก', role: 'filler', size: 0.6, stem: 'gerbera', colors: [c('white', 'ขาว', '#ffffff')] },
};

export const sizeOf = (type: string) => FLOWERS[type]?.size ?? 0.9;

export const flowerImg = (type: string, color: string) => `/flowers/${type}-${color}.webp`;

/* ---------- กระดาษห่อ / ริบบิ้น ---------- */
export const WRAP_PRICE = 50; // ค่าห่อ + ริบบิ้น (ราคาตัวอย่าง)
export const FILM_PRICE: number = 0; // ค่าฟิล์มใสห่อทับกระดาษ (0 = ไม่คิดเพิ่ม) — TODO: ใส่ราคาจริงถ้าคิดเพิ่ม

export type Paper = { name: string; kind: 'news' | 'matte'; color: string };
export const PAPERS: Paper[] = [
  { name: 'หนังสือพิมพ์', kind: 'news', color: '#e4cfa6' },
  { name: 'ชมพูพีช', kind: 'matte', color: '#f7dccf' },
  { name: 'ชมพูอ่อน', kind: 'matte', color: '#f5cdd8' },
  { name: 'ขาว', kind: 'matte', color: '#f8f6f2' },
  { name: 'ลาเวนเดอร์', kind: 'matte', color: '#ddcfee' },
  { name: 'ดำ', kind: 'matte', color: '#2f2b30' },
];
export const RIBBONS: [string, string][] = [
  ['ขาว', '#ffffff'], ['ครีม', '#efe3cc'], ['ชมพู', '#e9a3bb'],
  ['แดง', '#c1121f'], ['ทอง', '#c9a15b'], ['ดำ', '#222222'],
];

/* ---------- แบบช่อ ---------- */
export type Item = { id: number; type: string; color: string; x: number; y: number; r: number }; // ขนาดล็อกตามชนิด (sizeOf)
export type Design = { paper: number; ribbon: number; items: Item[]; film?: boolean }; // film = ห่อฟิล์มใสทับกระดาษ
// ชื่อการห่อที่ใช้ในสรุปรายการและข้อความออเดอร์
export const wrapLabel = (d: Design) =>
  `กระดาษ${(PAPERS[d.paper] ?? PAPERS[0]).name}${d.film ? ' + ฟิล์มใส' : ''} · ริบบิ้น${(RIBBONS[d.ribbon] ?? RIBBONS[0])[0]}`;

/* แบบสำเร็จ — ตามช่อที่ร้านจัดขายจริง (ใช้เป็น preset เริ่มต้นในหน้าจัดวางเองด้วย)
   items: [ชนิด, สี, x, y, องศา] — พื้นที่วาง 400×520, ก้านรวบที่จุด (200, 372)
   ใส่ดอกแซมก่อน (อยู่ด้านหลัง) แล้วค่อยดอกหลัก */
type Tuple = [string, string, number, number, number];
export type Template = { id: string; name: string; desc: string; paper: number; ribbon: number; items: Tuple[] };

export const TEMPLATES: Template[] = [
  {
    id: 'one-rose', name: 'กุหลาบดอกเดียว', desc: 'กุหลาบแดง 1 ดอก แซมยิปโซ ห่อหนังสือพิมพ์',
    paper: 0, ribbon: 0,
    items: [
      ['gypsophila', 'white', 176, 196, -14], ['gypsophila', 'white', 230, 210, 16],
      ['rose', 'red', 200, 252, 0],
    ],
  },
  {
    id: 'three-roses', name: 'กุหลาบ 3 ดอก', desc: 'กุหลาบแดง 3 ดอก แซมยิปโซ ห่อหนังสือพิมพ์',
    paper: 0, ribbon: 0,
    items: [
      ['gypsophila', 'white', 156, 170, -16], ['gypsophila', 'white', 246, 164, 14], ['gypsophila', 'white', 204, 136, 0],
      ['rose', 'red', 202, 204, 0], ['rose', 'red', 160, 250, -10], ['rose', 'red', 242, 258, 8],
    ],
  },
  {
    id: 'mix', name: 'มิกซ์สดใส', desc: 'ทานตะวัน กุหลาบ เยอบีร่า แซมยิปโซ ห่อหนังสือพิมพ์',
    paper: 0, ribbon: 0,
    items: [
      ['gypsophila', 'white', 108, 210, -28], ['gypsophila', 'white', 270, 148, 16], ['gypsophila', 'white', 222, 116, 4],
      ['carnation', 'white', 180, 122, 0],
      ['sunflower', 'yellow', 156, 176, -8], ['rose', 'red', 266, 222, 6], ['gerbera', 'lightpink', 200, 262, 0],
    ],
  },
  {
    id: 'orange-gerbera', name: 'เยอบีร่าส้ม', desc: 'เยอบีร่าส้ม 2 ดอก แซมสแตติสม่วงและยิปโซ ห่อกระดาษชมพูพีช',
    paper: 1, ribbon: 0,
    items: [
      ['statice', 'purple', 222, 140, 0], ['gypsophila', 'white', 256, 150, 12],
      ['daisy', 'white', 148, 238, 0],
      ['gerbera', 'orange', 182, 190, -6], ['gerbera', 'orange', 218, 244, 4],
    ],
  },
];

export const templateDesign = (t: Template, startId = 1): Design => ({
  paper: t.paper, ribbon: t.ribbon,
  items: t.items.map(([type, color, x, y, r], i) => ({ id: startId + i, type, color, x, y, r })),
});

/* ---------- pricing ---------- */
export const baht = (n: number) => '฿' + n.toLocaleString('th-TH');

export function summarize(d: Design) {
  const groups = new Map<string, number>();
  d.items.forEach((it) => groups.set(`${it.type}|${it.color}`, (groups.get(`${it.type}|${it.color}`) || 0) + 1));
  const lines = [...groups].map(([k, qty]) => {
    const [type, color] = k.split('|');
    const f = FLOWERS[type];
    const col = f.colors.find((x) => x.id === color);
    return { key: k, label: `${f.name} (${col?.name ?? color})`, qty, unit: f.unit, total: qty * f.price };
  });
  const flowers = lines.reduce((a, l) => a + l.total, 0);
  const wrap = d.items.length ? WRAP_PRICE + (d.film ? FILM_PRICE : 0) : 0;
  return { lines, wrap, total: flowers + wrap };
}
