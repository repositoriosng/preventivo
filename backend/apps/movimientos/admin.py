from django.contrib import admin
from .models import DetalleEgreso, DetalleIngreso, Egreso, Ingreso

admin.site.register([Ingreso, DetalleIngreso, Egreso, DetalleEgreso])
