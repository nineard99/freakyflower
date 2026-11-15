'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EMPTY_DESIGN, EMPTY_SHOP, newLineId, sanitizeDesign, sanitizeLines, sanitizeShop, shopToDesign,
  type CartLine, type ShopPick,
} from '@/lib/cart';
import { CONFIG, FLOWERS, type Design, type Item } from '@/lib/catalog';

export type { ShopPick } from '@/lib/cart';

const LS_KEY = 'onlyflower.order.v6';
const LS_KEY_V5 = 'onlyflower.design.v5'; // รุ่นเก่า: ช่อเดียว (design / shop) → กลายเป็นร่างที่ค้างไว้
const LS_KEY_V4 = 'onlyflower.design.v4'; // รุ่นเก่ากว่า: มีกระดาษ "หนังสือพิมพ์ + ห่อใส" เป็น index 1

// หน้าเครื่องมือที่เปิดอยู่: lineId = null คือกำลังสร้างช่อใหม่ (ร่างค้างไว้ได้), มีค่า = แก้รายการเดิมในออเดอร์
export type Editing = { kind: 'custom' | 'shop'; lineId: string | null } | null;

type Ctx = {
  /* ออเดอร์ */
  lines: CartLine[];
  linesFull: boolean; // ครบจำนวนรายการสูงสุดแล้ว
  setQty: (id: string, qty: number) => void; // qty ≤ 0 = ลบรายการ
  removeLine: (id: string) => void;
  toggleTemplate: (templateId: string) => void;
  clearCart: () => void;
  film: boolean; // ห่อฟิล์มใสทับกระดาษ — ตัวเลือกของทั้งออเดอร์ ใช้กับทุกช่อ
  setFilm: (on: boolean) => void;
  withFilm: (d: Design) => Design;

  /* หน้าเครื่องมือ (จัดวางเอง / ให้ร้านจัดให้) ทำงานกับ "ร่าง" */
  editing: Editing;
  openDraft: (kind: 'custom' | 'shop', lineId?: string | null, seed?: Design) => void;
  commitDraft: () => void; // บันทึกร่างลงออเดอร์ แล้วปิดหน้าเครื่องมือ
  closeDraft: () => void; // ปิดโดยไม่กดบันทึก: ช่อใหม่ = เก็บร่างไว้ทำต่อ, ช่อเดิม = บันทึกการแก้ให้เลย (ไม่ทิ้งงานที่ทำ)
  pending: { design: Design; shopDesign: Design }; // ร่างช่อใหม่ที่ค้างไว้ (แสดงในแถวเลือก)

  design: Design; // ร่างจัดวางเอง (ที่เปิดอยู่)
  shop: ShopPick; // ร่างให้ร้านจัด (ที่เปิดอยู่)
  shopDesign: Design; // ภาพตัวอย่างที่จัดอัตโนมัติจาก shop.counts
  setShop: (fn: (s: ShopPick) => ShopPick) => void;
  selected: number | null;
  setSelected: (id: number | null) => void;
  setPaper: (i: number) => void;
  setRibbon: (i: number) => void;
  addFlower: (type: string, color: string, x?: number, y?: number) => void;
  updateItem: (id: number, patch: Partial<Item>) => void;
  arrange: (id: number, act: 'front' | 'back' | 'dup' | 'del') => void;
  replace: (d: Design) => void;
  clear: () => void;
};

const BouquetCtx = createContext<Ctx | null>(null);

export function useBouquet() {
  const ctx = useContext(BouquetCtx);
  if (!ctx) throw new Error('useBouquet must be used inside <BouquetProvider>');
  return ctx;
}

const nextId = (items: Item[]) => items.reduce((m, it) => Math.max(m, it.id), 0) + 1;
type SetDesign = React.Dispatch<React.SetStateAction<Design>>;

export function BouquetProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [film, setFilm] = useState(false);
  // ร่างช่อใหม่ (จำไว้ในเครื่อง) กับร่างที่กำลังแก้รายการเดิม (ชั่วคราว)
  const [newDesign, setNewDesign] = useState<Design>(EMPTY_DESIGN);
  const [newShop, setNewShop] = useState<ShopPick>(EMPTY_SHOP);
  const [editDesign, setEditDesign] = useState<Design>(EMPTY_DESIGN);
  const [editShop, setEditShop] = useState<ShopPick>(EMPTY_SHOP);
  const [editing, setEditing] = useState<Editing>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // จำออเดอร์และร่างไว้ในเครื่องลูกค้า (รีเฟรชแล้วไม่หาย)
  useEffect(() => {
    try {
      type V6 = { lines?: unknown; draft?: { design?: Design; shop?: ShopPick }; film?: boolean };
      type Old = { design?: Design; shop?: ShopPick; film?: boolean };
      const v6 = JSON.parse(localStorage.getItem(LS_KEY) || 'null') as V6 | null;
      if (v6) {
        setLines(sanitizeLines(v6.lines));
        setNewDesign(sanitizeDesign(v6.draft?.design));
        setNewShop(sanitizeShop(v6.draft?.shop));
        setFilm(!!v6.film);
      } else {
        let old = JSON.parse(localStorage.getItem(LS_KEY_V5) || 'null') as Old | null;
        if (!old) {
          // กระดาษ index 1 (หนังสือพิมพ์ + ห่อใส) → หนังสือพิมพ์ + ฟิล์มใส, index ถัดไปเลื่อนขึ้น 1
          const v4 = JSON.parse(localStorage.getItem(LS_KEY_V4) || 'null') as Old | null;
          if (v4) {
            const fix = <T extends { paper: number }>(x?: T) => (x ? { ...x, paper: x.paper >= 1 ? x.paper - 1 : x.paper } : x);
            old = { design: fix(v4.design), shop: fix(v4.shop), film: v4.design?.paper === 1 || v4.shop?.paper === 1 };
          }
        }
        if (old) {
          setNewDesign(sanitizeDesign(old.design));
          setNewShop(sanitizeShop(old.shop));
          setFilm(!!old.film);
        }
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ lines, draft: { design: newDesign, shop: newShop }, film })); } catch { /* ignore */ }
  }, [lines, newDesign, newShop, film, loaded]);

  const withFilm = useCallback((d: Design): Design => ({ ...d, film }), [film]);

  // ร่างที่หน้าเครื่องมือใช้อยู่ตอนนี้
  const isEdit = !!editing?.lineId;
  const rawDesign = isEdit ? editDesign : newDesign;
  const setDesign: SetDesign = isEdit ? setEditDesign : setNewDesign;
  const shop = isEdit ? editShop : newShop;
  const setShop = useCallback((fn: (s: ShopPick) => ShopPick) => (isEdit ? setEditShop : setNewShop)(fn), [isEdit]);
  const design = useMemo(() => withFilm(rawDesign), [rawDesign, withFilm]);

  const addFlower = useCallback((type: string, color: string, x?: number, y?: number) => {
    if (rawDesign.items.length >= CONFIG.maxItems) {
      alert(`ใส่ได้สูงสุด ${CONFIG.maxItems} ชิ้นต่อช่อ`);
      return;
    }
    const back = FLOWERS[type].role !== 'main';
    const it: Item = {
      id: nextId(rawDesign.items), type, color,
      x: x ?? 200 + Math.round((Math.random() - 0.5) * 120),
      y: y ?? (back ? 170 : 220) + Math.round((Math.random() - 0.5) * 70),
      r: back ? (rawDesign.items.length % 2 ? 20 : -20) : Math.round((Math.random() - 0.5) * 16),
    };
    // ดอกรองไว้ด้านหลัง
    setDesign((d) => ({ ...d, items: back ? [it, ...d.items] : [...d.items, it] }));
    setSelected(it.id);
  }, [rawDesign.items, setDesign]);

  const updateItem = useCallback((id: number, patch: Partial<Item>) => {
    setDesign((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  }, [setDesign]);

  const arrange = useCallback((id: number, act: 'front' | 'back' | 'dup' | 'del') => {
    setDesign((d) => {
      const i = d.items.findIndex((it) => it.id === id);
      if (i < 0) return d;
      const it = d.items[i];
      const rest = d.items.filter((x) => x.id !== id);
      if (act === 'del') { setSelected(null); return { ...d, items: rest }; }
      if (act === 'front') return { ...d, items: [...rest, it] };
      if (act === 'back') return { ...d, items: [it, ...rest] };
      if (d.items.length >= CONFIG.maxItems) return d;
      const copy = { ...it, id: nextId(d.items), x: it.x + 18, y: it.y + 12 };
      const items = [...d.items];
      items.splice(i + 1, 0, copy);
      setSelected(copy.id);
      return { ...d, items };
    });
  }, [setDesign]);

  const shopDesign = useMemo(() => withFilm(shopToDesign(shop)), [shop, withFilm]);
  const pending = useMemo(() => ({ design: withFilm(newDesign), shopDesign: withFilm(shopToDesign(newShop)) }), [newDesign, newShop, withFilm]);

  /* ---------- ออเดอร์ ---------- */
  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, qty: Math.min(CONFIG.maxQty, qty) } : l))));
  }, []);
  const removeLine = useCallback((id: string) => setLines((ls) => ls.filter((l) => l.id !== id)), []);
  const toggleTemplate = useCallback((templateId: string) => {
    setLines((ls) => {
      if (ls.some((l) => l.kind === 'template' && l.templateId === templateId)) return ls.filter((l) => !(l.kind === 'template' && l.templateId === templateId));
      if (ls.length >= CONFIG.maxLines) return ls;
      return [...ls, { id: newLineId(), qty: 1, kind: 'template', templateId }];
    });
  }, []);
  const clearCart = useCallback(() => setLines([]), []);

  const openDraft = useCallback((kind: 'custom' | 'shop', lineId: string | null = null, seed?: Design) => {
    const line = lineId ? lines.find((l) => l.id === lineId) : undefined;
    if (line?.kind === 'custom') setEditDesign(line.design);
    else if (line?.kind === 'shop') setEditShop(line.pick);
    else if (seed) setNewDesign({ paper: seed.paper, ribbon: seed.ribbon, items: seed.items });
    setSelected(null);
    setEditing({ kind, lineId: line ? line.id : null });
  }, [lines]);

  const save = useCallback(() => {
    if (!editing) return;
    const d = editing.kind === 'custom' ? rawDesign : null;
    const empty = d ? !d.items.length : !Object.keys(shop.counts).length;
    if (editing.lineId) {
      const id = editing.lineId;
      setLines((ls) => (empty
        ? ls.filter((l) => l.id !== id)
        : ls.map((l) => (l.id !== id ? l : d ? { ...l, kind: 'custom', design: d } as CartLine : { ...l, kind: 'shop', pick: shop } as CartLine))));
      return;
    }
    if (empty) return;
    setLines((ls) => (ls.length >= CONFIG.maxLines ? ls : [...ls, d ? { id: newLineId(), qty: 1, kind: 'custom', design: d } : { id: newLineId(), qty: 1, kind: 'shop', pick: shop }]));
    if (d) setNewDesign((x) => ({ ...x, items: [] }));
    else setNewShop(EMPTY_SHOP);
  }, [editing, rawDesign, shop]);

  const commitDraft = useCallback(() => { save(); setEditing(null); setSelected(null); }, [save]);
  const closeDraft = useCallback(() => { if (editing?.lineId) save(); setEditing(null); setSelected(null); }, [editing, save]);

  const value = useMemo<Ctx>(() => ({
    lines, linesFull: lines.length >= CONFIG.maxLines, setQty, removeLine, toggleTemplate, clearCart, film, setFilm, withFilm,
    editing, openDraft, commitDraft, closeDraft, pending,
    design, shop, shopDesign, setShop, selected, setSelected,
    setPaper: (paper) => setDesign((d) => ({ ...d, paper })),
    setRibbon: (ribbon) => setDesign((d) => ({ ...d, ribbon })),
    addFlower, updateItem, arrange,
    replace: (d) => { setDesign({ paper: d.paper, ribbon: d.ribbon, items: d.items }); setSelected(null); },
    clear: () => { setDesign((d) => ({ ...d, items: [] })); setSelected(null); },
  }), [lines, setQty, removeLine, toggleTemplate, clearCart, film, withFilm, editing, openDraft, commitDraft, closeDraft, pending,
    design, shop, shopDesign, setShop, selected, setDesign, addFlower, updateItem, arrange]);

  return <BouquetCtx.Provider value={value}>{children}</BouquetCtx.Provider>;
}
