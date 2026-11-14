'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { arrange as autoArrange, type Counts } from '@/lib/arrange';
import { CONFIG, FLOWERS, PAPERS, RIBBONS, templateDesign, TEMPLATES, type Design, type Item } from '@/lib/catalog';

const LS_KEY = 'onlyflower.design.v5';
const LS_KEY_V4 = 'onlyflower.design.v4'; // รุ่นเก่า: มีกระดาษ "หนังสือพิมพ์ + ห่อใส" เป็น index 1

export type Choice = string | null; // id แบบสำเร็จ | 'custom' (จัดเอง) | 'shop' (ให้ร้านจัดให้) | null = ยังไม่เลือก

// โหมดให้ร้านจัดให้: ลูกค้าเลือกแค่ชนิด/สี/จำนวน + กระดาษ ริบบิ้น และโน้ตถึงร้าน
export type ShopPick = { counts: Counts; paper: number; ribbon: number; note: string };

type Ctx = {
  design: Design; // ช่อที่ลูกค้าจัดเอง (custom)
  film: boolean; // ห่อฟิล์มใสทับกระดาษ — ตัวเลือกของออเดอร์ ใช้กับทุกแบบ (สำเร็จ / จัดเอง / ร้านจัด)
  setFilm: (on: boolean) => void;
  withFilm: (d: Design) => Design; // ใส่ค่าฟิล์มปัจจุบันลงในช่อ (ใช้กับภาพแบบสำเร็จ)
  choice: Choice;
  choose: (c: Choice) => void;
  orderDesign: Design | null; // ช่อที่จะสั่งจริง ตาม choice
  shop: ShopPick;
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

const EMPTY: Design = { paper: 0, ribbon: 0, items: [] };
const EMPTY_SHOP: ShopPick = { counts: {}, paper: 0, ribbon: 0, note: '' };
const validKey = (k: string) => { const [t, c] = k.split('|'); return !!FLOWERS[t]?.colors.some((x) => x.id === c); };
const nextId = (items: Item[]) => items.reduce((m, it) => Math.max(m, it.id), 0) + 1;

export function BouquetProvider({ children }: { children: React.ReactNode }) {
  const [raw, setDesign] = useState<Design>(EMPTY);
  const [film, setFilm] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [choice, choose] = useState<Choice>(null);
  const [shop, setShopState] = useState<ShopPick>(EMPTY_SHOP);
  const [loaded, setLoaded] = useState(false);

  // จำช่อที่จัดไว้ในเครื่องลูกค้า (รีเฟรชแล้วไม่หาย)
  useEffect(() => {
    try {
      type Saved = { design?: Design; shop?: ShopPick; film?: boolean };
      let saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null') as Saved | null;
      if (!saved) {
        // ย้ายข้อมูลรุ่นเก่า: กระดาษ index 1 (หนังสือพิมพ์ + ห่อใส) → หนังสือพิมพ์ + ฟิล์มใส, index ถัดไปเลื่อนขึ้น 1
        const old = JSON.parse(localStorage.getItem(LS_KEY_V4) || 'null') as Saved | null;
        if (old) {
          const fix = <T extends { paper: number }>(x?: T) => (x ? { ...x, paper: x.paper >= 1 ? x.paper - 1 : x.paper } : x);
          saved = { design: fix(old.design), shop: fix(old.shop), film: old.design?.paper === 1 || old.shop?.paper === 1 };
        }
      }
      const d = saved?.design, sp = saved?.shop;
      setFilm(!!saved?.film);
      // จำช่อที่จัดเองและรายการให้ร้านจัด — การเลือกแบบเริ่มว่างทุกครั้งที่เปิดหน้า
      if (sp) {
        setShopState({
          counts: Object.fromEntries(Object.entries(sp.counts || {}).filter(([k, n]) => validKey(k) && n > 0)),
          paper: PAPERS[sp.paper] ? sp.paper : 0,
          ribbon: RIBBONS[sp.ribbon] ? sp.ribbon : 0,
          note: String(sp.note || '').slice(0, 300),
        });
      }
      if (d) {
        setDesign({
          paper: PAPERS[d.paper] ? d.paper : 0,
          ribbon: RIBBONS[d.ribbon] ? d.ribbon : 0,
          items: (d.items || []).filter((it) => FLOWERS[it.type]?.colors.some((c) => c.id === it.color)),
        });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ design: raw, shop, film })); } catch { /* ignore */ }
  }, [raw, shop, film, loaded]);

  const withFilm = useCallback((d: Design): Design => ({ ...d, film }), [film]);
  const design = useMemo(() => withFilm(raw), [raw, withFilm]);

  const addFlower = useCallback((type: string, color: string, x?: number, y?: number) => {
    if (raw.items.length >= CONFIG.maxItems) {
      alert(`ใส่ได้สูงสุด ${CONFIG.maxItems} ชิ้นต่อช่อ`);
      return;
    }
    const back = FLOWERS[type].role !== 'main';
    const it: Item = {
      id: nextId(raw.items), type, color,
      x: x ?? 200 + Math.round((Math.random() - 0.5) * 120),
      y: y ?? (back ? 170 : 220) + Math.round((Math.random() - 0.5) * 70),
      r: back ? (raw.items.length % 2 ? 20 : -20) : Math.round((Math.random() - 0.5) * 16),
    };
    // ดอกรองไว้ด้านหลัง
    setDesign((d) => ({ ...d, items: back ? [it, ...d.items] : [...d.items, it] }));
    setSelected(it.id);
  }, [raw.items]);

  const updateItem = useCallback((id: number, patch: Partial<Item>) => {
    setDesign((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  }, []);

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
  }, []);

  const shopItems = useMemo(() => autoArrange(shop.counts), [shop.counts]);
  const shopDesign = useMemo<Design>(() => ({ paper: shop.paper, ribbon: shop.ribbon, items: shopItems, film }), [shop.paper, shop.ribbon, shopItems, film]);

  const orderDesign = useMemo(() => {
    if (choice === 'custom') return design.items.length ? design : null;
    if (choice === 'shop') return shopDesign.items.length ? shopDesign : null;
    const t = TEMPLATES.find((x) => x.id === choice);
    return t ? withFilm(templateDesign(t)) : null;
  }, [choice, design, shopDesign, withFilm]);

  const value = useMemo<Ctx>(() => ({
    design, film, setFilm, withFilm, choice, choose, orderDesign, shop, shopDesign, setShop: setShopState, selected, setSelected,
    setPaper: (paper) => setDesign((d) => ({ ...d, paper })),
    setRibbon: (ribbon) => setDesign((d) => ({ ...d, ribbon })),
    addFlower, updateItem, arrange,
    replace: (d) => { setDesign({ paper: d.paper, ribbon: d.ribbon, items: d.items }); setSelected(null); },
    clear: () => { setDesign((d) => ({ ...d, items: [] })); setSelected(null); },
  }), [design, film, withFilm, choice, orderDesign, shop, shopDesign, selected, addFlower, updateItem, arrange]);

  return <BouquetCtx.Provider value={value}>{children}</BouquetCtx.Provider>;
}
