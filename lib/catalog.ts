/* ============================================================
   freakyflower — ข้อมูลร้าน / ดอกไม้ / แบบสำเร็จ
   แก้ราคา สี ชื่อ หรือเพิ่มดอกไม้ได้ที่ไฟล์นี้ไฟล์เดียว
   รูปดอกไม้อยู่ที่ public/flowers/<ชนิด>-<สี>.webp (พื้นหลังโปร่งใส)
   ============================================================ */

export const CONFIG = {
  shopName: 'FreakyFlower',
  maxItems: 45, // จำนวนชิ้นสูงสุดต่อช่อ
  maxLines: 8, // จำนวนรายการ (แบบช่อ) สูงสุดต่อออเดอร์
  maxQty: 10, // จำนวนช่อสูงสุดต่อรายการ
  // ช่องทางติดต่อร้าน (แสดงท้ายหน้า) — ชื่อบัญชีไม่ต้องมี @
  instagram: 'freakyflowers.bkk',
  tiktok: 'freakyflowers.bkk',
};

/* ---------- Pre-order วันลอยกระทง (หน้าแรก) ---------- */
// รับของได้วันเดียว เฉพาะเวลาทำการ — ลูกค้าเลือกเวลารับเป็นช่วงละ step นาที
// แก้เวลาแล้วต้องแก้ PICKUP_FROM / PICKUP_TO / QUEUE_FROM / QUEUE_TO ใน scripts/loykrathong-apps-script.gs ให้ตรงกันด้วย
export const PICKUP = { date: '24 พ.ย.', from: '15:00', to: '21:00', step: 30, place: 'หน้าร้าน' };
const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const timeSlots = (from: string, to: string, step: number) => {
  const out: string[] = [];
  for (let t = toMin(from); t <= toMin(to); t += step) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return out;
};
// เวลารับช่อดอกไม้ (และพวงมาลัยแบบซื้อไปทำเอง) — ทุก 30 นาที
export const PICKUP_SLOTS = timeSlots(PICKUP.from, PICKUP.to, PICKUP.step);

/* ---------- พวงมาลัยรัดเกล้า ---------- */
// ให้ร้านมัดให้ = ต้องจองคิวมัด ทุก 10 นาที (1 คิว = 1 ออเดอร์ — ระบบเช็กคิวที่ถูกจองแล้วจาก Sheet)
// ซื้อไปทำเอง = รับพร้อมช่อดอกไม้ (เวลาเดียวกับช่อ)
export type GarlandMode = 'shop' | 'diy';
export const GARLAND = {
  name: 'พวงมาลัยรัดเกล้า',
  unit: 'พวง',
  image: '/garland.jpg',
  price: 150, // ต่อพวง ราคาเดียวทั้งให้ร้านมัดและซื้อไปทำเอง — TODO: ราคาตัวอย่าง ใส่ราคาจริง
  modes: {
    shop: { name: 'ให้ร้านมัดให้' },
    diy: { name: 'ซื้อไปทำเอง' },
  } satisfies Record<GarlandMode, { name: string }>,
  queue: { from: '15:00', to: '20:50', step: 10 }, // คิวสุดท้าย 20:50 (มัดเสร็จราว 3 ทุ่ม)
};
export const GARLAND_SLOTS = timeSlots(GARLAND.queue.from, GARLAND.queue.to, GARLAND.queue.step);

// ที่ตั้งร้าน (แผนที่ก่อนขั้นตอนเลือกช่อ) — กันลูกค้าที่ไม่ได้อยู่แถว มจธ. บางมด จองผิด
// TODO: ใส่พิกัดจริงของร้าน (Google Maps → คลิกขวาที่หมุด → คัดลอกตัวเลขพิกัด) และรายละเอียดจุดรับ
export const SHOP_LOCATION = {
  area: 'มจธ. บางมด',
  detail: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (บางมด) ถ.ประชาอุทิศ แขวงบางมด เขตทุ่งครุ กรุงเทพฯ',
  lat: 13.6513,
  lng: 100.4942,
};

export const LOYKRATHONG = {
  eyebrow: 'Pre-order', // บรรทัดเล็กเหนือหัวเรื่อง (อักษรละติน — แสดงเป็นตัวพิมพ์ใหญ่)
  title: 'วันลอยกระทง',
  detail: 'เลือกพวงมาลัยรัดเกล้าหรือช่อดอกไม้ กรอกข้อมูล เลือกเวลารับ แล้วกดยืนยันเพื่อโอนตาม QR และแนบสลิป', // วัน เวลา สถานที่รับ แสดงจาก PICKUP
  qrImage: '/loykrathong-qr.jpg', // รูป QR ชำระเงิน (PromptPay) ที่ public/loykrathong-qr.jpg
  accountName: '', // TODO: ชื่อบัญชีที่แสดงใต้ QR (ไม่ใส่ก็ได้)
  // URL ระบบรับออเดอร์ (Apps Script) อยู่ใน env: APPS_SCRIPT_URL — ดู .env.example
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
  /** รูปที่ถ่ายมาแนวนอน (ก้านไม่ได้อยู่ล่างกลาง): base = จุดโคนกิ่งในรูป (0–100) · turn = องศาที่หมุนให้กิ่งชี้ขึ้น
      ภาพ 2D จะหมุนรูปแล้ววางโคนกิ่งไว้ที่ปลายก้านพอดี */
  head?: { base: [number, number]; turn: number };
};

const c = (id: string, name: string, hex: string): FlowerColor => ({ id, name, hex });

/* ราคาขายจริงของร้าน · ขนาดเทียบกับกุหลาบ (หัวกว้างราว 6–7 ซม.) */
export const FLOWERS: Record<string, Flower> = {
  rose: {
    name: 'กุหลาบ', en: 'Rose', price: 29, unit: 'ดอก', role: 'main', size: 0.9, stem: 'rose',
    colors: [c('red', 'แดง', '#c8274a'), c('white', 'ขาว', '#f6f1e6')],
  },
  sunflower: { name: 'ทานตะวัน', en: 'Sunflower', price: 49, unit: 'ดอก', role: 'main', size: 1.15, stem: 'sunflower', colors: [c('yellow', 'เหลือง', '#f6c514')] },
  gerbera: {
    name: 'เยอบีร่า', en: 'Gerbera', price: 30, unit: 'ดอก', role: 'main', size: 0.98, stem: 'gerbera',
    colors: [c('lightpink', 'ชมพู', '#f3c6d3'), c('orange', 'ส้ม', '#f7901e')],
  },
  carnation: {
    name: 'คาร์เนชัน', en: 'Carnation', price: 20, unit: 'ดอก', role: 'main', size: 0.72, stem: 'carnation',
    colors: [c('pink', 'ชมพู', '#f28fb0'), c('white', 'ขาว', '#f7e9ee')],
  },

  gypsophila: { name: 'ยิปโซ', en: "Baby's breath", price: 25, unit: 'กำ', role: 'filler', size: 0.95, stem: 'spray', head: { base: [9, 69], turn: -72 }, colors: [c('white', 'ขาว', '#ffffff')] },
  aster: { name: 'คลัสเตอร์', en: 'Aster', price: 15, unit: 'กำ', role: 'filler', size: 0.8, stem: 'spray', colors: [c('white', 'ขาว', '#ffffff')] },
  caspia: { name: 'แคสเปีย', en: 'Caspia', price: 15, unit: 'กำ', role: 'filler', size: 0.75, stem: 'spray', colors: [c('purple', 'ม่วง', '#7a62c9')] },
};

export const sizeOf = (type: string) => FLOWERS[type]?.size ?? 0.9;

export const flowerImg = (type: string, color: string) => `/flowers/${type}-${color}.webp`;

/* ---------- กระดาษห่อ / ริบบิ้น ---------- */
export const WRAP_PRICE = 0; // ค่าห่อกระดาษ + ริบบิ้น (0 = ฟรี)
export const FILM_PRICE: number = 5; // ค่าฟิล์มใสห่อทับกระดาษ (0 = ไม่คิดเพิ่ม)

// ทรงการห่อ 2 แบบให้ลูกค้าเลือกทีละช่อ (แยกจากฟิล์มใส) — ราคาเท่ากัน · ตัวแรก = ค่าเริ่มต้น
export type WrapStyle = 'fan' | 'cone';
export const WRAP_STYLES: { id: WrapStyle; name: string; desc: string; image: string }[] = [
  { id: 'fan', name: 'ทรงบาน', desc: 'กระดาษบานรอบช่อ', image: '/wrap-fan.jpg' },
  { id: 'cone', name: 'ทรงกรวย', desc: 'กระดาษม้วนเป็นกรวยแคบ', image: '/wrap-cone.jpg' },
];
export const toWrapStyle = (v: unknown): WrapStyle => (v === 'cone' ? 'cone' : 'fan');
export const wrapStyleName = (s?: WrapStyle) => (WRAP_STYLES.find((w) => w.id === s) ?? WRAP_STYLES[0]).name;

// ร้านมีกระดาษหนังสือพิมพ์กับริบบิ้นขาวอย่างละแบบเดียว — มีตัวเลือกเดียว หน้าเว็บจะไม่แสดงตัวเลือก (แสดงเป็นข้อความแทน)
// อยากเพิ่มสี: เพิ่มรายการต่อท้าย (ตัวที่ 0 = ค่าเริ่มต้น) แล้วตัวเลือกจะกลับมาเอง
export type Paper = { name: string; kind: 'news' | 'matte'; color: string };
export const PAPERS: Paper[] = [
  { name: 'หนังสือพิมพ์', kind: 'news', color: '#e4cfa6' },
];
export const RIBBONS: [string, string][] = [
  ['ขาว', '#ffffff'],
];

/* ---------- แบบช่อ ---------- */
export type Item = { id: number; type: string; color: string; x: number; y: number; r: number }; // ขนาดล็อกตามชนิด (sizeOf)
export type Design = { paper: number; ribbon: number; items: Item[]; film?: boolean; style?: WrapStyle }; // film = ห่อฟิล์มใสทับกระดาษ · style = ทรงการห่อ (ไม่ใส่ = ทรงบาน)
// ชื่อการห่อที่ใช้ในสรุปรายการและข้อความออเดอร์
export const wrapLabel = (d: Design) =>
  `${wrapStyleName(d.style)} · กระดาษ${(PAPERS[d.paper] ?? PAPERS[0]).name}${d.film ? ' + ฟิล์มใส' : ''} · ริบบิ้น${(RIBBONS[d.ribbon] ?? RIBBONS[0])[0]}`;

/* แบบสำเร็จ — ตามช่อที่ร้านจัดขายจริง (ใช้เป็น preset เริ่มต้นในหน้าจัดวางเองด้วย)
   items: [ชนิด, สี, x, y, องศา] — พื้นที่วาง 400×520, ก้านรวบที่จุด (200, 372)
   ใส่ดอกแซมก่อน (อยู่ด้านหลัง) แล้วค่อยดอกหลัก */
type Tuple = [string, string, number, number, number];
// photo = รูปช่อที่ร้านทำจริง ใช้บนการ์ดหน้าหลัก (ไม่มี = ใช้ภาพวาดจาก items)
// film/style = การห่อเริ่มต้นตอนลูกค้ากดเลือก (ตามรูปจริง) — ลูกค้าเปลี่ยนเองได้
export type Template = { id: string; name: string; desc: string; paper: number; ribbon: number; items: Tuple[]; photo?: string; film?: boolean; style?: WrapStyle };

export const TEMPLATES: Template[] = [
  {
    id: 'one-rose', name: 'กุหลาบดอกเดียว', desc: 'กุหลาบแดง 1 ดอก แซมยิปโซ ห่อหนังสือพิมพ์',
    paper: 0, ribbon: 0, photo: '/templates/one-rose.jpg', film: true, style: 'cone',
    items: [
      ['gypsophila', 'white', 176, 196, -14], ['gypsophila', 'white', 230, 210, 16],
      ['rose', 'red', 200, 252, 0],
    ],
  },
  {
    id: 'three-roses', name: 'กุหลาบ 3 ดอก', desc: 'กุหลาบแดง 3 ดอก แซมยิปโซ ห่อหนังสือพิมพ์',
    paper: 0, ribbon: 0, photo: '/templates/three-roses.jpg',
    items: [
      ['gypsophila', 'white', 156, 170, -16], ['gypsophila', 'white', 246, 164, 14], ['gypsophila', 'white', 204, 136, 0],
      ['rose', 'red', 202, 204, 0], ['rose', 'red', 160, 250, -10], ['rose', 'red', 242, 258, 8],
    ],
  },
  {
    id: 'orange-gerbera', name: 'เยอบีร่าส้ม', desc: 'เยอบีร่าส้ม 2 ดอก แซมแคสเปียม่วง ยิปโซ และคลัสเตอร์ ห่อหนังสือพิมพ์',
    paper: 0, ribbon: 0, photo: '/templates/orange-gerbera.jpg',
    items: [
      ['caspia', 'purple', 222, 140, 0], ['gypsophila', 'white', 256, 150, 12],
      ['aster', 'white', 148, 238, 0],
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
