import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR.parent / '.env')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-only-change-me')
DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() == 'true'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'
).split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'apps.usuarios',
    'apps.productos',
    'apps.inventario',
    'apps.terceros',
    'apps.compras',
    'apps.ventas',
    'apps.movimientos',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'config.urls'
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]
WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': os.getenv('DB_NAME', 'inventario'),
    'USER': os.getenv('DB_USER', 'postgres'),
    'PASSWORD': os.getenv('DB_PASSWORD', ''),
    'HOST': os.getenv('DB_HOST', 'localhost'),
    'PORT': os.getenv('DB_PORT', '5432'),
}}

AUTH_USER_MODEL = 'usuarios.Usuario'
AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = 'es-co'
TIME_ZONE = os.getenv('TZ', 'America/Bogota')
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
