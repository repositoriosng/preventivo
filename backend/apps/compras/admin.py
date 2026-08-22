from django.contrib import admin
from .models import Compra, DetalleCompra

admin.site.register([Compra, DetalleCompra])
