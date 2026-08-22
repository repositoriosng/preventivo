import { useEffect, useState } from 'react'
import { getDashboardResumen, DashboardResumen } from '@/api/graphql'
import { Package, Warehouse, Users, ShoppingCart, Store, AlertTriangle } from 'lucide-react'

export function DashboardPage() {
  const [data, setData] = useState<DashboardResumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardResumen()
      .then(res => setData(res.dashboard_resumen))
      .catch(err => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <div style={{padding: 24}}>Cargando dashboard...</div>
  if (error) return <div className="notice error">{error}</div>
  if (!data) return null

  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{marginBottom: 4}}>RESUMEN GENERAL</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111827' }}>Dashboard</h2>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center' }}>
          <div style={{ background: '#e0e7ff', padding: 12, borderRadius: 10, marginRight: 16, color: '#4338ca' }}><Package size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Total Productos</p>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>{data.total_productos}</h3>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center' }}>
          <div style={{ background: '#fce7f3', padding: 12, borderRadius: 10, marginRight: 16, color: '#be185d' }}><Warehouse size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Total Almacenes</p>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>{data.total_almacenes}</h3>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center' }}>
          <div style={{ background: '#dcfce7', padding: 12, borderRadius: 10, marginRight: 16, color: '#15803d' }}><Users size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Total Clientes</p>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>{data.total_clientes}</h3>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center' }}>
          <div style={{ background: '#fef3c7', padding: 12, borderRadius: 10, marginRight: 16, color: '#b45309' }}><ShoppingCart size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Proveedores</p>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>{data.total_proveedores}</h3>
          </div>
        </div>
      </div>

      {/* Alertas de Stock */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', marginBottom: 24, borderLeft: data.productos_stock_critico.length > 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <AlertTriangle size={20} color={data.productos_stock_critico.length > 0 ? '#ef4444' : '#10b981'} style={{ marginRight: 8 }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Alertas de Stock Crítico</h3>
        </div>
        
        {data.productos_stock_critico.length === 0 ? (
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Todo en orden. No hay productos con stock por debajo del mínimo.</p>
        ) : (
          <div className="table-wrap" style={{ margin: 0, border: '1px solid #fee2e2' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: '#fef2f2' }}>
                  <th>Producto</th>
                  <th>Almacén</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {data.productos_stock_critico.map((alerta, i) => (
                  <tr key={i}>
                    <td><strong>{alerta.producto.codigo}</strong> - {alerta.producto.nombre}</td>
                    <td>{alerta.almacen.nombre}</td>
                    <td><strong style={{color: '#dc2626'}}>{alerta.stock_actual}</strong></td>
                    <td>{alerta.stock_minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actividad Reciente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Últimas Ventas */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <Store size={18} style={{ marginRight: 8, color: '#147b68' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Últimas Ventas</h3>
          </div>
          {data.ultimas_ventas.length === 0 ? (
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>No hay ventas registradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.ultimas_ventas.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{v.cliente.nombre}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(v.fecha).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>${Number(v.total).toLocaleString()}</div>
                    <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: v.estado === 'COMP' ? '#dcfce7' : '#fee2e2', color: v.estado === 'COMP' ? '#166534' : '#991b1b', display: 'inline-block' }}>
                      {v.estado === 'COMP' ? 'Completada' : 'Pendiente/Anulada'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas Compras */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <ShoppingCart size={18} style={{ marginRight: 8, color: '#2563eb' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Últimas Compras</h3>
          </div>
          {data.ultimas_compras.length === 0 ? (
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>No hay compras registradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.ultimas_compras.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{c.proveedor.razon_social}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(c.fecha).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>${Number(c.total).toLocaleString()}</div>
                    <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: c.estado === 'REC' ? '#dcfce7' : '#fef3c7', color: c.estado === 'REC' ? '#166534' : '#92400e', display: 'inline-block' }}>
                      {c.estado === 'REC' ? 'Recibida' : 'Pendiente/Anulada'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
