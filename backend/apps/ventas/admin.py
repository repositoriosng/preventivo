from django.contrib import admin
from .models import DetalleVenta, NotaVenta

admin.site.register([NotaVenta, DetalleVenta])
