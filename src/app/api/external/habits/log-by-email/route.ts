// src/app/api/external/habits/log-by-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/apiKeyAuth';
import { z } from 'zod';

// Schema de validación para el registro de hábito
const logHabitSchema = z.object({
  email: z.string().email('Email inválido'),
  hashtag: z.string().min(1, 'Hashtag requerido').regex(/^#?\w+$/, 'Formato de hashtag inválido'),
  fecha_registro: z.string().optional(), // Formato YYYY-MM-DD, opcional (default: hoy)
  valor: z.number().optional(), // Para hábitos medibles
  notas: z.string().optional() // Notas adicionales
});

export async function POST(request: NextRequest) {
  try {
    // Validar API Key
    const apiKeyValidation = await verifyApiKey(request);
    if (!apiKeyValidation.success) {
      return NextResponse.json(
        { error: apiKeyValidation.error || 'API Key inválida o faltante' },
        { status: apiKeyValidation.status || 401 }
      );
    }

    // Obtener y validar datos del body
    let body;
    try {
      const rawBody = await request.text();
      console.log('Raw body received:', rawBody);
      
      if (!rawBody || rawBody.trim() === '') {
        return NextResponse.json(
          { error: 'Body de la petición está vacío' },
          { status: 400 }
        );
      }
      
      body = JSON.parse(rawBody);
      console.log('Parsed body:', body);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return NextResponse.json(
        { error: 'Body de la petición no es un JSON válido' },
        { status: 400 }
      );
    }
    
    const validation = logHabitSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { email, hashtag, fecha_registro, valor, notas } = validation.data;

    // Limpiar hashtag (remover # si existe)
    const cleanHashtag = hashtag.replace(/^#/, '').toLowerCase();

    // Establecer fecha de registro (hoy si no se especifica)
    const registrationDate = fecha_registro || new Date().toISOString().split('T')[0];

    // Buscar usuario por email
    const userResult = await query({
      sql: 'SELECT id, nombre, email FROM usuarios WHERE email = ? AND estado = ?',
      args: [email, 'activo']
    });
    
    const user = userResult.rows[0] as any;

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Primero, obtener todos los hábitos del usuario para debugging
    const allHabitsResult = await query({
      sql: `SELECT id, nombre, descripcion, tipo FROM habitos WHERE usuario_id = ? ORDER BY nombre`,
      args: [user.id]
    });
    
    console.log('Todos los hábitos del usuario:', allHabitsResult.rows);
    console.log('Buscando hashtag:', cleanHashtag);
    
    // Buscar hábito que coincida con el hashtag
    const habitResult = await query({
      sql: `SELECT id, nombre, descripcion, tipo 
            FROM habitos 
            WHERE usuario_id = ? AND LOWER(nombre) LIKE ?
            ORDER BY nombre LIMIT 1`,
      args: [user.id, `%${cleanHashtag}%`]
    });
    
    console.log('Resultado de búsqueda de hábito:', habitResult.rows);
    
    const habit = habitResult.rows[0] as any;

    if (!habit) {
      return NextResponse.json(
        { 
          error: 'No se encontró un hábito activo que coincida con el hashtag',
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email
          },
          searched_hashtag: cleanHashtag,
          all_user_habits: allHabitsResult.rows.map((h: any) => ({ id: h.id, nombre: h.nombre, tipo: h.tipo }))
        },
        { status: 404 }
      );
    }

    // Verificar si ya existe un registro para esta fecha
    const existingLogResult = await query({
      sql: 'SELECT id FROM registros_habitos WHERE habito_id = ? AND fecha_registro = ?',
      args: [habit.id, registrationDate]
    });
    
    const existingLog = existingLogResult.rows[0];

    let logResult;
    let isUpdate = false;

    // Procesar según el tipo de hábito
    switch (habit.tipo) {
      case 'MAL_HABITO':
        // Para malos hábitos, registrar como "no completado" (0)
        logResult = await query({
          sql: `INSERT OR REPLACE INTO registros_habitos 
                (habito_id, fecha_registro, completado, notas, fecha_creacion)
                VALUES (?, ?, 0, ?, datetime('now'))`,
          args: [habit.id, registrationDate, notas || 'Registrado vía email']
        });
        break;

      case 'SI_NO':
        // Para hábitos sí/no, registrar como completado (1)
        logResult = await query({
          sql: `INSERT OR REPLACE INTO registros_habitos 
                (habito_id, fecha_registro, completado, notas, fecha_creacion)
                VALUES (?, ?, 1, ?, datetime('now'))`,
          args: [habit.id, registrationDate, notas || 'Registrado vía email']
        });
        break;

      case 'MEDIBLE_NUMERICO':
        // Para hábitos medibles, usar el valor proporcionado o 1 por defecto
        const numericValue = valor || 1;
        logResult = await query({
          sql: `INSERT OR REPLACE INTO registros_habitos 
                (habito_id, fecha_registro, valor_numerico, notas, fecha_creacion)
                VALUES (?, ?, ?, ?, datetime('now'))`,
          args: [habit.id, registrationDate, numericValue, notas || 'Registrado vía email']
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de hábito no soportado' },
          { status: 400 }
        );
    }

    if (existingLog) {
      isUpdate = true;
    }

    // Registro completado exitosamente

    // Obtener información del registro creado para la respuesta
    const createdLogResult = await query({
      sql: `SELECT id, habito_id, fecha_registro, completado, valor_numerico, notas, fecha_creacion
            FROM registros_habitos 
            WHERE habito_id = ? AND fecha_registro = ?`,
      args: [habit.id, registrationDate]
    });
    
    const createdLog = createdLogResult.rows[0];

    // Obtener información actualizada del hábito para la respuesta
    const updatedHabitResult = await query({
      sql: `SELECT 
         h.id,
         h.nombre,
         h.descripcion,
         h.tipo,
         rh.completado,
         rh.valor_numerico,
         rh.notas,
         rh.fecha_creacion as fecha_registro_creacion
       FROM habitos h
       LEFT JOIN registros_habitos rh ON h.id = rh.habito_id AND rh.fecha_registro = ?
       WHERE h.id = ?`,
       args: [registrationDate, habit.id]
     });
     
     const updatedHabit = updatedHabitResult.rows[0];

    return NextResponse.json({
      success: true,
      message: isUpdate ? 'Registro de hábito actualizado exitosamente' : 'Hábito registrado exitosamente',
      action: isUpdate ? 'updated' : 'created',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email
      },
      habit: {
        id: habit.id,
        nombre: habit.nombre,
        tipo: habit.tipo
      },
      registro: {
        fecha_registro: registrationDate,
        completado: updatedHabit?.completado || null,
        valor_numerico: updatedHabit?.valor_numerico || null,
        notas: updatedHabit?.notas || null
      },
      searched_hashtag: cleanHashtag
    });

  } catch (error) {
    console.error('Error al registrar hábito por email:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}