# Priorix Backend

Proyecto backend de Priorix compuesto por dos servicios Laravel independientes y una infraestructura de observabilidad ambientada en Docker.

## Descripción general

El repositorio contiene:

- `priorix-core`: API principal de gestión de usuarios, actividades, tareas y planificación.
- `priorix-gamification`: API de gamificación y estadísticas que complementa al servicio principal.
- `docker-compose.yml`: define servicios Docker para ambas APIs, bases de datos MySQL, Redis, Nginx, Prometheus, Grafana y Jaeger.
- `docker/nginx/default.conf`: balancea el tráfico hacia los servicios `core` y `gamification`.

## Arquitectura

- `core`: servicio Laravel que expone rutas públicas y privadas. Usa JWT para autenticación.
- `gamification`: servicio Laravel que expone rutas de gamificación y estadísticas.
- `mysql-core` y `mysql-gamification`: bases de datos MySQL separadas para cada servicio.
- `redis`: cache y/o sesión compartida.
- `nginx`: proxy inverso con dos hosts: `80` para `core` y `81` para `gamification`.
- `prometheus`, `grafana`, `jaeger`: observabilidad y telemetría.

## Ejecución local

### Requisitos

- Docker
- Docker Compose
- Git

### Levantar el entorno

Desde la raíz del repositorio:

```bash
docker compose up --build
```

## Configuración de Docker

El `docker-compose.yml` ya define las variables de entorno necesarias para cada servicio.

Para `core`:

- `DB_HOST=mysql-core`
- `DB_DATABASE=priorix_core`
- `DB_USERNAME=priorix`
- `DB_PASSWORD=secret`
- `GAMIFICATION_SERVICE_URL=http://gamification/api/gamification`
- `STATISTICS_SERVICE_URL=http://gamification/api/statistics`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`

Para `gamification`:

- `DB_HOST=mysql-gamification`
- `DB_DATABASE=priorix_gamification`
- `DB_USERNAME=priorix`
- `DB_PASSWORD=secret`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`

## Rutas principales

### Priorix Core (`/api`)

#### Autenticación

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Login y obtención de token JWT
- `POST /api/auth/refresh` - Refrescar token JWT
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener datos del usuario autenticado

#### Actividades

- `GET /api/activities` - Listar actividades
- `POST /api/activities` - Crear actividad
- `GET /api/activities/{id}` - Ver actividad
- `PUT/PATCH /api/activities/{id}` - Actualizar actividad
- `DELETE /api/activities/{id}` - Eliminar actividad
- `POST /api/activities/{id}/complete` - Marcar actividad como completada

#### Tareas

- `GET /api/tasks` - Listar tareas
- `POST /api/tasks` - Crear tarea
- `GET /api/tasks/{id}` - Ver tarea
- `PUT/PATCH /api/tasks/{id}` - Actualizar tarea
- `DELETE /api/tasks/{id}` - Eliminar tarea
- `POST /api/tasks/{id}/complete` - Marcar tarea como completada
- `GET /api/tasks/date-range` - Obtener tareas por rango de fechas
- `GET /api/tasks/today/pending` - Obtener tareas pendientes del día

#### Planificador

- `POST /api/planner/generate-weekly` - Generar plan semanal
- `POST /api/planner/reschedule-activity/{activityId}` - Reprogramar actividad

### Priorix Gamification (`/api`)

- `GET /api/gamification/pet` - Obtener estado del personaje / mascota
- `POST /api/gamification/update-experience` - Actualizar experiencia de gamificación
- `GET /api/statistics/weekly` - Obtener estadísticas semanales
- `POST /api/statistics/record-activity` - Registrar actividad para estadísticas

## Desarrollo

### Dependencias Laravel

Cada servicio usa Laravel y las dependencias definidas en su propio `composer.json`.

#### Comandos útiles

Dentro de cada servicio:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

### Pruebas

Cada servicio cuenta con PHPUnit. Desde cada carpeta de servicio:

```bash
php artisan test
```

## Estructura del repositorio

- `priorix-core/`
  - `app/` - código fuente Laravel del core
  - `config/` - configuración Laravel
  - `routes/` - rutas de la API y web
  - `database/` - migraciones, seeders y factories
  - `docker/` - configuración de Docker específica del servicio

- `priorix-gamification/`
  - `app/` - código fuente Laravel de gamificación
  - `config/`
  - `routes/`
  - `database/`
  - `docker/`

- `docker/` - configuración de infraestructura compartida
- `postman/` - colecciones de Postman para pruebas de API

## Observabilidad

El proyecto incluye:

- `Prometheus` para métricas
- `Grafana` para dashboards
- `Jaeger` para trazabilidad distribuida

## Roadmap

Este roadmap muestra la dirección de desarrollo del backend de Priorix, desde mejoras inmediatas hasta objetivos futuros.

### Prioridades inmediatas

- Completar la documentación de los endpoints y los modelos de datos.
- Asegurar la integración entre `priorix-core` y `priorix-gamification`.
- Fortalecer la autenticación JWT, validaciones y manejo de errores.
- Implementar pruebas automatizadas para los flujos de actividades, tareas y planificación.

### Próximos objetivos

- Añadir soporte para notificaciones y recordatorios.
- Exponer especificaciones OpenAPI / Swagger para ambas APIs.
- Mejorar la observabilidad con dashboards específicos de negocio en Grafana.
- Refactorizar servicios para su escalabilidad y separación de responsabilidades.

### Fase futura

- Soporte de roles avanzados y permisos de usuario.
- Integración con aplicaciones web y móviles.
- Análisis de hábitos, recomendaciones y estadísticas más completas.
- Escalar la infraestructura y optimizar el rendimiento del backend.

## Notas adicionales

- El proxy Nginx usa `http://core:80` para el servicio principal y `http://gamification:80` para el servicio de gamificación.
- La comunicación interna entre servicios se realiza mediante el hostname del servicio Docker.

---
