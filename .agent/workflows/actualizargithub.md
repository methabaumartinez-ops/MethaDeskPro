---
description: Actualiza el repositorio de GitHub con los últimos cambios
---

Este flujo de trabajo guarda todos los cambios locales y los sube al repositorio remoto en GitHub. Solo se debe utilizar cuando el usuario lo solicite explícitamente.

1. Se añadirán los cambios, se creará un commit genérico y se hará push a la rama `main`.
// turbo-all
Ejecuta el siguiente comando en la terminal:
`git add . ; git commit -m "Actualizacion de codigo generada por el asistente" ; git push origin main`
