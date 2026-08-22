import { useEffect, useState, FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { 
  getVentas, registrarVenta, VentaResumen,
  getClientes, ClienteResumen,
  getInventarioResumen, InventarioResumen
} from '@/api/graphql'

export function VentasPage() {
  const [ventas, setVentas] = useState<VentaResumen[]>([])
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [inventario, setInventario] = useState<InventarioResumen | null>(null)
  
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detalles, setDetalles] = useState<{producto_id: number, cantidad: string, precio_unitario: string}[]>([])

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [resVentas, resCl, resInv] = await Promise.all([
        getVentas(),
        getClientes(true), // solo activos
        getInventarioResumen()
      ])
      setVentas(resVentas.ventas)
      setClientes(resCl.clientes)
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
    setDetalles([{ producto_id: 0, cantidad: '', precio_unitario: '' }])
    setIsModalOpen(true)
  }

  const addDetalle = () => setDetalles([...detalles, { producto_id: 0, cantidad: '', precio_unitario: '' }])
  const removeDetalle = (index: number) => setDetalles(detalles.filter((_, i) => i !== index))
  const updateDetalle = (index: number, key: keyof typeof detalles[0], val: any) => {
    const nuevos = [...detalles]
    nuevos[index] = { ...nuevos[index], [key]: val }
    setDetalles(nuevos)
  }

  const calcularTotalFormulario = () => {
    return detalles.reduce((acc, d) => {
      const cant = Number(d.cantidad) || 0
      const prec = Number(d.precio_unitario) || 0
      return acc + (cant * prec)
    }, 0)
  }

  const handleProductoChange = (index: number, prodId: number) => {
    const prod = inventario?.productos.find(p => p.id === prodId)
    const nuevos = [...detalles]
    nuevos[index].producto_id = prodId
    if (prod) {
      // Prellenar precio de venta
      nuevos[index].precio_unitario = prod.precio_venta
    }
    setDetalles(nuevos)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (detalles.length === 0 || detalles.some(d => !d.producto_id || !d.cantidad || Number(d.cantidad) <= 0 || !d.precio_unitario || Number(d.precio_unitario) < 0)) {
      alert("Revisa los productos: asegúrate de seleccionar un producto, cantidad > 0 y precio >= 0.")
      return
    }

    const form = new FormData(e.currentTarget)
    const cliente_id = Number(form.get('cliente_id'))
    const estado = form.get('estado') as string
    const almacen_id = form.get('almacen_id') ? Number(form.get('almacen_id')) : undefined
    const moneda = form.get('moneda') as string || 'BOB'
    const tipo_cambio = form.get('tipo_cambio') as string || '6.96'

    try {
      await registrarVenta(cliente_id, estado, detalles, almacen_id, moneda, tipo_cambio)
      setIsModalOpen(false)
      cargarDatos()
    } catch (err: any) {
      alert("Error al registrar venta: " + err.message)
    }
  }

  if (cargando && !ventas.length) return <div>Cargando...</div>
  if (error) return <div className="notice error">{error}</div>

  return (
    <div className="content-panel">
      <div className="panel-heading" style={{ marginBottom: 16 }}>
        <div>
          <p className="eyebrow">MÓDULO</p>
          <h2>Ventas a Clientes</h2>
        </div>
        <button className="primary-button" onClick={handleOpenModal}>
          <Plus size={16} style={{display:'inline', verticalAlign:'text-top', marginRight:4}}/> 
          Registrar Venta
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>N° Venta</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Vendedor</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => (
              <tr key={v.id}>
                <td><strong>#{v.id}</strong></td>
                <td>{new Date(v.fecha).toLocaleString()}</td>
                <td>{v.cliente.nombre}</td>
                <td><strong>{v.moneda === 'USD' ? '$' : 'Bs.'} {Number(v.total).toFixed(2)}</strong></td>
                <td>
                  <span className="badge active" style={{
                    background: v.estado === 'COMP' ? '#ddf2e9' : v.estado === 'ANU' ? '#fee2e2' : '#fef3c7',
                    color: v.estado === 'COMP' ? '#177254' : v.estado === 'ANU' ? '#991b1b' : '#92400e'
                  }}>
                    {v.estado === 'COMP' ? 'Completada' : v.estado === 'ANU' ? 'Anulada' : 'Pendiente'}
                  </span>
                </td>
                <td>{v.usuario.first_name || v.usuario.email}</td>
              </tr>
            ))}
            {ventas.length === 0 && (
              <tr><td colSpan={6} style={{textAlign:'center', padding: 20}}>No hay ventas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nota de Venta">
        <form onSubmit={handleSubmit} style={{maxWidth: 700}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <FormField label="Cliente">
              <select name="cliente_id" required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                <option value="">Seleccione cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.numero_documento})</option>)}
              </select>
            </FormField>

            <FormField label="Estado de la venta">
              <select name="estado" defaultValue="COMP" required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                <option value="PEND">Pendiente (No descuenta stock)</option>
                <option value="COMP">Completada (Descuenta stock automáticamente)</option>
              </select>
            </FormField>
          </div>

          <div style={{marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
            <FormField label="Moneda">
              <select name="moneda" defaultValue="BOB" style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                <option value="BOB">Bolivianos (Bs.)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </FormField>
            <FormField label="Tipo de Cambio (Bs. por $1 USD)">
              <input name="tipo_cambio" type="number" step="0.0001" defaultValue="6.96" style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}} />
            </FormField>
            <FormField label="Almacén Origen (De donde sale la mercancía)">
              <select name="almacen_id" required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                <option value="">Seleccione bodega...</option>
                {inventario?.almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </FormField>
          </div>

          <div style={{marginTop: 24, marginBottom: 16, borderTop: '1px solid #eee', paddingTop: 16}}>
            <h4 style={{margin: '0 0 12px 0', fontSize: 15, color: '#147b68'}}>Detalle de Productos</h4>
            
            <div style={{
              display: 'grid', 
              gridTemplateColumns: detalles.length > 1 ? '1fr 90px 110px 100px 40px' : '1fr 90px 110px 100px', 
              gap: 8, 
              marginBottom: 8, 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#666', 
              alignItems: 'center'
            }}>
              <div>Producto</div>
              <div>Cantidad</div>
              <div>Precio Unit. ($)</div>
              <div style={{textAlign: 'right'}}>Subtotal</div>
              {detalles.length > 1 && <div></div>}
            </div>

            {detalles.map((d, index) => {
              const sub = (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0)
              
              return (
                <div key={index} style={{
                  display: 'grid', 
                  gridTemplateColumns: detalles.length > 1 ? '1fr 90px 110px 100px 40px' : '1fr 90px 110px 100px', 
                  gap: 8, 
                  marginBottom: 8, 
                  alignItems: 'center'
                }}>
                  <select 
                    value={d.producto_id} 
                    onChange={e => handleProductoChange(index, Number(e.target.value))}
                    required 
                    style={{width: '100%', padding:'8px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff', minWidth: 0}}
                  >
                    <option value={0}>Seleccione...</option>
                    {inventario?.productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
                  </select>
                  
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Cant."
                    value={d.cantidad}
                    onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                    required 
                    style={{width: '100%', padding:'8px', borderRadius:'6px', border:'1px solid #ccc', minWidth: 0}}
                  />

                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Precio"
                    value={d.precio_unitario}
                    onChange={e => updateDetalle(index, 'precio_unitario', e.target.value)}
                    required 
                    style={{width: '100%', padding:'8px', borderRadius:'6px', border:'1px solid #ccc', minWidth: 0}}
                  />

                  <div style={{textAlign: 'right', fontWeight: 600}}>
                    ${sub.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                  
                  {detalles.length > 1 && (
                    <button type="button" onClick={() => removeDetalle(index)} className="secondary-button" style={{padding: '8px', color: '#d9534f', width: '100%', minWidth: 0}}>X</button>
                  )}
                </div>
              )
            })}
            
            <button type="button" onClick={addDetalle} style={{background: 'none', border: 'none', color: '#147b68', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 8}}>
              + Agregar fila
            </button>
          </div>

          <div style={{display: 'flex', justifyContent: 'flex-end', padding: '16px 0', borderTop: '2px dashed #eee', marginTop: 16}}>
            <div style={{textAlign: 'right', fontSize: 18}}>
              <span style={{color: '#666', marginRight: 16}}>Total de la Venta:</span>
              <strong style={{color: '#147b68'}}>${calcularTotalFormulario().toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Registrar Venta</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
