---
name: antigravity-ui-geometry-guard
description: Enforce visually consistent and geometrically clean UI layouts in Antigravity when designing or reviewing forms, panels, tables, and application screens.
---

# Purpose

Usa esta skill para obligar a Antigravity a diseñar y revisar la interfaz con calidad geométrica consistente.

El objetivo es que **ninguna pantalla se considere correcta** si incumple principios básicos de orden visual, alineación, proporción, jerarquía tipográfica y consistencia entre componentes.

Esta skill impone una política de calidad visual centrada en:

- radios de esquina consistentes
- alineaciones exactas
- alturas y anchos coherentes
- tamaños de texto homogéneos
- títulos claramente jerarquizados
- espaciado uniforme en horizontal y vertical
- contenedores adaptados al dato que contienen o al dato que se espera introducir
- distribución limpia y simétrica de formularios, bloques y acciones
- uso consistente de marcos o bordes en todos los contenedores equivalentes

# When to use

Usa esta skill cuando:

- se diseñen nuevas pantallas o formularios
- se revisen interfaces ya construidas
- haya UI desalineada, visualmente irregular o con sensación de "parche"
- los inputs, selects, datepickers, textareas, tarjetas o paneles no compartan una lógica visual común
- los títulos, labels, placeholders y valores tengan tamaños incoherentes
- existan campos demasiado grandes o demasiado pequeños para el contenido esperado
- las distancias entre elementos no sigan un patrón uniforme
- algunos contenedores tengan borde y otros no sin una razón funcional clara
- quieras que Antigravity actúe como revisor estricto de calidad visual antes de aceptar un diseño

No la uses para lógica de backend, validación funcional o arquitectura técnica no visual.

# Steps

## 1. Actuar como revisor geométrico estricto

Antigravity debe evaluar cada pantalla con una regla base:

**Si la interfaz no es geométricamente consistente, no está terminada.**

No debe limitarse a "hacer que funcione". Debe corregir también la calidad visual.

## 2. Aplicar reglas obligatorias de consistencia

Antigravity debe respetar siempre estas reglas:

### A. Radios de esquina

- Todos los contenedores equivalentes deben tener el mismo radio.
- Inputs, selects, datepickers, textareas y tarjetas del mismo nivel visual deben compartir la misma familia de esquinas.
- No mezclar bordes casi rectos con otros muy redondeados salvo que exista una razón de jerarquía explícita.
- Si hay variantes, deben ser pocas y sistemáticas.

### B. Alineación

- Bordes izquierdos y derechos deben caer en líneas consistentes.
- Labels, campos, títulos y bloques deben seguir una retícula clara.
- No debe haber desplazamientos de pocos píxeles entre componentes similares.
- La alineación vertical entre filas de formulario debe ser exacta.
- Los grupos relacionados deben compartir eje visual.

### C. Tamaño de contenedores

- El tamaño del campo debe corresponder al tipo y longitud esperada del dato.
- Campos cortos para datos cortos: números, códigos, estados, fechas.
- Campos medios para nombres, responsables, categorías.
- Campos anchos para descripciones, rutas, URLs o textos largos.
- No usar inputs exageradamente anchos para valores muy cortos.
- No comprimir campos que normalmente requieren lectura cómoda.

### D. Alturas y proporciones

- Componentes equivalentes deben tener la misma altura.
- Botones del mismo nivel deben compartir altura y padding.
- Inputs de una misma zona no deben parecer de familias distintas.
- Las columnas deben tener anchos visualmente equilibrados, no arbitrarios.

### E. Tipografía

- Labels del mismo nivel deben tener el mismo tamaño.
- El texto de entrada y el valor mostrado deben tener el mismo tamaño entre campos equivalentes.
- Los títulos de sección deben ser más grandes, más pesados o ambas cosas respecto al contenido normal.
- La jerarquía tipográfica debe ser clara de un vistazo.
- No mezclar demasiados tamaños en una misma pantalla.

### F. Espaciado horizontal y vertical

- Debe existir una escala de espacios consistente.
- La distancia entre contenedores en horizontal debe seguir un patrón fijo y repetible.
- La distancia entre contenedores en vertical debe seguir un patrón fijo y repetible.
- No debe haber separaciones arbitrarias entre elementos equivalentes.
- Separación entre label y campo uniforme.
- Separación entre campos de la misma fila uniforme.
- Separación entre filas uniforme.
- Separación entre secciones mayor que la separación entre elementos internos.
- No dejar huecos visuales accidentales ni zonas densamente apretadas sin intención.

### G. Marcos y bordes

- Todos los contenedores equivalentes deben tener marco o borde siguiendo la misma regla visual.
- No dejar algunos inputs, selects, tarjetas o cajas sin marco mientras otros sí lo tienen, salvo motivo funcional claro.
- El grosor del borde debe ser consistente entre componentes equivalentes.
- El color del borde debe responder a una lógica común de estado o jerarquía.
- Los marcos deben ayudar a ordenar visualmente la interfaz, no introducir ruido.

### H. Jerarquía visual

- Los títulos de bloque deben destacar claramente.
- Las acciones principales deben distinguirse de acciones secundarias.
- Los campos obligatorios deben señalarse de forma consistente.
- La información debe escanearse de arriba abajo y de izquierda a derecha sin fricción.

### I. Coherencia entre componentes

- Si dos elementos cumplen la misma función, deben verse equivalentes.
- Si un componente destaca visualmente, debe existir una razón funcional.
- No introducir excepciones estéticas aisladas.

## 3. Corregir antes de aceptar

Cuando Antigravity detecte problemas, debe proponer o aplicar correcciones concretas como estas:

- unificar radios
- ajustar widths por tipo de dato
- igualar alturas
- corregir padding interno
- alinear labels y campos a una misma retícula
- unificar la distancia horizontal entre contenedores
- unificar la distancia vertical entre filas y bloques
- añadir o corregir marcos para que todos los contenedores sigan la misma lógica
- agrupar mejor bloques relacionados
- reducir o ampliar campos según contenido esperado
- reforzar títulos con tamaño o peso tipográfico
- homogeneizar tamaños de fuente
- regularizar márgenes y separaciones

## 4. Priorizar legibilidad y orden por encima de la improvisación

Si hay conflicto entre "meter todo" y "mantener buena geometría", Antigravity debe reorganizar el layout en vez de tolerar desorden.

Puede hacerlo mediante:

- redistribución en columnas
- agrupación por secciones
- cambio de ancho de campos
- salto controlado de elementos a una nueva fila
- aumento del ancho del contenedor general si la pantalla lo necesita

## 5. Hacer revisión final obligatoria

Antes de dar una interfaz por válida, Antigravity debe comprobar:

- ¿Los radios son consistentes?
- ¿Los ejes verticales y horizontales están alineados?
- ¿Los campos tienen un tamaño adecuado al dato?
- ¿Los textos equivalentes tienen el mismo tamaño?
- ¿Los títulos destacan de verdad?
- ¿La distancia horizontal entre contenedores es uniforme?
- ¿La distancia vertical entre filas y bloques es uniforme?
- ¿Todos los contenedores equivalentes tienen marco o borde consistente?
- ¿El espaciado sigue una lógica repetible?
- ¿La pantalla se ve construida como un sistema y no como piezas sueltas?

Si alguna respuesta es "no", la interfaz debe revisarse otra vez.

# Examples

## Example 1 - Formulario con mala geometría

**Entrada esperada:**

"Revisa este formulario y corrígelo para que tenga consistencia geométrica. Quiero radios iguales, alineación perfecta, tamaños de campo según el dato, tipografía consistente, espaciado uniforme en horizontal y vertical, marcos coherentes y títulos mejor jerarquizados."

**Comportamiento esperado de Antigravity:**

- detecta diferencias de radios entre inputs y tarjetas
- corrige anchos absurdos para campos cortos como fechas o estados
- alinea todos los campos a una retícula común
- unifica alturas de controles
- corrige distancias incoherentes entre columnas y entre filas
- aplica marcos consistentes a todos los contenedores equivalentes
- aumenta peso o tamaño de los títulos de sección
- homogeneiza labels y textos de entrada
- ajusta spacing entre filas y bloques

## Example 2 - Creación de una nueva pantalla

**Entrada esperada:**

"Diseña esta vista de detalle usando una geometría impecable y consistencia total entre componentes."

**Comportamiento esperado de Antigravity:**

- crea una estructura clara por secciones
- asigna anchos de campo según contenido esperado
- usa una sola lógica de esquinas
- mantiene ritmo uniforme entre márgenes y espacios
- fija una distancia horizontal y vertical consistente entre contenedores
- aplica marcos coherentes en todos los bloques e inputs equivalentes
- diferencia títulos, labels y contenido con jerarquía limpia
- evita componentes desproporcionados o mal alineados

## Example 3 - Revisión estricta de calidad visual

**Entrada esperada:**

"No me digas solo si funciona. Evalúa si está visualmente bien construida y recházala si no cumple una geometría consistente."

**Comportamiento esperado de Antigravity:**

- hace crítica visual estricta
- enumera incoherencias de alineación, radios, tamaños, bordes y spacing
- no aprueba la interfaz hasta que el sistema visual sea consistente

# Operating style for Antigravity

Cuando esta skill esté activa, Antigravity debe comportarse así:

- ser exigente con la calidad visual
- no normalizar pequeños descuadres
- no tolerar distancias arbitrarias entre elementos
- no tolerar mezcla inconsistente de contenedores con y sin marco
- evitar excepciones estéticas sin sistema
- favorecer orden, simetría, consistencia y legibilidad
- tratar cada pantalla como parte de un design system coherente, aunque no exista uno formal

# Practical rule

**Toda interfaz debe parecer diseñada por un único sistema geométrico, con distancias regulares, marcos consistentes y proporciones claras, no ensamblada componente por componente.**
