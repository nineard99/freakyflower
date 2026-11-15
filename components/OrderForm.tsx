'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { baht, CONFIG, LOYKRATHONG, PICKUP, PICKUP_SLOTS, summarize, templateDesign, TEMPLATES, wrapLabel, type Design } from '@/lib/catalog';
import { designToPng } from '@/lib/exportPng';
import { BouquetChoices } from './BouquetChoices';
import { Builder } from './Builder';
import { ShopPicker } from './ShopPicker';
import { BouquetSvg } from './BouquetSvg';
import { FilmToggle } from './FilmToggle';
import { useBouquet } from './BouquetProvider';
import { Icon } from './Icon';
import { Summary } from './Summary';
import { ThermalButton } from './ThermalButton';
import { Alert, useConfirm } from './ui';

// ย่อรูปสลิปก่อนส่ง (กันไฟล์ใหญ่จากกล้องมือถือ) → JPEG data URL
async function shrinkImage(file: File, max = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * k);
    canvas.height = Math.round(img.naturalHeight * k);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ตัวเลขวิ่งไปหาค่าใหม่ (ยอดเงิน)
function useCountUp(target: number, ms = 500) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now(), a = from.current;
    if (a === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); from.current = target; return; }
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms), e = 1 - (1 - t) ** 3;
      const cur = Math.round(a + (target - a) * e);
      from.current = cur;
      setV(cur);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// กลีบดอกไม้โปรยตอนจองสำเร็จ (สีของดอกไม้ = เนื้อหา ไม่ใช่สีของระบบ)
const PETALS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.35,
  dur: 4.5 + (i % 5) * 0.7,
  size: 8 + (i % 4) * 3,
  hue: ['#f4b6c8', '#e98aa8', '#f7d27a', '#fbfaf6', '#d9b8ef'][i % 5],
}));

function bouquetText(d: Design, name: string) {
  const sum = summarize(d);
  return [
    `${name} · ${wrapLabel(d)}`,
    ...sum.lines.map((l) => `- ${l.label} × ${l.qty} ${l.unit}`),
  ].join('\n');
}

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

type Field = 'choice' | 'name' | 'phone' | 'pickup' | 'slip';
const FIELD_ORDER: Field[] = ['choice', 'name', 'phone', 'pickup', 'slip'];
// จุดที่พาโฟกัสไปเมื่อช่องนั้นยังไม่ผ่าน
const FIELD_TARGET: Record<Field, string> = {
  choice: '#loy-choices .choice', name: '#loy-name', phone: '#loy-phone', pickup: '#loy-pickup', slip: '#loy-slip',
};
const STEPS = 3;
// ราคาเริ่มต้น = แบบสำเร็จที่ถูกที่สุด
const FROM_PRICE = Math.min(...TEMPLATES.map((t) => summarize(templateDesign(t)).total));

export function OrderForm() {
  const { choice, orderDesign, shop } = useBouquet();
  const [picker, setPicker] = useState<'custom' | 'shop' | null>(null);
  const closePicker = useCallback(() => setPicker(null), []);
  const { confirm, dialog } = useConfirm();
  const doneRef = useRef<HTMLHeadingElement>(null);
  const qrRef = useRef<HTMLImageElement>(null);
  const [filled, setFilled] = useState({ name: false, phone: false });
  const [pickup, setPickup] = useState(''); // เวลารับช่อ (HH:MM) — เลือกได้เฉพาะช่วงเวลาทำการของวันรับ
  const [slip, setSlip] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [over, setOver] = useState(false); // กำลังลากไฟล์มาเหนือ dropzone
  const [qrMissing, setQrMissing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState(''); // ส่งแล้วไม่สำเร็จ (ไม่ใช่ข้อมูลไม่ครบ)
  const [sending, setSending] = useState(false);
  const [orderNo, setOrderNo] = useState('');

  const total = useMemo(() => (orderDesign ? summarize(orderDesign).total : 0), [orderDesign]);
  const shown = useCountUp(total);
  const name = choice === 'custom' ? 'จัดวางเอง' : choice === 'shop' ? 'ให้ร้านจัดให้' : TEMPLATES.find((t) => t.id === choice)?.name ?? '';

  const done = [!!orderDesign, filled.name && filled.phone && !!pickup, !!orderDesign && !!slip];
  const doneCount = done.filter(Boolean).length;
  const clearError = useCallback((f: Field) => setErrors((e) => {
    if (!(f in e)) return e;
    const next = { ...e };
    delete next[f];
    return next;
  }), []);

  // รูป QR อาจโหลดพังก่อน React ผูก onError (hydration) — เช็กซ้ำตอน mount
  useEffect(() => {
    const img = qrRef.current;
    if (img?.complete && !img.naturalWidth) setQrMissing(true);
  }, []);

  useEffect(() => {
    if (!slip) return setPreview('');
    const url = URL.createObjectURL(slip);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slip]);

  useEffect(() => { if (orderDesign) clearError('choice'); }, [orderDesign, clearError]);

  // วางไฟล์พลาดนอก dropzone → เบราว์เซอร์จะเปิดรูปแทนหน้านี้ ข้อมูลที่กรอกไว้หาย: กันไว้ทั้งหน้า
  useEffect(() => {
    const stop = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', stop);
    return () => { window.removeEventListener('dragover', stop); window.removeEventListener('drop', stop); };
  }, []);

  // จองสำเร็จ: ย้ายโฟกัสไปที่หัวเรื่องของหน้าผลลัพธ์
  useEffect(() => { if (orderNo) doneRef.current?.focus({ preventScroll: true }); }, [orderNo]);

  const pickSlip = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((e) => ({ ...e, slip: 'ไฟล์นี้ไม่ใช่รูปภาพ เลือกไฟล์ JPG หรือ PNG' }));
      return;
    }
    setSlip(file);
    clearError('slip');
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const v = (k: string) => (typeof fd[k] === 'string' ? fd[k].trim() : '');
    const phone = v('phone').replace(/[\s-]/g, '');
    setFailure('');

    const errs: Partial<Record<Field, string>> = {};
    if (!orderDesign) errs.choice = 'ยังไม่ได้เลือกช่อ เลือกแบบในขั้นตอนที่ 1 ก่อน';
    if (!v('name')) errs.name = 'กรอกชื่อผู้สั่ง';
    if (!/^0\d{8,9}$/.test(phone)) errs.phone = 'เบอร์โทรไม่ถูกต้อง ใช้รูปแบบ 0812345678';
    if (!PICKUP_SLOTS.includes(pickup)) errs.pickup = `เลือกเวลามารับช่อ ระหว่าง ${PICKUP.from}–${PICKUP.to} น.`;
    if (!slip) errs.slip = 'แนบรูปสลิปการโอน';
    setErrors(errs);
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first || !orderDesign || !slip) {
      // พาไปที่ช่องแรกที่ยังไม่ผ่าน
      const el = first && form.querySelector<HTMLElement>(FIELD_TARGET[first]);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    if (!LOYKRATHONG.endpoint) return setFailure('ร้านยังไม่ได้ตั้งค่าระบบรับออเดอร์ ติดต่อร้านทาง LINE ได้เลย');

    setSending(true);
    try {
      const res = await fetch(LOYKRATHONG.endpoint, {
        method: 'POST',
        // text/plain = simple request ไม่มี CORS preflight (Apps Script ไม่รองรับ OPTIONS)
        body: JSON.stringify({
          name: v('name'),
          phone,
          ig: v('ig').replace(/^@+/, ''),
          pickup,
          bouquet: bouquetText(orderDesign, name) + (choice === 'shop' && shop.note.trim() ? `\nโน้ต: ${shop.note.trim()}` : ''),
          total,
          design: await designToPng(orderDesign, 1.5),
          slip: await shrinkImage(slip),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setOrderNo(data.orderNo);
      window.scrollTo({ top: 0 });
    } catch {
      setFailure('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือส่งรูปสลิปให้ร้านทาง LINE');
    } finally {
      setSending(false);
    }
  }

  const topbar = (
    <header className="topbar">
      <div className="wrap topbar__inner">
        <p className="topbar__name">{CONFIG.shopName}</p>
        {!orderNo && (
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

  if (orderNo) {
    return (
      <>
        {topbar}
        <main className="wrap done">
          <section className="ticket" role="status">
            <div className="petals" aria-hidden>
              {PETALS.map((p, i) => (
                <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, width: p.size, height: p.size * 1.3, background: p.hue } as React.CSSProperties} />
              ))}
            </div>
            <header className="ticket__head">
              <span className="ticket__check" aria-hidden><Icon name="check" size={28} strokeWidth={2.2} className="draw" /></span>
              <h1 ref={doneRef} tabIndex={-1} className="ticket__title">จองสำเร็จ</h1>
              <p className="muted">บันทึกภาพหน้าจอนี้ไว้ แล้วแสดงตอนรับช่อที่{PICKUP.place}</p>
            </header>
            <div className="ticket__no">
              <span className="stat__label">เลขออเดอร์</span>
              <strong className="num">{orderNo}</strong>
            </div>
            <div className="ticket__body">
              {orderDesign && <div className="ticket__art"><BouquetSvg design={orderDesign} label="ช่อดอกไม้ที่สั่ง" /></div>}
              <dl className="ticket__facts">
                <div><dt>ช่อ</dt><dd>{name}</dd></div>
                <div><dt>รับช่อ</dt><dd className="num">{PICKUP.date} · {pickup} น.</dd></div>
                <div><dt>ยอดชำระ</dt><dd className="num">{baht(total)}</dd></div>
              </dl>
            </div>
            <p className="ticket__note">ร้านจะตรวจสลิปและติดต่อกลับทางเบอร์โทรที่ให้ไว้</p>
          </section>
        </main>
      </>
    );
  }

  const messages = FIELD_ORDER.map((f) => errors[f]).filter(Boolean) as string[];
  const stepBadge = (n: number) => (
    <b className="step__badge" data-done={done[n - 1] || undefined} aria-hidden>
      <span>{n}</span><Icon name="check" size={14} strokeWidth={2.6} />
    </b>
  );

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
            setFilled({ name: !!f.name?.value.trim(), phone: /^0\d{8,9}$/.test((f.phone?.value ?? '').replace(/[\s-]/g, '')) });
            const field = (e.target as HTMLInputElement).name;
            if (field === 'name' || field === 'phone') clearError(field);
          }}
        >
          <div className="order__steps">
            <section className="step enter" style={{ '--i': 3 } as React.CSSProperties} aria-labelledby="step-1">
              {stepBadge(1)}
              <header className="step__head">
                <h2 id="step-1" className="step__title">เลือกช่อ</h2>
                <p className="step__status num">{orderDesign ? `${name} · ${baht(total)}` : 'เลือกแบบสำเร็จ หรือออกแบบเอง'}</p>
              </header>
              <div className="step__body">
                <BouquetChoices confirm={confirm} onCustom={() => setPicker('custom')} onShop={() => setPicker('shop')} />
                {errors.choice && <p className="field__error"><Icon name="circle-alert" size={14} />{errors.choice}</p>}
                <FilmToggle />
              </div>
            </section>

            <section className="step enter" style={{ '--i': 4 } as React.CSSProperties} aria-labelledby="step-2">
              {stepBadge(2)}
              <header className="step__head">
                <h2 id="step-2" className="step__title">ข้อมูลผู้สั่ง</h2>
                <p className="step__status num">{pickup ? `รับช่อ ${PICKUP.date} · ${pickup} น.` : 'ใช้ติดต่อกลับและนัดรับช่อ'}</p>
              </header>
              <div className="step__body fields">
                <label className="field">
                  <span className="field__label">ชื่อ</span>
                  <input
                    id="loy-name" className="input" name="name" required autoComplete="name"
                    aria-invalid={!!errors.name || undefined} aria-describedby={errors.name ? 'err-name' : undefined}
                  />
                  {errors.name && <span id="err-name" className="field__error"><Icon name="circle-alert" size={14} />{errors.name}</span>}
                </label>
                <label className="field">
                  <span className="field__label">เบอร์โทร</span>
                  <input
                    id="loy-phone" className="input num" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="0812345678"
                    aria-invalid={!!errors.phone || undefined} aria-describedby={errors.phone ? 'err-phone' : undefined}
                  />
                  {errors.phone && <span id="err-phone" className="field__error"><Icon name="circle-alert" size={14} />{errors.phone}</span>}
                </label>
                <label className="field">
                  <span className="field__label">Instagram <span className="field__opt">ไม่บังคับ</span></span>
                  <input id="loy-ig" className="input" name="ig" autoCapitalize="none" autoCorrect="off" placeholder="@yourname" />
                </label>
                <label className="field">
                  <span className="field__label">เวลามารับ</span>
                  <span className="select">
                    <select
                      id="loy-pickup" name="pickup" required value={pickup} data-empty={!pickup || undefined}
                      aria-invalid={!!errors.pickup || undefined} aria-describedby={errors.pickup ? 'err-pickup' : 'hint-pickup'}
                      onChange={(e) => { setPickup(e.target.value); clearError('pickup'); }}
                    >
                      <option value="">เลือกเวลา</option>
                      {PICKUP_SLOTS.map((t) => <option key={t} value={t}>{t} น.</option>)}
                    </select>
                    <Icon name="chevron-down" size={18} />
                  </span>
                  {errors.pickup
                    ? <span id="err-pickup" className="field__error"><Icon name="circle-alert" size={14} />{errors.pickup}</span>
                    : <span id="hint-pickup" className="field__hint num">รับได้เฉพาะวันที่ {PICKUP.date} เวลา {PICKUP.from}–{PICKUP.to} น.</span>}
                </label>
              </div>
            </section>

            <section className="step enter" style={{ '--i': 5 } as React.CSSProperties} aria-labelledby="step-3">
              {stepBadge(3)}
              <header className="step__head">
                <h2 id="step-3" className="step__title">ชำระเงิน</h2>
                <p className="step__status">{slip ? 'แนบสลิปแล้ว' : 'โอนตาม QR แล้วแนบสลิป'}</p>
              </header>
              <div className="step__body pay">
                <div className="pay__amount">
                  <span className="stat__label">ยอดโอน</span>
                  <strong className="stat__value num" data-empty={!orderDesign || undefined}>{orderDesign ? baht(shown) : '—'}</strong>
                  {!orderDesign && <span className="field__hint">เลือกช่อในขั้นตอนที่ 1 เพื่อดูยอดโอน</span>}
                </div>
                <figure className="pay__qr">
                  {qrMissing ? (
                    <div className="pay__qr-missing">ยังไม่มีรูป QR</div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img ref={qrRef} src={LOYKRATHONG.qrImage} alt="QR code สำหรับชำระเงิน" onError={() => setQrMissing(true)} />
                  )}
                  <figcaption>{LOYKRATHONG.accountName || 'สแกนด้วยแอปธนาคาร'}</figcaption>
                </figure>
                <div className="field pay__slip">
                  <span className="field__label">สลิปการโอน</span>
                  <div
                    className="drop" data-over={over || undefined} data-invalid={!!errors.slip || undefined} data-filled={!!slip || undefined}
                    onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); }}
                    onDrop={(e) => { e.preventDefault(); setOver(false); pickSlip(e.dataTransfer.files?.[0]); }}
                  >
                    <input
                      id="loy-slip" className="drop__input" name="slip" type="file" accept="image/*" required
                      aria-label="รูปสลิปการโอน" aria-invalid={!!errors.slip || undefined} aria-describedby={errors.slip ? 'err-slip' : undefined}
                      onChange={(e) => pickSlip(e.target.files?.[0])}
                    />
                    {slip && preview ? (
                      <div className="drop__file">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img key={preview} className="drop__thumb" src={preview} alt="ตัวอย่างสลิปที่แนบ" />
                        <span className="drop__meta">
                          <span className="drop__name">{slip.name}</span>
                          <span className="field__hint num">{fileSize(slip.size)}</span>
                        </span>
                        <label htmlFor="loy-slip" className="btn btn--xs">เปลี่ยนรูป</label>
                      </div>
                    ) : (
                      <label htmlFor="loy-slip" className="drop__empty">
                        <Icon name="upload" size={24} />
                        <span className="drop__title">ลากรูปสลิปมาวาง หรือ <span className="drop__browse">เลือกไฟล์</span></span>
                        <span className="field__hint">ไฟล์รูปภาพ JPG หรือ PNG</span>
                      </label>
                    )}
                  </div>
                  {errors.slip && <span id="err-slip" className="field__error"><Icon name="circle-alert" size={14} />{errors.slip}</span>}
                </div>
              </div>
            </section>
          </div>

          <aside className="rail enter" style={{ '--i': 4 } as React.CSSProperties} aria-label="สรุปคำสั่งจอง">
            <h2 className="rail__title">สรุปคำสั่งจอง</h2>
            <div className="rail__bouquet">
              <div className="rail__art">
                {orderDesign ? <BouquetSvg key={choice} design={orderDesign} label={`ช่อ ${name}`} /> : <Icon name="flower" size={24} />}
              </div>
              <div className="rail__what">
                <p className="rail__name">{orderDesign ? name : 'ยังไม่ได้เลือกช่อ'}</p>
                <p className="rail__sub">{orderDesign ? wrapLabel(orderDesign) : 'เลือกแบบในขั้นตอนที่ 1'}</p>
              </div>
            </div>
            {orderDesign && <Summary design={orderDesign} />}
            <dl className="rail__facts">
              <div><dt>รับช่อ</dt><dd className="num">{PICKUP.date} · {pickup ? `${pickup} น.` : 'ยังไม่เลือกเวลา'}</dd></div>
            </dl>
            {messages.length > 0 && (
              <Alert title="ข้อมูลยังไม่ครบ">
                <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>
              </Alert>
            )}
            {failure && <Alert title="ยังจองไม่สำเร็จ">{failure}</Alert>}
            {/* ปุ่มร้อนปุ่มเดียวของหน้า — สนามความร้อนอุ่นขึ้นตามขั้นตอนที่ทำเสร็จ */}
            <ThermalButton
              type="submit" full icon="arrow-right" status={sending ? 'loading' : 'idle'} still={!!picker || !!dialog}
              intensity={0.25 + 0.25 * doneCount}
            >
              {sending ? 'กำลังส่ง' : orderDesign ? `ยืนยันการจอง · ${baht(shown)}` : 'ยืนยันการจอง'}
            </ThermalButton>
            <p className="rail__note">ร้านจะตรวจสลิปและติดต่อกลับทางเบอร์โทรที่ให้ไว้</p>
          </aside>
        </form>
      </main>

      {dialog}
      {picker === 'custom' && <Builder onClose={closePicker} />}
      {picker === 'shop' && <ShopPicker onClose={closePicker} />}
    </>
  );
}
