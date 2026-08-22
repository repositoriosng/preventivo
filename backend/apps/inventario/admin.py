from django.contrib import admin
from .models import Almacen, ProductoAlmacen

admin.site.register([Almacen, ProductoAlmacen])
