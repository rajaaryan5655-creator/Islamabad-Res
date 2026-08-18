import { GALLERY, VIDEO_GALLERY } from '@islamabad/shared';
import { PageHero } from '@/components/layout/page-hero';
import { GalleryGrid } from '@/components/gallery/gallery-grid';
import { JsonLd, breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Gallery — Food, Room & Events',
  description:
    'Photographs of our food, the dining hall, the charcoal counter, private events and the team at Islamabad Restaurant, Margalla Town.',
  path: '/gallery',
  image: '/images/interior-hall.jpg',
  keywords: ['restaurant photos Islamabad', 'Pakistani food photos', 'restaurant interior Islamabad'],
});

export default function GalleryPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Gallery', path: '/gallery' }])} />

      <PageHero
        eyebrow="Gallery"
        title="The room,"
        accent="the fire, the food"
        description="Photographs from the dining hall, the charcoal counter, and the private rooms."
        image="/images/interior-courtyard.jpg"
        breadcrumbs={[{ label: 'Gallery', href: '/gallery' }]}
      />

      <GalleryGrid images={[...GALLERY]} videos={[...VIDEO_GALLERY]} />
    </>
  );
}
