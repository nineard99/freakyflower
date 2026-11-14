'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { baht, LOYKRATHONG, PICKUP, PICKUP_SLOTS, summarize, TEMPLATES, wrapLabel, type Design } from '@/lib/catalog';
import { designToPng } from '@/lib/exportPng';
import { BouquetChoices } from './BouquetChoices';
import { BouquetPicker } from './BouquetPicker';
import { ShopPicker } from './ShopPicker';
import { BouquetSvg } from './BouquetSvg';
import { FilmToggle } from './FilmToggle';
import { useBouquet } from './BouquetProvider';
import { Summary } from './Summary';

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

// กลีบดอกไม้โปรยตอนจองสำเร็จ
const PETALS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.35,
  dur: 4.5 + (i % 5) * 0.7,
  size: 8 + (i % 4) * 3,
  hue: ['#f4b6c8', '#e98aa8', '#f7d27a', '#ffffff', '#d9b8ef'][i % 5],
}));

function bouquetText(d: Design, name: string) {
  const sum = summarize(d);
  return [
    `${name} · ${wrapLabel(d)}`,
    ...sum.lines.map((l) => `- ${l.label} × ${l.qty} ${l.unit}`),
  ].join('\n');
}

export function OrderForm() {
  const { choice, orderDesign, shop } = useBouquet();
  const [picker, setPicker] = useState<'custom' | 'shop' | null>(null);
  const closePicker = useCallback(() => setPicker(null), []);
  const qrRef = useRef<HTMLImageElement>(null);
  const [filled, setFilled] = useState({ name: false, phone: false });
  const [pickup, setPickup] = useState(''); // เวลารับช่อ (HH:MM) — เลือกได้เฉพาะช่วงเวลาทำการของวันรับ
  const [slip, setSlip] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [qrMissing, setQrMissing] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [orderNo, setOrderNo] = useState('');

  const total = useMemo(() => (orderDesign ? summarize(orderDesign).total : 0), [orderDesign]);
  const shown = useCountUp(total);
  const name = choice === 'custom' ? 'จัดวางเอง' : choice === 'shop' ? 'ให้ร้านจัดให้' : TEMPLATES.find((t) => t.id === choice)?.name ?? '';

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const v = (k: string) => (typeof fd[k] === 'string' ? fd[k].trim() : '');
    const phone = v('phone').replace(/[\s-]/g, '');
    setError('');
    if (!orderDesign) return setError('ยังไม่ได้เลือกช่อ — เลือกแบบในข้อ 1 ก่อนนะ');
    if (!v('name')) return setError('กรุณากรอกชื่อ');
    if (!/^0\d{8,9}$/.test(phone)) return setError('เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)');
    if (!PICKUP_SLOTS.includes(pickup)) return setError(`กรุณาเลือกเวลามารับช่อ (วันที่ ${PICKUP.date} เวลา ${PICKUP.from}–${PICKUP.to} น.)`);
    if (!slip) return setError('กรุณาแนบรูปสลิปการโอน');
    if (!LOYKRATHONG.endpoint) return setError('ร้านยังไม่ได้ตั้งค่าระบบรับออเดอร์ — ทัก LINE ร้านได้เลย');

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
      setError('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือแคปหน้าจอสลิปส่งทาง LINE ร้าน');
    } finally {
      setSending(false);
    }
  }

  if (orderNo) {
    return (
      <div className="panel loy__done" role="status">
        <div className="petals" aria-hidden>
          {PETALS.map((p, i) => (
            <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, width: p.size, height: p.size * 1.3, background: p.hue } as React.CSSProperties} />
          ))}
        </div>
        <span className="loy__check" aria-hidden>✓</span>
        <h1>จองสำเร็จ</h1>
        <p className="muted">เลขออเดอร์ของคุณ</p>
        <p className="loy__no">{orderNo}</p>
        {orderDesign && <BouquetSvg design={orderDesign} label="ช่อดอกไม้ที่สั่ง" />}
        <p className="loy__pickup">รับช่อวันที่ {PICKUP.date} เวลา {pickup} น.</p>
        <p className="muted">ร้านจะตรวจสลิปและติดต่อกลับทางเบอร์โทรที่ให้ไว้ แคปหน้าจอนี้ไว้แสดงตอนรับช่อที่หน้าร้าน</p>
      </div>
    );
  }

  return (
    <>
      <form
        className="order__form loy__form" onSubmit={onSubmit} noValidate
        onInput={(e) => {
          const f = e.currentTarget.elements as unknown as Record<string, HTMLInputElement>;
          setFilled({ name: !!f.name?.value.trim(), phone: /^0\d{8,9}$/.test((f.phone?.value ?? '').replace(/[\s-]/g, '')) });
        }}
      >
        <header className="loy__head">
          <h1>{LOYKRATHONG.title}</h1>
          <p className="muted">{LOYKRATHONG.detail}</p>
        </header>

        <section className="panel loy__sec">
          <h2><b className={`step${orderDesign ? ' done' : ''}`}><span>1</span><i aria-hidden>✓</i></b>เลือกช่อ</h2>
          <BouquetChoices onCustom={() => setPicker('custom')} onShop={() => setPicker('shop')} />
          {orderDesign && (
            <details className="loy__detail">
              <summary>รายการในช่อ “{name}”</summary>
              <Summary design={orderDesign} />
            </details>
          )}
        </section>

        <section className="panel loy__sec">
          <h2><b className={`step${filled.name && filled.phone && pickup ? ' done' : ''}`}><span>2</span><i aria-hidden>✓</i></b>ข้อมูลผู้สั่ง</h2>
          <label>ชื่อ *<input id="loy-name" name="name" required autoComplete="name" /></label>
          <label>เบอร์โทร *<input id="loy-phone" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="0812345678" /></label>
          <label>Instagram (ถ้ามี)<input id="loy-ig" name="ig" autoCapitalize="none" autoCorrect="off" placeholder="@yourname" /></label>
          <label>มารับกี่โมง *
            <select id="loy-pickup" name="pickup" required value={pickup} onChange={(e) => setPickup(e.target.value)}>
              <option value="">เลือกเวลามารับ</option>
              {PICKUP_SLOTS.map((t) => <option key={t} value={t}>{t} น.</option>)}
            </select>
            <small className="muted">รับช่อได้เฉพาะวันที่ {PICKUP.date} เวลา {PICKUP.from}–{PICKUP.to} น. เท่านั้น</small>
          </label>
          <FilmToggle />
        </section>

        <section className="panel loy__sec">
          <h2><b className={`step${orderDesign ? ' done' : ''}`}><span>3</span><i aria-hidden>✓</i></b>ชำระเงิน</h2>
          <div className="loy__qr">
            <p className="muted">ยอดโอน</p>
            <p className="loy__amount" key={total}>{orderDesign ? baht(shown) : '—'}</p>
            {!orderDesign && <p className="muted">เลือกช่อในข้อ 1 ก่อน</p>}
            {qrMissing ? (
              <div className="loy__qr-missing">ยังไม่มีรูป QR</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={qrRef} src={LOYKRATHONG.qrImage} alt="QR code สำหรับชำระเงิน" onError={() => setQrMissing(true)} />
            )}
            {LOYKRATHONG.accountName && <p className="muted">{LOYKRATHONG.accountName}</p>}
          </div>
        </section>

        <section className="panel loy__sec">
          <h2><b className={`step${slip ? ' done' : ''}`}><span>4</span><i aria-hidden>✓</i></b>แนบสลิป</h2>
          <label>รูปสลิปการโอน *
            <input id="loy-slip" name="slip" type="file" accept="image/*" required onChange={(e) => setSlip(e.target.files?.[0] ?? null)} />
          </label>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img key={preview} className="loy__slip" src={preview} alt="ตัวอย่างสลิปที่แนบ" />}
          <p className="form-error" role="alert">{error}</p>
          <button className={`btn btn--block btn--submit${sending ? ' is-sending' : ''}`} type="submit" disabled={sending}>{sending ? 'กำลังส่ง…' : orderDesign ? `ยืนยันการจอง · ${baht(shown)}` : 'ยืนยันการจอง'}</button>
        </section>
      </form>

      {picker === 'custom' && <BouquetPicker onClose={closePicker} />}
      {picker === 'shop' && <ShopPicker onClose={closePicker} />}
    </>
  );
}
