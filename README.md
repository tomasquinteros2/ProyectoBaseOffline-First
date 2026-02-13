# Proyecto Base Offline-First 🚀

Este es un proyecto base diseñado con una arquitectura **Offline-First**, orientado a garantizar una experiencia de usuario fluida incluso en entornos con conectividad limitada o nula. Utiliza tecnologías modernas para el manejo de estado, persistencia local y sincronización.

## 📋 Descripción

El objetivo de este proyecto es servir como plantilla robusta para aplicaciones que requieren alta disponibilidad de datos. La aplicación prioriza la base de datos local y sincroniza los cambios con el servidor de forma asíncrona cuando la conexión se restablece.

## 🛠️ Tecnologías Principales

* **Frontend:** React.js / TypeScript
* **Backend:** Java Spring Boot
* **Contenedores:** Docker

## ✨ Características Key

- **Estrategia Offline-First:** Los datos se consumen y guardan localmente primero.
- **Sincronización en segundo plano:** Implementación de mecanismos para detectar la recuperación de red y sincronizar cambios pendientes.
- **UI Responsiva:** Diseñada con TypeScript para asegurar robustez en el tipado de datos.
- **Arquitectura Limpia:** Separación clara entre la capa de servicio, persistencia y componentes de UI.

## 🚀 Instalación y Uso

### Requisitos previos
- Node.js (v18+)
- Docker (opcional)

### Pasos para ejecutar localmente

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tomasquinteros2/ProyectoBaseOffline-First.git](https://github.com/tomasquinteros2/ProyectoBaseOffline-First.git)
   cd ProyectoBaseOffline-First
2. **Instalar dependencias:**

   ```bash
    npm install
3. **Ejecutar en modo desarrollo:**

    ```bash
    npm run dev
4. **🐳 Despliegue con Docker**
Para correr el proyecto en un contenedor:

    ```bash
    docker build -t proyecto-offline-first .
    docker run -p 3000:3000 proyecto-offline-first

👤 **Autor**
**Tomás Quinteros**

LinkedIn: https://www.linkedin.com/in/tomasquinteros1/

Portfolio: https://portfolioquinterostomas.vercel.app/
