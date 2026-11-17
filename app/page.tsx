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
          <p>สอบถามได้ทาง IG หรือ TikTok ของร้าน</p>
          <div className="site-foot__links">
            <a href={`https://www.instagram.com/${CONFIG.instagram}/`} target="_blank" rel="noopener noreferrer" className="link site-foot__ig">
              <Icon name="instagram" size={16} />IG @{CONFIG.instagram}
            </a>
            <a href={`https://www.tiktok.com/@${CONFIG.tiktok}`} target="_blank" rel="noopener noreferrer" className="link site-foot__ig">
              <Icon name="tiktok" size={16} />TikTok @{CONFIG.tiktok}
            </a>
          </div>
        </div>
      </footer>
    </BouquetProvider>
  );
}
