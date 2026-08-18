'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ---------------------------------- input --------------------------------- */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, hint, id, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-current/70">
            {label}
            {props.required && <span className="ml-1 text-ember-500">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'h-12 w-full rounded-sm border bg-white/80 px-4 text-[0.95rem] outline-none transition-all duration-200',
            'placeholder:text-current/35 focus:border-saffron-400 focus:bg-white focus:ring-2 focus:ring-saffron-400/20',
            'dark:bg-white/5 dark:focus:bg-white/10',
            error ? 'border-ember-500 focus:border-ember-500 focus:ring-ember-500/20' : 'border-current/15',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-ember-500">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-current/50">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

/* -------------------------------- textarea -------------------------------- */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-current/70">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          className={cn(
            'w-full resize-y rounded-sm border bg-white/80 px-4 py-3 text-[0.95rem] outline-none transition-all duration-200',
            'placeholder:text-current/35 focus:border-saffron-400 focus:bg-white focus:ring-2 focus:ring-saffron-400/20',
            'dark:bg-white/5 dark:focus:bg-white/10',
            error ? 'border-ember-500' : 'border-current/15',
            className,
          )}
          rows={props.rows ?? 4}
          {...props}
        />
        {error && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-ember-500">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

/* --------------------------------- select --------------------------------- */

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, children, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-current/70">
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={cn(
            'h-12 w-full appearance-none rounded-sm border bg-white/80 bg-[length:1.1em] bg-[right_0.9rem_center] bg-no-repeat px-4 pr-10 text-[0.95rem] outline-none transition-all',
            "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a8a8a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
            'focus:border-saffron-400 focus:ring-2 focus:ring-saffron-400/20 dark:bg-white/5',
            error ? 'border-ember-500' : 'border-current/15',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-ember-500">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';

/* ---------------------------------- badge --------------------------------- */

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'ember' | 'outline' | 'success' | 'muted';
  className?: string;
}) {
  const variants = {
    default: 'bg-obsidian text-cream',
    gold: 'bg-saffron-400 text-obsidian',
    ember: 'bg-ember-500 text-white',
    outline: 'border border-current/25 text-current',
    success: 'bg-emerald-600 text-white',
    muted: 'bg-current/10 text-current/70',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em]',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------- skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-current/10', className)} aria-hidden />;
}

/* --------------------------------- spinner -------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('size-6 animate-spin rounded-full border-2 border-current/20 border-t-ember-500', className)}
    />
  );
}
