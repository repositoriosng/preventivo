const graphqlUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/graphql/'

type GraphQLResponse<T> = {
  data?: T
  errors?: { message: string }[]
}

export async function graphqlRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('inventario_token')
        ? { Authorization: `Bearer ${localStorage.getItem('inventario_token')}` }
        : {}),
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al consultar el backend.`)
  }

  const result = await response.json() as GraphQLResponse<T>
  if (result.errors?.length) {
    throw new Error(result.errors.map(error => error.message).join(', '))
  }
  if (!result.data) {
    throw new Error('El backend no devolvio datos.')
  }
  return result.data
}

export interface AuthResponse {
  login: { 
    token: string; 
    usuario: { 
      id: number; username: string; email: string; first_name: string; is_staff: boolean;
      roles: { id: number; name: string }[];
      perfil: { activo: boolean; almacen_predeterminado: { id: number, nombre: string } | null } | null
    } 
  }
}

export function login(email: string, password: string) {
  return graphqlRequest<AuthResponse>(
    'mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { token usuario { id username email first_name is_staff roles { id name } perfil { activo almacen_predeterminado { id nombre } } } } }',
    { email, password },
  )
}

export interface ProductoResumen {
  id: number
  codigo: string
  nombre: string
  precio_venta: string
  precio_compra?: string
  moneda: string
  stock_minimo: string
  activo: boolean
  categoria: { nombre: string }
  unidad_medida: { abreviatura: string }
}

export interface AlmacenResumen {
  id: number
  nombre: string
  direccion: string
  activo: boolean
}

export interface ExistenciaResumen {
  id: number
  producto_id: number
  almacen_id: number
  stock_actual: string
}

export interface InventarioResumen {
  productos: ProductoResumen[]
  almacenes: AlmacenResumen[]
  existencias: ExistenciaResumen[]
}

export function getInventarioResumen() {
  return graphqlRequest<InventarioResumen>(`{
    productos {
      id codigo nombre precio_venta moneda stock_minimo activo
      categoria { nombre }
      unidad_medida { abreviatura }
    }
    almacenes { id nombre direccion activo }
    existencias { id producto_id almacen_id stock_actual }
  }`)
}

export interface Categoria {
  id: number
  nombre: string
  descripcion: string
}

export interface UnidadMedida {
  id: number
  nombre: string
  abreviatura: string
}

export interface CatalogoResumen {
  productos: (ProductoResumen & { 
    descripcion: string, 
    precio_compra: string,
    categoria: { id: number, nombre: string, descripcion: string },
    unidad_medida: { id: number, nombre: string, abreviatura: string }
  })[]
  categorias: Categoria[]
  unidades_medida: UnidadMedida[]
}

export function getCatalogo() {
  return graphqlRequest<CatalogoResumen>(`{
    productos(solo_activos: false) {
      id codigo nombre descripcion precio_compra precio_venta moneda stock_minimo activo
      categoria { id nombre descripcion }
      unidad_medida { id nombre abreviatura }
    }
    categorias { id nombre descripcion }
    unidades_medida { id nombre abreviatura }
  }`)
}

export function crearCategoria(nombre: string, descripcion: string) {
  return graphqlRequest<{ crear_categoria: Categoria }>(
    'mutation CrearCategoria($nombre: String!, $descripcion: String!) { crear_categoria(nombre: $nombre, descripcion: $descripcion) { id nombre descripcion } }',
    { nombre, descripcion }
  )
}

export function actualizarCategoria(id: number, nombre: string, descripcion: string) {
  return graphqlRequest<{ actualizar_categoria: Categoria }>(
    'mutation ActualizarCategoria($id: Int!, $nombre: String!, $descripcion: String!) { actualizar_categoria(id: $id, nombre: $nombre, descripcion: $descripcion) { id nombre descripcion } }',
    { id, nombre, descripcion }
  )
}

export function crearUnidadMedida(nombre: string, abreviatura: string) {
  return graphqlRequest<{ crear_unidad_medida: UnidadMedida }>(
    'mutation CrearUnidadMedida($nombre: String!, $abreviatura: String!) { crear_unidad_medida(nombre: $nombre, abreviatura: $abreviatura) { id nombre abreviatura } }',
    { nombre, abreviatura }
  )
}

export function actualizarUnidadMedida(id: number, nombre: string, abreviatura: string) {
  return graphqlRequest<{ actualizar_unidad_medida: UnidadMedida }>(
    'mutation ActualizarUnidadMedida($id: Int!, $nombre: String!, $abreviatura: String!) { actualizar_unidad_medida(id: $id, nombre: $nombre, abreviatura: $abreviatura) { id nombre abreviatura } }',
    { id, nombre, abreviatura }
  )
}

export function crearProducto(datos: any) {
  return graphqlRequest<{ crear_producto: any }>(
    'mutation CrearProducto($datos: ProductoInput!) { crear_producto(datos: $datos) { id codigo nombre } }',
    { datos }
  )
}

export function actualizarProducto(id: number, datos: any) {
  return graphqlRequest<{ actualizar_producto: any }>(
    'mutation ActualizarProducto($id: Int!, $datos: ProductoInput!) { actualizar_producto(id: $id, datos: $datos) { id codigo nombre } }',
    { id, datos }
  )
}

export function desactivarProducto(id: number) {
  return graphqlRequest<{ desactivar_producto: boolean }>(
    'mutation DesactivarProducto($id: Int!) { desactivar_producto(id: $id) }',
    { id }
  )
}

export function crearAlmacen(nombre: string, direccion: string) {
  return graphqlRequest<{ crear_almacen: AlmacenResumen }>(
    'mutation CrearAlmacen($nombre: String!, $direccion: String!) { crear_almacen(nombre: $nombre, direccion: $direccion) { id nombre direccion activo } }',
    { nombre, direccion }
  )
}

export function actualizarAlmacen(id: number, nombre: string, direccion: string) {
  return graphqlRequest<{ actualizar_almacen: AlmacenResumen }>(
    'mutation ActualizarAlmacen($id: Int!, $nombre: String!, $direccion: String!) { actualizar_almacen(id: $id, nombre: $nombre, direccion: $direccion) { id nombre direccion activo } }',
    { id, nombre, direccion }
  )
}

export function desactivarAlmacen(id: number) {
  return graphqlRequest<{ desactivar_almacen: boolean }>(
    'mutation DesactivarAlmacen($id: Int!) { desactivar_almacen(id: $id) }',
    { id }
  )
}

export interface DetalleMovimiento {
  id: number
  producto: ProductoResumen
  cantidad: string
}

export interface Movimiento {
  id: number
  almacen: AlmacenResumen
  usuario: { first_name: string, email: string }
  fecha: string
  tipo: string
  observacion: string
  detalles: DetalleMovimiento[]
}

export function getIngresos() {
  return graphqlRequest<{ ingresos: Movimiento[] }>(`{
    ingresos {
      id almacen { id nombre } usuario { first_name email } fecha tipo observacion
      detalles { id cantidad producto { id codigo nombre categoria { nombre } unidad_medida { abreviatura } } }
    }
  }`)
}

export function getEgresos() {
  return graphqlRequest<{ egresos: Movimiento[] }>(`{
    egresos {
      id almacen { id nombre } usuario { first_name email } fecha tipo observacion
      detalles { id cantidad producto { id codigo nombre categoria { nombre } unidad_medida { abreviatura } } }
    }
  }`)
}

export function registrarIngreso(almacen_id: number, tipo: string, detalles: any[], observacion: string) {
  return graphqlRequest<{ registrar_ingreso: Movimiento }>(
    'mutation RegistrarIngreso($almacen_id: Int!, $tipo: String!, $detalles: [DetalleMovimientoInput!]!, $observacion: String!) { registrar_ingreso(almacen_id: $almacen_id, tipo: $tipo, detalles: $detalles, observacion: $observacion) { id } }',
    { almacen_id, tipo, detalles, observacion }
  )
}

export function registrarEgreso(almacen_id: number, tipo: string, detalles: any[], observacion: string) {
  return graphqlRequest<{ registrar_egreso: Movimiento }>(
    'mutation RegistrarEgreso($almacen_id: Int!, $tipo: String!, $detalles: [DetalleMovimientoInput!]!, $observacion: String!) { registrar_egreso(almacen_id: $almacen_id, tipo: $tipo, detalles: $detalles, observacion: $observacion) { id } }',
    { almacen_id, tipo, detalles, observacion }
  )
}

// ── Terceros ────────────────────────────────────────────────────────────────

export interface ClienteResumen {
  id: number
  tipo_documento: string
  numero_documento: string
  nombre: string
  telefono: string
  email: string
  direccion: string
  activo: boolean
}

export interface ProveedorResumen {
  id: number
  razon_social: string
  numero_documento: string
  telefono: string
  email: string
  contacto: string
  activo: boolean
}

const CLIENTE_FIELDS = 'id tipo_documento numero_documento nombre telefono email direccion activo'
const PROVEEDOR_FIELDS = 'id razon_social numero_documento telefono email contacto activo'

export function getClientes() {
  return graphqlRequest<{ clientes: ClienteResumen[] }>(`{ clientes { ${CLIENTE_FIELDS} } }`)
}

export function getProveedores() {
  return graphqlRequest<{ proveedores: ProveedorResumen[] }>(`{ proveedores { ${PROVEEDOR_FIELDS} } }`)
}

export function crearCliente(datos: Omit<ClienteResumen, 'id' | 'activo'>) {
  return graphqlRequest<{ crear_cliente: ClienteResumen }>(
    `mutation CrearCliente($tipo_documento: String!, $numero_documento: String!, $nombre: String!, $telefono: String!, $email: String!, $direccion: String!) {
      crear_cliente(tipo_documento: $tipo_documento, numero_documento: $numero_documento, nombre: $nombre, telefono: $telefono, email: $email, direccion: $direccion) { ${CLIENTE_FIELDS} } }`,
    datos
  )
}

export function actualizarCliente(id: number, datos: Omit<ClienteResumen, 'id' | 'activo'>) {
  return graphqlRequest<{ actualizar_cliente: ClienteResumen }>(
    `mutation ActualizarCliente($id: Int!, $tipo_documento: String!, $numero_documento: String!, $nombre: String!, $telefono: String!, $email: String!, $direccion: String!) {
      actualizar_cliente(id: $id, tipo_documento: $tipo_documento, numero_documento: $numero_documento, nombre: $nombre, telefono: $telefono, email: $email, direccion: $direccion) { ${CLIENTE_FIELDS} } }`,
    { id, ...datos }
  )
}

export function desactivarCliente(id: number) {
  return graphqlRequest<{ desactivar_cliente: boolean }>(
    'mutation DesactivarCliente($id: Int!) { desactivar_cliente(id: $id) }', { id }
  )
}

export function crearProveedor(datos: Omit<ProveedorResumen, 'id' | 'activo'>) {
  return graphqlRequest<{ crear_proveedor: ProveedorResumen }>(
    `mutation CrearProveedor($razon_social: String!, $numero_documento: String!, $telefono: String!, $email: String!, $contacto: String!) {
      crear_proveedor(razon_social: $razon_social, numero_documento: $numero_documento, telefono: $telefono, email: $email, contacto: $contacto) { ${PROVEEDOR_FIELDS} } }`,
    datos
  )
}

export function actualizarProveedor(id: number, datos: Omit<ProveedorResumen, 'id' | 'activo'>) {
  return graphqlRequest<{ actualizar_proveedor: ProveedorResumen }>(
    `mutation ActualizarProveedor($id: Int!, $razon_social: String!, $numero_documento: String!, $telefono: String!, $email: String!, $contacto: String!) {
      actualizar_proveedor(id: $id, razon_social: $razon_social, numero_documento: $numero_documento, telefono: $telefono, email: $email, contacto: $contacto) { ${PROVEEDOR_FIELDS} } }`,
    { id, ...datos }
  )
}

export function desactivarProveedor(id: number) {
  return graphqlRequest<{ desactivar_proveedor: boolean }>(
    'mutation DesactivarProveedor($id: Int!) { desactivar_proveedor(id: $id) }', { id }
  )
}

// ── Compras ─────────────────────────────────────────────────────────────────

export interface DetalleCompraResumen {
  id: number
  producto: ProductoResumen
  cantidad: string
  precio_unitario: string
  subtotal: string
}

export interface CompraResumen {
  id: number
  proveedor: ProveedorResumen
  usuario: { first_name: string, email: string }
  fecha: string
  numero_factura: string
  estado: string
  moneda: string
  tipo_cambio: string
  subtotal: string
  impuesto: string
  total: string
  detalles: DetalleCompraResumen[]
}

export function getCompras() {
  return graphqlRequest<{ compras: CompraResumen[] }>(`{
    compras {
      id
      proveedor { id razon_social numero_documento }
      usuario { first_name email }
      fecha
      numero_factura
      estado
      moneda
      tipo_cambio
      subtotal
      impuesto
      total
      detalles {
        id
        cantidad
        precio_unitario
        subtotal
        producto { id codigo nombre unidad_medida { abreviatura } }
      }
    }
  }`)
}

export function registrarCompra(
  proveedor_id: number,
  numero_factura: string,
  estado: string,
  detalles: { producto_id: number, cantidad: string, precio_unitario: string }[],
  almacen_id?: number,
  moneda: string = 'BOB',
  tipo_cambio: string = '6.96'
) {
  return graphqlRequest<{ registrar_compra: CompraResumen }>(
    `mutation RegistrarCompra($proveedor_id: Int!, $numero_factura: String!, $estado: String!, $detalles: [DetalleCompraInput!]!, $almacen_id: Int, $moneda: String!, $tipo_cambio: String!) {
      registrar_compra(proveedor_id: $proveedor_id, numero_factura: $numero_factura, estado: $estado, detalles: $detalles, almacen_id: $almacen_id, moneda: $moneda, tipo_cambio: $tipo_cambio) { id }
    }`,
    { proveedor_id, numero_factura, estado, detalles, almacen_id, moneda, tipo_cambio }
  )
}

// ── Ventas ──────────────────────────────────────────────────────────────────

export interface DetalleVentaResumen {
  id: number
  producto: ProductoResumen
  cantidad: string
  precio_unitario: string
  subtotal: string
}

export interface VentaResumen {
  id: number
  cliente: ClienteResumen
  usuario: { first_name: string, email: string }
  fecha: string
  estado: string
  moneda: string
  tipo_cambio: string
  subtotal: string
  impuesto: string
  total: string
  detalles: DetalleVentaResumen[]
}

export function getVentas() {
  return graphqlRequest<{ ventas: VentaResumen[] }>(`{
    ventas {
      id
      cliente { id nombre tipo_documento numero_documento }
      usuario { first_name email }
      fecha
      estado
      moneda
      tipo_cambio
      subtotal
      impuesto
      total
      detalles {
        id
        cantidad
        precio_unitario
        subtotal
        producto { id codigo nombre unidad_medida { abreviatura } }
      }
    }
  }`)
}

export function registrarVenta(
  cliente_id: number,
  estado: string,
  detalles: { producto_id: number, cantidad: string, precio_unitario: string }[],
  almacen_id?: number,
  moneda: string = 'BOB',
  tipo_cambio: string = '6.96'
) {
  return graphqlRequest<{ registrar_venta: VentaResumen }>(
    `mutation RegistrarVenta($cliente_id: Int!, $estado: String!, $detalles: [DetalleVentaInput!]!, $almacen_id: Int, $moneda: String!, $tipo_cambio: String!) {
      registrar_venta(cliente_id: $cliente_id, estado: $estado, detalles: $detalles, almacen_id: $almacen_id, moneda: $moneda, tipo_cambio: $tipo_cambio) { id }
    }`,
    { cliente_id, estado, detalles, almacen_id, moneda, tipo_cambio }
  )
}

// ── Kardex ──────────────────────────────────────────────────────────────────

export interface KardexMovimiento {
  fecha: string
  operacion: string
  usuario: string
  almacen: string
  entrada: string
  salida: string
  saldo: string
}

export function getKardex(producto_id: number, almacen_id?: number) {
  return graphqlRequest<{ kardex_producto: KardexMovimiento[] }>(
    `query GetKardex($producto_id: Int!, $almacen_id: Int) {
      kardex_producto(producto_id: $producto_id, almacen_id: $almacen_id) {
        fecha operacion usuario almacen entrada salida saldo
      }
    }`,
    { producto_id, almacen_id }
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface AlertaStockResumen {
  producto: ProductoResumen
  almacen: { id: number, nombre: string }
  stock_actual: string
  stock_minimo: string
}

export interface DashboardResumen {
  total_productos: number
  total_clientes: number
  total_proveedores: number
  total_almacenes: number
  productos_stock_critico: AlertaStockResumen[]
  ultimas_ventas: VentaResumen[]
  ultimas_compras: CompraResumen[]
}

export function getDashboardResumen() {
  return graphqlRequest<{ dashboard_resumen: DashboardResumen }>(`{
    dashboard_resumen {
      total_productos
      total_clientes
      total_proveedores
      total_almacenes
      productos_stock_critico {
        stock_actual
        stock_minimo
        producto { id codigo nombre }
        almacen { id nombre }
      }
      ultimas_ventas {
        id fecha estado total
        cliente { nombre }
        usuario { first_name email }
      }
      ultimas_compras {
        id fecha estado total
        proveedor { razon_social }
        usuario { first_name email }
      }
    }
  }`)
}

// ── Usuarios & Roles ─────────────────────────────────────────────────────────

export interface RolResumen {
  id: number
  name: string
}

export interface PerfilResumen {
  id: number
  telefono: string
  cargo: string
  almacen_predeterminado: { id: number, nombre: string } | null
  activo: boolean
}

export interface UsuarioResumen {
  id: number
  username: string
  email: string
  first_name: string
  is_staff: boolean
  roles: RolResumen[]
  perfil: PerfilResumen | null
}

export function getRoles() {
  return graphqlRequest<{ roles: RolResumen[] }>(`{ roles { id name } }`)
}

export function getUsuarios(soloActivos: boolean = false) {
  return graphqlRequest<{ usuarios: UsuarioResumen[] }>(
    `query GetUsuarios($solo_activos: Boolean!) {
      usuarios(solo_activos: $solo_activos) {
        id username email first_name is_staff
        roles { id name }
        perfil { id telefono cargo activo almacen_predeterminado { id nombre } }
      }
    }`,
    { solo_activos: soloActivos }
  )
}

export function crearUsuario(
  email: string, password: string, nombre: string, roles: number[],
  telefono: string = '', cargo: string = '', almacen_id?: number
) {
  return graphqlRequest<{ crear_usuario: UsuarioResumen }>(
    `mutation CrearUsuario($email: String!, $password: String!, $nombre: String!, $roles: [Int!]!, $telefono: String!, $cargo: String!, $almacen_id: Int) {
      crear_usuario(email: $email, password: $password, nombre: $nombre, roles: $roles, telefono: $telefono, cargo: $cargo, almacen_id: $almacen_id) { id }
    }`,
    { email, password, nombre, roles, telefono, cargo, almacen_id }
  )
}

export function actualizarUsuario(
  id: number, email: string, nombre: string, roles: number[],
  telefono: string = '', cargo: string = '', almacen_id?: number, password?: string
) {
  return graphqlRequest<{ actualizar_usuario: UsuarioResumen }>(
    `mutation ActualizarUsuario($id: Int!, $email: String!, $nombre: String!, $roles: [Int!]!, $telefono: String!, $cargo: String!, $almacen_id: Int, $password: String!) {
      actualizar_usuario(id: $id, email: $email, nombre: $nombre, roles: $roles, telefono: $telefono, cargo: $cargo, almacen_id: $almacen_id, password: $password) { id }
    }`,
    { id, email, nombre, roles, telefono, cargo, almacen_id, password: password || "" }
  )
}

export function desactivarUsuario(id: number) {
  return graphqlRequest<{ desactivar_usuario: boolean }>(
    `mutation DesactivarUsuario($id: Int!) { desactivar_usuario(id: $id) }`,
    { id }
  )
}
