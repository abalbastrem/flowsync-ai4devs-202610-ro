---
status: accepted
date: 2026-11-13
---

# 0002 — Niveles de test por historia y cobertura de ramas como detector

## Contexto y problema

La unidad de trabajo es la historia, y cada criterio se prueba por defecto desde fuera. Hasta ahora el E2E era «pocos, solo recorridos críticos», sin regla sobre cuándo toca, y no se medía la cobertura. Eso deja dos preguntas abiertas:

- **¿Qué nivel prueba que una historia está hecha?** Un endpoint en verde y un componente en verde con la API simulada no garantizan que frontend y backend encajen.
- **¿Cómo se detecta el comportamiento que nadie ha decidido?** Una rama que no sale de ningún criterio puede quedar sin test, y nadie se entera, o con un test inventado, que la convierte en contrato sin que nadie lo decida.

## Factores de decisión

- Que cada criterio, casos límite incluidos, se pruebe de forma rápida y determinista.
- Que haya una prueba de que la historia funciona entera, tal como la ve una persona.
- Que los tests no fijen como contrato comportamiento que ningún criterio pide.
- Coste de mantenimiento: los E2E son lentos, frágiles y no dicen dónde está el fallo.

## Opciones consideradas

1. **E2E como test principal de cada historia**, que verifica sus criterios por la pantalla.
2. **Solo endpoint y componente**, con E2E únicamente para recorridos críticos (lo que había).
3. **Reparto por papeles**: endpoint para cada criterio del backend, componente para cada criterio visual, un E2E por historia con pantalla solo para el camino feliz, y unitario como excepción.

## Decisión

Opción 3, y además:

- **Ningún test sin criterio.** Todo test cuelga de un escenario o de una decisión técnica aceptada. Ante una rama que ningún criterio recoge, el agente para y pregunta en lugar de inventar el escenario y su test.
- **Cobertura de ramas del código nuevo de cada change**, como detector y sin umbral que bloquee. Cada rama sin cubrir se clasifica en el PR: criterio que falta, código muerto o defensivo, decisión técnica propia (test unitario) o código de otra historia.

### Consecuencias

- Bueno: cada historia tiene una prueba de que está conectada, sin pagar el coste de verificar criterios por la pantalla.
- Bueno: la cobertura caza las ramas sin test, y la regla de no inventar criterios, vigilada por el revisor del PR, caza los tests sin criterio. La cobertura sola no ve el segundo caso, porque esa rama sale en verde.
- Malo: hace falta montar la base de E2E (Playwright, los dos servidores y una base de datos aislada). Es preparación técnica de la primera historia con pantalla que la necesite; hasta entonces, las historias ya cerradas no tienen su E2E.
- Malo: hace falta montar la medición de cobertura en backend y frontend, también como preparación de la primera historia que la necesite.
- Malo: la cobertura de los E2E no se mide (corren en procesos separados). No hace falta: lo que recorren ya lo cubren endpoint y componente.

### Confirmación

El grupo «Cierre» de las tareas de cada change (ver `openspec/config.yaml`) contiene el E2E, si hay pantalla, y la auditoría de cobertura. El subagente `adversarial-reviewer` comprueba en cada PR que todo test se traza a un criterio.

## Pros y contras de las opciones

### E2E como test principal

- Bueno, porque prueba la historia tal como la ve la persona usuaria y sirve de criterio de «hecho».
- Malo, porque no cabe probar todos los criterios por la pantalla: FS-142 tiene 18. En la práctica cubre el camino feliz y poco más.
- Malo, porque es lento y frágil, y cuando falla no dice si el fallo es del frontend, del backend o de los datos.
- Malo, porque no todas las historias tienen pantalla.

### Solo endpoint y componente

- Bueno, porque es rápido, determinista y cubre todos los criterios con un coste bajo.
- Malo, porque nada prueba que frontend y backend encajen. Los tipos generados del registro reducen el hueco, pero no cubren los mensajes de error ni el comportamiento real.

### Reparto por papeles

- Bueno, porque cada nivel hace lo que sabe hacer: el endpoint y el componente verifican, y el E2E conecta.
- Malo, porque es el que más infraestructura de tests necesita.
