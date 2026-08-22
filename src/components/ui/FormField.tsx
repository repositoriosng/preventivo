import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  children: ReactNode
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label style={{ display: 'grid', gap: '7px', color: '#526a63', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
      {label}
      <div style={{ fontWeight: 'normal', color: '#17252b' }}>
        {children}
      </div>
      {error && <span style={{ color: '#9b3d32', fontSize: '12px', fontWeight: 'normal' }}>{error}</span>}
    </label>
  )
}
