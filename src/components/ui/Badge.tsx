interface BadgeProps {
  active: boolean
  label?: string
}

export function Badge({ active, label }: BadgeProps) {
  return (
    <span className={`badge ${active ? 'active' : 'inactive'}`}>
      {label || (active ? 'Activo' : 'Inactivo')}
    </span>
  )
}
