'use client';

import { baht, FILM_PRICE } from '@/lib/catalog';
import { useBouquet } from './BouquetProvider';

// ตัวเลือกห่อฟิล์มใสทับกระดาษ — ค่าเดียวกันทั้งออเดอร์ (ฟอร์ม / หน้าจัดวางเอง / ให้ร้านจัดให้)
export function FilmToggle() {
  const { film, setFilm } = useBouquet();
  return (
    <label className="check">
      <input type="checkbox" checked={film} onChange={(e) => setFilm(e.target.checked)} />
      <span>ห่อฟิล์มใสทับกระดาษ{FILM_PRICE > 0 && <small> +{baht(FILM_PRICE)}</small>}</span>
    </label>
  );
}
