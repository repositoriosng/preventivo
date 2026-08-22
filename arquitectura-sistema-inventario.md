# Arquitectura Base — Sistema de Gestión de Inventario

## 1. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Backend | Django + Strawberry GraphQL (Django 5.x, Python 3.12) |
| Base de datos | PostgreSQL |
| Caché / Broker | Redis |
| Contenedores | Docker + Docker Compose |
| Autenticación | JWT (strawberry-django-auth o django-graphql-jwt) |

---

## 2. Estructura de carpetas propuesta

```
inventario-app/
├── backend/
│   ├── config/                  # settings, urls, asgi/wsgi, schema raíz
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   └── prod.py
│   │   ├── schema.py            # une los schemas de cada app
│   │   └── urls.py
│   ├── apps/
│   │   ├── usuarios/            # login, perfiles, permisos
│   │   ├── productos/           # producto, categoría, unidad de medida
│   │   ├── inventario/          # almacén, producto_almacen (stock)
│   │   ├── terceros/            # cliente, proveedor
│   │   ├── compras/             # compra, detalle_compra
│   │   ├── ventas/              # nota_venta, detalle_venta
│   │   └── movimientos/         # ingreso, egreso, sus detalles
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── modules/              # un folder por dominio (productos, ventas, etc.)
│   │   ├── graphql/               # queries/mutations generadas
│   │   ├── auth/
│   │   └── shared/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env
```

Cada app Django trae su propia carpeta `graphql/` con `types.py`, `queries.py`, `mutations.py`, y `config/schema.py` las une en un solo `Query`/`Mutation` raíz. Esto evita un `schema.py` gigante y escala bien cuando agregues más módulos.

---

## 3. Apps Django y sus modelos

### 3.1 `usuarios` (login + permisos)
No reinventes el sistema de permisos: usa `AbstractUser` + los `Group`/`Permission` nativos de Django. Es suficiente para roles como Admin, Almacenero, Vendedor, Comprador.

```python
class Usuario(AbstractUser):
    pass  # se extiende solo si necesitas campos extra de auth

class Perfil(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE)
    telefono = models.CharField(max_length=20, blank=True)
    cargo = models.CharField(max_length=50, blank=True)
    almacen_predeterminado = models.ForeignKey(
        "inventario.Almacen", null=True, blank=True, on_delete=models.SET_NULL
    )
    activo = models.BooleanField(default=True)
```

Roles y permisos se administran vía `Group` (ej: "Vendedor" con permiso `add_notaventa`, "Almacenero" con `add_ingreso`, `add_egreso`). Esto te da granularidad sin tener que crear un modelo de roles propio.

### 3.2 `productos`
```python
class Categoria(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)

class UnidadMedida(models.Model):
    nombre = models.CharField(max_length=50)
    abreviatura = models.CharField(max_length=10)

class Producto(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT)
    unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.PROTECT)
    precio_compra = models.DecimalField(max_digits=12, decimal_places=2)
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2)
    stock_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)
```

### 3.3 `inventario` (el corazón del stock)
```python
class Almacen(models.Model):
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200, blank=True)
    encargado = models.ForeignKey("usuarios.Usuario", null=True, on_delete=models.SET_NULL)
    activo = models.BooleanField(default=True)

class ProductoAlmacen(models.Model):
    producto = models.ForeignKey("productos.Producto", on_delete=models.CASCADE)
    almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE)
    stock_actual = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        unique_together = ("producto", "almacen")
```

`ProductoAlmacen` es la tabla que responde "¿cuánto tengo de este producto en este almacén?". Nunca se edita el stock a mano: solo se modifica desde los movimientos de `Ingreso`/`Egreso` (ver 3.6).

### 3.4 `terceros`
```python
class Cliente(models.Model):
    tipo_documento = models.CharField(max_length=10)
    numero_documento = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=150)
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    activo = models.BooleanField(default=True)

class Proveedor(models.Model):
    razon_social = models.CharField(max_length=150)
    numero_documento = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    contacto = models.CharField(max_length=100, blank=True)
    activo = models.BooleanField(default=True)
```

### 3.5 `compras` y `ventas` (documentos comerciales)
```python
class Compra(models.Model):
    ESTADOS = [("PEND", "Pendiente"), ("REC", "Recibida"), ("ANU", "Anulada")]
    proveedor = models.ForeignKey("terceros.Proveedor", on_delete=models.PROTECT)
    usuario = models.ForeignKey("usuarios.Usuario", on_delete=models.PROTECT)
    fecha = models.DateTimeField(auto_now_add=True)
    numero_factura = models.CharField(max_length=30, blank=True)
    estado = models.CharField(max_length=4, choices=ESTADOS, default="PEND")
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    impuesto = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2)

class DetalleCompra(models.Model):
    compra = models.ForeignKey(Compra, related_name="detalles", on_delete=models.CASCADE)
    producto = models.ForeignKey("productos.Producto", on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
```

`NotaVenta`/`DetalleVenta` son estructuralmente idénticos, cambiando `proveedor` por `cliente`.

### 3.6 `movimientos` (lo que realmente mueve el stock)
```python
class Ingreso(models.Model):
    TIPOS = [("COMPRA", "Compra"), ("AJUSTE", "Ajuste"), ("DEVOLUCION", "Devolución")]
    almacen = models.ForeignKey("inventario.Almacen", on_delete=models.PROTECT)
    usuario = models.ForeignKey("usuarios.Usuario", on_delete=models.PROTECT)
    fecha = models.DateTimeField(auto_now_add=True)
    tipo = models.CharField(max_length=15, choices=TIPOS)
    compra = models.ForeignKey("compras.Compra", null=True, blank=True, on_delete=models.SET_NULL)
    observacion = models.TextField(blank=True)

class DetalleIngreso(models.Model):
    ingreso = models.ForeignKey(Ingreso, related_name="detalles", on_delete=models.CASCADE)
    producto = models.ForeignKey("productos.Producto", on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
```

`Egreso`/`DetalleEgreso` son el espejo, referenciando `nota_venta` en lugar de `compra` y con tipos `VENTA`, `AJUSTE`, `MERMA`.

**Regla de oro:** el stock (`ProductoAlmacen.stock_actual`) solo se toca desde una capa de servicio (`apps/movimientos/services.py`), nunca directo desde el modelo ni desde el resolver. Ejemplo de flujo:

```python
def registrar_ingreso(almacen, usuario, tipo, detalles, compra=None):
    with transaction.atomic():
        ingreso = Ingreso.objects.create(almacen=almacen, usuario=usuario, tipo=tipo, compra=compra)
        for d in detalles:
            DetalleIngreso.objects.create(ingreso=ingreso, **d)
            pa, _ = ProductoAlmacen.objects.select_for_update().get_or_create(
                producto_id=d["producto_id"], almacen=almacen
            )
            pa.stock_actual += d["cantidad"]
            pa.save()
        return ingreso
```

Esto es clave: mantiene la integridad del stock aunque después agregues reglas (validar stock negativo en egresos, alertas de stock mínimo, etc.) sin tocar el schema de GraphQL.

---

## 4. GraphQL con Strawberry

Recomiendo `strawberry-graphql-django` (no solo `strawberry`), porque te da:
- Types auto-generados desde los modelos Django (`auto` fields)
- Filtros, paginación y ordenamiento listos
- Integración de permisos por campo/mutación

Estructura por app:
```
apps/productos/graphql/
├── types.py       # @strawberry_django.type(Producto)
├── queries.py      # resolvers de lectura
└── mutations.py    # crear_producto, actualizar_producto, etc.
```

`config/schema.py`:
```python
import strawberry
from apps.usuarios.graphql.queries import UsuarioQuery
from apps.productos.graphql.queries import ProductoQuery
# ...

@strawberry.type
class Query(UsuarioQuery, ProductoQuery, InventarioQuery, VentasQuery, ComprasQuery, MovimientosQuery):
    pass

@strawberry.type
class Mutation(UsuarioMutation, ProductoMutation, ...):
    pass

schema = strawberry.Schema(query=Query, mutation=Mutation)
```

Permisos: cada mutation valida `info.context.request.user.has_perm("app.accion_modelo")` (o un decorator propio `@login_required` / `@permission_required` que armes sobre `strawberry_django`).

---

## 5. Redis — para qué lo vas a usar

En una v1 no necesitas Celery necesariamente, pero Redis te sirve desde ya para:
1. **Cache de queries GraphQL pesadas** (ej: listado de stock por almacén) con `django-redis`.
2. **Sesiones/blacklist de JWT** (invalidar tokens al hacer logout).
3. **Rate limiting** en mutaciones sensibles (login, creación de ventas).
4. Dejar la puerta abierta a **Celery** más adelante (reportes, notificaciones de stock mínimo) sin cambiar de broker.

---

## 6. Docker Compose

```yaml
version: "3.9"

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: inventario
      POSTGRES_USER: inventario_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    command: npm run dev -- --host
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## 7. Roadmap sugerido para la v1

1. **Sprint 1** — `usuarios` (login JWT, perfiles, grupos/permisos base) + `productos` + `terceros`.
2. **Sprint 2** — `inventario` (almacén, producto_almacen) con queries de consulta de stock.
3. **Sprint 3** — `compras` + `movimientos.Ingreso` (compra genera ingreso automático vía servicio).
4. **Sprint 4** — `ventas` + `movimientos.Egreso` (venta genera egreso automático, con validación de stock disponible).
5. **Sprint 5** — Reportes básicos (stock bajo mínimo, kardex por producto) y pulido de permisos por rol.

Dejar `traspasos` fuera de la v1 es buena decisión: al no existir, `Ingreso`/`Egreso` quedan simples (un solo almacén por movimiento), y cuando lo agregues después será un módulo aparte que internamente genera un egreso + un ingreso ligados.

---

## 8. Notas de diseño

- Usa `PROTECT` en las FK hacia `Producto`, `Cliente`, `Proveedor` desde documentos históricos (compras, ventas, movimientos): no quieres borrar un producto y perder la trazabilidad de ventas pasadas. Para eso, mejor `activo=False` (soft delete) en vez de borrar.
- Los totales de `Compra`/`NotaVenta` (subtotal, impuesto, total) se calculan en el servicio a partir de los detalles, no se dejan editables directamente vía GraphQL.
- Considera desde ya un campo `creado_en`/`actualizado_en` en un modelo abstracto base (`TimeStampedModel`) que hereden todos los modelos, te ahorra repetir campos y te da auditoría básica gratis.
