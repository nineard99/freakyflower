import Link from 'next/link';
import { CONFIG } from '@/lib/catalog';
import { BouquetProvider } from '@/components/BouquetProvider';
import { OrderForm } from '@/components/OrderForm';

export default function Home() {
  return (
    <BouquetProvider>
      <main className="loy">
        {/* แสงโคมลอย / แสงเทียนกระทง ลอยขึ้นช้าๆ ด้านหลัง */}
        <div className="glow" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ '--x': `${(i * 23 + 7) % 100}%`, '--d': `${i * 1.7}s`, '--t': `${14 + (i % 4) * 3}s`, '--s': `${10 + (i % 3) * 6}px` } as React.CSSProperties} />)}
        </div>
        <div className="wrap loy__inner">
          <p className="logo">{CONFIG.shopName}</p>
          <OrderForm />
          <footer className="muted loy__contact">
            <p>สอบถาม LINE {CONFIG.lineId} · โทร {CONFIG.phone}</p>
            <p><Link href="/credits">เครดิตภาพดอกไม้</Link></p>
          </footer>
        </div>
      </main>
    </BouquetProvider>
  );
}
