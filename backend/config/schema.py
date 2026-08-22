from datetime import datetime, timedelta, timezone
from decimal import Decimal

import jwt
import strawberry
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from django.conf import settings
from strawberry.schema.config import StrawberryConfig
from strawberry.types import Info

from apps.inventario.models import Almacen, ProductoAlmacen
from apps.compras.models import Compra
from apps.compras.services import registrar_compra as srv_registrar_compra
from apps.ventas.models import NotaVenta
from apps.ventas.services import registrar_venta as srv_registrar_venta
from apps.movimientos.models import Ingreso, Egreso
from apps.movimientos.services import registrar_ingreso as srv_registrar_ingreso, registrar_egreso as srv_registrar_egreso
from apps.productos.models import Categoria, Producto, UnidadMedida
from apps.terceros.models import Cliente, Proveedor
from apps.usuarios.models import Usuario, Perfil
from django.contrib.auth.models import Group

from django.db.models import F


def _token(user: Usuario) -> str:
    return jwt.encode(
        {'user_id': user.id, 'exp': datetime.now(timezone.utc) + timedelta(hours=8)},
        settings.SECRET_KEY, algorithm='HS256'
    )


def _user_from_info(info: Info) -> Usuario:
    authorization = info.context.request.headers.get('Authorization', '')
    if not authorization.startswith('Bearer '):
        raise PermissionError('Se requiere autenticacion.')
    try:
        payload = jwt.decode(authorization[7:], settings.SECRET_KEY, algorithms=['HS256'])
        return Usuario.objects.get(id=payload['user_id'], is_active=True)
    except (jwt.PyJWTError, Usuario.DoesNotExist, KeyError) as error:
        raise PermissionError('Token invalido o expirado.') from error


def _check_role(user: Usuario, allowed_roles: list[str]) -> None:
    if user.is_staff:
        return
    user_roles = list(user.groups.values_list('name', flat=True))
    if not any(role in allowed_roles for role in user_roles):
        raise PermissionError(f'Permiso denegado. Se requiere uno de los siguientes roles: {", ".join(allowed_roles)}')


# ─── Types (orden de declaración importa) ────────────────────────────────────

@strawberry.type
class RolType:
    id: int
    name: str

@strawberry.type
class AlmacenType:
    id: int
    nombre: str
    direccion: str
    activo: bool

@strawberry.type
class PerfilType:
    id: int
    telefono: str
    cargo: str
    almacen_predeterminado: AlmacenType | None
    activo: bool

@strawberry.type
class UsuarioType:
    id: int
    username: str
    email: str
    first_name: str
    is_staff: bool
    roles: list[RolType]
    perfil: PerfilType | None


@strawberry.type
class AuthPayload:
    token: str
    usuario: UsuarioType


@strawberry.type
class CategoriaType:
    id: int
    nombre: str
    descripcion: str


@strawberry.type
class UnidadMedidaType:
    id: int
    nombre: str
    abreviatura: str


@strawberry.type
class ProductoType:
    id: int
    codigo: str
    nombre: str
    descripcion: str
    precio_compra: str
    precio_venta: str
    moneda: str
    stock_minimo: str
    activo: bool
    categoria: CategoriaType
    unidad_medida: UnidadMedidaType


@strawberry.type
class ExistenciaType:
    id: int
    producto_id: int
    almacen_id: int
    stock_actual: str


@strawberry.type
class DetalleMovimientoType:
    id: int
    producto: ProductoType
    cantidad: str


@strawberry.type
class KardexMovimientoType:
    fecha: str
    operacion: str
    usuario: str
    almacen: str
    entrada: str
    salida: str
    saldo: str


@strawberry.type
class IngresoType:
    id: int
    almacen: AlmacenType
    usuario: UsuarioType
    fecha: str
    tipo: str
    observacion: str
    detalles: list[DetalleMovimientoType]


@strawberry.type
class EgresoType:
    id: int
    almacen: AlmacenType
    usuario: UsuarioType
    fecha: str
    tipo: str
    observacion: str
    detalles: list[DetalleMovimientoType]


@strawberry.type
class ClienteType:
    id: int
    tipo_documento: str
    numero_documento: str
    nombre: str
    telefono: str
    email: str
    direccion: str
    activo: bool


@strawberry.type
class ProveedorType:
    id: int
    razon_social: str
    numero_documento: str
    telefono: str
    email: str
    contacto: str
    activo: bool


@strawberry.type
class DetalleCompraType:
    id: int
    producto: ProductoType
    cantidad: str
    precio_unitario: str
    subtotal: str


@strawberry.type
class CompraType:
    id: int
    proveedor: ProveedorType
    usuario: UsuarioType
    fecha: str
    numero_factura: str
    estado: str
    moneda: str
    tipo_cambio: str
    subtotal: str
    impuesto: str
    total: str
    detalles: list[DetalleCompraType]


@strawberry.type
class DetalleVentaType:
    id: int
    producto: ProductoType
    cantidad: str
    precio_unitario: str
    subtotal: str


@strawberry.type
class NotaVentaType:
    id: int
    cliente: ClienteType
    usuario: UsuarioType
    fecha: str
    estado: str
    moneda: str
    tipo_cambio: str
    subtotal: str
    impuesto: str
    total: str
    detalles: list[DetalleVentaType]


@strawberry.type
class AlertaStockType:
    producto: ProductoType
    almacen: AlmacenType
    stock_actual: str
    stock_minimo: str


@strawberry.type
class DashboardResumenType:
    total_productos: int
    total_clientes: int
    total_proveedores: int
    total_almacenes: int
    productos_stock_critico: list[AlertaStockType]
    ultimas_ventas: list[NotaVentaType]
    ultimas_compras: list[CompraType]


# ─── Inputs ───────────────────────────────────────────────────────────────────

@strawberry.input
class ProductoInput:
    codigo: str
    nombre: str
    categoria_id: int
    unidad_medida_id: int
    precio_compra: str
    precio_venta: str
    moneda: str = 'BOB'
    stock_minimo: str = '0'
    descripcion: str = ''


@strawberry.input
class DetalleMovimientoInput:
    producto_id: int
    cantidad: str


@strawberry.input
class DetalleCompraInput:
    producto_id: int
    cantidad: str
    precio_unitario: str


@strawberry.input
class DetalleVentaInput:
    producto_id: int
    cantidad: str
    precio_unitario: str


# ─── Helpers para construir tipos de retorno ──────────────────────────────────

def _to_usuario_type(user: Usuario) -> UsuarioType:
    roles = [RolType(id=g.id, name=g.name) for g in user.groups.all()]
    perfil_type = None
    if hasattr(user, 'perfil'):
        alm_type = None
        if user.perfil.almacen_predeterminado:
            a = user.perfil.almacen_predeterminado
            alm_type = AlmacenType(id=a.id, nombre=a.nombre, direccion=a.direccion, activo=a.activo)
        perfil_type = PerfilType(
            id=user.perfil.id, telefono=user.perfil.telefono, cargo=user.perfil.cargo,
            almacen_predeterminado=alm_type, activo=user.perfil.activo
        )
    return UsuarioType(
        id=user.id, username=user.username, email=user.email,
        first_name=user.first_name, is_staff=user.is_staff,
        roles=roles, perfil=perfil_type
    )

def _to_producto_type(p) -> ProductoType:
    return ProductoType(
        id=p.id, codigo=p.codigo, nombre=p.nombre, descripcion=p.descripcion,
        precio_compra=str(p.precio_compra), precio_venta=str(p.precio_venta),
        moneda=p.moneda,
        stock_minimo=str(p.stock_minimo), activo=p.activo,
        categoria=CategoriaType(id=p.categoria.id, nombre=p.categoria.nombre, descripcion=p.categoria.descripcion),
        unidad_medida=UnidadMedidaType(id=p.unidad_medida.id, nombre=p.unidad_medida.nombre, abreviatura=p.unidad_medida.abreviatura),
    )


def _to_ingreso_type(item) -> IngresoType:
    return IngresoType(
        id=item.id,
        almacen=AlmacenType(id=item.almacen.id, nombre=item.almacen.nombre, direccion=item.almacen.direccion, activo=item.almacen.activo),
        usuario=_to_usuario_type(item.usuario),
        fecha=item.fecha.isoformat(),
        tipo=item.tipo,
        observacion=item.observacion,
        detalles=[DetalleMovimientoType(id=d.id, cantidad=str(d.cantidad), producto=_to_producto_type(d.producto)) for d in item.detalles.all()],
    )


def _to_egreso_type(item) -> EgresoType:
    return EgresoType(
        id=item.id,
        almacen=AlmacenType(id=item.almacen.id, nombre=item.almacen.nombre, direccion=item.almacen.direccion, activo=item.almacen.activo),
        usuario=_to_usuario_type(item.usuario),
        fecha=item.fecha.isoformat(),
        tipo=item.tipo,
        observacion=item.observacion,
        detalles=[DetalleMovimientoType(id=d.id, cantidad=str(d.cantidad), producto=_to_producto_type(d.producto)) for d in item.detalles.all()],
    )


def _to_compra_type(item) -> CompraType:
    return CompraType(
        id=item.id,
        proveedor=ProveedorType(id=item.proveedor.id, razon_social=item.proveedor.razon_social, numero_documento=item.proveedor.numero_documento, telefono=item.proveedor.telefono, email=item.proveedor.email, contacto=item.proveedor.contacto, activo=item.proveedor.activo),
        usuario=_to_usuario_type(item.usuario),
        fecha=item.fecha.isoformat(),
        numero_factura=item.numero_factura,
        estado=item.estado,
        moneda=item.moneda,
        tipo_cambio=str(item.tipo_cambio),
        subtotal=str(item.subtotal),
        impuesto=str(item.impuesto),
        total=str(item.total),
        detalles=[DetalleCompraType(id=d.id, producto=_to_producto_type(d.producto), cantidad=str(d.cantidad), precio_unitario=str(d.precio_unitario), subtotal=str(d.subtotal)) for d in item.detalles.all()],
    )


def _to_venta_type(item) -> NotaVentaType:
    return NotaVentaType(
        id=item.id,
        cliente=ClienteType(id=item.cliente.id, tipo_documento=item.cliente.tipo_documento, numero_documento=item.cliente.numero_documento, nombre=item.cliente.nombre, telefono=item.cliente.telefono, email=item.cliente.email, direccion=item.cliente.direccion, activo=item.cliente.activo),
        usuario=_to_usuario_type(item.usuario),
        fecha=item.fecha.isoformat(),
        estado=item.estado,
        moneda=item.moneda,
        tipo_cambio=str(item.tipo_cambio),
        subtotal=str(item.subtotal),
        impuesto=str(item.impuesto),
        total=str(item.total),
        detalles=[DetalleVentaType(id=d.id, producto=_to_producto_type(d.producto), cantidad=str(d.cantidad), precio_unitario=str(d.precio_unitario), subtotal=str(d.subtotal)) for d in item.detalles.all()],
    )


# ─── Query ────────────────────────────────────────────────────────────────────

@strawberry.type
class Query:
    @strawberry.field
    def health(self) -> str:
        return 'ok'

    @strawberry.field
    def usuario_actual(self, info: Info) -> UsuarioType | None:
        try:
            user = _user_from_info(info)
        except PermissionError:
            return None
        return _to_usuario_type(user)

    @strawberry.field
    def categorias(self) -> list[CategoriaType]:
        return [CategoriaType(id=c.id, nombre=c.nombre, descripcion=c.descripcion) for c in Categoria.objects.all()]

    @strawberry.field
    def unidades_medida(self) -> list[UnidadMedidaType]:
        return [UnidadMedidaType(id=u.id, nombre=u.nombre, abreviatura=u.abreviatura) for u in UnidadMedida.objects.all()]

    @strawberry.field
    def almacenes(self, solo_activos: bool = False) -> list[AlmacenType]:
        qs = Almacen.objects.all()
        if solo_activos:
            qs = qs.filter(activo=True)
        return [AlmacenType(id=a.id, nombre=a.nombre, direccion=a.direccion, activo=a.activo) for a in qs]

    @strawberry.field
    def roles(self) -> list[RolType]:
        return [RolType(id=g.id, name=g.name) for g in Group.objects.all()]

    @strawberry.field
    def usuarios(self, info: Info, solo_activos: bool = False) -> list[UsuarioType]:
        actor = _user_from_info(info)
        if not actor.is_staff:
            raise PermissionError('Solo los administradores pueden listar usuarios.')
        qs = Usuario.objects.select_related('perfil__almacen_predeterminado').prefetch_related('groups').order_by('first_name')
        if solo_activos:
            qs = qs.filter(is_active=True, perfil__activo=True)
        return [_to_usuario_type(u) for u in qs]

    @strawberry.field
    def productos(self, solo_activos: bool = True) -> list[ProductoType]:
        query = Producto.objects.select_related('categoria', 'unidad_medida').order_by('nombre')
        if solo_activos:
            query = query.filter(activo=True)
        return [_to_producto_type(item) for item in query]

    @strawberry.field
    def kardex_producto(self, info: Info, producto_id: int, almacen_id: int | None = None) -> list[KardexMovimientoType]:
        from apps.movimientos.models import DetalleIngreso, DetalleEgreso
        from decimal import Decimal

        ingresos = DetalleIngreso.objects.filter(producto_id=producto_id).select_related('ingreso__usuario', 'ingreso__almacen')
        egresos = DetalleEgreso.objects.filter(producto_id=producto_id).select_related('egreso__usuario', 'egreso__almacen')
        
        if almacen_id:
            ingresos = ingresos.filter(ingreso__almacen_id=almacen_id)
            egresos = egresos.filter(egreso__almacen_id=almacen_id)

        movimientos = []
        for i in ingresos:
            movimientos.append({
                'fecha_obj': i.ingreso.fecha,
                'fecha': i.ingreso.fecha.isoformat(),
                'operacion': f"Ingreso - {i.ingreso.get_tipo_display()} {(' (Compra ' + i.ingreso.compra.numero_factura + ')') if i.ingreso.compra else ''}",
                'usuario': i.ingreso.usuario.first_name,
                'almacen': i.ingreso.almacen.nombre,
                'entrada': i.cantidad,
                'salida': Decimal('0.00')
            })
            
        for e in egresos:
            movimientos.append({
                'fecha_obj': e.egreso.fecha,
                'fecha': e.egreso.fecha.isoformat(),
                'operacion': f"Salida - {e.egreso.get_tipo_display()}",
                'usuario': e.egreso.usuario.first_name,
                'almacen': e.egreso.almacen.nombre,
                'entrada': Decimal('0.00'),
                'salida': e.cantidad
            })

        movimientos.sort(key=lambda x: x['fecha_obj'])
        
        resultado = []
        saldo = Decimal('0.00')
        for m in movimientos:
            saldo += m['entrada']
            saldo -= m['salida']
            resultado.append(KardexMovimientoType(
                fecha=m['fecha'],
                operacion=m['operacion'],
                usuario=m['usuario'],
                almacen=m['almacen'],
                entrada=str(m['entrada']) if m['entrada'] > 0 else '',
                salida=str(m['salida']) if m['salida'] > 0 else '',
                saldo=str(saldo)
            ))
            
        return resultado

    @strawberry.field
    def existencias(self, almacen_id: int | None = None) -> list[ExistenciaType]:
        query = ProductoAlmacen.objects.order_by('producto_id', 'almacen_id')
        if almacen_id is not None:
            query = query.filter(almacen_id=almacen_id)
        return [ExistenciaType(id=item.id, producto_id=item.producto_id, almacen_id=item.almacen_id, stock_actual=str(item.stock_actual))
                for item in query]

    @strawberry.field
    def ingresos(self) -> list[IngresoType]:
        query = Ingreso.objects.select_related('almacen', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).order_by('-fecha')
        return [_to_ingreso_type(item) for item in query]

    @strawberry.field
    def egresos(self) -> list[EgresoType]:
        query = Egreso.objects.select_related('almacen', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).order_by('-fecha')
        return [_to_egreso_type(item) for item in query]

    @strawberry.field
    def clientes(self, solo_activos: bool = False) -> list[ClienteType]:
        qs = Cliente.objects.order_by('nombre')
        if solo_activos:
            qs = qs.filter(activo=True)
        return [ClienteType(
            id=c.id, tipo_documento=c.tipo_documento, numero_documento=c.numero_documento,
            nombre=c.nombre, telefono=c.telefono, email=c.email,
            direccion=c.direccion, activo=c.activo
        ) for c in qs]

    @strawberry.field
    def proveedores(self, solo_activos: bool = False) -> list[ProveedorType]:
        qs = Proveedor.objects.order_by('razon_social')
        if solo_activos:
            qs = qs.filter(activo=True)
        return [ProveedorType(
            id=p.id, razon_social=p.razon_social, numero_documento=p.numero_documento,
            telefono=p.telefono, email=p.email, contacto=p.contacto, activo=p.activo
        ) for p in qs]

    @strawberry.field
    def compras(self) -> list[CompraType]:
        query = Compra.objects.select_related('proveedor', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).order_by('-fecha')
        return [_to_compra_type(item) for item in query]

    @strawberry.field
    def ventas(self) -> list[NotaVentaType]:
        query = NotaVenta.objects.select_related('cliente', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).order_by('-fecha')
        return [_to_venta_type(item) for item in query]


    @strawberry.field
    def dashboard_resumen(self) -> DashboardResumenType:
        # KPIs
        t_prod = Producto.objects.filter(activo=True).count()
        t_cli = Cliente.objects.filter(activo=True).count()
        t_prov = Proveedor.objects.filter(activo=True).count()
        t_alm = Almacen.objects.filter(activo=True).count()

        # Stock Crítico
        alertas = []
        pas = ProductoAlmacen.objects.filter(stock_actual__lte=F('producto__stock_minimo'), producto__activo=True).select_related('producto__categoria', 'producto__unidad_medida', 'almacen')
        for pa in pas:
            alertas.append(AlertaStockType(
                producto=_to_producto_type(pa.producto),
                almacen=AlmacenType(id=pa.almacen.id, nombre=pa.almacen.nombre, direccion=pa.almacen.direccion, activo=pa.almacen.activo),
                stock_actual=str(pa.stock_actual),
                stock_minimo=str(pa.producto.stock_minimo)
            ))

        # Actividad Reciente
        u_ventas_qs = NotaVenta.objects.select_related('cliente', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).order_by('-fecha')[:5]
        u_ventas = [_to_venta_type(v) for v in u_ventas_qs]

        u_compras_qs = Compra.objects.select_related('proveedor', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).order_by('-fecha')[:5]
        u_compras = [_to_compra_type(c) for c in u_compras_qs]

        return DashboardResumenType(
            total_productos=t_prod,
            total_clientes=t_cli,
            total_proveedores=t_prov,
            total_almacenes=t_alm,
            productos_stock_critico=alertas,
            ultimas_ventas=u_ventas,
            ultimas_compras=u_compras
        )

# ─── Mutation ─────────────────────────────────────────────────────────────────

@strawberry.type
class Mutation:
    @strawberry.mutation
    def login(self, email: str, password: str) -> AuthPayload:
        user = Usuario.objects.select_related('perfil__almacen_predeterminado').prefetch_related('groups').filter(email__iexact=email, is_active=True).first()
        if user is None or not user.check_password(password):
            raise PermissionError('Correo o contraseña incorrectos.')
        if hasattr(user, 'perfil') and not user.perfil.activo:
            raise PermissionError('Este usuario está desactivado.')
        return AuthPayload(
            token=_token(user),
            usuario=_to_usuario_type(user),
        )

    @strawberry.mutation
    def crear_usuario(self, info: Info, email: str, password: str, nombre: str, roles: list[int], telefono: str = '', cargo: str = '', almacen_id: int | None = None) -> UsuarioType:
        actor = _user_from_info(info)
        if not actor.is_staff:
            raise PermissionError('Solo un administrador puede crear usuarios.')
        if Usuario.objects.filter(email=email).exists():
            raise ValidationError('El correo ya esta registrado.')
        user = Usuario.objects.create(
            username=email, email=email, first_name=nombre, password=make_password(password)
        )
        if roles:
            user.groups.set(roles)
        Perfil.objects.create(
            usuario=user, telefono=telefono, cargo=cargo, almacen_predeterminado_id=almacen_id
        )
        # Re-fetch
        user = Usuario.objects.select_related('perfil__almacen_predeterminado').prefetch_related('groups').get(id=user.id)
        return _to_usuario_type(user)

    @strawberry.mutation
    def actualizar_usuario(self, info: Info, id: int, email: str, nombre: str, roles: list[int], telefono: str = '', cargo: str = '', almacen_id: int | None = None, password: str = '') -> UsuarioType:
        actor = _user_from_info(info)
        if not actor.is_staff:
            raise PermissionError('Solo un administrador puede actualizar usuarios.')
        user = Usuario.objects.select_related('perfil').get(id=id)
        if email != user.email and Usuario.objects.exclude(id=id).filter(email=email).exists():
            raise ValidationError('El correo ya esta registrado.')
        
        user.email = email
        user.username = email
        user.first_name = nombre
        if password:
            user.password = make_password(password)
        user.save()

        user.groups.set(roles)
        
        if hasattr(user, 'perfil'):
            user.perfil.telefono = telefono
            user.perfil.cargo = cargo
            user.perfil.almacen_predeterminado_id = almacen_id
            user.perfil.save()
        else:
            Perfil.objects.create(usuario=user, telefono=telefono, cargo=cargo, almacen_predeterminado_id=almacen_id)

        user = Usuario.objects.select_related('perfil__almacen_predeterminado').prefetch_related('groups').get(id=user.id)
        return _to_usuario_type(user)

    @strawberry.mutation
    def desactivar_usuario(self, info: Info, id: int) -> bool:
        actor = _user_from_info(info)
        if not actor.is_staff:
            raise PermissionError('Solo un administrador puede desactivar usuarios.')
        if actor.id == id:
            raise ValidationError('No puedes desactivarte a ti mismo.')
        
        user = Usuario.objects.get(id=id)
        if hasattr(user, 'perfil'):
            user.perfil.activo = not user.perfil.activo
            user.perfil.save()
            user.is_active = user.perfil.activo
            user.save()
        return True

    @strawberry.mutation
    def crear_producto(self, info: Info, datos: ProductoInput) -> ProductoType:
        user = _user_from_info(info)
        _check_role(user, ['Almacenero'])
        producto = Producto.objects.create(
            codigo=datos.codigo, nombre=datos.nombre, descripcion=datos.descripcion,
            categoria_id=datos.categoria_id, unidad_medida_id=datos.unidad_medida_id,
            precio_compra=Decimal(datos.precio_compra), precio_venta=Decimal(datos.precio_venta),
            moneda=datos.moneda,
            stock_minimo=Decimal(datos.stock_minimo),
        )
        return _to_producto_type(producto)

    @strawberry.mutation
    def actualizar_producto(self, info: Info, id: int, datos: ProductoInput) -> ProductoType:
        user = _user_from_info(info)
        _check_role(user, ['Almacenero'])
        producto = Producto.objects.select_related('categoria', 'unidad_medida').get(id=id)
        producto.codigo = datos.codigo
        producto.nombre = datos.nombre
        producto.descripcion = datos.descripcion
        producto.categoria_id = datos.categoria_id
        producto.unidad_medida_id = datos.unidad_medida_id
        producto.precio_compra = Decimal(datos.precio_compra)
        producto.precio_venta = Decimal(datos.precio_venta)
        producto.moneda = datos.moneda
        producto.stock_minimo = Decimal(datos.stock_minimo)
        producto.save()
        producto.refresh_from_db()
        return _to_producto_type(producto)

    @strawberry.mutation
    def desactivar_producto(self, info: Info, id: int) -> bool:
        _user_from_info(info)
        producto = Producto.objects.get(id=id)
        producto.activo = not producto.activo
        producto.save()
        return producto.activo

    @strawberry.mutation
    def crear_categoria(self, info: Info, nombre: str, descripcion: str = '') -> CategoriaType:
        _user_from_info(info)
        categoria = Categoria.objects.create(nombre=nombre, descripcion=descripcion)
        return CategoriaType(id=categoria.id, nombre=categoria.nombre, descripcion=categoria.descripcion)

    @strawberry.mutation
    def actualizar_categoria(self, info: Info, id: int, nombre: str, descripcion: str = '') -> CategoriaType:
        _user_from_info(info)
        categoria = Categoria.objects.get(id=id)
        categoria.nombre = nombre
        categoria.descripcion = descripcion
        categoria.save()
        return CategoriaType(id=categoria.id, nombre=categoria.nombre, descripcion=categoria.descripcion)

    @strawberry.mutation
    def crear_unidad_medida(self, info: Info, nombre: str, abreviatura: str) -> UnidadMedidaType:
        _user_from_info(info)
        unidad = UnidadMedida.objects.create(nombre=nombre, abreviatura=abreviatura)
        return UnidadMedidaType(id=unidad.id, nombre=unidad.nombre, abreviatura=unidad.abreviatura)

    @strawberry.mutation
    def actualizar_unidad_medida(self, info: Info, id: int, nombre: str, abreviatura: str) -> UnidadMedidaType:
        _user_from_info(info)
        unidad = UnidadMedida.objects.get(id=id)
        unidad.nombre = nombre
        unidad.abreviatura = abreviatura
        unidad.save()
        return UnidadMedidaType(id=unidad.id, nombre=unidad.nombre, abreviatura=unidad.abreviatura)

    @strawberry.mutation
    def crear_almacen(self, info: Info, nombre: str, direccion: str = '') -> AlmacenType:
        _user_from_info(info)
        almacen = Almacen.objects.create(nombre=nombre, direccion=direccion)
        return AlmacenType(id=almacen.id, nombre=almacen.nombre, direccion=almacen.direccion, activo=almacen.activo)

    @strawberry.mutation
    def actualizar_almacen(self, info: Info, id: int, nombre: str, direccion: str = '') -> AlmacenType:
        _user_from_info(info)
        almacen = Almacen.objects.get(id=id)
        almacen.nombre = nombre
        almacen.direccion = direccion
        almacen.save()
        return AlmacenType(id=almacen.id, nombre=almacen.nombre, direccion=almacen.direccion, activo=almacen.activo)

    @strawberry.mutation
    def desactivar_almacen(self, info: Info, id: int) -> bool:
        _user_from_info(info)
        almacen = Almacen.objects.get(id=id)
        almacen.activo = not almacen.activo
        almacen.save()
        return almacen.activo

    # ── Clientes ──────────────────────────────────────────────────────────────

    @strawberry.mutation
    def crear_cliente(self, info: Info, tipo_documento: str, numero_documento: str,
                      nombre: str, telefono: str = '', email: str = '', direccion: str = '') -> ClienteType:
        _user_from_info(info)
        c = Cliente.objects.create(
            tipo_documento=tipo_documento, numero_documento=numero_documento,
            nombre=nombre, telefono=telefono, email=email, direccion=direccion
        )
        return ClienteType(id=c.id, tipo_documento=c.tipo_documento, numero_documento=c.numero_documento,
                           nombre=c.nombre, telefono=c.telefono, email=c.email, direccion=c.direccion, activo=c.activo)

    @strawberry.mutation
    def actualizar_cliente(self, info: Info, id: int, tipo_documento: str, numero_documento: str,
                           nombre: str, telefono: str = '', email: str = '', direccion: str = '') -> ClienteType:
        _user_from_info(info)
        c = Cliente.objects.get(id=id)
        c.tipo_documento = tipo_documento
        c.numero_documento = numero_documento
        c.nombre = nombre
        c.telefono = telefono
        c.email = email
        c.direccion = direccion
        c.save()
        return ClienteType(id=c.id, tipo_documento=c.tipo_documento, numero_documento=c.numero_documento,
                           nombre=c.nombre, telefono=c.telefono, email=c.email, direccion=c.direccion, activo=c.activo)

    @strawberry.mutation
    def desactivar_cliente(self, info: Info, id: int) -> bool:
        _user_from_info(info)
        c = Cliente.objects.get(id=id)
        c.activo = not c.activo
        c.save()
        return c.activo

    # ── Proveedores ───────────────────────────────────────────────────────────

    @strawberry.mutation
    def crear_proveedor(self, info: Info, razon_social: str, numero_documento: str,
                        telefono: str = '', email: str = '', contacto: str = '') -> ProveedorType:
        _user_from_info(info)
        p = Proveedor.objects.create(
            razon_social=razon_social, numero_documento=numero_documento,
            telefono=telefono, email=email, contacto=contacto
        )
        return ProveedorType(id=p.id, razon_social=p.razon_social, numero_documento=p.numero_documento,
                             telefono=p.telefono, email=p.email, contacto=p.contacto, activo=p.activo)

    @strawberry.mutation
    def actualizar_proveedor(self, info: Info, id: int, razon_social: str, numero_documento: str,
                             telefono: str = '', email: str = '', contacto: str = '') -> ProveedorType:
        _user_from_info(info)
        p = Proveedor.objects.get(id=id)
        p.razon_social = razon_social
        p.numero_documento = numero_documento
        p.telefono = telefono
        p.email = email
        p.contacto = contacto
        p.save()
        return ProveedorType(id=p.id, razon_social=p.razon_social, numero_documento=p.numero_documento,
                             telefono=p.telefono, email=p.email, contacto=p.contacto, activo=p.activo)

    @strawberry.mutation
    def desactivar_proveedor(self, info: Info, id: int) -> bool:
        _user_from_info(info)
        p = Proveedor.objects.get(id=id)
        p.activo = not p.activo
        p.save()
        return p.activo

    @strawberry.mutation
    def registrar_ingreso(self, info: Info, almacen_id: int, tipo: str, detalles: list[DetalleMovimientoInput], observacion: str = '') -> IngresoType:
        usuario = _user_from_info(info)
        _check_role(usuario, ['Almacenero'])
        almacen = Almacen.objects.get(id=almacen_id)
        detalles_dict = [{'producto_id': d.producto_id, 'cantidad': d.cantidad} for d in detalles]
        ingreso = srv_registrar_ingreso(almacen, usuario, tipo, detalles_dict, observacion=observacion)
        ingreso = Ingreso.objects.select_related('almacen', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).get(id=ingreso.id)
        return _to_ingreso_type(ingreso)

    @strawberry.mutation
    def registrar_egreso(self, info: Info, almacen_id: int, tipo: str, detalles: list[DetalleMovimientoInput], observacion: str = '') -> EgresoType:
        usuario = _user_from_info(info)
        _check_role(usuario, ['Almacenero'])
        almacen = Almacen.objects.get(id=almacen_id)
        detalles_dict = [{'producto_id': d.producto_id, 'cantidad': d.cantidad} for d in detalles]
        egreso = srv_registrar_egreso(almacen, usuario, tipo, detalles_dict, observacion=observacion)
        egreso = Egreso.objects.select_related('almacen', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).get(id=egreso.id)
        return _to_egreso_type(egreso)

    # ── Compras ───────────────────────────────────────────────────────────────

    @strawberry.mutation
    def registrar_compra(self, info: Info, proveedor_id: int, numero_factura: str, estado: str, detalles: list[DetalleCompraInput], almacen_id: int | None = None, moneda: str = 'BOB', tipo_cambio: str = '6.96') -> CompraType:
        usuario = _user_from_info(info)
        _check_role(usuario, ['Comprador'])
        from apps.terceros.models import Proveedor
        proveedor = Proveedor.objects.get(id=proveedor_id)
        
        detalles_dict = [{'producto_id': d.producto_id, 'cantidad': d.cantidad, 'precio_unitario': d.precio_unitario} for d in detalles]
        
        compra = srv_registrar_compra(
            proveedor=proveedor, 
            usuario=usuario, 
            numero_factura=numero_factura, 
            estado=estado, 
            detalles=detalles_dict, 
            almacen_id=almacen_id,
            moneda=moneda,
            tipo_cambio=Decimal(tipo_cambio),
        )
        
        compra = Compra.objects.select_related('proveedor', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).get(id=compra.id)
        return _to_compra_type(compra)

    # ── Ventas ────────────────────────────────────────────────────────────────

    @strawberry.mutation
    def registrar_venta(self, info: Info, cliente_id: int, estado: str, detalles: list[DetalleVentaInput], almacen_id: int | None = None, moneda: str = 'BOB', tipo_cambio: str = '6.96') -> NotaVentaType:
        usuario = _user_from_info(info)
        _check_role(usuario, ['Vendedor'])
        from apps.terceros.models import Cliente
        cliente = Cliente.objects.get(id=cliente_id)
        
        detalles_dict = [{'producto_id': d.producto_id, 'cantidad': d.cantidad, 'precio_unitario': d.precio_unitario} for d in detalles]
        
        venta = srv_registrar_venta(
            cliente=cliente, 
            usuario=usuario, 
            estado=estado, 
            detalles=detalles_dict, 
            almacen_id=almacen_id,
            moneda=moneda,
            tipo_cambio=Decimal(tipo_cambio),
        )
        
        venta = NotaVenta.objects.select_related('cliente', 'usuario').prefetch_related(
            'detalles__producto__categoria', 'detalles__producto__unidad_medida'
        ).get(id=venta.id)
        return _to_venta_type(venta)


schema = strawberry.Schema(query=Query, mutation=Mutation, config=StrawberryConfig(auto_camel_case=False))
