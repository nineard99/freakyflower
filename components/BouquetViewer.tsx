'use client';

import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '@/lib/catalog';
import { decodeBouquet, type SharedBouquet } from '@/lib/shareDesign';
import { Bouquet3D, type Bouquet3DHandle } from './Bouquet3D';
import { BouquetSvg } from './BouquetSvg';
import { Icon } from './Icon';
import { Summary } from './Summary';
import { Seg } from './ui';

type State = { status: 'loading' } | { status: 'bad' } | { status: 'ok'; b: SharedBouquet };

// อ่านช่อจาก # ในลิงก์ → หมุนดูได้รอบ (ลากที่ไหนก็หมุน · บีบนิ้ว/Ctrl+ล้อเมาส์ = ซูม) · สลับดู 2D ได้
export function BouquetViewer() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [view, setView] = useState<'3d' | '2d'>('3d');
  const threeRef = useRef<Bouquet3DHandle>(null);

  useEffect(() => {
    const load = () => {
      const code = window.location.hash.slice(1);
      if (!code) return setState({ status: 'bad' });
      decodeBouquet(code).then((b) => setState(b && b.design.items.length ? { status: 'ok', b } : { status: 'bad' }));
    };
    load();
    window.addEventListener('hashchange', load);
    return () => window.removeEventListener('hashchange', load);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar__inner">
          <div className="topbar__brand">
            <p className="topbar__name">{CONFIG.shopName}</p>
            {state.status === 'ok' && <p className="topbar__meta">{state.b.name} × {state.b.qty} ช่อ</p>}
          </div>
        </div>
      </header>
      <main className="wrap viewer">
        {state.status === 'loading' && <p className="viewer__msg">กำลังเปิดช่อ…</p>}
        {state.status === 'bad' && <p className="viewer__msg">ลิงก์ไม่ถูกต้อง — เปิดลิงก์ &ldquo;ดู 3D&rdquo; จาก Google Sheet ใหม่อีกครั้ง</p>}
        {state.status === 'ok' && (
          <>
            <div className="viewer__stage canvas__stage">
              <div className="artboard">
                {view === '3d' ? (
                  <Bouquet3D ref={threeRef} design={state.b.design} selected={null} readOnly label={`ช่อ ${state.b.name} แบบ 3D`} onFail={() => setView('2d')} />
                ) : (
                  <BouquetSvg design={state.b.design} label={`ช่อ ${state.b.name}`} />
                )}
              </div>
            </div>
            <div className="canvas__dock">
              <Seg label="มุมมอง" compact value={view} onChange={setView} options={[{ value: '3d', label: '3D' }, { value: '2d', label: '2D' }]} />
              {view === '3d' && (
                <button type="button" className="btn btn--ghost btn--xs" onClick={() => threeRef.current?.resetView()}>
                  <Icon name="rotate-ccw" size={16} />มุมเริ่มต้น
                </button>
              )}
            </div>
            {view === '3d' && <p className="canvas__hint">ลากเพื่อหมุนดูรอบช่อ · บีบนิ้วหรือ Ctrl + ล้อเมาส์เพื่อซูม</p>}
            <section className="viewer__sum">
              <h1 className="viewer__title">{state.b.name} <span className="num">× {state.b.qty}</span></h1>
              <Summary design={state.b.design} />
            </section>
          </>
        )}
      </main>
    </>
  );
}
