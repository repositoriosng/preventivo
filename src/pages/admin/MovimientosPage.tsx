import { useEffect, useState, FormEvent } from 'react'
import { Plus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { 
  getIngresos, getEgresos, Movimiento,
  registrarIngreso, registrarEgreso,
  getInventarioResumen, InventarioResumen
} from '@/api/graphql'

export function MovimientosPage() {
  const [tab, setTab] = useState<'ingresos' | 'egresos'>('ingresos')
  const [ingresos, setIngresos] = useState<Movimiento[]>([])
  const [egresos, setEgresos] = useState<Movimiento[]>([])
  const [inventario, setInventario] = useState<InventarioResumen | null>(null)
  
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detalles, setDetalles] = useState<{producto_id: number, cantidad: string}[]>([])

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [resIng, resEgr, resInv] = await Promise.all([
        getIngresos(),
        getEgresos(),
        getInventarioResumen()
      ])
      setIngresos(resIng.ingresos)
      setEgresos(resEgr.egresos)
      setInventario(resInv)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleOpenModal = () => {
    setDetalles([{ producto_id: 0, cantidad: '' }])
    setIsModalOpen(true)
  }

  const addDetalle = () => setDetalles([...detalles, { producto_id: 0, cantidad: '' }])
  const removeDetalle = (index: number) => setDetalles(detalles.filter((_, i) => i !== index))
  const updateDetalle = (index: number, key: 'producto_id' | 'cantidad', val: any) => {
    const nuevos = [...detalles]
    nuevos[index][key] = val
    setDetalles(nuevos)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (detalles.length === 0 || detalles.some(d => !d.producto_id || !d.cantidad || Number(d.cantidad) <= 0)) {
      alert("Debes agregar al menos un producto válido con cantidad mayor a 0.")
      return
    }

    const form = new FormData(e.currentTarget)
    const almacen_id = Number(form.get('almacen_id'))
    const tipo = form.get('tipo') as string
    const observacion = form.get('observacion') as string

    try {
      if (tab === 'ingresos') {
        await registrarIngreso(almacen_id, tipo, detalles, observacion)
      } else {
        await registrarEgreso(almacen_id, tipo, detalles, observacion)
      }
      setIsModalOpen(false)
      cargarDatos()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (cargando && !inventario) return <div>Cargando...</div>
  if (error) return <div className="notice error">{error}</div>

  const listado = tab === 'ingresos' ? ingresos : egresos

  return (
    <div className="content-panel">
      <div className="panel-heading" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">MÓDULO</p>
          <h2>Movimientos de Inventario</h2>
        </div>
      </div>

      <div className="tabs-nav">
        <button className={`tab-button ${tab === 'ingresos' ? 'active' : ''}`} onClick={() => setTab('ingresos')}>
          <ArrowDownToLine size={16} style={{display:'inline', verticalAlign:'text-bottom', marginRight:4}}/>
          Ingresos (Entradas)
        </button>
        <button className={`tab-button ${tab === 'egresos' ? 'active' : ''}`} onClick={() => setTab('egresos')}>
          <ArrowUpFromLine size={16} style={{display:'inline', verticalAlign:'text-bottom', marginRight:4}}/>
          Egresos (Salidas)
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="primary-button" onClick={handleOpenModal}>
          <Plus size={16} style={{display:'inline', verticalAlign:'text-top', marginRight:4}}/> 
          Registrar {tab === 'ingresos' ? 'Ingreso' : 'Egreso'}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Bodega</th>
              <th>Tipo</th>
              <th>Usuario</th>
              <th>Productos (Cantidades)</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            {listado.map(m => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>{new Date(m.fecha).toLocaleString()}</td>
                <td>{m.almacen.nombre}</td>
                <td><span className="badge active" style={{background: tab === 'ingresos' ? '#ddf2e9' : '#fee2e2', color: tab === 'ingresos' ? '#177254' : '#991b1b'}}>{m.tipo}</span></td>
                <td>{m.usuario.first_name || m.usuario.email}</td>
                <td>
                  <ul style={{margin: 0, paddingLeft: 16, fontSize: 13}}>
                    {m.detalles.map(d => (
                      <li key={d.id}>{d.producto.nombre} - <strong>{d.cantidad} {d.producto.unidad_medida.abreviatura}</strong></li>
                    ))}
                  </ul>
                </td>
                <td>{m.observacion || '-'}</td>
              </tr>
            ))}
            {listado.length === 0 && (
              <tr><td colSpan={7} style={{textAlign:'center', padding: 20}}>No hay {tab} registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Registrar ${tab === 'ingresos' ? 'Ingreso' : 'Egreso'}`}>
        <form onSubmit={handleSubmit}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <FormField label="Bodega / Sucursal">
              <select name="almacen_id" required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                <option value="">Seleccione bodega...</option>
                {inventario?.almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </FormField>
            
            <FormField label="Tipo de Movimiento">
              <select name="tipo" required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                {tab === 'ingresos' ? (
                  <>
                    <option value="COMPRA">Compra</option>
                    <option value="AJUSTE">Ajuste Positivo</option>
                    <option value="DEVOLUCION">Devolución</option>
                  </>
                ) : (
                  <>
                    <option value="VENTA">Venta</option>
                    <option value="AJUSTE">Ajuste Negativo (Regalo/Uso interno)</option>
                    <option value="MERMA">Merma (Pérdida/Daño)</option>
                  </>
                )}
              </select>
            </FormField>
          </div>

          <div style={{marginTop: 16, marginBottom: 16, borderTop: '1px solid #eee', paddingTop: 16}}>
            <h4 style={{margin: '0 0 12px 0', fontSize: 14, color: '#147b68'}}>Productos a mover</h4>
            
            {detalles.map((d, index) => (
              <div key={index} style={{display:'flex', gap: 8, marginBottom: 8}}>
                <select 
                  value={d.producto_id} 
                  onChange={e => updateDetalle(index, 'producto_id', Number(e.target.value))}
                  required 
                  style={{flex: 1, padding:'8px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}
                >
                  <option value={0}>Seleccione producto...</option>
                  {inventario?.productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
                </select>
                
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Cantidad"
                  value={d.cantidad}
                  onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                  required 
                  style={{width: 100, padding:'8px', borderRadius:'6px', border:'1px solid #ccc'}}
                />
                
                {detalles.length > 1 && (
                  <button type="button" onClick={() => removeDetalle(index)} className="secondary-button" style={{padding: '8px 12px', color: '#d9534f'}}>X</button>
                )}
              </div>
            ))}
            
            <button type="button" onClick={addDetalle} style={{background: 'none', border: 'none', color: '#147b68', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 8}}>
              + Agregar otro producto
            </button>
          </div>

          <FormField label="Observaciones (opcional)">
            <textarea name="observacion" style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', minHeight: 60}}/>
          </FormField>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Guardar Movimiento</button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
