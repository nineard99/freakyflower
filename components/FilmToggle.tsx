'use client';

import { baht, FILM_PRICE } from '@/lib/catalog';
import { useBouquet } from './BouquetProvider';
import { Checkbox } from './ui';

// ตัวเลือกห่อฟิล์มใสทับกระดาษ — ค่าเดียวกันทั้งออเดอร์ (ฟอร์ม / หน้าจัดวางเอง / ให้ร้านจัดให้)
export function FilmToggle() {
  const { film, setFilm } = useBouquet();
  return (
    <Checkbox checked={film} onChange={setFilm}>
      ห่อฟิล์มใสทับกระดาษ{FILM_PRICE > 0 && <small className="num"> +{baht(FILM_PRICE)}</small>}
    </Checkbox>
  );
}
