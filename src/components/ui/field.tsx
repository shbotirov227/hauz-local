import type { ReactNode } from 'react'

export function Field({
  children,
  hint,
  label,
  name,
}: {
  children: ReactNode
  hint?: string
  label: string
  name: string
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}
