import { baht, FILM_PRICE } from '@/lib/catalog';
import { Checkbox } from './ui';

// ตัวเลือกห่อฟิล์มใสทับกระดาษ — เลือกแยกทีละช่อ (รายการในออเดอร์ / ร่างในหน้าจัดวางเอง / ให้ร้านจัดให้)
// name = ชื่อช่อ อ่านให้โปรแกรมอ่านหน้าจอรู้ว่าติ๊กของช่อไหน เมื่อมีหลายช่อในหน้าเดียว
export function FilmToggle({ checked, onChange, name }: { checked: boolean; onChange: (on: boolean) => void; name?: string }) {
  return (
    <Checkbox checked={checked} onChange={onChange}>
      ห่อฟิล์มใสทับกระดาษ{name && <span className="sr-only"> ({name})</span>}
      {FILM_PRICE > 0 && <small className="num"> +{baht(FILM_PRICE)}</small>}
    </Checkbox>
  );
}
