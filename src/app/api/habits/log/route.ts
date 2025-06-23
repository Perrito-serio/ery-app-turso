// src/app/api/habits/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse } from '@/lib/mobileAuthUtils';
import { query } from '@/lib/db';
import { z } from 'zod';

// 1. ESQUEMA DE ZOD ACTUALIZADO
// Se añade el campo `es_recaida` y se refina la validación para que solo uno de los
// tres tipos de valor (`valor_booleano`, `valor_numerico`, `es_recaida`) pueda ser proporcionado.
const logHabitSchema = z.object({
  habito_id: z.number().int().positive("El ID del hábito debe ser válido."),
  fecha_registro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD."),
  valor_booleano: z.boolean().optional(),
  valor_numerico: z.number().optional(),
  es_recaida: z.boolean().optional(), // Nuevo campo para malos hábitos
  notas: z.string().optional().nullable(),
}).refine(data => {
    // Cuenta cuántos de los campos de valor se han proporcionado.
    // CORRECCIÓN: Se ha arreglado el error de sintaxis aquí.
    const providedValues = [data.valor_booleano, data.valor_numerico, data.es_recaida].filter(v => v !== undefined).length;
    // La validación es correcta si se proporciona exactamente un valor.
    return providedValues === 1;
}, {
    message: "Se debe proporcionar exactamente un valor: 'valor_booleano', 'valor_numerico' o 'es_recaida'.",
    path: ["valor_booleano"], // El error se asocia a un campo para la visualización.
});

// --- Interfaces (sin cambios) ---
interface HabitInfo {
  usuario_id: number;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
}

interface ExistingLog {
  id: number;
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult);
  }

  const userId = authResult.user.id;

  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }
  
  const validation = logHabitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  // 2. OBTENER NUEVOS DATOS Y PREPARARLOS PARA SQLITE
  const { habito_id, fecha_registro, valor_booleano, valor_numerico, es_recaida, notas } = validation.data;
  
  // Convertimos los booleanos a 0/1 para SQLite.
  const valorBooleanoNumerico = valor_booleano !== undefined ? (valor_booleano ? 1 : 0) : null;
  const esRecaidaNumerico = es_recaida !== undefined ? (es_recaida ? 1 : 0) : 0; // Default a 0 (false) si no se proporciona

  try {
    // Obtener información del hábito (sin cambios)
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
    
    // 3. LÓGICA DE VALIDACIÓN MEJORADA
    // Se asegura de que el valor proporcionado coincida con el tipo de hábito.
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

    // 4. ACTUALIZACIÓN DE LAS CONSULTAS SQL
    if (existingLogRs.rows.length > 0) {
      const logId = (existingLogRs.rows[0] as unknown as ExistingLog).id;
      console.log(`Actualizando registro existente (ID: ${logId}) para el hábito ID: ${habito_id}`);
      
      // La sentencia UPDATE ahora incluye `es_recaida`.
      await query({
        sql: 'UPDATE registros_habitos SET valor_booleano = ?, valor_numerico = ?, es_recaida = ?, notas = ? WHERE id = ?',
        args: [valorBooleanoNumerico, valor_numerico ?? null, esRecaidaNumerico, notas ?? null, logId]
      });
      return NextResponse.json({ message: "Registro de hábito actualizado exitosamente." });

    } else {
      console.log(`Creando nuevo registro para el hábito ID: ${habito_id} en la fecha: ${fecha_registro}`);
      
      // La sentencia INSERT ahora incluye `es_recaida`.
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
