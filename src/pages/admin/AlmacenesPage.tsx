import { useEffect, useState, FormEvent } from 'react'
import { Plus, Edit2, Power } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { 
  getInventarioResumen, InventarioResumen, 
  crearAlmacen, actualizarAlmacen, desactivarAlmacen
} from '@/api/graphql'

export function AlmacenesPage() {
  const [tab, setTab] = useState<'almacenes' | 'existencias'>('almacenes')
  const [data, setData] = useState<InventarioResumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modals
  const [isAlmacenModalOpen, setIsAlmacenModalOpen] = useState(false)

  // Edit states
  const [editingAlmacen, setEditingAlmacen] = useState<any>(null)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      setData(await getInventarioResumen())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleAlmacenSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nombre = form.get('nombre') as string
    const direccion = form.get('direccion') as string
    
    try {
      if (editingAlmacen) {
        await actualizarAlmacen(editingAlmacen.id, nombre, direccion)
      } else {
        await crearAlmacen(nombre, direccion)
      }
      setIsAlmacenModalOpen(false)
      cargarDatos()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const toggleAlmacenEstado = async (id: number) => {
    if (confirm('¿Cambiar estado de este almacén?')) {
      try {
        await desactivarAlmacen(id)
        cargarDatos()
      } catch(e: any) { alert(e.message) }
    }
  }

  if (cargando && !data) return <div>Cargando...</div>
  if (error) return <div className="notice error">{error}</div>

  return (
    <div className="content-panel">
      <div className="panel-heading" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">MÓDULO</p>
          <h2>Almacenes e Inventario</h2>
        </div>
      </div>

      <div className="tabs-nav">
        <button className={`tab-button ${tab === 'almacenes' ? 'active' : ''}`} onClick={() => setTab('almacenes')}>Bodegas / Sucursales</button>
        <button className={`tab-button ${tab === 'existencias' ? 'active' : ''}`} onClick={() => setTab('existencias')}>Existencias por Bodega</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {tab === 'almacenes' && <button className="primary-button" onClick={() => { setEditingAlmacen(null); setIsAlmacenModalOpen(true) }}><Plus size={16} style={{display:'inline', verticalAlign:'text-top', marginRight:4}}/> Nuevo Almacén</button>}
      </div>

      {/* Tabla Almacenes */}
      {tab === 'almacenes' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Dirección</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {data?.almacenes.map(a => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td><strong>{a.nombre}</strong></td>
                  <td>{a.direccion || 'N/A'}</td>
                  <td><Badge active={a.activo} /></td>
                  <td>
                    <button className="icon-button" style={{display:'inline-flex', width: 32, height: 32, marginRight: 8}} onClick={() => { setEditingAlmacen(a); setIsAlmacenModalOpen(true) }}><Edit2 size={14}/></button>
                    <button className="icon-button" style={{display:'inline-flex', width: 32, height: 32}} onClick={() => toggleAlmacenEstado(a.id)}><Power size={14} color={a.activo ? '#d9534f' : '#5cb85c'} /></button>
                  </td>
                </tr>
              ))}
              {data?.almacenes.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center', padding: 20}}>No hay almacenes registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Existencias */}
      {tab === 'existencias' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Almacén / Bodega</th><th>Stock Físico</th></tr></thead>
            <tbody>
              {data?.existencias.map(e => {
                const prod = data.productos.find(p => p.id === e.producto_id)
                const alma = data.almacenes.find(a => a.id === e.almacen_id)
                if (!prod || !alma) return null
                return (
                  <tr key={e.id}>
                    <td className="code">{prod.codigo}</td>
                    <td><strong>{prod.nombre}</strong></td>
                    <td>{prod.categoria.nombre}</td>
                    <td>{alma.nombre}</td>
                    <td><strong style={{color: Number(e.stock_actual) <= Number(prod.stock_minimo) ? '#d9534f' : 'inherit'}}>{e.stock_actual} {prod.unidad_medida.abreviatura}</strong></td>
                  </tr>
                )
              })}
              {data?.existencias.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center', padding: 20}}>No hay stock registrado en ningún almacén.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Almacen */}
      <Modal isOpen={isAlmacenModalOpen} onClose={() => setIsAlmacenModalOpen(false)} title={editingAlmacen ? "Editar Almacén" : "Nuevo Almacén"}>
        <form onSubmit={handleAlmacenSubmit}>
          <FormField label="Nombre (ej. Bodega Principal)"><input name="nombre" defaultValue={editingAlmacen?.nombre} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
          <FormField label="Dirección"><input name="direccion" defaultValue={editingAlmacen?.direccion} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsAlmacenModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Guardar</button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
