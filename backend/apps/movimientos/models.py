from django.db import models


class Ingreso(models.Model):
    class Tipo(models.TextChoices):
        COMPRA = 'COMPRA', 'Compra'
        AJUSTE = 'AJUSTE', 'Ajuste'
        DEVOLUCION = 'DEVOLUCION', 'Devolución'

    almacen = models.ForeignKey('inventario.Almacen', on_delete=models.PROTECT, related_name='ingresos')
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='ingresos')
    fecha = models.DateTimeField(auto_now_add=True)
    tipo = models.CharField(max_length=15, choices=Tipo.choices)
    compra = models.ForeignKey('compras.Compra', null=True, blank=True, on_delete=models.SET_NULL, related_name='ingresos')
    observacion = models.TextField(blank=True)


class DetalleIngreso(models.Model):
    ingreso = models.ForeignKey(Ingreso, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey('productos.Producto', on_delete=models.PROTECT, related_name='detalles_ingreso')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)


class Egreso(models.Model):
    class Tipo(models.TextChoices):
        VENTA = 'VENTA', 'Venta'
        AJUSTE = 'AJUSTE', 'Ajuste'
        MERMA = 'MERMA', 'Merma'

    almacen = models.ForeignKey('inventario.Almacen', on_delete=models.PROTECT, related_name='egresos')
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='egresos')
    fecha = models.DateTimeField(auto_now_add=True)
    tipo = models.CharField(max_length=15, choices=Tipo.choices)
    venta = models.ForeignKey('ventas.NotaVenta', null=True, blank=True, on_delete=models.SET_NULL, related_name='egresos')
    observacion = models.TextField(blank=True)


class DetalleEgreso(models.Model):
    egreso = models.ForeignKey(Egreso, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey('productos.Producto', on_delete=models.PROTECT, related_name='detalles_egreso')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
