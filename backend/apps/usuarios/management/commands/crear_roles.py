"""
Comando de Django para crear los grupos/roles base del sistema de inventario.
Uso: python manage.py crear_roles
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group


ROLES = ['Admin', 'Almacenero', 'Vendedor', 'Comprador']


class Command(BaseCommand):
    help = 'Crea los grupos/roles base del sistema de inventario'

    def handle(self, *args, **options):
        for nombre in ROLES:
            grupo, created = Group.objects.get_or_create(name=nombre)
            if created:
                self.stdout.write(self.style.SUCCESS(f'  [OK] Grupo "{nombre}" creado.'))
            else:
                self.stdout.write(f'  [-] Grupo "{nombre}" ya existia.')
        self.stdout.write(self.style.SUCCESS('\nRoles base listos.'))
