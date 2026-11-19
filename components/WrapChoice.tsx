import { baht, FILM_PRICE, WRAP_STYLES } from '@/lib/catalog';
import { Seg } from './ui';

const priceNote = (film: boolean) => (film && FILM_PRICE > 0 ? ` +${baht(FILM_PRICE)}` : '');

// รูปตัวอย่างการห่อทั้ง 2 แบบ — แสดงก่อนเลือกช่อ ส่วนการเลือกจริงทำแยกทีละช่อด้วย WrapChoice
export function WrapGuide() {
  return (
    <>
      <p className="choices__label">การห่อมี 2 แบบ <span className="choices__sub">เลือกได้ทีละช่อ</span></p>
      <div className="wrapstyle">
        {WRAP_STYLES.map((s) => (
          <figure key={s.name} className="wrapstyle__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="wrapstyle__img" src={s.image} alt={`ตัวอย่างช่อดอกไม้ห่อแบบ${s.name}`} loading="lazy" />
            <figcaption className="wrapstyle__name">{s.name}<span className="num">{priceNote(s.film)}</span></figcaption>
            <span className="wrapstyle__desc">{s.desc}</span>
          </figure>
        ))}
      </div>
    </>
  );
}

// เลือกแบบการห่อของช่อหนึ่ง: compact = ปุ่มสลับในการ์ดแคบ, ปกติ = การ์ดรูปตัวอย่าง
// name = ชื่อช่อ ให้โปรแกรมอ่านหน้าจอรู้ว่าเป็นตัวเลือกของช่อไหน เมื่อมีหลายช่อในหน้าเดียว
export function WrapChoice({ film, onChange, name, compact }: { film: boolean; onChange: (film: boolean) => void; name?: string; compact?: boolean }) {
  const label = `แบบการห่อ${name ? ` (${name})` : ''}`;
  if (compact) {
    return (
      <Seg
        full compact label={label} value={film ? 'film' : 'paper'} onChange={(v) => onChange(v === 'film')}
        options={WRAP_STYLES.map((s) => ({ value: s.film ? 'film' : 'paper', label: s.name + priceNote(s.film) }))}
      />
    );
  }
  return (
    <div className="wrapstyle" role="radiogroup" aria-label={label}>
      {WRAP_STYLES.map((s) => (
        <label key={s.name} className="wrapstyle__item">
          <input className="sr-only" type="radio" name="wrap-style" checked={film === s.film} onChange={() => onChange(s.film)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wrapstyle__img" src={s.image} alt="" loading="lazy" />
          <span className="wrapstyle__name">{s.name}<span className="num">{priceNote(s.film)}</span></span>
          <span className="wrapstyle__desc">{s.desc}</span>
        </label>
      ))}
    </div>
  );
}
