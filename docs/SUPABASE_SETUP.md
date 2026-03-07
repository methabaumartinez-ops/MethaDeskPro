# Supabase Self-Hosted Setup — Easypanel/VPS

## Arquitectura

```
┌─────────────────────── Easypanel VPS ───────────────────────┐
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ BauDesk  │────│  Supabase    │────│  Supabase        │   │
│  │ Pro App  │    │  Kong :8000  │    │  Postgres :5432  │   │
│  │  :3000   │    │  (API GW)    │    │  (db)            │   │
│  └──────────┘    └──────────────┘    └──────────────────┘   │
│       │                                                      │
│  ┌──────────┐                                               │
│  │ Qdrant   │  ← solo para AI/vectores                     │
│  │  :6333   │                                               │
│  └──────────┘                                               │
└──────────────────────────────────────────────────────────────┘
```

## 1. Variables de Entorno para el Servicio de la App

Configura estas variables en **Easypanel → App Service → Environment**:

```bash
# Supabase (self-hosted)
SUPABASE_URL=http://supabase-kong:8000
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>

# Feature flag — activar Supabase como DB principal
USE_SUPABASE=false       # Activar a 'true' después de migración

# Qdrant (mantener para AI)
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=<tu_qdrant_api_key>
```

Para encontrar tu `SERVICE_ROLE_KEY`:
- Ve a Easypanel → Supabase service → Environment
- Busca `SERVICE_ROLE_KEY` (es un JWT largo)
- Cópialo al env de la app

Para `SUPABASE_URL`:
- Si la app y Supabase están en el **mismo proyecto Easypanel**: usa `http://supabase-kong:8000`
- Si están en **proyectos distintos** de Easypanel: usa la URL externa `https://supabase.tudominio.com`

## 2. Ejecutar Schema SQL

### Opción A: Supabase Studio SQL Editor
Si tienes Supabase Studio habilitado (normalmente en `:3001` o vía dominio):
1. Abre Studio → SQL Editor
2. Pega el contenido de `scripts/supabase-schema.sql`
3. Ejecuta

### Opción B: psql directo al contenedor Postgres
```bash
# Desde el VPS/server (SSH)
docker exec -i <postgres_container_name> psql -U postgres -d postgres < scripts/supabase-schema.sql

# Para encontrar el nombre del contenedor:
docker ps | grep supabase | grep postgres
```

### Opción C: psql remoto (si el puerto Postgres está expuesto)
```bash
psql postgresql://postgres:<POSTGRES_PASSWORD>@<VPS_IP>:5432/postgres -f scripts/supabase-schema.sql
```

## 3. Secuencia de Migración

```
1. Backup:   npx tsx scripts/export-qdrant-data.ts
2. Schema:   Ejecutar supabase-schema.sql (Opción A/B/C)
3. Import:   npx tsx scripts/import-to-supabase.ts
4. Validar:  Verificar datos en Studio o psql
5. Activar:  USE_SUPABASE=true → Redeploy app
6. Verificar CRUD funciona
7. Verificar AI/chat funciona (sigue usando Qdrant para contexto)
```

## 4. Validación Post-Migración

- [ ] CRUD Teilsysteme funciona
- [ ] Positionen se crean/editan correctamente
- [ ] Auth/login sigue funcionando
- [ ] Chat AI devuelve contexto del proyecto
- [ ] QR codes y export funcionan
- [ ] No hay errores en logs del servidor
