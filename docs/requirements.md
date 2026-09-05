# Requisitos del producto — documento del equipo

## 1. Problema y contexto

El producto busca facilitar el registro y seguimiento de inspecciones de mantenimiento mediante una aplicación que permita consultar y documentar información de inspecciones de manera clara y estructurada.

Una dificultad importante es que una inspección puede realizarse en un lugar donde la conexión a Internet sea inestable o se interrumpa. En estas situaciones, depender exclusivamente de una conexión disponible en todo momento puede dificultar la continuidad del registro de un hallazgo. Si un registro se interrumpe o se pierde, la información capturada puede tener que registrarse nuevamente y se puede dificultar el seguimiento posterior.

La conectividad intermitente es relevante porque una persona encargada de realizar una inspección puede encontrarse temporalmente sin acceso estable a Internet. Por ello, como capacidad futura, el producto deberá contemplar la conservación local de los registros y su posterior sincronización cuando vuelva a existir conectividad.

Durante la Semana 1 el proyecto se limita a dejar documentados los requisitos y comprobar el funcionamiento básico del starter. En esta etapa no se implementan todavía el funcionamiento offline, la sincronización, el manifest, el service worker, las notificaciones ni la autenticación.

Los escenarios y necesidades descritos en este documento representan situaciones previstas para el producto y no constituyen un diagnóstico de problemas reales de la Universidad Tecnológica de Tehuacán.

## 2. Usuarios y escenarios

### Usuarios

* **Persona inspectora:** realiza inspecciones, consulta registros y documenta hallazgos encontrados durante una revisión.
* **Persona responsable de mantenimiento o seguimiento:** consulta los registros de inspección para conocer su estado, hallazgos y resumen, y dar seguimiento a las situaciones registradas.

### ESC-01 — Inspección con conexión

**Situación inicial:** Una persona inspectora realiza una inspección y cuenta con conexión a Internet. Existen registros sintéticos disponibles para consultar.

**Acción:** La persona inspectora abre la aplicación, consulta los registros de inspección y revisa la información disponible.

**Resultado esperado:** La aplicación muestra los registros sintéticos y permite visualizar la información correspondiente a cada inspección.

### ESC-02 — Inspección con conexión intermitente

**Situación inicial:** Una persona inspectora realiza una inspección y la conexión a Internet es intermitente o se pierde temporalmente.

**Acción:** Como capacidad futura, la persona inspectora registra un hallazgo y el sistema conserva la información localmente hasta que vuelva a existir conectividad.

**Resultado esperado:** Como capacidad futura, el registro permanece disponible en el dispositivo y posteriormente puede sincronizarse cuando se restablezca la conexión.

## 3. Requisitos funcionales

| ID    | Acción del producto                                                           | Condición observable de aceptación                                                                                                            | Ahora o futuro |
| ----- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| RF-01 | Mostrar los registros sintéticos de inspección proporcionados por el starter. | Al abrir la página inicial se muestran los registros sintéticos disponibles.                                                                  | Semana 1       |
| RF-02 | Mostrar la información de cada registro de inspección.                        | Al consultar un registro se pueden identificar sus datos disponibles, como laboratorio, fecha, responsable, estado, hallazgos y resumen.      | Semana 1       |
| RF-03 | Permitir visualizar el estado de una inspección.                              | El estado registrado se muestra de manera identificable dentro de la información de la inspección.                                            | Semana 1       |
| RF-04 | Permitir registrar una inspección con sus datos correspondientes.             | En una versión futura, al guardar una inspección válida, el sistema deberá mostrar el registro creado.                                        | Futuro         |
| RF-05 | Conservar localmente un registro cuando no exista conexión.                   | En una versión futura, al perder la conectividad, un registro previamente capturado deberá permanecer disponible en el dispositivo.           | Futuro         |
| RF-06 | Sincronizar registros conservados localmente cuando vuelva la conexión.       | En una versión futura, al restablecerse la conectividad, los registros pendientes deberán enviarse y quedar identificados como sincronizados. | Futuro         |

Los requisitos RF-04, RF-05 y RF-06 describen capacidades futuras y no implican que dichas funciones estén implementadas durante la Semana 1.

## 4. Requisitos no funcionales

### RNF-01 — Reproducibilidad

**Condición:** El proyecto debe poder instalarse y verificarse desde una copia limpia utilizando las versiones de Node.js y npm declaradas por el proyecto.

**Método de comprobación:** Ejecutar `npm ci` y posteriormente `npm run verify`, comprobando que los comandos terminen con código 0.

**Momento de validación:** Semana 1.

### RNF-02 — Accesibilidad

**Condición:** Los elementos visibles de la interfaz deberán presentar texto legible, controles identificables y una estructura que permita distinguir la información principal.

**Método de comprobación:** Revisión humana de la interfaz y de los elementos visibles de la aplicación.

**Momento de validación:** Semana 1 para la interfaz existente y durante las semanas de implementación de nuevas pantallas.

### RNF-03 — Seguridad

**Condición:** El repositorio no deberá contener contraseñas, credenciales, tokens ni secretos de configuración.

**Método de comprobación:** Revisión de los archivos del repositorio y comprobación de que no se agreguen archivos `.env` ni credenciales.

**Momento de validación:** Semana 1 y en cada entrega posterior.

### RNF-04 — Privacidad

**Condición:** Las pruebas y registros utilizados durante el desarrollo deberán utilizar únicamente información sintética y no deberán contener datos personales reales.

**Método de comprobación:** Revisión humana de los datos utilizados en la aplicación y en las pruebas.

**Momento de validación:** Semana 1 y durante las siguientes etapas de desarrollo.

### RNF-05 — Rendimiento

**Condición:** Como meta futura, el listado deberá mostrar 100 registros sintéticos en menos de 2 segundos en el dispositivo de prueba definido por el equipo.

**Método de comprobación:** Realizar cinco ejecuciones con 100 registros sintéticos y registrar los tiempos obtenidos.

**Momento de validación:** Futuro, cuando exista la funcionalidad y la cantidad de registros necesaria.

**Supuesto:** El umbral de 2 segundos es una meta propuesta por el equipo para evaluar el comportamiento del listado y no representa un resultado medido durante la Semana 1.

### RNF-06 — Operación offline futura

**Condición:** Como capacidad futura, la aplicación deberá permitir consultar y conservar registros previamente capturados cuando el dispositivo no tenga conexión.

**Método de comprobación:** Desactivar la conexión del dispositivo de prueba, realizar una captura y comprobar que el registro permanezca disponible localmente.

**Momento de validación:** Futuro, cuando se implemente la operación offline.

## 5. Datos sintéticos y límites

Los registros utilizados durante la Semana 1 deberán utilizar información ficticia. Los campos considerados para una inspección incluyen:

* **ID:** identificador ficticio de la inspección.
* **Laboratorio:** nombre ficticio del laboratorio.
* **Fecha:** fecha asociada al registro de prueba.
* **Responsable:** nombre ficticio utilizado únicamente para pruebas.
* **Estado:** estado de la inspección, por ejemplo pendiente, en proceso o resuelto.
* **Hallazgos:** descripción ficticia de los hallazgos encontrados.
* **Resumen:** descripción breve y ficticia de la inspección.

Los datos deberán mantenerse como información sintética. Se excluyen datos reales de estudiantes, nombres reales utilizados como responsables de una inspección, contraseñas, tokens, credenciales, información de contacto y cualquier otra información personal innecesaria para las pruebas.

La identificación académica de los integrantes se registra únicamente en la evidencia correspondiente del repositorio privado y en Classroom, no como parte de los datos de prueba de la aplicación.

## 6. Criterios de aceptación de la Semana 1

| Entrega               | Comprobación      | Criterio de aceptación                                                                                                                 |
| --------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Instalación           | `npm ci`          | Las dependencias se instalan correctamente desde una copia limpia.                                                                     |
| Arranque              | `npm run dev`     | El proyecto inicia y permite acceder a la aplicación en el entorno local.                                                              |
| Pantalla inicial      | Inspección visual | La pantalla inicial se muestra y los registros sintéticos disponibles pueden observarse.                                               |
| Pruebas               | `npm test`        | Las pruebas proporcionadas por el proyecto se ejecutan y su resultado real queda registrado en la evidencia correspondiente.           |
| Build                 | `npm run build`   | El proyecto genera correctamente su compilación.                                                                                       |
| Verificación conjunta | `npm run verify`  | Los comandos incluidos en la verificación terminan correctamente según la configuración del proyecto.                                  |
| Calidad documental    | Revisión humana   | Los requisitos, escenarios, límites y criterios son claros, verificables y no confunden funciones futuras con funciones implementadas. |

La ejecución de comandos comprueba aspectos técnicos específicos del proyecto. La revisión humana es necesaria para determinar si los requisitos están correctamente redactados, si los escenarios son coherentes y si los límites del producto están claramente definidos.

La ejecución de `npm run verify` no demuestra por sí sola la calidad del análisis de requisitos ni sustituye la revisión humana del documento.
