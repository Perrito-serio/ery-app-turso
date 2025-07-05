// src/app/api/habits/[habitoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { z } from 'zod';
import { Row } from '@libsql/client';

// --- INTERFACES ---
interface HabitFromDB extends Row {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
  meta_objetivo: number | null;
  fecha_creacion: string;
  usuario_id: number;
}

interface HabitLogFromDB extends Row {
  habito_id: number;
  fecha_registro: string;
  valor_booleano: number | null;
  valor_numerico: number | null;
}

// Esquema de Zod (sin cambios)
const updateHabitSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido.").max(255).optional(),
  descripcion: z.string().optional().nullable(),
  meta_objetivo: z.number().optional().nullable(),
}).partial().refine(data => Object.keys(data).length > 0, {
  message: "Se debe proporcionar al menos un campo para actualizar."
});

// --- FUNCIONES AUXILIARES PARA ESTADÍSTICAS ---

// Función para calcular días entre fechas
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Función para parsear fecha como local (sin zona horaria)
function parseDateAsLocal(dateString: string): Date {
  const dateOnly = dateString.split(' ')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Función para obtener fecha local como string YYYY-MM-DD
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Función para calcular la racha actual
function calculateCurrentStreak(logs: HabitLogFromDB[], habitType: string): number {
  if (logs.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Ordenar logs por fecha (más reciente primero)
  const sortedLogs = logs.sort((a, b) => parseDateAsLocal(b.fecha_registro).getTime() - parseDateAsLocal(a.fecha_registro).getTime());
  
  if (habitType === 'MAL_HABITO') {
    // Para malos hábitos, calcular días desde la última recaída
    const lastLog = sortedLogs[0];
    const lastLogDate = parseDateAsLocal(lastLog.fecha_registro);
    return daysBetween(lastLogDate, today);
  } else {
    // Para otros hábitos, calcular días consecutivos completados
    let streak = 0;
    let currentDate = new Date(today);
    
    for (const log of sortedLogs) {
      const logDate = parseDateAsLocal(log.fecha_registro);
      
      if (logDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (logDate.getTime() < currentDate.getTime()) {
        break;
      }
    }
    
    return streak;
  }
}

// Función para calcular la mejor racha
function calculateBestStreak(logs: HabitLogFromDB[], habitType: string): number {
  if (logs.length === 0) return 0;
  
  if (habitType === 'MAL_HABITO') {
    // Para malos hábitos, encontrar el período más largo sin recaídas
    const sortedLogs = logs.sort((a, b) => parseDateAsLocal(a.fecha_registro).getTime() - parseDateAsLocal(b.fecha_registro).getTime());
    let maxStreak = 0;
    
    for (let i = 0; i < sortedLogs.length - 1; i++) {
      const currentDate = parseDateAsLocal(sortedLogs[i].fecha_registro);
      const nextDate = parseDateAsLocal(sortedLogs[i + 1].fecha_registro);
      const daysBetweenRelapses = daysBetween(currentDate, nextDate);
      maxStreak = Math.max(maxStreak, daysBetweenRelapses);
    }
    
    // También considerar el tiempo desde la última recaída hasta hoy
    if (sortedLogs.length > 0) {
      const lastRelapseDate = parseDateAsLocal(sortedLogs[sortedLogs.length - 1].fecha_registro);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysSinceLastRelapse = daysBetween(lastRelapseDate, today);
      maxStreak = Math.max(maxStreak, daysSinceLastRelapse);
    }
    
    return maxStreak;
  } else {
    // Para otros hábitos, encontrar la racha más larga de días consecutivos
    const sortedLogs = logs.sort((a, b) => parseDateAsLocal(a.fecha_registro).getTime() - parseDateAsLocal(b.fecha_registro).getTime());
    let maxStreak = 0;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedLogs.length; i++) {
      const prevDate = parseDateAsLocal(sortedLogs[i - 1].fecha_registro);
      const currentDate = parseDateAsLocal(sortedLogs[i].fecha_registro);
      
      if (daysBetween(prevDate, currentDate) === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    
    return Math.max(maxStreak, currentStreak);
  }
}

// Función para calcular la tasa de éxito del último mes
function calculateMonthlySuccessRate(logs: HabitLogFromDB[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const recentLogs = logs.filter(log => {
    const logDate = parseDateAsLocal(log.fecha_registro);
    return logDate >= oneMonthAgo && logDate <= today;
  });
  
  if (recentLogs.length === 0) return '0%';
  
  const daysInPeriod = daysBetween(oneMonthAgo, today);
  const successRate = (recentLogs.length / daysInPeriod) * 100;
  
  return `${Math.round(successRate)}%`;
}

interface RouteContext {
  params: {
    habitoId: string;
  };
}

// --- GET HANDLER ---
export async function GET(request: NextRequest, { params }: RouteContext) {
  // Autenticación (dual: web session o API token)
  let authResult;
  if (request.headers.has('Authorization')) {
    authResult = await verifyApiToken(request);
  } else {
    authResult = await getAuthenticatedUser(request);
  }

  if (!authResult.success) {
    const errorResponse = request.headers.has('Authorization')
      ? createApiTokenError(authResult)
      : createWebAuthError(authResult);
    return errorResponse;
  }
  const userId = authResult.user.id;
  const { habitoId } = params;

  try {
    // 1. Obtener el hábito y verificar propiedad
    const habitResult = await query({
      sql: 'SELECT id, nombre, descripcion, tipo, meta_objetivo, fecha_creacion, usuario_id FROM habitos WHERE id = ?',
      args: [habitoId],
    });

    if (habitResult.rows.length === 0) {
      return NextResponse.json({ message: 'Hábito no encontrado.' }, { status: 404 });
    }

    const habit = habitResult.rows[0] as HabitFromDB;

    // Verificar que el hábito pertenece al usuario autenticado
    if (habit.usuario_id !== parseInt(userId)) {
      return NextResponse.json({ message: 'No tienes permiso para acceder a este hábito.' }, { status: 403 });
    }

    // 2. Obtener todos los registros del hábito
    const logsResult = await query({
      sql: 'SELECT habito_id, fecha_registro, valor_booleano, valor_numerico FROM registros_habitos WHERE habito_id = ? ORDER BY fecha_registro DESC',
      args: [habitoId],
    });

    const logs = logsResult.rows as HabitLogFromDB[];

    // 3. Calcular estadísticas
    const rachaActual = calculateCurrentStreak(logs, habit.tipo);
    const mejorRacha = calculateBestStreak(logs, habit.tipo);
    const totalCompletados = logs.length;
    const tasaExitoUltimoMes = calculateMonthlySuccessRate(logs);

    // 4. Preparar la respuesta
    const response = {
      id: habit.id,
      nombre: habit.nombre,
      descripcion: habit.descripcion,
      tipo: habit.tipo,
      meta_objetivo: habit.meta_objetivo,
      fecha_creacion: habit.fecha_creacion,
      stats: {
        racha_actual: rachaActual,
        mejor_racha: mejorRacha,
        total_completados: totalCompletados,
        tasa_exito_ultimo_mes: tasaExitoUltimoMes,
      },
      registros: logs.map(log => ({
        fecha_registro: log.fecha_registro,
        valor_booleano: log.valor_booleano,
        valor_numerico: log.valor_numerico,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el hábito:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

// --- PUT /api/habits/[habitoId] ---
// Permite a un usuario editar uno de sus propios hábitos.
export async function PUT(request: NextRequest, context: RouteContext) {
  // Autenticación (dual: web session o API token)
  let authResult;
  if (request.headers.has('Authorization')) {
    authResult = await verifyApiToken(request);
  } else {
    authResult = await getAuthenticatedUser(request);
  }

  if (!authResult.success) {
    const errorResponse = request.headers.has('Authorization')
      ? createApiTokenError(authResult)
      : createWebAuthError(authResult);
    return errorResponse;
  }

  const userId = authResult.user.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  const { habitoId } = context.params;
  const numericHabitoId = parseInt(habitoId, 10);
  if (isNaN(numericHabitoId)) {
    return NextResponse.json({ message: 'ID de hábito inválido.' }, { status: 400 });
  }

  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

  const validation = updateHabitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nombre, descripcion, meta_objetivo } = validation.data;

  try {
    const habitCheckRs = await query({
        sql: 'SELECT usuario_id FROM habitos WHERE id = ?',
        args: [numericHabitoId]
    });
    if (habitCheckRs.rows.length === 0) {
      return NextResponse.json({ message: `Hábito con ID ${numericHabitoId} no encontrado.` }, { status: 404 });
    }
    if ((habitCheckRs.rows[0] as any).usuario_id !== userId) {
      return NextResponse.json({ message: 'Acceso denegado. No tienes permiso para editar este hábito.' }, { status: 403 });
    }

    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    if (nombre) { updateFields.push('nombre = ?'); updateValues.push(nombre); }
    if (descripcion !== undefined) { updateFields.push('descripcion = ?'); updateValues.push(descripcion); }
    if (meta_objetivo !== undefined) { updateFields.push('meta_objetivo = ?'); updateValues.push(meta_objetivo); }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'No se proporcionaron campos para actualizar.' }, { status: 400 });
    }

    const sqlSetClause = updateFields.join(', ');
    updateValues.push(numericHabitoId);

    await query({
        sql: `UPDATE habitos SET ${sqlSetClause} WHERE id = ?`,
        args: updateValues
    });

    return NextResponse.json({ message: "Hábito actualizado exitosamente." });

  } catch (error) {
    console.error(`Error al actualizar el hábito ID ${numericHabitoId}:`, error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}


// --- DELETE /api/habits/[habitoId] ---
// Permite a un usuario eliminar uno de sus propios hábitos.
export async function DELETE(request: NextRequest, context: RouteContext) {
  // Autenticación (dual: web session o API token)
  let authResult;
  if (request.headers.has('Authorization')) {
    authResult = await verifyApiToken(request);
  } else {
    authResult = await getAuthenticatedUser(request);
  }

  if (!authResult.success) {
    const errorResponse = request.headers.has('Authorization')
      ? createApiTokenError(authResult)
      : createWebAuthError(authResult);
    return errorResponse;
  }

  const userId = authResult.user.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  const { habitoId } = context.params;
  const numericHabitoId = parseInt(habitoId, 10);
  if (isNaN(numericHabitoId)) {
    return NextResponse.json({ message: 'ID de hábito inválido.' }, { status: 400 });
  }

  console.log(`Usuario ID: ${userId} está intentando eliminar el hábito ID: ${numericHabitoId}`);

  try {
    const deleteRs = await query({
        sql: 'DELETE FROM habitos WHERE id = ? AND usuario_id = ?',
        args: [numericHabitoId, userId]
    });
    
    if (deleteRs.rowsAffected === 0) {
      return NextResponse.json({ message: `Hábito con ID ${numericHabitoId} no encontrado o no tienes permiso para eliminarlo.` }, { status: 404 });
    }

    return NextResponse.json({ message: "Hábito eliminado exitosamente." }, { status: 200 });

  } catch (error) {
    console.error(`Error al eliminar el hábito ID ${numericHabitoId}:`, error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
