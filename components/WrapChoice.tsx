import { useId } from 'react';
import { WRAP_STYLES, type WrapStyle } from '@/lib/catalog';
import { Seg } from './ui';

// รูปตัวอย่างทรงการห่อทั้ง 2 แบบ — แสดงก่อนเลือกช่อ ส่วนการเลือกจริงทำแยกทีละช่อด้วย WrapChoice
export function WrapGuide() {
  return (
    <>
      <p className="choices__label">ทรงการห่อมี 2 แบบ <span className="choices__sub">เลือกได้ทีละช่อ</span></p>
      <div className="wrapstyle">
        {WRAP_STYLES.map((s) => (
          <figure key={s.id} className="wrapstyle__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="wrapstyle__img" src={s.image} alt={`ตัวอย่างช่อดอกไม้ห่อ${s.name}`} loading="lazy" />
            <figcaption className="wrapstyle__name">{s.name}</figcaption>
            <span className="wrapstyle__desc">{s.desc}</span>
          </figure>
        ))}
      </div>
    </>
  );
}

// เลือกทรงการห่อของช่อหนึ่ง: compact = ปุ่มสลับในการ์ดแคบ, ปกติ = การ์ดรูปตัวอย่าง
// name = ชื่อช่อ ให้โปรแกรมอ่านหน้าจอรู้ว่าเป็นตัวเลือกของช่อไหน เมื่อมีหลายช่อในหน้าเดียว
export function WrapChoice({ value, onChange, name, compact }: { value: WrapStyle; onChange: (s: WrapStyle) => void; name?: string; compact?: boolean }) {
  const group = useId();
  const label = `ทรงการห่อ${name ? ` (${name})` : ''}`;
  if (compact) {
    return <Seg full compact label={label} value={value} onChange={onChange} options={WRAP_STYLES.map((s) => ({ value: s.id, label: s.name }))} />;
  }
  return (
    <div className="wrapstyle" role="radiogroup" aria-label={label}>
      {WRAP_STYLES.map((s) => (
        <label key={s.id} className="wrapstyle__item">
          <input className="sr-only" type="radio" name={group} checked={value === s.id} onChange={() => onChange(s.id)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wrapstyle__img" src={s.image} alt="" loading="lazy" />
          <span className="wrapstyle__name">{s.name}</span>
          <span className="wrapstyle__desc">{s.desc}</span>
        </label>
      ))}
    </div>
  );
}
