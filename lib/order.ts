import { cartCount, cartText, resolveLines, sanitizeLines, type CartLine, type ResolvedLine } from './cart';
import { CONFIG, PICKUP_SLOTS } from './catalog';

/* ออเดอร์ที่หน้าเว็บส่งมา /api/order — server ตรวจทุกช่องและคำนวณยอดเงินเองจากรายการช่อ
   (ไม่เชื่อตัวเลขจากหน้าเว็บ) แล้วค่อยส่งต่อให้ Google Apps Script บันทึกลง Sheet */

export type OrderRequest = {
  name: string;
  phone: string;
  ig: string;
  pickup: string;
  lines: CartLine[];
  slip: string; // รูปสลิป (data URL)
};

export type OrderResponse = { ok: true; orderNo: string } | { ok: false; error: string };

// ขนาดสูงสุด (ความยาว data URL) — Vercel รับ request ได้ราว 4.5 MB ต่อครั้ง
export const MAX_BODY = 4_000_000;
const MAX_SLIP = 2_000_000;

const IMAGE = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const PHONE = /^0\d{8,9}$/;
export const normalizePhone = (s: string) => s.replace(/[\s-]/g, '');

export type ValidOrder = {
  name: string; phone: string; ig: string; pickup: string;
  count: number; total: number; bouquet: string; slip: string;
};

// คืนข้อความ error (ภาษาไทย แสดงให้ลูกค้าได้) หรือออเดอร์ที่ผ่านการตรวจแล้ว
export function validateOrder(body: unknown): { error: string } | { order: ValidOrder; resolved: ResolvedLine[] } {
  if (!body || typeof body !== 'object') return { error: 'ข้อมูลออเดอร์ไม่ถูกต้อง' };
  const b = body as Partial<Record<keyof OrderRequest, unknown>>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  const name = str(b.name).slice(0, 100);
  const phone = normalizePhone(str(b.phone));
  const ig = str(b.ig).replace(/^@+/, '').slice(0, 60);
  const pickup = str(b.pickup);
  if (!name) return { error: 'กรอกชื่อผู้สั่ง' };
  if (!PHONE.test(phone)) return { error: 'เบอร์โทรไม่ถูกต้อง' };
  if (!PICKUP_SLOTS.includes(pickup)) return { error: 'เวลารับช่อไม่ถูกต้อง' };

  // รายการช่อ: ถ้ามีรายการไหนพัง/ไม่มีในร้าน ให้ปฏิเสธทั้งออเดอร์ (ไม่ตัดทิ้งเงียบๆ ยอดจะไม่ตรงกับที่ลูกค้าเห็น)
  const raw = Array.isArray(b.lines) ? b.lines : [];
  const lines = sanitizeLines(raw);
  if (!lines.length) return { error: 'ยังไม่ได้เลือกช่อ' };
  if (lines.length !== raw.length || raw.length > CONFIG.maxLines) return { error: 'รายการช่อไม่ถูกต้อง รีเฟรชหน้าแล้วลองใหม่' };

  const slip = str(b.slip);
  if (!IMAGE.test(slip)) return { error: 'แนบรูปสลิปการโอน' };
  if (slip.length > MAX_SLIP) return { error: 'รูปสลิปใหญ่เกินไป' };

  const resolved = resolveLines(lines);
  return {
    order: {
      name, phone, ig, pickup,
      count: cartCount(lines),
      total: resolved.reduce((a, r) => a + r.total, 0),
      bouquet: cartText(resolved),
      slip,
    },
    resolved,
  };
}
