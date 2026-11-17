import { baht, CONFIG, GARLAND, type GarlandMode } from './catalog';

/* พวงมาลัยรัดเกล้า — สินค้าแยกจากช่อดอกไม้ (ไม่ได้อยู่ในตะกร้าช่อ)
   ให้ร้านมัดให้ → ต้องจองคิวมัด (GARLAND_SLOTS) · ซื้อไปทำเอง → รับพร้อมช่อ (PICKUP_SLOTS) */

export type GarlandPick = { qty: number; mode: GarlandMode };

export const garlandUnit = (g: GarlandPick) => GARLAND.modes[g.mode].price;
export const garlandTotal = (g: GarlandPick | null) => (g ? garlandUnit(g) * g.qty : 0);

// ต้องเลือกเวลารับ (ทุก 30 นาที) เมื่อมีช่อดอกไม้ หรือพวงมาลัยแบบซื้อไปทำเอง
export const needsPickup = (lineCount: number, g: GarlandPick | null) => lineCount > 0 || g?.mode === 'diy';
// ต้องจองคิวมัด (ทุก 10 นาที) เมื่อให้ร้านมัดให้
export const needsQueue = (g: GarlandPick | null) => g?.mode === 'shop';

// null = ไม่ได้สั่ง · undefined = ข้อมูลพัง (ให้ server ปฏิเสธทั้งออเดอร์)
export function sanitizeGarland(raw: unknown): GarlandPick | null | undefined {
  if (raw == null) return null;
  if (typeof raw !== 'object') return undefined;
  const g = raw as Partial<GarlandPick>;
  const qty = Number(g.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > CONFIG.maxQty) return undefined;
  if (g.mode !== 'shop' && g.mode !== 'diy') return undefined;
  return { qty, mode: g.mode };
}

// ข้อความที่ส่งเข้า Sheet
export const garlandText = (g: GarlandPick, queue: string) =>
  `${GARLAND.name} × ${g.qty} ${GARLAND.unit} · ${GARLAND.modes[g.mode].name} (${baht(garlandUnit(g))}/${GARLAND.unit})` +
  (g.mode === 'shop' && queue ? `\n   คิวมัด ${queue} น.` : '');
