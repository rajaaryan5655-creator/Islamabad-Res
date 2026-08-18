'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GalleryImage {
  src: string;
  alt: string;
  category: string;
  span: string;
}

const CATEGORIES = ['All', 'Food', 'Restaurant', 'Events', 'Team'];

export function GalleryGrid({
  images,
  videos,
}: {
  images: GalleryImage[];
  videos: { id: string; title: string; poster: string; duration: string }[];
}) {
  const [filter, setFilter] = useState('All');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = filter === 'All' ? images : images.filter((i) => i.category === filter);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? null : (i + 1) % filtered.length));
      if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, filtered.length]);

  return (
    <div className="container-luxe py-14">
      {/* filters */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium transition-all',
              filter === c ? 'bg-obsidian text-cream' : 'bg-white text-black/60 hover:bg-black/5',
            )}
          >
            {c}
            <span className="ml-1.5 text-xs opacity-45">
              {c === 'All' ? images.length : images.filter((i) => i.category === c).length}
            </span>
          </button>
        ))}
      </div>

      {/* masonry */}
      <motion.div layout className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((img, i) => (
            <motion.button
              key={img.src}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.32, delay: Math.min(i, 10) * 0.03 }}
              onClick={() => setLightbox(i)}
              className="group relative block w-full break-inside-avoid overflow-hidden rounded-sm bg-black/5"
              aria-label={`View ${img.alt}`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={600}
                height={img.span === 'tall' ? 800 : img.span === 'wide' ? 400 : 600}
                sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-107"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-obsidian/85 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                <p className="text-left text-sm text-cream">{img.alt}</p>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* videos */}
      <section className="mt-20">
        <h2 className="mb-7 text-center font-display text-4xl">
          From <span className="script-accent">the kitchen</span>
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {videos.map((v) => (
            <div key={v.id} className="group relative aspect-video cursor-pointer overflow-hidden rounded-sm bg-black/5">
              <Image
                src={v.poster}
                alt={v.title}
                fill
                sizes="(max-width:768px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-obsidian/45 transition-colors group-hover:bg-obsidian/25" />
              <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ember-500 text-white transition-transform duration-400 group-hover:scale-110">
                <Play className="ml-0.5 size-5 fill-current" />
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                <p className="font-display text-lg text-cream">{v.title}</p>
                <span className="rounded-sm bg-obsidian/80 px-2 py-0.5 text-xs text-cream">{v.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* lightbox */}
      <AnimatePresence>
        {lightbox !== null && filtered[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-130 flex items-center justify-center bg-obsidian/96 p-4"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-label="Image viewer"
          >
            <button
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute right-5 top-5 flex size-11 items-center justify-center rounded-full text-cream transition-colors hover:bg-white/10"
            >
              <X className="size-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));
              }}
              aria-label="Previous image"
              className="absolute left-3 flex size-12 items-center justify-center rounded-full text-cream transition-colors hover:bg-white/10 md:left-8"
            >
              <ChevronLeft className="size-7" />
            </button>

            <motion.figure
              key={filtered[lightbox].src}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] w-full max-w-4xl"
            >
              <Image
                src={filtered[lightbox].src}
                alt={filtered[lightbox].alt}
                width={1400}
                height={1000}
                className="max-h-[80vh] w-full rounded-sm object-contain"
              />
              <figcaption className="mt-3 text-center text-sm text-cream/70">
                {filtered[lightbox].alt}
                <span className="ml-3 text-cream/35">
                  {lightbox + 1} / {filtered.length}
                </span>
              </figcaption>
            </motion.figure>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((i) => (i === null ? null : (i + 1) % filtered.length));
              }}
              aria-label="Next image"
              className="absolute right-3 flex size-12 items-center justify-center rounded-full text-cream transition-colors hover:bg-white/10 md:right-8"
            >
              <ChevronRight className="size-7" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
