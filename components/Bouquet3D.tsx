'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Design } from '@/lib/catalog';
import type { Scene3D } from '@/lib/scene3d';

export type Bouquet3DHandle = Pick<Scene3D, 'stagePoint' | 'resetView'>;

type Props = {
  design: Design;
  selected: number | null;
  label?: string;
  readOnly?: boolean; // ดูอย่างเดียว: ลากที่ไหนก็หมุน
  onSelect?: (id: number | null) => void;
  onMove?: (id: number, x: number, y: number) => void;
  onFail: () => void; // เครื่องนี้เปิด WebGL ไม่ได้
} & Pick<React.CanvasHTMLAttributes<HTMLCanvasElement>, 'onDragOver' | 'onDrop'>;

// พื้นที่จัดช่อแบบ 3D — โหลด three.js เฉพาะตอนเปิดโหมดนี้ (ไม่ถ่วงหน้าแรก)
export const Bouquet3D = forwardRef<Bouquet3DHandle, Props>(function Bouquet3D(
  { design, selected, label, readOnly, onSelect, onMove, onFail, ...rest }, ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  const latest = useRef({ design, selected, onSelect, onMove, onFail });
  useEffect(() => { latest.current = { design, selected, onSelect, onMove, onFail }; });

  useEffect(() => {
    let dead = false;
    import('@/lib/scene3d')
      .then(({ createScene3D }) => {
        if (dead || !canvasRef.current) return;
        const scene = createScene3D(canvasRef.current, {
          onSelect: (id) => latest.current.onSelect?.(id),
          onMove: (id, x, y) => latest.current.onMove?.(id, x, y),
          readOnly,
        });
        sceneRef.current = scene;
        scene.update(latest.current.design, latest.current.selected);
      })
      .catch(() => { if (!dead) latest.current.onFail(); });
    return () => {
      dead = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => { sceneRef.current?.update(design, selected); }, [design, selected]);

  useImperativeHandle(ref, () => ({
    stagePoint: (x, y) => sceneRef.current?.stagePoint(x, y) ?? null,
    resetView: () => sceneRef.current?.resetView(),
  }), []);

  return <canvas ref={canvasRef} className="stage3d" role="img" aria-label={label ?? 'ช่อดอกไม้แบบ 3D'} {...rest} />;
});
