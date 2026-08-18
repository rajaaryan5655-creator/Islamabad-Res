import { PageHero } from '@/components/layout/page-hero';
import { ReservationForm } from '@/components/reservations/reservation-form';
import { JsonLd, breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Book a Table — Live Availability',
  description:
    'Reserve a table at Islamabad Restaurant in Margalla Town. Live availability against our real floor plan, instant confirmation, indoor hall, courtyard or private rooms. No deposit required.',
  path: '/reservations',
  image: '/images/interior-hall.jpg',
  keywords: ['book a table Islamabad', 'restaurant reservation Islamabad', 'private dining booking', 'table booking Margalla Town'],
});

export default function ReservationsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Reservations', path: '/reservations' }])} />

      <PageHero
        eyebrow="Reservations"
        title="Book a Table"
        accent="tonight"
        description="Live availability against our real floor plan — every slot you can select is genuinely free."
        image="/images/interior-hall.jpg"
        breadcrumbs={[{ label: 'Reservations', href: '/reservations' }]}
      />

      <div className="container-luxe py-14">
        <ReservationForm />
      </div>
    </>
  );
}
