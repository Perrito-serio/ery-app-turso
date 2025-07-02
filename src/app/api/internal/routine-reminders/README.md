# Integración de Recordatorios de Rutinas con n8n

Este documento describe cómo integrar el endpoint de recordatorios de rutinas con n8n para enviar correos electrónicos automáticos a los usuarios sobre sus hábitos de rutina no completados.

## Descripción del Endpoint

- **URL**: `/api/internal/routine-reminders`
- **Método**: GET
- **Autenticación**: API Key (Bearer Token)
- **Propósito**: Obtener una lista de hábitos de rutina no completados para enviar recordatorios por correo electrónico

## Estructura de la Respuesta

El endpoint devuelve un array JSON con la siguiente estructura para cada recordatorio:

```json
[
  {
    "userId": 123,
    "userName": "Nombre Usuario",
    "userEmail": "usuario@ejemplo.com",
    "habitName": "Nombre del Hábito"
  },
  ...
]
```

## Importante: Autenticación Correcta

⚠️ **ATENCIÓN**: Este endpoint requiere una **API Key** para la autenticación, NO un token de usuario.

### Diferencia entre Token de Usuario y API Key

1. **Token de Usuario** (`/api/auth/token`):
   - Se obtiene con credenciales de usuario (email/contraseña)
   - Está vinculado a un usuario específico
   - Se usa para acciones en nombre de un usuario
   - **NO es adecuado para integraciones automatizadas como n8n**

2. **API Key** (generada por un administrador):
   - Se crea específicamente para integraciones de sistema
   - No está vinculada a un usuario específico
   - Proporciona acceso a endpoints internos protegidos
   - **Es la autenticación correcta para n8n**

## Obtención de una API Key

Para obtener una API Key válida:

1. Un administrador debe acceder al panel de administración
2. Navegar a la sección de "API Keys"
3. Crear una nueva API Key con un nombre descriptivo (ej. "n8n Recordatorios")
4. Copiar la API Key generada (solo se muestra una vez)

## Integración con n8n

Sigue estos pasos para configurar un flujo de trabajo en n8n que envíe recordatorios por correo electrónico:

### 1. Configuración del Nodo HTTP Request

1. Añade un nodo "HTTP Request" en n8n
2. Configura el nodo con los siguientes parámetros:
   - **Método**: GET
   - **URL**: `https://tu-dominio.com/api/internal/routine-reminders`
   - **Autenticación**: Bearer Token
   - **Token**: Tu API Key generada por un administrador

### 2. Configuración del Nodo de Correo Electrónico

1. Añade un nodo "Send Email" después del nodo HTTP Request
2. Configura el servicio de correo electrónico (SMTP, SendGrid, etc.)
3. Utiliza la opción "Split In Batches" para procesar cada recordatorio individualmente
4. Configura el correo con los siguientes parámetros:
   - **Para**: `{{$json["userEmail"]}}`
   - **Asunto**: `Recordatorio: No olvides completar tu hábito "{{$json["habitName"]}}"`
   - **Contenido**: Personaliza el mensaje utilizando los campos disponibles (`userName`, `habitName`)

### 3. Programación del Flujo de Trabajo

1. Añade un nodo "Cron" al inicio del flujo para programar la ejecución
2. Configura la programación según tus necesidades (por ejemplo, diariamente a las 20:00)

## Notas Técnicas

- El endpoint filtra automáticamente los hábitos que ya han sido completados en el día actual
- Solo se incluyen usuarios con estado "activo"
- La consulta SQL agrupa los resultados para evitar duplicados
- La fecha utilizada para la consulta es la fecha actual del servidor en formato YYYY-MM-DD

## Pruebas

Puedes probar el endpoint manualmente con curl:

```bash
curl -X GET \
  https://tu-dominio.com/api/internal/routine-reminders \
  -H 'Authorization: Bearer TU_API_KEY'
```

O utilizando el script de prueba incluido:

```javascript
// test.js
const fetch = require('node-fetch');

async function testEndpoint() {
  const response = await fetch('https://tu-dominio.com/api/internal/routine-reminders', {
    headers: {
      'Authorization': 'Bearer TU_API_KEY'
    }
  });
  
  const data = await response.json();
  console.log(data);
}

testEndpoint().catch(console.error);
```