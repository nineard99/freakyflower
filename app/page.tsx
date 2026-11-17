import { CONFIG } from '@/lib/catalog';
import { BouquetProvider } from '@/components/BouquetProvider';
import { Icon } from '@/components/Icon';
import { OrderForm } from '@/components/OrderForm';

export default function Home() {
  return (
    <BouquetProvider>
      <OrderForm />
      <footer className="site-foot">
        <div className="wrap site-foot__inner">
          <p>สอบถาม LINE <span className="num">{CONFIG.lineId}</span> · โทร <span className="num">{CONFIG.phone}</span></p>
          <a href={`https://www.instagram.com/${CONFIG.instagram}/`} target="_blank" rel="noopener noreferrer" className="link site-foot__ig">
            <Icon name="instagram" size={16} />@{CONFIG.instagram}
          </a>
        </div>
      </footer>
    </BouquetProvider>
  );
}
