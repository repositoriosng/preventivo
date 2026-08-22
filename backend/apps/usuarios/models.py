from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    email = models.EmailField(unique=True)


class Perfil(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil')
    telefono = models.CharField(max_length=20, blank=True)
    cargo = models.CharField(max_length=50, blank=True)
    almacen_predeterminado = models.ForeignKey(
        'inventario.Almacen', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='perfiles_predeterminados'
    )
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.usuario.get_username()
