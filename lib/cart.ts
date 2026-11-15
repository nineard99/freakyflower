import { arrange as autoArrange, type Counts } from './arrange';
import { CONFIG, FLOWERS, PAPERS, RIBBONS, summarize, templateDesign, TEMPLATES, wrapLabel, type Design } from './catalog';

/* ตะกร้า: ออเดอร์เดียวสั่งได้หลายช่อ — แต่ละรายการ = แบบสำเร็จ / จัดวางเอง / ให้ร้านจัดให้ + จำนวน
   ฟิล์มใสเป็นตัวเลือกของทั้งออเดอร์ (ใส่ตอนคำนวณ ไม่เก็บในรายการ) */

// โหมดให้ร้านจัดให้: ลูกค้าเลือกแค่ชนิด/สี/จำนวน + กระดาษ ริบบิ้น และโน้ตถึงร้าน
export type ShopPick = { counts: Counts; paper: number; ribbon: number; note: string };

type LineBase = { id: string; qty: number };
export type CartLine =
  | (LineBase & { kind: 'template'; templateId: string })
  | (LineBase & { kind: 'custom'; design: Design })
  | (LineBase & { kind: 'shop'; pick: ShopPick });

export const EMPTY_DESIGN: Design = { paper: 0, ribbon: 0, items: [] };
export const EMPTY_SHOP: ShopPick = { counts: {}, paper: 0, ribbon: 0, note: '' };

export const newLineId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `l${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

const clampQty = (n: unknown) => Math.max(1, Math.min(CONFIG.maxQty, Math.round(Number(n)) || 1));
const validKey = (k: string) => { const [t, c] = k.split('|'); return !!FLOWERS[t]?.colors.some((x) => x.id === c); };

export function sanitizeDesign(d?: Partial<Design> | null): Design {
  if (!d) return EMPTY_DESIGN;
  return {
    paper: PAPERS[d.paper ?? -1] ? d.paper! : 0,
    ribbon: RIBBONS[d.ribbon ?? -1] ? d.ribbon! : 0,
    items: (d.items || []).filter((it) => FLOWERS[it.type]?.colors.some((c) => c.id === it.color)).slice(0, CONFIG.maxItems),
  };
}

export function sanitizeShop(sp?: Partial<ShopPick> | null): ShopPick {
  if (!sp) return EMPTY_SHOP;
  return {
    counts: Object.fromEntries(Object.entries(sp.counts || {}).filter(([k, n]) => validKey(k) && n > 0)),
    paper: PAPERS[sp.paper ?? -1] ? sp.paper! : 0,
    ribbon: RIBBONS[sp.ribbon ?? -1] ? sp.ribbon! : 0,
    note: String(sp.note || '').slice(0, 300),
  };
}

// รายการจาก localStorage: ทิ้งรายการที่พัง/แบบที่ร้านเลิกขายแล้ว
export function sanitizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const l of raw as Partial<CartLine & { templateId: string; design: Design; pick: ShopPick }>[]) {
    if (!l || typeof l !== 'object') continue;
    const base = { id: typeof l.id === 'string' && l.id ? l.id : newLineId(), qty: clampQty(l.qty) };
    if (l.kind === 'template' && TEMPLATES.some((t) => t.id === l.templateId)) {
      if (!out.some((x) => x.kind === 'template' && x.templateId === l.templateId)) out.push({ ...base, kind: 'template', templateId: l.templateId! });
    } else if (l.kind === 'custom') {
      const design = sanitizeDesign(l.design);
      if (design.items.length) out.push({ ...base, kind: 'custom', design });
    } else if (l.kind === 'shop') {
      const pick = sanitizeShop(l.pick);
      if (Object.keys(pick.counts).length) out.push({ ...base, kind: 'shop', pick });
    }
  }
  return out.slice(0, CONFIG.maxLines);
}

export const shopToDesign = (s: ShopPick): Design => ({ paper: s.paper, ribbon: s.ribbon, items: autoArrange(s.counts) });

export function lineDesign(l: CartLine, film: boolean): Design {
  const d = l.kind === 'template'
    ? templateDesign(TEMPLATES.find((t) => t.id === l.templateId)!)
    : l.kind === 'custom' ? l.design : shopToDesign(l.pick);
  return { ...d, film };
}

// ชื่อรายการ: แบบสำเร็จใช้ชื่อแบบ · จัดเอง/ร้านจัด มีเลขลำดับเมื่อมีมากกว่าหนึ่ง
export function lineName(l: CartLine, lines: CartLine[]) {
  if (l.kind === 'template') return TEMPLATES.find((t) => t.id === l.templateId)?.name ?? '';
  const label = l.kind === 'custom' ? 'จัดวางเอง' : 'ให้ร้านจัดให้';
  const same = lines.filter((x) => x.kind === l.kind);
  return same.length > 1 ? `${label} #${same.indexOf(l) + 1}` : label;
}

export const cartCount = (lines: CartLine[]) => lines.reduce((a, l) => a + l.qty, 0);

export type ResolvedLine = { line: CartLine; name: string; design: Design; unit: number; total: number };
export function resolveLines(lines: CartLine[], film: boolean): ResolvedLine[] {
  return lines.map((line) => {
    const design = lineDesign(line, film);
    const unit = summarize(design).total;
    return { line, name: lineName(line, lines), design, unit, total: unit * line.qty };
  });
}

// ข้อความรายการช่อที่ส่งเข้า Sheet
export function cartText(rs: ResolvedLine[]) {
  return rs.map((r, i) => {
    const sum = summarize(r.design);
    return [
      `${i + 1}) ${r.name} × ${r.line.qty} ช่อ · ${wrapLabel(r.design)}`,
      ...sum.lines.map((l) => `   - ${l.label} × ${l.qty} ${l.unit}`),
      ...(r.line.kind === 'shop' && r.line.pick.note.trim() ? [`   โน้ต: ${r.line.pick.note.trim()}`] : []),
    ].join('\n');
  }).join('\n');
}
