'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPKR } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  items?: { name: string; slug: string; price: number; image: string }[];
  actions?: { label: string; href: string }[];
  suggestions?: string[];
}

const GREETING: Message = {
  role: 'assistant',
  content:
    'Assalam-o-Alaikum. I can help you find a dish, check delivery to your area, book a table or track an order. What would you like to do?',
  suggestions: ['What are your best sellers?', 'Delivery to F-10?', 'Book a table for four', 'Vegetarian options'],
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;

    setMessages((m) => [...m, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);

    try {
      const res = await api.post<{
        reply: string;
        items?: Message['items'];
        actions?: Message['actions'];
        suggestions?: string[];
      }>('/api/assistant/chat', {
        message,
        history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: res.reply, items: res.items, actions: res.actions, suggestions: res.suggestions },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'I could not reach the kitchen just then. Please try again, or call us on +92 306 4650507.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? 'Close the assistant' : 'Ask our concierge'}
        className="no-print fixed bottom-5 right-5 z-90 flex size-14 items-center justify-center rounded-full bg-ember-500 text-white shadow-2xl shadow-ember-900/40 transition-colors hover:bg-ember-600"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="size-6" />
            </motion.span>
          ) : (
            <motion.span key="c" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="size-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && <span className="absolute -right-0.5 -top-0.5 size-3.5 animate-pulse rounded-full bg-saffron-400" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            role="dialog"
            aria-label="Restaurant concierge"
            className="no-print fixed bottom-24 right-5 z-90 flex h-[min(34rem,72vh)] w-[min(94vw,23rem)] flex-col overflow-hidden rounded-lg bg-cream shadow-2xl"
          >
            <header className="flex items-center gap-3 bg-obsidian px-4 py-3.5 text-cream">
              <span className="flex size-9 items-center justify-center rounded-full bg-ember-500">
                <Sparkles className="size-4" />
              </span>
              <div className="leading-tight">
                <p className="font-display text-lg">Concierge</p>
                <p className="flex items-center gap-1.5 text-[0.68rem] text-cream/55">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Answers from our live menu
                </p>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'space-y-2'}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] rounded-lg rounded-br-sm bg-ember-500 px-3.5 py-2.5 text-sm text-white'
                        : 'max-w-[92%] rounded-lg rounded-bl-sm bg-white px-3.5 py-2.5 text-sm leading-relaxed shadow-sm'
                    }
                  >
                    {m.content}
                  </div>

                  {m.items && m.items.length > 0 && (
                    <div className="grid gap-2">
                      {m.items.slice(0, 3).map((item) => (
                        <Link
                          key={item.slug}
                          href={`/menu/${item.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2.5 rounded-sm bg-white p-2 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-sm">
                            <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <p className="text-xs font-semibold text-ember-500">{formatPKR(item.price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        <Link
                          key={a.href}
                          href={a.href}
                          onClick={() => setOpen(false)}
                          className="rounded-full bg-obsidian px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-ember-500"
                        >
                          {a.label}
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.role === 'assistant' && i === messages.length - 1 && m.suggestions && !busy && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => void send(s)}
                          className="rounded-full border border-black/12 bg-white px-3 py-1.5 text-xs transition-colors hover:border-ember-500 hover:text-ember-500"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {busy && (
                <div className="flex gap-1.5 rounded-lg rounded-bl-sm bg-white px-4 py-3 shadow-sm w-fit">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-1.5 rounded-full bg-black/35"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex gap-2 border-t border-black/8 bg-white p-3"
            >
              <label htmlFor="chat-input" className="sr-only">
                Ask a question
              </label>
              <input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the menu, delivery, tables…"
                maxLength={500}
                className="h-10 flex-1 rounded-sm border border-black/12 px-3 text-sm outline-none focus:border-saffron-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Send"
                className="flex size-10 items-center justify-center rounded-sm bg-ember-500 text-white transition-colors hover:bg-ember-600 disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
