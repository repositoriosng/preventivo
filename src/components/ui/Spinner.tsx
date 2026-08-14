// ============================================================
//  Spinner.tsx
// ============================================================
import React from 'react'

export default function Spinner({ fullScreen = false }: { fullScreen?: boolean }) {
  const style: React.CSSProperties = fullScreen
    ? { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FAF6' }
    : { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }

  return (
    <div style={style} role="status" aria-label="Cargando">
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #C8DED9',
        borderTopColor: '#1D9E75',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
