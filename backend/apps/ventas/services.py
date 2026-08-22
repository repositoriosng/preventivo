from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import NotaVenta, DetalleVenta
from apps.movimientos.services import registrar_egreso

def registrar_venta(cliente, usuario, estado, detalles, almacen_id=None, moneda='BOB', tipo_cambio=None):
    """
    Registra una nota de venta y sus detalles.
    Si el estado es COMP (Completada), genera automáticamente un movimiento de egreso 
    desde el almacen_id especificado.
    """
    # Si la venta está completada, se requiere un almacén para el egreso automático.
    if estado == NotaVenta.Estado.COMPLETADA and not almacen_id:
        raise ValidationError("Para completar la venta debe seleccionar un almacén de origen.")

    with transaction.atomic():
        # Crear la cabecera de la venta
        venta = NotaVenta.objects.create(
            cliente=cliente,
            usuario=usuario,
            estado=estado,
            moneda=moneda,
            tipo_cambio=tipo_cambio if tipo_cambio is not None else Decimal('6.96'),
            subtotal=Decimal('0.00'),
            impuesto=Decimal('0.00'),
            total=Decimal('0.00')
        )
        
        subtotal_general = Decimal('0.00')
        detalles_para_egreso = []

        for d in detalles:
            cantidad = Decimal(str(d['cantidad']))
            precio_unitario = Decimal(str(d['precio_unitario']))
            
            if cantidad <= 0:
                raise ValidationError("La cantidad debe ser mayor que cero.")
            if precio_unitario < 0:
                raise ValidationError("El precio unitario no puede ser negativo.")
            
            subtotal_linea = cantidad * precio_unitario
            subtotal_general += subtotal_linea
            
            DetalleVenta.objects.create(
                venta=venta,
                producto_id=d['producto_id'],
                cantidad=cantidad,
                precio_unitario=precio_unitario,
                subtotal=subtotal_linea
            )

            if estado == NotaVenta.Estado.COMPLETADA:
                detalles_para_egreso.append({
                    'producto_id': d['producto_id'],
                    'cantidad': cantidad
                })

        # Actualizar totales (Sin impuestos según requerimiento del usuario)
        venta.subtotal = subtotal_general
        venta.impuesto = Decimal('0.00')
        venta.total = subtotal_general
        venta.save(update_fields=['subtotal', 'impuesto', 'total'])

        # Si se completó, generar el egreso automático de stock
        # Esto automáticamente validará que haya stock suficiente (lanzará ValidationError si no hay)
        if estado == NotaVenta.Estado.COMPLETADA and detalles_para_egreso:
            from apps.inventario.models import Almacen
            almacen = Almacen.objects.get(id=almacen_id)
            observacion = f"Egreso automático desde Nota de Venta #{venta.id}"
            
            # Vinculamos usando el ForeignKey null=True si existe en Egreso, sino dejamos registro
            # En el modelo Egreso habíamos definido venta=models.ForeignKey("ventas.NotaVenta", null=True)
            registrar_egreso(
                almacen=almacen, 
                usuario=usuario, 
                tipo="VENTA", 
                detalles=detalles_para_egreso, 
                venta=venta,
                observacion=observacion
            )

        return venta
