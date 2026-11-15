import { memo } from 'react';
import { baht, summarize, wrapLabel, type Design } from '@/lib/catalog';

// รายการในช่อ + ยอดรวม — ตัวเลขใช้ tabular figures ให้หลักตรงกัน
export const Summary = memo(function Summary({ design }: { design: Design }) {
  const sum = summarize(design);
  return (
    <div className="sum">
      <ul className="sum__list">
        {sum.lines.length ? (
          <>
            {sum.lines.map((l) => (
              <li key={l.key}>
                <span>{l.label}</span>
                <span className="sum__qty num">× {l.qty}</span>
                <span className="num">{baht(l.total)}</span>
              </li>
            ))}
            <li className="sum__wrap">
              <span>ห่อ{wrapLabel(design)}</span>
              <span className="num">{baht(sum.wrap)}</span>
            </li>
          </>
        ) : (
          <li className="sum__empty">ยังไม่มีดอกไม้ในช่อ</li>
        )}
      </ul>
      <div className="sum__total"><span>รวม</span><strong className="num">{baht(sum.total)}</strong></div>
    </div>
  );
});
