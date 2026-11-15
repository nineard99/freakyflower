import { PICKUP, SHOP_LOCATION } from '@/lib/catalog';
import { Icon } from '../Icon';

const { lat, lng } = SHOP_LOCATION;
// Google Maps แบบฝัง ไม่ต้องใช้ API key · ลิงก์เปิดแอปแผนที่สำหรับนำทาง
const EMBED = `https://www.google.com/maps?q=${lat},${lng}&z=16&hl=th&output=embed`;
const OPEN = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

// ก่อนขั้นตอนที่ 1: ร้านอยู่ที่ไหน + วันเวลารับช่อ — ให้ลูกค้าเช็กก่อนว่ามารับได้จริง (รับที่ร้านเท่านั้น)
export function ShopMap({ enterIndex }: { enterIndex: number }) {
  return (
    <section className="where enter" style={{ '--i': enterIndex } as React.CSSProperties} aria-labelledby="where-title">
      <header className="where__head">
        <span className="where__pin" aria-hidden><Icon name="map-pin" size={18} /></span>
        <div>
          <h2 id="where-title" className="where__title">ร้านอยู่แถว {SHOP_LOCATION.area}</h2>
          <p className="where__lead">มารับช่อเองที่ร้านเท่านั้น เช็กตำแหน่งให้แน่ใจก่อนจอง</p>
        </div>
      </header>
      <div className="where__map">
        <iframe src={EMBED} title={`แผนที่ร้าน ${SHOP_LOCATION.area}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <dl className="where__facts">
        <div><dt>วันรับช่อ</dt><dd className="num">{PICKUP.date}</dd></div>
        <div><dt>ช่วงเวลา</dt><dd className="num">{PICKUP.from}–{PICKUP.to} น.</dd></div>
        <div><dt>จุดรับ</dt><dd>{PICKUP.place}</dd></div>
      </dl>
      <div className="where__foot">
        <p className="where__addr">{SHOP_LOCATION.detail}</p>
        <a className="btn btn--xs" href={OPEN} target="_blank" rel="noopener noreferrer">
          เปิดใน Google Maps<Icon name="external-link" size={14} />
        </a>
      </div>
    </section>
  );
}
