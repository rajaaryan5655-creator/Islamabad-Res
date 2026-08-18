'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-ember-500 text-white hover:bg-ember-600 shadow-lg shadow-ember-900/20 hover:shadow-xl hover:shadow-ember-900/30 shimmer',
        gold: 'bg-saffron-400 text-obsidian hover:bg-saffron-300 shadow-lg shadow-saffron-600/20 shimmer font-semibold',
        dark: 'bg-obsidian text-cream hover:bg-charcoal-2 shadow-lg',
        outline:
          'border border-current/25 bg-transparent hover:bg-current/5 hover:border-current/50',
        outlineGold:
          'border border-saffron-400/60 text-saffron-400 bg-transparent hover:bg-saffron-400 hover:text-obsidian',
        ghost: 'hover:bg-black/5 dark:hover:bg-white/10',
        link: 'underline-offset-4 hover:underline text-ember-500 p-0 h-auto',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-4 text-xs tracking-widest uppercase rounded-sm [&_svg]:size-3.5',
        md: 'h-11 px-6 text-[0.8rem] tracking-[0.18em] uppercase rounded-sm [&_svg]:size-4',
        lg: 'h-14 px-9 text-[0.82rem] tracking-[0.2em] uppercase rounded-sm [&_svg]:size-[18px]',
        icon: 'h-10 w-10 rounded-sm [&_svg]:size-[18px]',
        pill: 'h-10 px-5 text-sm rounded-full [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            <span className="sr-only">Loading</span>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
