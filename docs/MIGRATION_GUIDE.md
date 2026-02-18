# Guía de Migración de Datos a Qdrant

Esta guía te explica cómo subir tus datos locales a tu instancia de Qdrant en Easypanel.

## Prerrequisitos
1.  Tener Node.js instalado.
2.  Tener el proyecto `BauDeskPro` abierto en Visual Studio Code.

## Configuración Actual
He configurado tu proyecto con los siguientes datos:
*   **URL**: `https://methadesk-qdrant.ph2gu6.easypanel.host/`
*   **API Key**: `429683C4C977415CAAFCCE10F7D57E11`
*   **Script de Migración**: `scripts/setup-qdrant-local.ts` (Ya incluye tus datos y configuración SSL).

## Pasos para Ejecutar

1.  **Abre una Terminal**:
    *   En Visual Studio Code, ve al menú **Terminal** > **New Terminal**.
    *   O usa el atajo `Ctrl + ñ` (o `Ctrl + Shift + `).

2.  **Verifica la carpeta**:
    Asegúrate de que la terminal esté en la carpeta del proyecto. Debería terminar en `BauDeskPro`.

3.  **Ejecuta el comando**:
    Copia y pega el siguiente comando en la terminal y pulsa **Enter**:

    ```bash
    npx tsx scripts/setup-qdrant-local.ts
    ```

## ¿Qué pasará?

*   El script se conectará a tu Qdrant en Hostinger.
*   Creará las colecciones: `projekte`, `teilsysteme`, `positionen`, `material`, `mitarbeiter`, `fahrzeuge`.
*   Subirá todos los datos de prueba que tienes localmente.
*   Verás mensajes como `Creating collection...` y `Migrating...`.
*   Al final verás: **`Setup complete!`**.

## Solución de Problemas

*   **Error `fetch failed`**:
    *   Significa que tu ordenador no puede conectar con la URL de Qdrant.
    *   Verifica que la URL sea accesible desde tu navegador (deberías ver una pantalla de Qdrant o un JSON).
    *   Si usas VPN o Proxy corporativo, intenta desactivarlo.
    *   Asegúrate de que el puerto 443 (HTTPS) no esté bloqueado.

*   **Error `Unauthorized`**:
    *   Verifica que la API Key en el archivo `.env` sea correcta.
