# Sistema de Inventario

Un sistema de gestión de inventario completo, desarrollado con **React (Vite) + TypeScript** en el Frontend y **Django + GraphQL + PostgreSQL** en el Backend.

## Arquitectura del Proyecto

El sistema está diseñado para correr en contenedores Docker y utiliza las siguientes tecnologías:
- **Frontend:** React, Vite, TypeScript, GraphQL (Apollo Client / graphql-request). Servido mediante Caddy como proxy reverso.
- **Backend:** Django, Gunicorn, Strawberry GraphQL.
- **Base de Datos:** PostgreSQL 15.

## Requisitos Previos

Para ejecutar el proyecto en tu entorno local necesitas tener instalado:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) o Docker Engine y Docker Compose.
- Git.

## Configuración y Variables de Entorno

Antes de iniciar el sistema, debes configurar las variables de entorno.
Copia el archivo `.env.example` a un nuevo archivo llamado `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Configura tus credenciales y preferencias en el `.env` (si usas Docker, las variables de conexión a la base de datos ya vienen preparadas por defecto en el `docker-compose.yml`, así que el `.env` por defecto suele ser suficiente para desarrollo local).

## Levantar el Sistema con Docker

Para iniciar todos los servicios (Base de Datos, Backend y Frontend), ejecuta el siguiente comando en la raíz del proyecto:

```bash
docker-compose up --build
```

Esto hará lo siguiente:
1. Descargar la imagen de **PostgreSQL** y levantar la base de datos.
2. Construir el contenedor del **Backend (Django)**, ejecutar las migraciones pendientes automáticamente y arrancar el servidor `gunicorn` en el puerto `8000`.
3. Construir el contenedor del **Frontend (React)**, compilar los archivos estáticos y usar **Caddy** en el puerto `3000` para servirlos. Caddy también actúa como proxy, redirigiendo todas las peticiones que empiecen por `/graphql` o `/admin` hacia el backend.

## Accesos Rápidos

Una vez que todos los contenedores estén corriendo, puedes acceder a:

- **Aplicación Web (Frontend):** [http://localhost:3000](http://localhost:3000)
- **Panel de Administración de Django:** [http://localhost:3000/admin](http://localhost:3000/admin) (Nota que se usa el puerto 3000 gracias a Caddy).
- **Interfaz GraphiQL (Pruebas API):** [http://localhost:3000/graphql](http://localhost:3000/graphql)

## Desarrollo Local sin Docker (Modo Legacy)

Si deseas correr los servidores de forma manual para depuración directa:

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # o .venv\Scripts\activate en Windows
pip install -r requirements.txt
python manage.py runserver 8000
```

**Frontend:**
```bash
npm install
npm run dev
```

*(Asegúrate de que en este caso las variables de conexión apunten a tu instancia local de PostgreSQL y no al host `db` que usa Docker).*

## Licencia

Propiedad Intelectual. Prohibida su distribución.
