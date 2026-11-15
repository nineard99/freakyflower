import Link from 'next/link';
import { CONFIG } from '@/lib/catalog';
import { BouquetProvider } from '@/components/BouquetProvider';
import { OrderForm } from '@/components/OrderForm';

export default function Home() {
  return (
    <BouquetProvider>
      <OrderForm />
      <footer className="site-foot">
        <div className="wrap site-foot__inner">
          <p>สอบถาม LINE <span className="num">{CONFIG.lineId}</span> · โทร <span className="num">{CONFIG.phone}</span></p>
          <Link href="/credits" className="link">เครดิตภาพดอกไม้</Link>
        </div>
      </footer>
    </BouquetProvider>
  );
}
