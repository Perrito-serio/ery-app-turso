// tests/api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tests de API - Hábitos', () => {
  // Usar sesión de usuario estándar para tests de API
  test.use({ storageState: 'playwright/.auth/usuario_estandar.json' });
  
  test('GET /api/habits devuelve lista de hábitos del usuario', async ({ page }) => {
    // Navegar para establecer cookies de sesión
    await page.goto('/my-dashboard');
    
    const response = await page.request.get('/api/habits');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('habits');
    expect(Array.isArray(data.habits)).toBe(true);
  });
  
  test('POST /api/habits crea un nuevo hábito correctamente', async ({ page }) => {
    await page.goto('/my-dashboard');
    
    const newHabit = {
      nombre: 'Test Hábito API',
      descripcion: 'Hábito creado desde test de API',
      tipo: 'SI_NO'
    };
    
    const response = await page.request.post('/api/habits', {
      data: newHabit
    });
    
    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data.message).toContain('exitosamente');
  });
  
  test('POST /api/habits valida datos de entrada con Zod', async ({ page }) => {
    await page.goto('/my-dashboard');
    
    // Enviar datos inválidos
    const invalidHabit = {
      nombre: '', // Nombre vacío debería fallar
      tipo: 'TIPO_INVALIDO' // Tipo inválido
    };
    
    const response = await page.request.post('/api/habits', {
      data: invalidHabit
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data.message).toContain('inválidos');
  });
  
  test('POST /api/habits/log registra progreso de hábito', async ({ page }) => {
    await page.goto('/my-dashboard');
    
    // Primero crear un hábito
    const newHabit = {
      nombre: 'Hábito para Log Test',
      tipo: 'SI_NO'
    };
    
    const habitResponse = await page.request.post('/api/habits', {
      data: newHabit
    });
    expect(habitResponse.status()).toBe(201);
    
    const habitData = await habitResponse.json();
    const habitId = habitData.habitId;
    
    // Ahora registrar progreso
    const logData = {
      habito_id: habitId,
      fecha_registro: new Date().toISOString().split('T')[0], // Fecha de hoy
      valor_booleano: true
    };
    
    const logResponse = await page.request.post('/api/habits/log', {
      data: logData
    });
    
    expect([200, 201]).toContain(logResponse.status());
  });
});

test.describe('Tests de API - Dashboard', () => {
  test.use({ storageState: 'playwright/.auth/usuario_estandar.json' });
  
  test('GET /api/dashboard devuelve estadísticas del usuario', async ({ page }) => {
    await page.goto('/my-dashboard');
    
    const response = await page.request.get('/api/dashboard');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('habits_con_estadisticas');
    expect(Array.isArray(data.habits_con_estadisticas)).toBe(true);
    
    // Verificar estructura de datos
    if (data.habits_con_estadisticas.length > 0) {
      const habit = data.habits_con_estadisticas[0];
      expect(habit).toHaveProperty('id');
      expect(habit).toHaveProperty('nombre');
      expect(habit).toHaveProperty('tipo');
      expect(habit).toHaveProperty('racha_actual');
    }
  });
});

test.describe('Tests de API - Autenticación', () => {
  
  test('Endpoints protegidos devuelven 401 sin autenticación', async ({ request }) => {
    const protectedEndpoints = [
      { method: 'GET', url: '/api/habits' },
      { method: 'POST', url: '/api/habits' },
      { method: 'GET', url: '/api/dashboard' },
      { method: 'GET', url: '/api/profile' }
    ];
    
    for (const endpoint of protectedEndpoints) {
      let response;
      if (endpoint.method === 'GET') {
        response = await request.get(endpoint.url);
      } else {
        response = await request.post(endpoint.url, { data: {} });
      }
      
      expect(response.status()).toBe(401);
    }
  });
  
  test('API devuelve errores apropiados para datos malformados', async ({ page }) => {
    await page.goto('/my-dashboard');
    
    // Enviar JSON malformado
    const response = await page.request.post('/api/habits', {
      data: 'invalid json string'
    });
    
    expect(response.status()).toBe(400);
  });
});

test.describe('Tests de API - Validación de Tipos de Hábitos', () => {
  test.use({ storageState: 'playwright/.auth/usuario_estandar.json' });
  
  test('Hábito MEDIBLE_NUMERICO requiere meta_objetivo', async ({ page }) => {
    await page.goto('/my-dashboard');
    
    const habitWithoutGoal = {
      nombre: 'Hábito Numérico Sin Meta',
      tipo: 'MEDIBLE_NUMERICO'
      // meta_objetivo faltante
    };
    
    const response = await page.request.post('/api/habits', {
      data: habitWithoutGoal
    });
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.message).toContain('meta objetivo');
  });
  
  test('Hábito SI_NO no requiere meta_objetivo', async ({ page }) => {
    await page.goto('/my-dashboard');
    
    const siNoHabit = {
      nombre: 'Hábito Sí/No',
      tipo: 'SI_NO'
      // meta_objetivo no necesario
    };
    
    const response = await page.request.post('/api/habits', {
      data: siNoHabit
    });
    
    expect(response.status()).toBe(201);
  });
  
  test('MAL_HABITO se crea correctamente', async ({ page }) => {
    await page.goto('/my-dashboard');
    
    const malHabito = {
      nombre: 'Mal Hábito Test',
      tipo: 'MAL_HABITO',
      descripcion: 'Test de mal hábito'
    };
    
    const response = await page.request.post('/api/habits', {
      data: malHabito
    });
    
    expect(response.status()).toBe(201);
  });
});