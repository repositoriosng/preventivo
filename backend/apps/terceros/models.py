from django.db import models


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
