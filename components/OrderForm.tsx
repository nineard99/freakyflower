'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cartCount, resolveLines, type ResolvedLine } from '@/lib/cart';
import { baht, CONFIG, GARLAND, GARLAND_SLOTS, LOYKRATHONG, PICKUP, PICKUP_SLOTS } from '@/lib/catalog';
import { garlandTotal, needsPickup, needsQueue, sanitizeGarland, type GarlandPick } from '@/lib/garland';
import { itemsLabel as labelOf, normalizePhone, PHONE } from '@/lib/order';
import { fetchTakenQueue, OrderError, submitOrder } from '@/lib/submitOrder';
import { useCountUp } from '@/lib/useCountUp';
import { BouquetChoices } from './BouquetChoices';
import { useBouquet } from './BouquetProvider';
import { Builder } from './Builder';
import { ShopPicker } from './ShopPicker';
import { useConfirm } from './ui';
import { CustomerFields, type Customer } from './order/CustomerFields';
import { GarlandChoice } from './order/GarlandChoice';
import { OrderRail } from './order/OrderRail';
import { OrderTicket } from './order/OrderTicket';
import { PaymentView } from './order/PaymentView';
import { ShopMap } from './order/ShopMap';
import { FieldError, Step } from './order/Step';

// หน้าแรก: ที่ตั้งร้าน → เลือกสินค้า → ข้อมูลผู้สั่ง + แถบสรุป (เลือกเวลารับ/คิวมัด) → กดยืนยัน
// → หน้าชำระเงิน (QR + แนบสลิป) → ส่งออเดอร์ → หน้าจองสำเร็จ
// ไฟล์นี้ถือ state ของฟอร์มและการตรวจข้อมูล — หน้าตาแต่ละส่วนอยู่ใน components/order/

type Field = 'choice' | 'name' | 'phone' | 'pickup' | 'queue';
type Errors = Partial<Record<Field, string>>;
const FIELD_ORDER: Field[] = ['choice', 'name', 'phone', 'pickup', 'queue'];
// จุดที่พาโฟกัสไปเมื่อช่องนั้นยังไม่ผ่าน
const FIELD_TARGET: Record<Field, string> = {
  choice: '#loy-garland .choice', name: '#loy-name', phone: '#loy-phone', pickup: '#loy-pickup', queue: '#loy-queue',
};
const GARLAND_KEY = 'ff-garland'; // พวงมาลัยในออเดอร์ (เก็บในเครื่อง รีเฟรชแล้วไม่หาย เหมือนตะกร้าช่อ)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const focusField = (sel: string) => {
  const el = document.querySelector<HTMLElement>(sel);
  el?.focus({ preventScroll: true });
  el?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
};

type Placed = { orderNo: string; lines: ResolvedLine[]; garland: GarlandPick | null; total: number; pickup: string; queue: string };

export function OrderForm() {
  const { lines, editing, closeDraft, clearCart, removeLine } = useBouquet();
  const { confirm, dialog } = useConfirm();
  const [filled, setFilled] = useState({ name: false, phone: false });
  const [garland, setGarlandState] = useState<GarlandPick | null>(null);
  const [pickup, setPickup] = useState(''); // เวลารับช่อ / พวงมาลัยทำเอง (HH:MM)
  const [queue, setQueue] = useState(''); // คิวมัดพวงมาลัย (HH:MM)
  const [full, setFull] = useState<string[]>([]); // คิวมัดที่เต็มแล้ว
  const [errors, setErrors] = useState<Errors>({});
  // ยืนยันการจองแล้ว → หน้าชำระเงิน (customer = ข้อมูลที่กรอกไว้)
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [paying, setPaying] = useState(false);
  const [failure, setFailure] = useState(''); // ส่งแล้วไม่สำเร็จ
  const [queueTaken, setQueueTaken] = useState(false);
  const [sending, setSending] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null); // ตะกร้าล้างหลังส่ง — เก็บไว้แสดงหน้าจองสำเร็จ

  const resolved = useMemo(() => resolveLines(lines), [lines]);
  const total = useMemo(() => resolved.reduce((a, r) => a + r.total, 0) + garlandTotal(garland), [resolved, garland]);
  const count = cartCount(lines);
  const hasOrder = lines.length > 0 || !!garland;
  const wantPickup = needsPickup(lines.length, garland);
  const wantQueue = needsQueue(garland);
  const label = labelOf(count, garland);
  const shown = useCountUp(total);

  const clearError = useCallback((f: Field) => setErrors((e) => {
    if (!(f in e)) return e;
    const next = { ...e };
    delete next[f];
    return next;
  }), []);
  useEffect(() => { if (hasOrder) clearError('choice'); }, [hasOrder, clearError]);

  // พวงมาลัย: โหลด/เก็บในเครื่อง
  useEffect(() => {
    try {
      const g = sanitizeGarland(JSON.parse(localStorage.getItem(GARLAND_KEY) || 'null'));
      if (g) setGarlandState(g);
    } catch { /* ไม่มี/อ่านไม่ได้ */ }
  }, []);
  const setGarland = useCallback((g: GarlandPick | null) => {
    setGarlandState(g);
    try { if (g) localStorage.setItem(GARLAND_KEY, JSON.stringify(g)); else localStorage.removeItem(GARLAND_KEY); } catch { /* ไม่เป็นไร */ }
  }, []);

  // คิวมัดที่เต็ม: โหลดเมื่อเลือกให้ร้านมัด และทุกครั้งที่เปิดแผงเลือกคิว — คิวที่เลือกไว้เต็มไปแล้ว → ล้างให้เลือกใหม่
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  const refreshQueue = useCallback(async () => {
    const taken = await fetchTakenQueue();
    setFull(taken);
    const q = queueRef.current;
    if (q && taken.includes(q)) {
      setQueue('');
      setErrors((e) => ({ ...e, queue: `คิว ${q} น. เต็มแล้ว เลือกคิวใหม่` }));
    }
  }, []);
  useEffect(() => { if (wantQueue) void refreshQueue(); }, [wantQueue, refreshQueue]);

  function onConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? '').trim();
    const c: Customer = { name: v('name'), phone: normalizePhone(v('phone')), ig: v('ig') };

    const errs: Errors = {};
    if (!hasOrder) errs.choice = 'ยังไม่ได้เลือกสินค้า เลือกพวงมาลัยหรือช่อในขั้นตอนที่ 1 ก่อน';
    if (!c.name) errs.name = 'กรอกชื่อผู้สั่ง';
    if (!PHONE.test(c.phone)) errs.phone = 'เบอร์โทรไม่ถูกต้อง ใช้รูปแบบ 0812345678';
    if (wantPickup && !PICKUP_SLOTS.includes(pickup)) errs.pickup = `เลือกเวลามารับ ระหว่าง ${PICKUP.from}–${PICKUP.to} น.`;
    if (wantQueue && (!GARLAND_SLOTS.includes(queue) || full.includes(queue))) errs.queue = 'เลือกคิวมัดพวงมาลัย';
    setErrors(errs);
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) return focusField(FIELD_TARGET[first]);

    setCustomer(c);
    setFailure('');
    setQueueTaken(false);
    setPaying(true);
    window.scrollTo({ top: 0 });
  }

  async function onPay(slip: File) {
    if (!customer) return;
    setSending(true);
    setFailure('');
    try {
      const p = wantPickup ? pickup : '', q = wantQueue ? queue : '';
      const orderNo = await submitOrder({ ...customer, pickup: p, queue: q, lines, garland, slip });
      setPlaced({ orderNo, lines: resolved, garland, total, pickup: p, queue: q });
      clearCart();
      setGarland(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setFailure(err instanceof Error && err.message ? err.message : 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือส่งรูปสลิปให้ร้านทาง IG');
      if (err instanceof OrderError && err.code === 'queue') {
        setQueueTaken(true);
        setQueue('');
        void refreshQueue();
      }
    } finally {
      setSending(false);
    }
  }

  // กลับไปแก้คำสั่งจอง — คิวเพิ่งเต็ม: พาไปที่ช่องเลือกคิว
  function back() {
    setPaying(false);
    if (queueTaken) {
      setErrors((e) => ({ ...e, queue: 'คิวที่เลือกเพิ่งถูกจองไป เลือกคิวใหม่' }));
      requestAnimationFrame(() => focusField(FIELD_TARGET.queue));
    } else {
      window.scrollTo({ top: 0 });
    }
  }

  // ลบช่อจากแถบสรุป — แบบสำเร็จกดเลือกใหม่ได้ทันที · ช่อที่ออกแบบเองหายแล้วกู้ไม่ได้ จึงถามก่อน
  const removeFromRail = useCallback((r: ResolvedLine) => {
    if (r.line.kind === 'template') return removeLine(r.line.id);
    confirm({
      title: `ลบ “${r.name}” ออกจากออเดอร์`, body: 'ช่อที่ออกแบบไว้จะหายไป และกู้คืนไม่ได้',
      confirmLabel: 'ลบ', danger: true, onConfirm: () => removeLine(r.line.id),
    });
  }, [confirm, removeLine]);

  if (placed) return <OrderTicket {...placed} />;

  if (paying && customer) {
    return (
      <PaymentView
        resolved={resolved} garland={garland} pickup={wantPickup ? pickup : ''} queue={wantQueue ? queue : ''}
        itemsLabel={label} total={total} sending={sending} failure={failure} queueTaken={queueTaken}
        onBack={back} onSubmit={onPay}
      />
    );
  }

  return (
    <>
      <main className="wrap">
        <header className="hero">
          <div className="hero__copy">
            <h1 className="hero__title enter">{CONFIG.shopName}</h1>
            <p className="hero__lead enter" style={{ '--i': 1 } as React.CSSProperties}>{LOYKRATHONG.detail}</p>
          </div>
        </header>

        <form
          className="order" onSubmit={onConfirm} noValidate
          onInput={(e) => {
            const f = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>;
            const next = { name: !!f.name?.value.trim(), phone: PHONE.test(normalizePhone(f.phone?.value ?? '')) };
            // ค่าเดิม → คืน object เดิม React จะไม่เรนเดอร์ทั้งฟอร์มใหม่ทุกตัวอักษร
            setFilled((p) => (p.name === next.name && p.phone === next.phone ? p : next));
            const field = (e.target as HTMLInputElement).name;
            if (field === 'name' || field === 'phone') clearError(field);
          }}
        >
          <div className="order__steps">
            <ShopMap enterIndex={2} />

            <Step n={1} title="เลือกสินค้า" done={hasOrder} enterIndex={3}
              status={hasOrder ? `${label} · ${baht(total)}` : 'พวงมาลัยรัดเกล้า และ/หรือ ช่อดอกไม้'}>
              <div className="choices">
                <p className="choices__label choices__label--section">{GARLAND.name}</p>
                <GarlandChoice value={garland} onChange={setGarland} />
              </div>
              <p className="choices__label choices__label--section">ช่อดอกไม้</p>
              <BouquetChoices confirm={confirm} />
              {errors.choice && <FieldError>{errors.choice}</FieldError>}
            </Step>

            <Step n={2} title="ข้อมูลผู้สั่ง" done={filled.name && filled.phone} enterIndex={4} bodyClass="fields"
              status="ใช้ติดต่อกลับและนัดรับของ">
              <CustomerFields errors={errors} defaults={customer ?? undefined} />
            </Step>
          </div>

          <OrderRail
            resolved={resolved} garland={garland} onGarland={setGarland}
            pickup={pickup} onPickup={(t) => { setPickup(t); clearError('pickup'); }}
            queue={queue} onQueue={(t) => { setQueue(t); clearError('queue'); setQueueTaken(false); }}
            full={full} onQueueOpen={() => void refreshQueue()} errors={errors}
            itemsLabel={label} total={total} shown={shown}
            messages={FIELD_ORDER.map((f) => errors[f]).filter(Boolean) as string[]}
            still={!!editing || !!dialog} onRemove={removeFromRail}
          />
        </form>
      </main>

      {dialog}
      {editing?.kind === 'custom' && <Builder onClose={closeDraft} />}
      {editing?.kind === 'shop' && <ShopPicker onClose={closeDraft} />}
    </>
  );
}
