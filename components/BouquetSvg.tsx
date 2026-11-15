import { forwardRef, memo, useId, useMemo } from 'react';
import { flowerImg, FLOWERS, type Design } from '@/lib/catalog';
import { backLayer, defsLayer, frontLayer, itemTransform, STAGE_H, STAGE_W, stemsLayer } from '@/lib/wrap';

type Props = {
  design: Design;
  selected?: number | null;
  className?: string;
  label?: string;
} & Omit<React.SVGProps<SVGSVGElement>, 'ref'>;

// วาดช่อดอกไม้ทั้งช่อ: กระดาษหลัง → ก้าน → ดอกไม้ (รูปจริง) → กระดาษหน้า + ริบบิ้น
// memo: ฟอร์มเรนเดอร์ใหม่ทุกครั้งที่พิมพ์ — ช่อที่ design ไม่เปลี่ยนไม่ต้องวาดใหม่ (วาดก้าน/ใบ/กระดาษหนักพอสมควร)
export const BouquetSvg = memo(forwardRef<SVGSVGElement, Props>(function BouquetSvg(
  { design, selected = null, className, label, ...rest }, ref,
) {
  const uid = 'b' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const layers = useMemo(() => ({
    back: defsLayer(uid, design) + backLayer(uid, design),
    stems: stemsLayer(uid, design),
    front: frontLayer(uid, design),
  }), [uid, design]);
  return (
    <svg ref={ref} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} className={className} role="img" aria-label={label ?? 'ช่อดอกไม้'} {...rest}>
      <g className="bq">
        <g dangerouslySetInnerHTML={{ __html: layers.back }} />
        <g pointerEvents="none" dangerouslySetInnerHTML={{ __html: layers.stems }} />
        <g>
          {design.items.map((it, i) => (
            <g key={it.id} className="item" data-id={it.id} transform={itemTransform(it)} style={{ '--i': i } as React.CSSProperties}>
              <image
                href={flowerImg(it.type, it.color)}
                width="100" height="100"
                filter={`url(#${uid}ps)`}
                aria-label={FLOWERS[it.type]?.name}
              />
              {it.id === selected && <circle className="sel-ring" cx="50" cy="50" r="54" vectorEffect="non-scaling-stroke" />}
            </g>
          ))}
        </g>
        <g pointerEvents="none" dangerouslySetInnerHTML={{ __html: layers.front }} />
      </g>
    </svg>
  );
}));
