from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import DetalleEgreso, DetalleIngreso, Egreso, Ingreso
from apps.inventario.models import ProductoAlmacen


def registrar_ingreso(almacen, usuario, tipo, detalles, compra=None, observacion=''):
    with transaction.atomic():
        ingreso = Ingreso.objects.create(
            almacen=almacen, usuario=usuario, tipo=tipo, compra=compra, observacion=observacion
        )
        for detalle in detalles:
            cantidad = Decimal(str(detalle['cantidad']))
            if cantidad <= 0:
                raise ValidationError('La cantidad debe ser mayor que cero.')
            DetalleIngreso.objects.create(ingreso=ingreso, producto_id=detalle['producto_id'], cantidad=cantidad)
            existencia, _ = ProductoAlmacen.objects.select_for_update().get_or_create(
                producto_id=detalle['producto_id'], almacen=almacen
            )
            existencia.stock_actual += cantidad
            existencia.save(update_fields=['stock_actual'])
        return ingreso


def registrar_egreso(almacen, usuario, tipo, detalles, venta=None, observacion=''):
    with transaction.atomic():
        egreso = Egreso.objects.create(
            almacen=almacen, usuario=usuario, tipo=tipo, venta=venta, observacion=observacion
        )
        for detalle in detalles:
            cantidad = Decimal(str(detalle['cantidad']))
            if cantidad <= 0:
                raise ValidationError('La cantidad debe ser mayor que cero.')
            existencia = ProductoAlmacen.objects.select_for_update().filter(
                producto_id=detalle['producto_id'], almacen=almacen
            ).first()
            if existencia is None or existencia.stock_actual < cantidad:
                raise ValidationError('Stock insuficiente para el producto solicitado.')
            DetalleEgreso.objects.create(egreso=egreso, producto_id=detalle['producto_id'], cantidad=cantidad)
            existencia.stock_actual -= cantidad
            existencia.save(update_fields=['stock_actual'])
        return egreso
