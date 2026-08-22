import { useEffect, useState, FormEvent } from 'react'
import { Plus, Edit2, Power } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import {
  getClientes, getProveedores,
  crearCliente, actualizarCliente, desactivarCliente,
  crearProveedor, actualizarProveedor, desactivarProveedor,
  ClienteResumen, ProveedorResumen
} from '@/api/graphql'

const TIPOS_DOCUMENTO = ['RIF', 'CI', 'NIT', 'RUC', 'OTRO']

const EMPTY_CLIENTE: Omit<ClienteResumen, 'id' | 'activo'> = {
  tipo_documento: 'CI',
  numero_documento: '',
  nombre: '',
  telefono: '',
  email: '',
  direccion: '',
}

const EMPTY_PROVEEDOR: Omit<ProveedorResumen, 'id' | 'activo'> = {
  razon_social: '',
  numero_documento: '',
  telefono: '',
  email: '',
  contacto: '',
}

export function TercerosPage() {
  const [tab, setTab] = useState<'clientes' | 'proveedores'>('clientes')
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [proveedores, setProveedores] = useState<ProveedorResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false)
  const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<ClienteResumen | null>(null)
  const [editingProveedor, setEditingProveedor] = useState<ProveedorResumen | null>(null)

  // Form state for cliente
  const [formCliente, setFormCliente] = useState(EMPTY_CLIENTE)
  // Form state for proveedor
  const [formProveedor, setFormProveedor] = useState(EMPTY_PROVEEDOR)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [resC, resP] = await Promise.all([getClientes(), getProveedores()])
      setClientes(resC.clientes)
      setProveedores(resP.proveedores)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarDatos() }, [])

  const abrirModalCliente = (c?: ClienteResumen) => {
    setEditingCliente(c ?? null)
    setFormCliente(c ? { ...c } : EMPTY_CLIENTE)
    setIsClienteModalOpen(true)
  }

  const abrirModalProveedor = (p?: ProveedorResumen) => {
    setEditingProveedor(p ?? null)
    setFormProveedor(p ? { ...p } : EMPTY_PROVEEDOR)
    setIsProveedorModalOpen(true)
  }

  const handleClienteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (editingCliente) {
        await actualizarCliente(editingCliente.id, formCliente)
      } else {
        await crearCliente(formCliente)
      }
      setIsClienteModalOpen(false)
      cargarDatos()
    } catch (err: any) { alert(err.message) }
  }

  const handleProveedorSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (editingProveedor) {
        await actualizarProveedor(editingProveedor.id, formProveedor)
      } else {
        await crearProveedor(formProveedor)
      }
      setIsProveedorModalOpen(false)
      cargarDatos()
    } catch (err: any) { alert(err.message) }
  }

  const toggleCliente = async (id: number) => {
    if (confirm('¿Cambiar estado de este cliente?')) {
      try { await desactivarCliente(id); cargarDatos() } catch (e: any) { alert(e.message) }
    }
  }

  const toggleProveedor = async (id: number) => {
    if (confirm('¿Cambiar estado de este proveedor?')) {
      try { await desactivarProveedor(id); cargarDatos() } catch (e: any) { alert(e.message) }
    }
  }

  if (cargando && !clientes.length && !proveedores.length) return <div>Cargando...</div>
  if (error) return <div className="notice error">{error}</div>

  return (
    <div className="content-panel">
      <div className="panel-heading" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">MÓDULO</p>
          <h2>Terceros</h2>
        </div>
      </div>

      <div className="tabs-nav">
        <button className={`tab-button ${tab === 'clientes' ? 'active' : ''}`} onClick={() => setTab('clientes')}>
          Clientes
        </button>
        <button className={`tab-button ${tab === 'proveedores' ? 'active' : ''}`} onClick={() => setTab('proveedores')}>
          Proveedores
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {tab === 'clientes' && (
          <button className="primary-button" onClick={() => abrirModalCliente()}>
            <Plus size={16} style={{ display: 'inline', verticalAlign: 'text-top', marginRight: 4 }} /> Nuevo Cliente
          </button>
        )}
        {tab === 'proveedores' && (
          <button className="primary-button" onClick={() => abrirModalProveedor()}>
            <Plus size={16} style={{ display: 'inline', verticalAlign: 'text-top', marginRight: 4 }} /> Nuevo Proveedor
          </button>
        )}
      </div>

      {/* Tabla Clientes */}
      {tab === 'clientes' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo Doc.</th><th>N° Documento</th><th>Nombre</th>
                <th>Teléfono</th><th>Email</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id}>
                  <td><span className="badge active" style={{ background: '#e9f0ff', color: '#3b5bdb' }}>{c.tipo_documento}</span></td>
                  <td className="code">{c.numero_documento}</td>
                  <td><strong>{c.nombre}</strong></td>
                  <td>{c.telefono || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td><Badge active={c.activo} /></td>
                  <td>
                    <button className="icon-button" style={{ display: 'inline-flex', width: 32, height: 32, marginRight: 8 }} onClick={() => abrirModalCliente(c)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="icon-button" style={{ display: 'inline-flex', width: 32, height: 32 }} onClick={() => toggleCliente(c.id)}>
                      <Power size={14} color={c.activo ? '#d9534f' : '#5cb85c'} />
                    </button>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>No hay clientes registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Proveedores */}
      {tab === 'proveedores' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N° Documento</th><th>Razón Social</th><th>Contacto</th>
                <th>Teléfono</th><th>Email</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map(p => (
                <tr key={p.id}>
                  <td className="code">{p.numero_documento}</td>
                  <td><strong>{p.razon_social}</strong></td>
                  <td>{p.contacto || '-'}</td>
                  <td>{p.telefono || '-'}</td>
                  <td>{p.email || '-'}</td>
                  <td><Badge active={p.activo} /></td>
                  <td>
                    <button className="icon-button" style={{ display: 'inline-flex', width: 32, height: 32, marginRight: 8 }} onClick={() => abrirModalProveedor(p)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="icon-button" style={{ display: 'inline-flex', width: 32, height: 32 }} onClick={() => toggleProveedor(p.id)}>
                      <Power size={14} color={p.activo ? '#d9534f' : '#5cb85c'} />
                    </button>
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>No hay proveedores registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Cliente */}
      <Modal isOpen={isClienteModalOpen} onClose={() => setIsClienteModalOpen(false)} title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <form onSubmit={handleClienteSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Tipo Documento">
              <select value={formCliente.tipo_documento} onChange={e => setFormCliente({ ...formCliente, tipo_documento: e.target.value })}
                required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff' }}>
                {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="N° Documento">
              <input value={formCliente.numero_documento} onChange={e => setFormCliente({ ...formCliente, numero_documento: e.target.value })}
                required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </FormField>
          </div>
          <FormField label="Nombre completo">
            <input value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
              required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Teléfono">
              <input value={formCliente.telefono} onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </FormField>
            <FormField label="Email">
              <input type="email" value={formCliente.email} onChange={e => setFormCliente({ ...formCliente, email: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </FormField>
          </div>
          <FormField label="Dirección">
            <input value={formCliente.direccion} onChange={e => setFormCliente({ ...formCliente, direccion: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </FormField>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsClienteModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Proveedor */}
      <Modal isOpen={isProveedorModalOpen} onClose={() => setIsProveedorModalOpen(false)} title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
        <form onSubmit={handleProveedorSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="N° Documento (RIF/NIT/etc)">
              <input value={formProveedor.numero_documento} onChange={e => setFormProveedor({ ...formProveedor, numero_documento: e.target.value })}
                required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </FormField>
            <FormField label="Persona de contacto">
              <input value={formProveedor.contacto} onChange={e => setFormProveedor({ ...formProveedor, contacto: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </FormField>
          </div>
          <FormField label="Razón Social / Nombre Empresa">
            <input value={formProveedor.razon_social} onChange={e => setFormProveedor({ ...formProveedor, razon_social: e.target.value })}
              required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Teléfono">
              <input value={formProveedor.telefono} onChange={e => setFormProveedor({ ...formProveedor, telefono: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </FormField>
            <FormField label="Email">
              <input type="email" value={formProveedor.email} onChange={e => setFormProveedor({ ...formProveedor, email: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </FormField>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsProveedorModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
