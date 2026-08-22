from django.contrib import admin
from .models import Cliente, Proveedor

admin.site.register([Cliente, Proveedor])
