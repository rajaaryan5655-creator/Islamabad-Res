import { CheckoutForm } from '@/components/commerce/checkout-form';
import { buildMetadata } from '@/lib/seo';

export const metadata = {
  ...buildMetadata({
    title: 'Checkout',
    description: 'Complete your order from Islamabad Restaurant.',
    path: '/checkout',
  }),
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-cream pt-[7.5rem]">
      <div className="container-luxe py-12">
        <h1 className="mb-2 font-display text-[clamp(2.2rem,5vw,3.2rem)] font-semibold">Checkout</h1>
        <p className="mb-9 text-black/55">Cooked to order, dispatched hot. You will get a live tracking link.</p>
        <CheckoutForm />
      </div>
    </div>
  );
}
