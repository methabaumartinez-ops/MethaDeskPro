---
name: antigravity-responsive-device-guard
description: Ensure Antigravity always designs and reviews the webapp for desktop, tablet, iPad, iPhone, and Android mobile compatibility instead of validating layouts only on desktop.
---

# Purpose

Usa esta skill para obligar a Antigravity a considerar siempre la version responsive y multi-dispositivo de la webapp.

El objetivo es que ninguna pantalla, componente o flujo se de por valido si solo funciona o se ve bien en desktop. Antigravity debe disenar, revisar y corregir cada vista teniendo en cuenta:

- desktop
- tablet
- iPad
- iPhone
- Android movil

Esta skill impone una politica de diseno donde la webapp debe ser usable, legible, consistente y compatible en todos los formatos principales, no solo en pantalla grande.

# When to use

Usa esta skill cuando:

- se disenyen nuevas pantallas de la webapp
- se revisen formularios, tablas, dashboards o vistas detalle
- se construyan componentes reutilizables
- se hagan cambios de layout
- se preparen entregas visuales o funcionales
- quieras evitar que la UI quede bien en desktop pero mal en movil o tablet
- quieras que Antigravity piense siempre en iPad, iPhone y Android como parte del diseno normal

No la uses para logica de backend o tareas que no tengan impacto en la interfaz o la experiencia de uso.

# Steps

## 1. Tratar multi-dispositivo como requisito obligatorio

Antigravity debe asumir siempre que la webapp se usara en varios tipos de dispositivo.

No puede considerar una pantalla terminada solo porque funcione en desktop. Debe validar tambien su comportamiento y legibilidad en:

- tablet horizontal y vertical
- iPad
- iPhone
- Android movil

Regla base:

**Si una pantalla solo esta resuelta en desktop, no esta terminada.**

## 2. Disenar cada vista con comportamiento responsive real

Antigravity debe revisar que cada layout tenga adaptacion correcta segun ancho disponible.

Debe comprobar:

- reorganizacion correcta de columnas
- apilado logico de bloques
- campos que no se desborden
- titulos que no rompan el layout
- botones accesibles en pantallas pequenas
- tablas que no resulten inutilizables en movil
- modales, menus y paneles adaptados a touch y viewport reducido

No debe limitarse a "encoger" la version desktop.

## 3. Aplicar reglas obligatorias por dispositivo

### A. Desktop

- Puede usar varias columnas si mejora la lectura.
- Debe mantener alineacion y jerarquia claras.
- No debe desperdiciar espacio ni generar densidad excesiva.

### B. Tablet e iPad

- Debe revisar version horizontal y vertical.
- Los bloques deben seguir siendo legibles y equilibrados.
- Formularios de varias columnas pueden pasar a estructura mas simple si mejora la usabilidad.
- Las zonas tactiles deben seguir siendo comodas.

### C. iPhone y Android movil

- La prioridad es lectura, toque y recorrido vertical claro.
- Los elementos deben apilarse de forma limpia.
- No debe haber controles demasiado pequenos para tocar.
- No debe obligar al usuario a hacer zoom.
- No debe haber texto cortado, inputs comprimidos o acciones fuera de pantalla.
- Los formularios deben poder completarse con comodidad desde el movil.

## 4. Disenar tamanios y componentes pensando en touch

Antigravity debe comprobar que la interfaz no dependa de precision de raton.

Debe revisar:

- botones suficientemente grandes
- selects y datepickers utilizables en touch
- separacion suficiente entre acciones
- targets tactiles comodos
- scroll natural
- menus desplegables no problematicos en movil
- areas clicables no demasiado pequenas

## 5. Adaptar componentes conflictivos

Antigravity debe tener especial cuidado con estos elementos:

### Formularios

- En movil deben reducir columnas o pasar a una sola columna cuando convenga.
- Labels, inputs y ayudas deben seguir siendo legibles.
- Campos cortos y largos deben mantener proporcion util en cada breakpoint.

### Tablas

- No deben romper la experiencia movil.
- Deben simplificarse, reestructurarse o usar scroll controlado solo cuando sea razonable.
- Si una tabla no es usable en movil, Antigravity debe proponer alternativa.

### Modales y paneles

- Deben caber en viewport pequeno.
- No deben generar recortes ni botones inaccesibles.
- En movil puede ser mejor usar drawer, full-screen panel o layout vertical.

### Navegacion

- Debe seguir siendo clara en tablet y movil.
- Menus, tabs y acciones deben poder tocarse sin error.
- No debe haber barras sobrecargadas en pantallas pequenas.

## 6. Mantener consistencia visual entre breakpoints

Antigravity no debe hacer que cada dispositivo parezca una app distinta sin motivo.

Debe mantener consistencia en:

- tipografia
- jerarquia
- espaciado
- radios
- bordes
- estilo de componentes
- comportamiento de acciones principales y secundarias

La adaptacion responsive debe cambiar la disposicion, no destruir el sistema visual.

## 7. Revisar compatibilidad iPad, iPhone y Android de forma explicita

Cuando esta skill este activa, Antigravity debe mencionar y comprobar explicitamente:

- iPad
- iPhone
- Android movil

No basta con decir "responsive". Debe pensar en escenarios reales de uso en esos dispositivos y detectar problemas tipicos como:

- cortes por ancho reducido
- tap targets demasiado pequenos
- columnas imposibles de leer
- paneles que no caben
- overflow horizontal accidental
- acciones escondidas o demasiado juntas
- formularios incomodos en teclado movil

## 8. Rechazar soluciones que solo funcionen en desktop

Si un diseno se ve bien en escritorio pero falla en tablet o movil, Antigravity debe rechazarlo y corregirlo.

Debe preferir:

- layouts que colapsan bien
- jerarquias simples
- agrupacion logica por bloques
- formularios verticales en movil cuando sea mejor
- acciones claras y accesibles en pantallas pequenas

## 9. Hacer revision final obligatoria

Antes de considerar valida una pantalla, Antigravity debe comprobar:

- ¿Se ve bien en desktop?
- ¿Se adapta bien a tablet?
- ¿Funciona correctamente en iPad?
- ¿Es comoda en iPhone?
- ¿Es compatible y usable en Android movil?
- ¿No hay desbordes ni cortes?
- ¿Los botones y controles son tactilmente utilizables?
- ¿Los formularios siguen siendo comodas?
- ¿La jerarquia visual se conserva en todos los tamanios?
- ¿La experiencia movil esta realmente resuelta y no solo reducida?

Si alguna respuesta es "no", la pantalla no debe darse por terminada.

# Examples

## Example 1 - Nueva pantalla

**Entrada esperada:**

"Disena esta pantalla para mi webapp, pero ten siempre en cuenta desktop, iPad, iPhone y Android."

**Comportamiento esperado de Antigravity:**

- plantea el layout pensando desde el inicio en varios tamanios
- evita composiciones que solo funcionan en ancho grande
- preve reorganizacion de columnas y bloques
- asegura usabilidad tactil
- no da la pantalla por cerrada sin validar tablet y movil

## Example 2 - Revision de formulario

**Entrada esperada:**

"Revisa este formulario y corrigelo para que tambien funcione bien en movil, iPad, iPhone y Android."

**Comportamiento esperado de Antigravity:**

- detecta campos demasiado anchos o apretados
- reduce columnas donde convenga
- mejora el apilado en movil
- asegura botones tocables
- corrige overflow, cortes y problemas de legibilidad

## Example 3 - Tabla problematica

**Entrada esperada:**

"Esta tabla funciona en desktop, pero quiero una solucion compatible para movil y tablet."

**Comportamiento esperado de Antigravity:**

- identifica que la tabla no es usable tal como esta en movil
- propone adaptacion real
- reorganiza contenido o cambia patron de presentacion
- preserva acceso a la informacion clave en iPad, iPhone y Android

# Operating style for Antigravity

Cuando esta skill este activa, Antigravity debe comportarse asi:

- no pensar solo en desktop
- considerar responsive desde el inicio, no como parche final
- validar siempre tablet y movil
- comprobar expresamente iPad, iPhone y Android
- priorizar legibilidad, toque, scroll natural y estructura clara
- rechazar layouts que se rompen fuera de escritorio
- mantener consistencia visual entre breakpoints

# Practical rule

**Toda pantalla de la webapp debe resolverse como experiencia multi-dispositivo real: desktop, tablet, iPad, iPhone y Android, no como una version desktop reducida.**
