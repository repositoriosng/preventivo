from django.contrib import admin
from .models import Categoria, Producto, UnidadMedida

admin.site.register([Categoria, Producto, UnidadMedida])
