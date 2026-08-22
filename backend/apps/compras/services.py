from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import Compra, DetalleCompra
from apps.movimientos.services import registrar_ingreso

def registrar_compra(proveedor, usuario, numero_factura, estado, detalles, almacen_id=None, moneda='BOB', tipo_cambio=None):
    """
    Registra una compra y sus detalles.
    Si el estado es REC (Recibida), genera automáticamente un movimiento de ingreso 
    hacia el almacen_id especificado.
    """
    # Si la compra está recibida, se requiere un almacén para el ingreso automático.
    if estado == Compra.Estado.RECIBIDA and not almacen_id:
        raise ValidationError("Para recibir la compra debe seleccionar un almacén de destino.")

    with transaction.atomic():
        # Crear la cabecera de la compra
        compra = Compra.objects.create(
            proveedor=proveedor,
            usuario=usuario,
            numero_factura=numero_factura,
            estado=estado,
            moneda=moneda,
            tipo_cambio=tipo_cambio if tipo_cambio is not None else Decimal('6.96'),
            subtotal=Decimal('0.00'),
            impuesto=Decimal('0.00'),
            total=Decimal('0.00')
        )
        
        subtotal_general = Decimal('0.00')
        detalles_para_ingreso = []

        for d in detalles:
            cantidad = Decimal(str(d['cantidad']))
            precio_unitario = Decimal(str(d['precio_unitario']))
            
            if cantidad <= 0:
                raise ValidationError("La cantidad debe ser mayor que cero.")
            if precio_unitario < 0:
                raise ValidationError("El precio unitario no puede ser negativo.")
            
            subtotal_linea = cantidad * precio_unitario
            subtotal_general += subtotal_linea
            
            DetalleCompra.objects.create(
                compra=compra,
                producto_id=d['producto_id'],
                cantidad=cantidad,
                precio_unitario=precio_unitario,
                subtotal=subtotal_linea
            )

            if estado == Compra.Estado.RECIBIDA:
                detalles_para_ingreso.append({
                    'producto_id': d['producto_id'],
                    'cantidad': cantidad
                })

        # Actualizar totales (Sin impuestos según requerimiento del usuario)
        compra.subtotal = subtotal_general
        compra.impuesto = Decimal('0.00')
        compra.total = subtotal_general
        compra.save(update_fields=['subtotal', 'impuesto', 'total'])

        # Si se recibió, generar el ingreso automático de stock
        if estado == Compra.Estado.RECIBIDA and detalles_para_ingreso:
            from apps.inventario.models import Almacen
            almacen = Almacen.objects.get(id=almacen_id)
            observacion = f"Ingreso automático desde Compra #{compra.id} (Factura: {numero_factura})"
            # Vinculamos usando el ForeignKey null=True si existe en Ingreso, sino simplemente dejamos registro.
            # En el modelo Ingreso habíamos definido compra=models.ForeignKey("compras.Compra", null=True)
            registrar_ingreso(
                almacen=almacen, 
                usuario=usuario, 
                tipo="COMPRA", 
                detalles=detalles_para_ingreso, 
                compra=compra,
                observacion=observacion
            )

        return compra
