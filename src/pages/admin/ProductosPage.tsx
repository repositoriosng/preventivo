import { useEffect, useState, FormEvent } from 'react'
import { Plus, Search, Edit2, Power, BookOpen } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { 
  getCatalogo, CatalogoResumen, 
  crearCategoria, actualizarCategoria,
  crearUnidadMedida, actualizarUnidadMedida,
  crearProducto, actualizarProducto, desactivarProducto,
  getKardex, KardexMovimiento
} from '@/api/graphql'

export function ProductosPage() {
  const [tab, setTab] = useState<'productos' | 'categorias' | 'unidades'>('productos')
  const [data, setData] = useState<CatalogoResumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modals
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [isUniModalOpen, setIsUniModalOpen] = useState(false)
  const [isProdModalOpen, setIsProdModalOpen] = useState(false)
  const [isKardexOpen, setIsKardexOpen] = useState(false)
  const [kardexProducto, setKardexProducto] = useState<any>(null)
  const [kardexData, setKardexData] = useState<KardexMovimiento[]>([])
  const [kardexLoading, setKardexLoading] = useState(false)

  // Edit states
  const [editingCat, setEditingCat] = useState<any>(null)
  const [editingUni, setEditingUni] = useState<any>(null)
  const [editingProd, setEditingProd] = useState<any>(null)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      setData(await getCatalogo())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleCatSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nombre = form.get('nombre') as string
    const descripcion = form.get('descripcion') as string
    
    try {
      if (editingCat) {
        await actualizarCategoria(editingCat.id, nombre, descripcion)
      } else {
        await crearCategoria(nombre, descripcion)
      }
      setIsCatModalOpen(false)
      cargarDatos()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleUniSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nombre = form.get('nombre') as string
    const abreviatura = form.get('abreviatura') as string
    
    try {
      if (editingUni) {
        await actualizarUnidadMedida(editingUni.id, nombre, abreviatura)
      } else {
        await crearUnidadMedida(nombre, abreviatura)
      }
      setIsUniModalOpen(false)
      cargarDatos()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleProdSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    
    const input = {
      codigo: form.get('codigo') as string,
      nombre: form.get('nombre') as string,
      descripcion: form.get('descripcion') as string,
      categoria_id: Number(form.get('categoria_id')),
      unidad_medida_id: Number(form.get('unidad_medida_id')),
      precio_compra: form.get('precio_compra') as string,
      precio_venta: form.get('precio_venta') as string,
      moneda: form.get('moneda') as string || 'BOB',
      stock_minimo: form.get('stock_minimo') as string || "0"
    }
    
    try {
      if (editingProd) {
        await actualizarProducto(editingProd.id, input)
      } else {
        await crearProducto(input)
      }
      setIsProdModalOpen(false)
      cargarDatos()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const toggleProdEstado = async (id: number) => {
    if (confirm('¿Cambiar estado de este producto?')) {
      try {
        await desactivarProducto(id)
        cargarDatos()
      } catch(e: any) { alert(e.message) }
    }
  }

  const abrirKardex = async (p: any) => {
    setKardexProducto(p)
    setIsKardexOpen(true)
    setKardexLoading(true)
    try {
      const res = await getKardex(p.id)
      setKardexData(res.kardex_producto)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setKardexLoading(false)
    }
  }

  if (cargando && !data) return <div>Cargando...</div>
  if (error) return <div className="notice error">{error}</div>

  return (
    <div className="content-panel">
      <div className="panel-heading" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">MÓDULO</p>
          <h2>Catálogo de Productos</h2>
        </div>
      </div>

      <div className="tabs-nav">
        <button className={`tab-button ${tab === 'productos' ? 'active' : ''}`} onClick={() => setTab('productos')}>Productos</button>
        <button className={`tab-button ${tab === 'categorias' ? 'active' : ''}`} onClick={() => setTab('categorias')}>Categorías</button>
        <button className={`tab-button ${tab === 'unidades' ? 'active' : ''}`} onClick={() => setTab('unidades')}>Unidades</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <label className="search-box">
          <Search size={17} />
          <input placeholder="Buscar..." />
        </label>
        
        {tab === 'productos' && <button className="primary-button" onClick={() => { setEditingProd(null); setIsProdModalOpen(true) }}><Plus size={16} style={{display:'inline', verticalAlign:'text-top', marginRight:4}}/> Nuevo Producto</button>}
        {tab === 'categorias' && <button className="primary-button" onClick={() => { setEditingCat(null); setIsCatModalOpen(true) }}><Plus size={16} style={{display:'inline', verticalAlign:'text-top', marginRight:4}}/> Nueva Categoría</button>}
        {tab === 'unidades' && <button className="primary-button" onClick={() => { setEditingUni(null); setIsUniModalOpen(true) }}><Plus size={16} style={{display:'inline', verticalAlign:'text-top', marginRight:4}}/> Nueva Unidad</button>}
      </div>

      {/* Tabla Productos */}
      {tab === 'productos' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Precio Venta</th><th>Stock Min.</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {data?.productos.map(p => (
                <tr key={p.id}>
                  <td className="code">{p.codigo}</td>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{p.categoria.nombre}</td>
                  <td>
                    <span style={{fontWeight:600}}>{p.moneda === 'USD' ? '$' : 'Bs.'} {Number(p.precio_venta).toFixed(2)}</span>
                    <Badge variant="info" style={{marginLeft:6, fontSize:10}}>{p.moneda}</Badge>
                  </td>
                  <td>{p.stock_minimo} {p.unidad_medida.abreviatura}</td>
                  <td><Badge active={p.activo} /></td>
                  <td>
                    <button className="icon-button" title="Ver Kardex" style={{display:'inline-flex', width: 32, height: 32, marginRight: 4}} onClick={() => abrirKardex(p)}><BookOpen size={14} color="#147b68"/></button>
                    <button className="icon-button" style={{display:'inline-flex', width: 32, height: 32, marginRight: 4}} onClick={() => { setEditingProd(p); setIsProdModalOpen(true) }}><Edit2 size={14}/></button>
                    <button className="icon-button" style={{display:'inline-flex', width: 32, height: 32}} onClick={() => toggleProdEstado(p.id)}><Power size={14} color={p.activo ? '#d9534f' : '#5cb85c'} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Categorias */}
      {tab === 'categorias' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
            <tbody>
              {data?.categorias.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td><strong>{c.nombre}</strong></td>
                  <td>{c.descripcion}</td>
                  <td>
                    <button className="icon-button" style={{display:'inline-flex', width: 32, height: 32}} onClick={() => { setEditingCat(c); setIsCatModalOpen(true) }}><Edit2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Unidades */}
      {tab === 'unidades' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Abreviatura</th><th>Acciones</th></tr></thead>
            <tbody>
              {data?.unidades_medida.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><strong>{u.nombre}</strong></td>
                  <td>{u.abreviatura}</td>
                  <td>
                    <button className="icon-button" style={{display:'inline-flex', width: 32, height: 32}} onClick={() => { setEditingUni(u); setIsUniModalOpen(true) }}><Edit2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={editingCat ? "Editar Categoría" : "Nueva Categoría"}>
        <form onSubmit={handleCatSubmit}>
          <FormField label="Nombre"><input name="nombre" defaultValue={editingCat?.nombre} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
          <FormField label="Descripción"><textarea name="descripcion" defaultValue={editingCat?.descripcion} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', minHeight: 80}}/></FormField>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsCatModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isUniModalOpen} onClose={() => setIsUniModalOpen(false)} title={editingUni ? "Editar Unidad" : "Nueva Unidad"}>
        <form onSubmit={handleUniSubmit}>
          <FormField label="Nombre"><input name="nombre" defaultValue={editingUni?.nombre} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
          <FormField label="Abreviatura"><input name="abreviatura" defaultValue={editingUni?.abreviatura} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsUniModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isProdModalOpen} onClose={() => setIsProdModalOpen(false)} title={editingProd ? "Editar Producto" : "Nuevo Producto"}>
        <form onSubmit={handleProdSubmit}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <FormField label="Código"><input name="codigo" defaultValue={editingProd?.codigo} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
            <FormField label="Nombre"><input name="nombre" defaultValue={editingProd?.nombre} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
          </div>
          <FormField label="Descripción"><textarea name="descripcion" defaultValue={editingProd?.descripcion} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <FormField label="Categoría">
              <select name="categoria_id" defaultValue={editingProd?.categoria.id} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                <option value="">Seleccione...</option>
                {data?.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </FormField>
            <FormField label="Unidad">
              <select name="unidad_medida_id" defaultValue={editingProd?.unidad_medida.id} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                <option value="">Seleccione...</option>
                {data?.unidades_medida.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
              </select>
            </FormField>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16}}>
            <FormField label="Precio Compra"><input type="number" step="0.01" name="precio_compra" defaultValue={editingProd?.precio_compra} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
            <FormField label="Precio Venta"><input type="number" step="0.01" name="precio_venta" defaultValue={editingProd?.precio_venta} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>
            <FormField label="Moneda">
              <select name="moneda" defaultValue={editingProd?.moneda || 'BOB'} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', background:'#fff'}}>
                <option value="BOB">Bolivianos (Bs.)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </FormField>
          </div>
          <FormField label="Stock Mínimo"><input type="number" step="0.01" name="stock_minimo" defaultValue={editingProd?.stock_minimo || 0} required style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></FormField>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsProdModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Kardex */}
      <Modal isOpen={isKardexOpen} onClose={() => setIsKardexOpen(false)} title={`Kardex: ${kardexProducto?.nombre || ''}`}>
        <div style={{minWidth: 620}}>
          {kardexLoading ? (
            <p style={{textAlign:'center', padding:20}}>Cargando historial...</p>
          ) : kardexData.length === 0 ? (
            <p style={{textAlign:'center', padding:20, color:'#6b7280'}}>No hay movimientos registrados para este producto.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Bodega</th>
                    <th>Usuario</th>
                    <th style={{textAlign:'right', color:'#147b68'}}>Entrada (+)</th>
                    <th style={{textAlign:'right', color:'#c0392b'}}>Salida (-)</th>
                    <th style={{textAlign:'right', fontWeight:700}}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {kardexData.map((m, i) => (
                    <tr key={i}>
                      <td style={{fontSize:12}}>{new Date(m.fecha).toLocaleString('es-BO')}</td>
                      <td style={{fontSize:12}}>{m.operacion}</td>
                      <td style={{fontSize:12}}>{m.almacen}</td>
                      <td style={{fontSize:12}}>{m.usuario}</td>
                      <td style={{textAlign:'right', color:'#147b68', fontWeight: m.entrada ? 600 : 400}}>
                        {m.entrada ? `+${m.entrada}` : ''}
                      </td>
                      <td style={{textAlign:'right', color:'#c0392b', fontWeight: m.salida ? 600 : 400}}>
                        {m.salida ? `-${m.salida}` : ''}
                      </td>
                      <td style={{textAlign:'right', fontWeight:700}}>{m.saldo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

    </div>
  )
}
