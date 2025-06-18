# Suite de Pruebas - Ery App

Esta documentación describe la suite de pruebas completa para la aplicación Ery App, incluyendo las mejoras implementadas para cubrir todas las funcionalidades críticas.

## Estructura de Archivos de Prueba

### Archivos de Configuración de Autenticación
- `auth.setup.ts` - Configuración de autenticación para administrador
- `auth-users.setup.ts` - Configuración de autenticación para usuarios estándar, moderadores y usuarios de prueba

### Archivos de Pruebas Funcionales
- `flujos-principales.spec.ts` - Pruebas de flujos principales de la aplicación
- `habits.spec.ts` - Pruebas completas de gestión de hábitos
- `admin.spec.ts` - Pruebas de funcionalidades administrativas
- `roles-permissions.spec.ts` - Pruebas de control de acceso y permisos por rol
- `api.spec.ts` - Pruebas de endpoints de API

### Archivos de Pruebas Especializadas
- `accessibility.spec.ts` - Pruebas de accesibilidad
- `visual.spec.ts` - Pruebas de regresión visual

## Tipos de Usuario y Roles

### Usuario Estándar
- **Archivo de sesión**: `playwright/.auth/usuario_estandar.json`
- **Credenciales**: `user1@tecsup.com` / `password123`
- **Permisos**: Acceso a dashboard personal, gestión de hábitos propios

### Moderador
- **Archivo de sesión**: `playwright/.auth/mod.json`
- **Credenciales**: `wilkidblox@hotmail.com` / `123456789`
- **Permisos**: Funciones de moderación, acceso limitado a gestión de usuarios

### Administrador
- **Archivo de sesión**: `playwright/.auth/admin.json`
- **Credenciales**: `admin@tecsup.com` / `admin123`
- **Permisos**: Acceso completo a todas las funcionalidades

### Usuario de Prueba
- **Archivo de sesión**: `playwright/.auth/test_user.json`
- **Credenciales**: `user2@tecsup.com` / `password123`
- **Uso**: Para pruebas que requieren un usuario alternativo sin conflictos

## Ejecutar las Pruebas

### Ejecutar todas las pruebas
```bash
npx playwright test
```

### Ejecutar pruebas específicas
```bash
# Pruebas de hábitos
npx playwright test habits.spec.ts

# Pruebas de API
npx playwright test api.spec.ts

# Pruebas de roles y permisos
npx playwright test roles-permissions.spec.ts

# Pruebas de administración
npx playwright test admin.spec.ts
```

### Ejecutar pruebas en modo debug
```bash
npx playwright test --debug
```

### Ejecutar pruebas con interfaz gráfica
```bash
npx playwright test --ui
```

## Cobertura de Pruebas

### Gestión de Hábitos (`habits.spec.ts`)
- ✅ Creación de hábitos (SI_NO, MEDIBLE_NUMERICO, MAL_HABITO)
- ✅ Registro de progreso
- ✅ Edición de hábitos existentes
- ✅ Eliminación de hábitos
- ✅ Validación de formularios

### API Testing (`api.spec.ts`)
- ✅ Endpoints de hábitos (GET, POST)
- ✅ Endpoint de dashboard
- ✅ Validación con Zod
- ✅ Autenticación de endpoints
- ✅ Manejo de errores
- ✅ Tipos específicos de hábitos

### Control de Acceso (`roles-permissions.spec.ts`)
- ✅ Verificación de permisos por rol
- ✅ Restricciones de acceso a rutas
- ✅ Autorización de APIs
- ✅ Comportamiento específico por tipo de usuario

### Administración (`admin.spec.ts`)
- ✅ Gestión de usuarios
- ✅ Activación/desactivación de usuarios
- ✅ Edición de roles
- ✅ Restricciones de auto-modificación
- ✅ APIs administrativas

### Accesibilidad (`accessibility.spec.ts`)
- ✅ Verificación con axe-core
- ✅ Páginas principales
- ✅ Modales y componentes interactivos

### Regresión Visual (`visual.spec.ts`)
- ✅ Consistencia visual de páginas
- ✅ Comparación de screenshots
- ✅ Enmascaramiento de datos dinámicos

## Configuración de Playwright

El archivo `playwright.config.ts` está configurado para:
- Ejecutar setup de autenticación antes de las pruebas
- Soportar múltiples navegadores (Chrome, Firefox, Safari)
- Generar reportes HTML
- Capturar screenshots en fallos
- Configurar timeouts apropiados

## Mejoras Implementadas

### 1. Pruebas de Hábitos Completas
- Se completaron las pruebas faltantes para creación, edición y eliminación
- Se agregaron pruebas de validación de formularios
- Se incluyeron pruebas para todos los tipos de hábitos

### 2. Pruebas de API Directas
- Se crearon pruebas específicas para endpoints críticos
- Se verifican validaciones de Zod
- Se prueban diferentes escenarios de error

### 3. Control de Acceso Robusto
- Se implementaron pruebas para cada tipo de usuario
- Se verifican restricciones de acceso por rol
- Se prueban APIs con diferentes niveles de autorización

### 4. Configuración de Sesiones Mejorada
- Se crearon múltiples archivos de autenticación
- Se mejoró la configuración de setup
- Se agregó manejo de usuarios de prueba

## Notas Importantes

1. **Datos de Prueba**: Las pruebas asumen ciertos usuarios y datos existentes. Asegúrate de que la base de datos de prueba esté configurada correctamente.

2. **Selectores**: Algunos tests usan `data-testid` que pueden necesitar ser agregados a los componentes de la aplicación.

3. **URLs**: Las pruebas usan URLs relativas. Asegúrate de que `baseURL` esté configurado correctamente en `playwright.config.ts`.

4. **Dependencias**: Los tests de setup deben ejecutarse antes que los tests principales para crear los archivos de autenticación.

## Próximos Pasos

1. Agregar `data-testid` a componentes críticos para selectores más robustos
2. Implementar pruebas de rendimiento
3. Agregar pruebas de integración con base de datos
4. Expandir pruebas de accesibilidad a más páginas
5. Implementar pruebas de carga para APIs críticas