import { useUIStore } from '@/store'

const COLORS = {
  success: { bg: '#E1F5EE', border: '#1D9E75', text: '#085041', icon: '✓' },
  error:   { bg: '#FCEBEB', border: '#E24B4A', text: '#501313', icon: '✕' },
  warning: { bg: '#FEF9EC', border: '#EF9F27', text: '#633806', icon: '⚠' },
  info:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E3A5F', icon: 'ℹ' },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999,
      width: 'calc(100% - 32px)', maxWidth: 400,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type]
        return (
          <div
            key={t.id}
            role="alert"
            style={{
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              pointerEvents: 'all',
              animation: 'slideUp 0.2s ease',
            }}
          >
            <span style={{ color: c.border, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {c.icon}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: c.text }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'transparent', border: 'none', color: c.text, cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )
      })}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
