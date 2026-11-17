// Thermal iconography — ชุดย่อยของ Lucide (ISC): เส้นอย่างเดียว กริด 24px ปลายมน ใช้ currentColor
// ไม่มีไอคอนทึบ ไม่มี emoji · ไอคอนที่ยืนเดี่ยวต้องมี label

type Shape = string | { c: [number, number, number] } | { r: [number, number, number, number, number] };

const ICONS = {
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  'arrow-left': ['m12 19-7-7 7-7', 'M19 12H5'],
  check: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  plus: ['M5 12h14', 'M12 5v14'],
  minus: ['M5 12h14'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'map-pin': ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0', { c: [12, 10, 3] }],
  instagram: [{ r: [2, 2, 20, 20, 5] }, 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z', 'M17.5 6.5h.01'],
  'external-link': ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  clock: [{ c: [12, 12, 10] }, 'M12 6v6l4 2'],
  'circle-alert': [{ c: [12, 12, 10] }, 'M12 8v4', 'M12 16h.01'],
  pencil: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'm15 5 4 4'],
  trash: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  copy: [{ r: [8, 8, 14, 14, 2] }, 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'],
  'rotate-ccw': ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  'bring-to-front': [{ r: [8, 8, 8, 8, 2] }, 'M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2', 'M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2'],
  'send-to-back': [{ r: [14, 14, 8, 8, 2] }, { r: [2, 2, 8, 8, 2] }, 'M7 14v1a2 2 0 0 0 2 2h1', 'M14 7h1a2 2 0 0 1 2 2v1'],
  flower: [
    'M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1',
    { c: [12, 8, 2] },
    'M12 10v12',
    'M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z',
    'M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z',
  ],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** ชื่อที่อ่านออกเสียงได้ — ใส่เมื่อไอคอนยืนเดี่ยวโดยไม่มีข้อความกำกับ */
  label?: string;
  className?: string;
};

export function Icon({ name, size = 20, strokeWidth = 2, label, className }: Props) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      focusable="false" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    >
      {(ICONS[name] as readonly Shape[]).map((s, i) =>
        typeof s === 'string' ? <path key={i} d={s} />
          : 'c' in s ? <circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} />
            : <rect key={i} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} />,
      )}
    </svg>
  );
}
