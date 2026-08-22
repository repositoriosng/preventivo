from django.db import models


class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    def __str__(self):
        return self.nombre


class UnidadMedida(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    abreviatura = models.CharField(max_length=10)

    def __str__(self):
        return self.abreviatura


class Producto(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='productos')
    unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.PROTECT, related_name='productos')
    moneda = models.CharField(max_length=3, choices=[('BOB', 'Bolivianos'), ('USD', 'Dólares')], default='BOB')
    precio_compra = models.DecimalField(max_digits=12, decimal_places=2)
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2)
    stock_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'
