import { useState, FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login({ email, password })
    } catch {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        {/* Logo / encabezado */}
        <div style={styles.header}>
          <div style={styles.logo}>⚙</div>
          <h1 style={styles.title}>Maple Mantenimiento</h1>
          <p style={styles.subtitle}>Sistema de mantenimiento preventivo</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operador@maplelc.com"
              required
              style={styles.input}
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p style={styles.footer}>
          ¿Problemas para ingresar? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  )
}

// Estilos inline para no depender de CSS externo aún
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F0FAF6',
    padding: '16px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px 32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#0F2621',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#5A7A72',
    margin: '6px 0 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#2D4A42',
  },
  input: {
    border: '1px solid #C8DED9',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#0F2621',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  errorBox: {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#B91C1C',
  },
  btn: {
    background: '#1D9E75',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    marginTop: '4px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#8AADA6',
    marginTop: '24px',
    marginBottom: 0,
  },
}
