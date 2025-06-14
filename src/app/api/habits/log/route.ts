// src/app/api/habits/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuthUtils';
import { query } from '@/lib/db';
import { z } from 'zod';

// Esquema de Zod (sin cambios)
const logHabitSchema = z.object({
  habito_id: z.number().int().positive("El ID del hábito debe ser válido."),
  fecha_registro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD."),
  valor_booleano: z.boolean().optional(),
  valor_numerico: z.number().optional(),
  notas: z.string().optional().nullable(),
}).refine(data => {
    return data.valor_booleano !== undefined || data.valor_numerico !== undefined;
}, {
    message: "Se debe proporcionar un valor booleano o numérico para el registro.",
    path: ["valor_booleano"],
});

// --- Interfaces (limpiadas de dependencias de mysql2) ---
interface HabitInfo {
  usuario_id: number;
  tipo: 'SI_NO' | 'MEDIBLE_NUMERICO' | 'MAL_HABITO';
}

interface ExistingLog {
  id: number;
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await verifyApiAuth();
  if (errorResponse) { return errorResponse; }

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
  }

  let body;
  try { body = await request.json(); } 
  catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }
  
  const validation = logHabitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { habito_id, fecha_registro, valor_booleano, valor_numerico, notas } = validation.data;
  // Convertimos el booleano a 0/1 para SQLite
  const valorBooleanoNumerico = valor_booleano !== undefined ? (valor_booleano ? 1 : 0) : null;

  try {
    const habitCheckRs = await query({
        sql: 'SELECT usuario_id, tipo FROM habitos WHERE id = ?',
        args: [habito_id]
    });
    if (habitCheckRs.rows.length === 0) {
      return NextResponse.json({ message: `Hábito con ID ${habito_id} no encontrado.` }, { status: 404 });
    }
    const habitInfo = habitCheckRs.rows[0] as unknown as HabitInfo;
    if (habitInfo.usuario_id !== userId) {
      return NextResponse.json({ message: 'Acceso denegado. No tienes permiso para registrar en este hábito.' }, { status: 403 });
    }
    
    // Validaciones de tipo (sin cambios)
    if (habitInfo.tipo === 'SI_NO' && typeof valor_booleano !== 'boolean') {
        return NextResponse.json({ message: 'Este hábito requiere un valor booleano (true/false).' }, { status: 400 });
    }
    if (habitInfo.tipo === 'MEDIBLE_NUMERICO' && typeof valor_numerico !== 'number') {
        return NextResponse.json({ message: 'Este hábito requiere un valor numérico.' }, { status: 400 });
    }
    if (habitInfo.tipo === 'MAL_HABITO' && typeof valor_booleano !== 'boolean') {
        return NextResponse.json({ message: 'Para un mal hábito, se debe registrar un valor booleano.' }, { status: 400 });
    }

    const existingLogRs = await query({
        sql: 'SELECT id FROM registros_habitos WHERE habito_id = ? AND fecha_registro = ?',
        args: [habito_id, fecha_registro]
    });

    if (existingLogRs.rows.length > 0) {
      const logId = (existingLogRs.rows[0] as unknown as ExistingLog).id;
      console.log(`Actualizando registro existente (ID: ${logId}) para el hábito ID: ${habito_id}`);
      
      await query({
        sql: 'UPDATE registros_habitos SET valor_booleano = ?, valor_numerico = ?, notas = ? WHERE id = ?',
        args: [valorBooleanoNumerico, valor_numerico ?? null, notas ?? null, logId]
      });
      return NextResponse.json({ message: "Registro de hábito actualizado exitosamente." });
    } else {
      console.log(`Creando nuevo registro para el hábito ID: ${habito_id} en la fecha: ${fecha_registro}`);
      
      const result = await query({
        sql: 'INSERT INTO registros_habitos (habito_id, fecha_registro, valor_booleano, valor_numerico, notas) VALUES (?, ?, ?, ?, ?)',
        args: [habito_id, fecha_registro, valorBooleanoNumerico, valor_numerico ?? null, notas ?? null]
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
