# 🚀 Pruebas de Carga con Locust - Ery App

## 📋 Descripción General

Este documento describe la implementación completa de pruebas de carga para la aplicación Ery usando **Locust**. Las pruebas están diseñadas para identificar cuellos de botella, medir tiempos de respuesta bajo estrés y determinar la capacidad máxima de usuarios concurrentes.

## 🎯 Objetivos de las Pruebas

- **Identificar cuellos de botella** en el sistema
- **Medir tiempos de respuesta** de la API bajo estrés
- **Determinar capacidad máxima** de usuarios concurrentes
- **Evaluar comportamiento** de diferentes tipos de usuarios
- **Validar escalabilidad** de la aplicación

## 🛠️ Prerrequisitos

### 1. Instalación de Locust

```bash
pip install locust
```

### 2. Población de Datos de Prueba

**CRÍTICO**: Antes de ejecutar las pruebas, es esencial poblar la base de datos con datos significativos:

```bash
# Ejecutar el script de poblado
node scripts/seedDatabase.js
```

Esto creará:
- **10,000+ usuarios** de prueba
- **Múltiples hábitos** por usuario
- **Datos de progreso** históricos
- **Archivo usuarios_prueba.csv** con credenciales

### 3. Usuarios de Prueba Configurados

El sistema está configurado con:

#### Usuarios Estándar (500 usuarios)
- **Emails**: `muser0@tecsup.edu.pe` hasta `muser499@tecsup.edu.pe`
- **Contraseña**: `password123`

#### Usuarios Administrador
- `admin@tecsup.edu.pe` / `admin123`
- `wilkidblox@hotmail.com` / `123456789`

## 📁 Estructura de Archivos

```
ery-app-turso/
├── locustfile.py              # Archivo principal de Locust
├── usuarios_prueba.csv        # Credenciales generadas por seedDatabase.js
├── LOAD_TESTING_README.md     # Esta documentación
└── scripts/
    └── seedDatabase.js        # Script de poblado de datos
```

## 🎭 Tipos de Usuarios Simulados

### 1. EryAppUser (80% del tráfico)
**Comportamiento de usuario estándar:**
- ✅ Login automático con credenciales únicas
- 📊 Revisar dashboard (tarea más frecuente)
- 📝 Ver y gestionar hábitos
- 📈 Registrar progreso de hábitos
- ➕ Crear nuevos hábitos
- ⏱️ Tiempo de espera: 1-5 segundos entre tareas

### 2. AdminUser (20% del tráfico)
**Comportamiento administrativo:**
- 🔐 Login con credenciales de administrador
- 👥 Gestionar lista de usuarios
- ⚙️ Acceder a páginas administrativas
- 🛡️ Funciones de moderación
- 🔄 Activar/desactivar usuarios
- ⏱️ Tiempo de espera: 3-10 segundos entre tareas

### 3. WebsiteUser (Tráfico mínimo)
**Navegación pública:**
- 🏠 Visitar página principal
- 🔑 Acceder a login/registro
- 📄 Navegar páginas públicas

## 🚀 Ejecución de las Pruebas

### 1. Iniciar Locust

```bash
# Desde el directorio raíz del proyecto
locust -f locustfile.py
```

### 2. Configurar la Prueba

1. **Abrir navegador**: http://localhost:8089
2. **Configurar parámetros**:
   - **Number of users**: 500 (empezar moderado)
   - **Spawn rate**: 10 usuarios/segundo
   - **Host**: https://ery-app-turso.vercel.app

### 3. Configuraciones Recomendadas

#### Prueba Inicial (Baseline)
- **Usuarios**: 50
- **Spawn rate**: 5/seg
- **Duración**: 5 minutos

#### Prueba de Carga Media
- **Usuarios**: 200
- **Spawn rate**: 10/seg
- **Duración**: 10 minutos

#### Prueba de Estrés
- **Usuarios**: 500+
- **Spawn rate**: 20/seg
- **Duración**: 15 minutos

## 📊 Métricas Clave a Monitorear

### 🎯 Endpoints Críticos
1. **`/api/dashboard`** - Más frecuente, debe ser < 500ms
2. **`/api/habits`** - Gestión de hábitos, debe ser < 1s
3. **`/api/admin/users`** - Administración, debe ser < 2s
4. **`/api/habits/log`** - Registro de progreso, debe ser < 800ms

### 📈 Indicadores de Rendimiento
- **Tiempo de respuesta promedio** < 1 segundo
- **95% percentil** < 2 segundos
- **99% percentil** < 5 segundos
- **Tasa de fallos** < 1%
- **Requests por segundo** (RPS)

### 🚨 Señales de Alerta
- Tiempos de respuesta > 5 segundos consistentemente
- Tasa de fallos > 5%
- Errores 500 frecuentes
- Timeouts en conexiones de base de datos

## 🔧 Características Avanzadas

### Autenticación Realista
- ✅ Manejo completo de **NextAuth.js**
- 🔐 Tokens CSRF automáticos
- 🍪 Gestión de cookies de sesión
- 👤 Credenciales únicas por usuario virtual

### Datos Dinámicos
- 📝 Obtención real de hábitos del usuario
- 🎲 Generación aleatoria de datos de progreso
- 📊 Uso de IDs reales de la base de datos

### Manejo de Errores
- ❌ Captura y reporte de fallos
- 📝 Logging detallado de errores
- 🔄 Recuperación automática de errores temporales

## 📋 Checklist Pre-Ejecución

- [ ] ✅ Locust instalado (`pip install locust`)
- [ ] 🗄️ Base de datos poblada (`node scripts/seedDatabase.js`)
- [ ] 🚀 Aplicación desplegada y accesible en `https://ery-app-turso.vercel.app`
- [ ] 📁 Archivo `usuarios_prueba.csv` presente
- [ ] 🔧 Configuración de base de datos optimizada
- [ ] 💾 Suficiente espacio en disco para logs
- [ ] 🖥️ Recursos del sistema monitoreados

## 🎯 Escenarios de Prueba Sugeridos

### Escenario 1: Día Normal
- **Usuarios**: 100-200
- **Duración**: 30 minutos
- **Objetivo**: Simular carga típica diaria

### Escenario 2: Hora Pico
- **Usuarios**: 300-500
- **Duración**: 15 minutos
- **Objetivo**: Simular picos de tráfico

### Escenario 3: Estrés Extremo
- **Usuarios**: 1000+
- **Duración**: 10 minutos
- **Objetivo**: Encontrar punto de quiebre

### Escenario 4: Carga Sostenida
- **Usuarios**: 200
- **Duración**: 2 horas
- **Objetivo**: Detectar memory leaks

## 🔍 Análisis de Resultados

### Interpretación de Métricas

#### ✅ Rendimiento Excelente
- Tiempo promedio < 200ms
- 95% percentil < 500ms
- 0% fallos

#### ⚠️ Rendimiento Aceptable
- Tiempo promedio < 1s
- 95% percentil < 2s
- < 1% fallos

#### 🚨 Problemas de Rendimiento
- Tiempo promedio > 2s
- 95% percentil > 5s
- > 5% fallos

### Acciones Recomendadas

1. **Si hay problemas de rendimiento**:
   - Revisar logs de la aplicación
   - Monitorear uso de CPU/memoria
   - Analizar consultas de base de datos
   - Considerar optimizaciones de caché

2. **Si el rendimiento es bueno**:
   - Incrementar gradualmente la carga
   - Probar diferentes patrones de uso
   - Documentar capacidad máxima encontrada

## 🛡️ Consideraciones de Seguridad

- 🔒 **No usar en producción** - Solo en entornos de desarrollo/testing
- 🗄️ **Datos de prueba** - Usar solo datos sintéticos
- 🔐 **Credenciales** - No usar credenciales reales de usuarios
- 🧹 **Limpieza** - Limpiar datos de prueba después de las pruebas

## 📞 Soporte y Troubleshooting

### Problemas Comunes

1. **Error de conexión a la base de datos**
   - Verificar que la aplicación esté ejecutándose
   - Revisar configuración de base de datos

2. **Fallos de autenticación**
   - Verificar que los usuarios existan en la base de datos
   - Revisar configuración de NextAuth

3. **Timeouts frecuentes**
   - Reducir número de usuarios concurrentes
   - Aumentar timeouts en la configuración

### Logs Útiles

```bash
# Ver logs de Locust
locust -f locustfile.py --logfile=locust.log

# Ver logs de la aplicación
npm run dev
```

---

**📝 Nota**: Este sistema de pruebas está diseñado para ser realista y completo. Ajusta los parámetros según las características específicas de tu infraestructura y objetivos de rendimiento.