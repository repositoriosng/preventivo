from django.db import models


class Almacen(models.Model):
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200, blank=True)
    encargado = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='almacenes_a_cargo'
    )
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class ProductoAlmacen(models.Model):
    producto = models.ForeignKey('productos.Producto', on_delete=models.CASCADE, related_name='existencias')
    almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE, related_name='existencias')
    stock_actual = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=('producto', 'almacen'), name='producto_almacen_unico')]
