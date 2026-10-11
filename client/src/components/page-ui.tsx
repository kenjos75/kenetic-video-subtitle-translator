import type { ReactNode } from 'react'

export const inputClass =
  'block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink scheme-light-dark placeholder:text-muted/60 transition-shadow focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15'

export const primaryButtonClass =
  'inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-[0.95rem] font-semibold text-brand-ink transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

export const deleteButtonClass =
  'rounded-lg p-2 text-muted transition-colors hover:bg-red-500/10 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:text-red-400'

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-[0.95rem] text-muted">{description}</p>
    </>
  )
}

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}