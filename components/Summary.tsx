import { baht, summarize, wrapLabel, type Design } from '@/lib/catalog';

export function Summary({ design }: { design: Design }) {
  const sum = summarize(design);
  return (
    <>
      <ul className="sum-list">
        {sum.lines.length ? (
          <>
            {sum.lines.map((l) => (
              <li key={l.key}><span>{l.label} × {l.qty}</span><span>{baht(l.total)}</span></li>
            ))}
            <li className="sum-wrap">
              <span>ห่อ{wrapLabel(design)}</span>
              <span>{baht(sum.wrap)}</span>
            </li>
          </>
        ) : (
          <li className="muted">ยังไม่มีดอกไม้ในช่อ</li>
        )}
      </ul>
      <div className="sum-total"><span>รวม</span><strong>{baht(sum.total)}</strong></div>
    </>
  );
}
