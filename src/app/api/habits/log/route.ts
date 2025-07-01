// src/app/api/habits/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

// Esquema de Zod simplificado. Ya no necesitamos 'es_recaida'.
const logHabitSchema = z.object({
  habito_id: z.number().int().positive(),
  fecha_registro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD."),
  valor_booleano: z.boolean().optional(),
  valor_numerico: z.number().optional(),
  notas: z.string().optional().nullable(),
});

interface HabitInfo {
  usuario_id: number;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
}

export async function POST(request: NextRequest) {
  // 1. Autenticación dual (sin cambios)
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

  const body = await request.json();
  
  // 2. Lógica de validación mejorada
  // Primero, obtenemos el tipo de hábito para decidir cómo validar.
  const { habito_id, fecha_registro } = body;

  if (!habito_id || !fecha_registro) {
    return NextResponse.json({ message: "Se requieren habito_id y fecha_registro." }, { status: 400 });
  }

  const habitCheckRs = await query({
    sql: 'SELECT usuario_id, tipo FROM habitos WHERE id = ?',
    args: [habito_id]
  });

  if (habitCheckRs.rows.length === 0) {
    return NextResponse.json({ message: `Hábito no encontrado.` }, { status: 404 });
  }
  const habitInfo = habitCheckRs.rows[0] as unknown as HabitInfo;
  if (String(habitInfo.usuario_id) !== userId) {
    return NextResponse.json({ message: 'No tienes permiso para registrar en este hábito.' }, { status: 403 });
  }

  // 3. Manejo específico para cada tipo de hábito
  try {
    if (habitInfo.tipo === 'MAL_HABITO') {
      // Para un mal hábito, un simple registro en esta fecha significa una recaída.
      // Se inserta un registro sin valor booleano ni numérico.
      await query({
        sql: 'INSERT OR REPLACE INTO registros_habitos (habito_id, fecha_registro, valor_booleano, valor_numerico, notas) VALUES (?, ?, NULL, NULL, ?)',
        args: [habito_id, fecha_registro, body.notas || null]
      });
      return NextResponse.json({ message: "Recaída registrada." });
    }

    // Para hábitos buenos (SI_NO, MEDIBLE_NUMERICO), validamos los datos completos.
    const validation = logHabitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { valor_booleano, valor_numerico, notas } = validation.data;

    if (habitInfo.tipo === 'SI_NO' && typeof valor_booleano !== 'boolean') {
      return NextResponse.json({ message: 'Este hábito requiere un valor booleano (true/false).' }, { status: 400 });
    }
    if (habitInfo.tipo === 'MEDIBLE_NUMERICO' && typeof valor_numerico !== 'number') {
      return NextResponse.json({ message: 'Este hábito requiere un valor numérico.' }, { status: 400 });
    }

    const valorBooleanoNumerico = valor_booleano !== undefined ? (valor_booleano ? 1 : 0) : null;

    // Usamos INSERT OR REPLACE para simplificar: si ya existe un registro para ese día, lo actualiza.
    await query({
      sql: 'INSERT OR REPLACE INTO registros_habitos (habito_id, fecha_registro, valor_booleano, valor_numerico, notas) VALUES (?, ?, ?, ?, ?)',
      args: [habito_id, fecha_registro, valorBooleanoNumerico, valor_numerico ?? null, notas ?? null]
    });
    return NextResponse.json({ message: "Progreso del hábito registrado exitosamente." });

  } catch (error) {
    console.error("Error al registrar el progreso del hábito:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
