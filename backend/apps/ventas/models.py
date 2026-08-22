from django.db import models


class NotaVenta(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = 'PEND', 'Pendiente'
        COMPLETADA = 'COMP', 'Completada'
        ANULADA = 'ANU', 'Anulada'

    cliente = models.ForeignKey('terceros.Cliente', on_delete=models.PROTECT, related_name='ventas')
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='ventas')
    fecha = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=4, choices=Estado.choices, default=Estado.PENDIENTE)
    moneda = models.CharField(max_length=3, choices=[('BOB', 'Bolivianos'), ('USD', 'Dólares')], default='BOB')
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=4, default=6.96)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    impuesto = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2)


class DetalleVenta(models.Model):
    venta = models.ForeignKey(NotaVenta, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey('productos.Producto', on_delete=models.PROTECT, related_name='detalles_venta')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
