from django.db import models


class Compra(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = 'PEND', 'Pendiente'
        RECIBIDA = 'REC', 'Recibida'
        ANULADA = 'ANU', 'Anulada'

    proveedor = models.ForeignKey('terceros.Proveedor', on_delete=models.PROTECT, related_name='compras')
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='compras')
    fecha = models.DateTimeField(auto_now_add=True)
    numero_factura = models.CharField(max_length=30, blank=True)
    estado = models.CharField(max_length=4, choices=Estado.choices, default=Estado.PENDIENTE)
    moneda = models.CharField(max_length=3, choices=[('BOB', 'Bolivianos'), ('USD', 'Dólares')], default='BOB')
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=4, default=6.96)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    impuesto = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2)


class DetalleCompra(models.Model):
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey('productos.Producto', on_delete=models.PROTECT, related_name='detalles_compra')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
