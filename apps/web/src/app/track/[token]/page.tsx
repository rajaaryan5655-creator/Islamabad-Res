import { OrderTracker } from '@/components/commerce/order-tracker';
import { buildMetadata } from '@/lib/seo';

export const metadata = {
  ...buildMetadata({ title: 'Track your order', description: 'Live status of your Islamabad Restaurant order.', path: '/track' }),
  robots: { index: false, follow: false },
};

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-cream pt-[7.5rem]">
      <div className="container-luxe py-12">
        <OrderTracker token={token} />
      </div>
    </div>
  );
}
