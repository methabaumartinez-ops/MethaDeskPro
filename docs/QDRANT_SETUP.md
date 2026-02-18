# Guía de Configuración: Qdrant en Hostinger (Easypanel)

Esta guía te ayudará a desplegar Qdrant en tu VPS de Hostinger utilizando Easypanel y conectarlo a la aplicación BauDeskPro.

## 1. Desplegar Qdrant en Easypanel

1.  Accede a tu panel de Easypanel.
2.  Crea un nuevo **Project** (o usa uno existente), por ejemplo `databases`.
3.  Haz clic en **Service** -> **App**.
4.  Selecciona **Qdrant** de la lista de plantillas (Templates) si está disponible. Si no lo está:
    *   Elige **Docker Image**.
    *   Image: `qdrant/qdrant`
    *   Name: `qdrant`
5.  Haz clic en **Create**.

## 2. Configurar el Servicio Qdrant

Una vez creado el servicio, ve a sus configuraciones (Settings):

### A. Exponer el Puerto (Networking / Domains)
Para acceder desde fuera (tu PC local o Vercel), necesitas un dominio público.
1.  Ve a la pestaña **Domains**.
2.  Añade un dominio, por ejemplo: `qdrant.tudominio.com`.
3.  Asegúrate de que el **Container Port** sea `6333`.
4.  Habilita **HTTPS** (Easypanel generará un certificado SSL automáticamente con Let's Encrypt).

### B. Configurar Seguridad (Environment Variables)
Por defecto, Qdrant no tiene contraseña. **Es crítico** establecer una API Key.
1.  Ve a la pestaña **Environment**.
2.  Añade la siguiente variable:
    *   Key: `QDRANT__SERVICE__API_KEY`
    *   Value: `tu_clave_super_secreta_aqui` (Genera una cadena larga y aleatoria).
3.  Haz clic en **Save** y luego **Deploy** o **Restart** para aplicar los cambios.

## 3. Conectar BauDeskPro

Ahora que tienes Qdrant corriendo en `https://qdrant.tudominio.com` con una API Key, configura tu aplicación.

1.  Abre el archivo `.env` en tu proyecto local `BauDeskPro`.
2.  Actualiza las variables:

```bash
NEXT_PUBLIC_QDRANT_URL=https://qdrant.tudominio.com
NEXT_PUBLIC_QDRANT_API_KEY=tu_clave_super_secreta_aqui
```

> **Nota:** La URL debe usar `https://` si configuraste SSL en Easypanel (recomendado).

## 4. Migrar los Datos

Una vez configurado el `.env`, ejecuta el script de migración desde tu terminal local:

```bash
npx tsx scripts/setup-qdrant-local.ts
```

Si la conexión es exitosa, verás mensajes indicando que las colecciones (`projekte`, `mitarbeiter`, etc.) se están creando y los datos se están migrando.

## 5. Verificación Final

1.  Abre `src/lib/services/db.ts`.
2.  Busca la línea: `private useMock = true;`
3.  Cámbiala a `private useMock = false;`.
4.  Reinicia tu entorno de desarrollo (`npm run dev`).

¡Listo! Tu aplicación ahora está conectada a tu base de datos Qdrant en Hostinger.
