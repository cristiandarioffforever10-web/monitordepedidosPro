---
name: creador_de_habilidades
description: Una habilidad meta diseñada para guiar al Agente en la creación de nuevas habilidades estandarizadas en español.
---

# Creador de Habilidades Antigravity (Español)

Esta habilidad se activa cuando el usuario solicita la creación de una nueva capacidad o "skill" para el agente. Su objetivo es asegurar que todas las habilidades sigan una estructura técnica coherente y profesional.

## Instrucciones de Flujo

1.  **Definición de Propósito**: 
    - Si el usuario no ha sido específico, pregunta: "¿Cuál es el objetivo principal de esta nueva habilidad?" y "¿Qué problemas específicos debe resolver?".
    - Determina si la habilidad requiere `scripts` adicionales (Python/JS) o solo instrucciones de texto.

2.  **Identificación y Nomenclatura**:
    - Nombre de la carpeta: `snake_case` (ej: `limpiador_de_datos`).
    - Título de la habilidad: Nombre descriptivo y profesional.

3.  **Construcción de la Estructura**:
    - Crea el directorio en `c:\Users\Noxie\Documents\MDP\MDP - AG\.agent/skills/<nombre_habilidad>/`.
    - Crea el archivo `SKILL.md` dentro de esa carpeta.

4.  **Redacción de SKILL.md**:
    - **Frontmatter**: Incluye `name` y `description`.
    - **Secciones Obligatorias**:
        - `# [Título de la Habilidad]`: Descripción detallada del rol que asume el agente.
        - `## Guía de Uso`: Pasos lógicos que debe seguir el agente al activarla.
        - `## Reglas y Restricciones`: Qué NO debe hacer el agente bajo esta habilidad.
        - `## Ejemplos de Interacción` (Opcional): Bloques de ejemplo para guiar al modelo.

5.  **Validación Final**:
    - Verifica que las rutas de los archivos sean absolutas.
    - Asegúrate de que el lenguaje utilizado en las instrucciones sea técnico pero claro.

## Estándar de Referencia
Recuerda que una habilidad es un conjunto de instrucciones que extienden mis capacidades. No es solo un documento, es un nuevo "modo de operación".
