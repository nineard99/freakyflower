'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cartCount, resolveLines, type ResolvedLine } from '@/lib/cart';
import { baht, CONFIG, LOYKRATHONG, PICKUP, PICKUP_SLOTS, summarize, templateDesign, TEMPLATES } from '@/lib/catalog';
import { normalizePhone, PHONE } from '@/lib/order';
import { submitOrder } from '@/lib/submitOrder';
import { useCountUp } from '@/lib/useCountUp';
import { BouquetChoices } from './BouquetChoices';
import { useBouquet } from './BouquetProvider';
import { Builder } from './Builder';
import { FilmToggle } from './FilmToggle';
import { ShopPicker } from './ShopPicker';
import { useConfirm } from './ui';
import { CustomerFields } from './order/CustomerFields';
import { OrderRail } from './order/OrderRail';
import { OrderTicket } from './order/OrderTicket';
import { PaymentFields } from './order/PaymentFields';
import { FieldError, Step } from './order/Step';

// หน้าแรก: ฟอร์ม pre-order 3 ขั้นตอน (เลือกช่อ → ข้อมูลผู้สั่ง → ชำระเงิน) + แถบสรุป
// ไฟล์นี้ถือ state ของฟอร์มและการตรวจข้อมูล — หน้าตาแต่ละส่วนอยู่ใน components/order/

type Field = 'choice' | 'name' | 'phone' | 'pickup' | 'slip';
type Errors = Partial<Record<Field, string>>;
const FIELD_ORDER: Field[] = ['choice', 'name', 'phone', 'pickup', 'slip'];
// จุดที่พาโฟกัสไปเมื่อช่องนั้นยังไม่ผ่าน
const FIELD_TARGET: Record<Field, string> = {
  choice: '#loy-choices .choice', name: '#loy-name', phone: '#loy-phone', pickup: '#loy-pickup', slip: '#loy-slip',
};
const STEPS = 3;
// ราคาเริ่มต้น = แบบสำเร็จที่ถูกที่สุด
const FROM_PRICE = Math.min(...TEMPLATES.map((t) => summarize(templateDesign(t)).total));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function OrderForm() {
  const { lines, film, editing, closeDraft, clearCart } = useBouquet();
  const { confirm, dialog } = useConfirm();
  const [filled, setFilled] = useState({ name: false, phone: false });
  const [pickup, setPickup] = useState(''); // เวลารับช่อ (HH:MM)
  const [slip, setSlip] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState(''); // ส่งแล้วไม่สำเร็จ (ไม่ใช่ข้อมูลไม่ครบ)
  const [sending, setSending] = useState(false);
  // ออเดอร์ที่ส่งแล้ว — เก็บไว้แสดงหน้าจองสำเร็จ (ตะกร้าล้างหลังส่ง)
  const [placed, setPlaced] = useState<{ orderNo: string; lines: ResolvedLine[]; total: number } | null>(null);

  const resolved = useMemo(() => resolveLines(lines, film), [lines, film]);
  const total = useMemo(() => resolved.reduce((a, r) => a + r.total, 0), [resolved]);
  const count = cartCount(lines);
  const hasOrder = lines.length > 0;
  const shown = useCountUp(total);

  const done = [hasOrder, filled.name && filled.phone && !!pickup, hasOrder && !!slip];
  const doneCount = done.filter(Boolean).length;

  const clearError = useCallback((f: Field) => setErrors((e) => {
    if (!(f in e)) return e;
    const next = { ...e };
    delete next[f];
    return next;
  }), []);
  useEffect(() => { if (hasOrder) clearError('choice'); }, [hasOrder, clearError]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const v = (k: string) => String(fd.get(k) ?? '').trim();
    const name = v('name'), phone = normalizePhone(v('phone'));
    setFailure('');

    const errs: Errors = {};
    if (!hasOrder) errs.choice = 'ยังไม่ได้เลือกช่อ เลือกแบบในขั้นตอนที่ 1 ก่อน';
    if (!name) errs.name = 'กรอกชื่อผู้สั่ง';
    if (!PHONE.test(phone)) errs.phone = 'เบอร์โทรไม่ถูกต้อง ใช้รูปแบบ 0812345678';
    if (!PICKUP_SLOTS.includes(pickup)) errs.pickup = `เลือกเวลามารับช่อ ระหว่าง ${PICKUP.from}–${PICKUP.to} น.`;
    if (!slip) errs.slip = 'แนบรูปสลิปการโอน';
    setErrors(errs);
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first || !slip) {
      // พาไปที่ช่องแรกที่ยังไม่ผ่าน
      const el = first && form.querySelector<HTMLElement>(FIELD_TARGET[first]);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      return;
    }

    setSending(true);
    try {
      const orderNo = await submitOrder({ name, phone, ig: v('ig'), pickup, film, lines, resolved, slip });
      setPlaced({ orderNo, lines: resolved, total });
      clearCart();
      window.scrollTo({ top: 0 });
    } catch (err) {
      setFailure(err instanceof Error && err.message ? err.message : 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือส่งรูปสลิปให้ร้านทาง LINE');
    } finally {
      setSending(false);
    }
  }

  const topbar = (
    <header className="topbar">
      <div className="wrap topbar__inner">
        <p className="topbar__name">{CONFIG.shopName}</p>
        {!placed && (
          <div
            className="meter" role="progressbar" aria-label="ความคืบหน้าการจอง"
            aria-valuemin={0} aria-valuemax={STEPS} aria-valuenow={doneCount} aria-valuetext={`เสร็จแล้ว ${doneCount} จาก ${STEPS} ขั้นตอน`}
          >
            <span className="meter__text">เสร็จแล้ว <b className="num">{doneCount}/{STEPS}</b></span>
            <span className="meter__track"><span className="meter__fill" style={{ width: `${(doneCount / STEPS) * 100}%` }} /></span>
          </div>
        )}
      </div>
    </header>
  );

  if (placed) {
    return <>{topbar}<OrderTicket orderNo={placed.orderNo} lines={placed.lines} total={placed.total} pickup={pickup} /></>;
  }

  return (
    <>
      {topbar}
      <main className="wrap">
        <header className="hero">
          <div className="hero__copy">
            <h1 className="hero__title enter">
              <span className="overline hero__eyebrow">{LOYKRATHONG.eyebrow}</span>
              {LOYKRATHONG.title}
            </h1>
            <p className="hero__lead enter" style={{ '--i': 1 } as React.CSSProperties}>{LOYKRATHONG.detail}</p>
          </div>
          <dl className="facts enter" style={{ '--i': 2 } as React.CSSProperties}>
            <div><dt>วันรับช่อ</dt><dd className="num">{PICKUP.date}</dd></div>
            <div><dt>ช่วงเวลา</dt><dd className="num">{PICKUP.from}–{PICKUP.to} น.</dd></div>
            <div><dt>สถานที่</dt><dd>{PICKUP.place}</dd></div>
            <div><dt>ราคาเริ่มต้น</dt><dd className="num">{baht(FROM_PRICE)}</dd></div>
          </dl>
        </header>

        <form
          className="order" onSubmit={onSubmit} noValidate
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
            <Step n={1} title="เลือกช่อ" done={done[0]} enterIndex={3}
              status={hasOrder ? `${count} ช่อ · ${baht(total)}` : 'เลือกแบบสำเร็จ หรือออกแบบเอง'}>
              <BouquetChoices confirm={confirm} />
              {errors.choice && <FieldError>{errors.choice}</FieldError>}
              <FilmToggle />
            </Step>

            <Step n={2} title="ข้อมูลผู้สั่ง" done={done[1]} enterIndex={4} bodyClass="fields"
              status={pickup ? `รับช่อ ${PICKUP.date} · ${pickup} น.` : 'ใช้ติดต่อกลับและนัดรับช่อ'}>
              <CustomerFields errors={errors} pickup={pickup} onPickup={(t) => { setPickup(t); clearError('pickup'); }} />
            </Step>

            <Step n={3} title="ชำระเงิน" done={done[2]} enterIndex={5} bodyClass="pay"
              status={slip ? 'แนบสลิปแล้ว' : 'โอนตาม QR แล้วแนบสลิป'}>
              <PaymentFields
                hasOrder={hasOrder} shown={shown} slip={slip} error={errors.slip}
                onSlip={(f) => { setSlip(f); clearError('slip'); }}
                onBadFile={(msg) => setErrors((x) => ({ ...x, slip: msg }))}
              />
            </Step>
          </div>

          <OrderRail
            resolved={resolved} count={count} total={total} shown={shown} pickup={pickup}
            messages={FIELD_ORDER.map((f) => errors[f]).filter(Boolean) as string[]}
            failure={failure} sending={sending} still={!!editing || !!dialog} doneCount={doneCount}
          />
        </form>
      </main>

      {dialog}
      {editing?.kind === 'custom' && <Builder onClose={closeDraft} />}
      {editing?.kind === 'shop' && <ShopPicker onClose={closeDraft} />}
    </>
  );
}
