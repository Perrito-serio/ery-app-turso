// src/app/api/habits/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

// --- PASO 1: Importar AMBOS validadores de autenticación ---
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

// El esquema de Zod y las interfaces se mantienen sin cambios.
const logHabitSchema = z.object({
  habito_id: z.number().int().positive("El ID del hábito debe ser válido."),
  fecha_registro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD."),
  valor_booleano: z.boolean().optional(),
  valor_numerico: z.number().optional(),
  es_recaida: z.boolean().optional(),
  notas: z.string().optional().nullable(),
}).refine(data => {
    const providedValues = [data.valor_booleano, data.valor_numerico, data.es_recaida].filter(v => v !== undefined).length;
    return providedValues === 1;
}, {
    message: "Se debe proporcionar exactamente un valor: 'valor_booleano', 'valor_numerico' o 'es_recaida'.",
    path: ["valor_booleano"],
});

interface HabitInfo {
  usuario_id: number;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
}

interface ExistingLog {
  id: number;
}

export async function POST(request: NextRequest) {
  // --- PASO 2: Implementar la lógica de autenticación DUAL ---
  let authResult;

  if (request.headers.has('Authorization')) {
    // Si la cabecera existe, es una petición de API móvil (Flutter, iOS)
    authResult = await verifyApiToken(request);
  } else {
    // Si no, es una petición web con cookie de sesión
    authResult = await getAuthenticatedUser(request);
  }

  // Si la autenticación falla, por cualquier método...
  if (!authResult.success) {
    const errorResponse = request.headers.has('Authorization')
      ? createApiTokenError(authResult)
      : createWebAuthError(authResult);
    return errorResponse;
  }
  // --- FIN DE LOS CAMBIOS DE AUTENTICACIÓN ---

  // El resto del código funciona sin modificaciones.
  const userId = authResult.user.id;

  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }
  
  const validation = logHabitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { habito_id, fecha_registro, valor_booleano, valor_numerico, es_recaida, notas } = validation.data;
  
  const valorBooleanoNumerico = valor_booleano !== undefined ? (valor_booleano ? 1 : 0) : null;
  const esRecaidaNumerico = es_recaida !== undefined ? (es_recaida ? 1 : 0) : 0;

  try {
    const habitCheckRs = await query({
        sql: 'SELECT usuario_id, tipo FROM habitos WHERE id = ?',
        args: [habito_id]
    });
    if (habitCheckRs.rows.length === 0) {
      return NextResponse.json({ message: `Hábito con ID ${habito_id} no encontrado.` }, { status: 404 });
    }
    const habitInfo = habitCheckRs.rows[0] as unknown as HabitInfo;
    if (String(habitInfo.usuario_id) !== userId) {
      return NextResponse.json({ message: 'Acceso denegado. No tienes permiso para registrar en este hábito.' }, { status: 403 });
    }
    
    switch (habitInfo.tipo) {
      case 'SI_NO':
        if (typeof valor_booleano !== 'boolean') {
          return NextResponse.json({ message: 'Este hábito requiere un valor booleano (true/false).' }, { status: 400 });
        }
        break;
      case 'MEDIBLE_NUMERICO':
        if (typeof valor_numerico !== 'number') {
          return NextResponse.json({ message: 'Este hábito requiere un valor numérico.' }, { status: 400 });
        }
        break;
      case 'MAL_HABITO':
        if (typeof es_recaida !== 'boolean') {
          return NextResponse.json({ message: 'Para un mal hábito, se debe registrar si hubo una recaída (true/false).' }, { status: 400 });
        }
        break;
      default:
        return NextResponse.json({ message: 'Tipo de hábito desconocido.' }, { status: 500 });
    }

    const existingLogRs = await query({
        sql: 'SELECT id FROM registros_habitos WHERE habito_id = ? AND fecha_registro = ?',
        args: [habito_id, fecha_registro]
    });

    if (existingLogRs.rows.length > 0) {
      const logId = (existingLogRs.rows[0] as unknown as ExistingLog).id;
      console.log(`Actualizando registro existente (ID: ${logId}) para el hábito ID: ${habito_id}`);
      
      await query({
        sql: 'UPDATE registros_habitos SET valor_booleano = ?, valor_numerico = ?, es_recaida = ?, notas = ? WHERE id = ?',
        args: [valorBooleanoNumerico, valor_numerico ?? null, esRecaidaNumerico, notas ?? null, logId]
      });
      return NextResponse.json({ message: "Registro de hábito actualizado exitosamente." });

    } else {
      console.log(`Creando nuevo registro para el hábito ID: ${habito_id} en la fecha: ${fecha_registro}`);
      
      const result = await query({
        sql: 'INSERT INTO registros_habitos (habito_id, fecha_registro, valor_booleano, valor_numerico, es_recaida, notas) VALUES (?, ?, ?, ?, ?, ?)',
        args: [habito_id, fecha_registro, valorBooleanoNumerico, valor_numerico ?? null, esRecaidaNumerico, notas ?? null]
      });
      return NextResponse.json({ message: "Progreso del hábito registrado exitosamente.", logId: Number(result.lastInsertRowid) }, { status: 201 });
    }
  } catch (error) {
    const typedError = error as { code?: string; message?: string };
    if (typedError.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json({ message: 'Error: Ya existe un registro para este hábito en esta fecha.' }, { status: 409 });
    }
    console.error("Error al registrar el progreso del hábito:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
