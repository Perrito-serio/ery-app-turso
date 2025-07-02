// src/app/api/internal/routine-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyApiKey } from '@/lib/apiKeyAuth';

interface ReminderItem {
  userId: number;
  userName: string;
  userEmail: string;
  habitName: string;
}

/**
 * GET /api/internal/routine-reminders
 * Endpoint para obtener recordatorios de hábitos de rutina no completados.
 * Este endpoint está protegido por API Key y está diseñado para ser consumido por n8n.
 */
export async function GET(request: NextRequest) {
  // 1. Verificar la autenticación mediante API Key
  const authResult = await verifyApiKey(request);
  if (!authResult.success) {
    return NextResponse.json({ message: authResult.error }, { status: authResult.status });
  }

  try {
    // 2. Obtener la fecha actual en formato YYYY-MM-DD
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // 3. Ejecutar la consulta SQL para encontrar hábitos de rutina no completados
    const remindersResult = await query({
      sql: `
        SELECT 
          u.id AS userId, 
          u.nombre AS userName, 
          u.email AS userEmail, 
          h.nombre AS habitName 
        FROM usuarios u 
        JOIN rutinas r ON u.id = r.usuario_id 
        JOIN rutina_habitos rh ON r.id = rh.rutina_id 
        JOIN habitos h ON rh.habito_id = h.id 
        LEFT JOIN registros_habitos rhg ON h.id = rhg.habito_id AND rhg.fecha_registro = ? 
        WHERE rhg.id IS NULL AND u.estado = 'activo'
        GROUP BY u.id, u.nombre, u.email, h.nombre
      `,
      args: [formattedDate],
    });

    // 4. Transformar los resultados al formato esperado
    const reminders = remindersResult.rows.map(row => {
      const reminderItem = row as unknown as ReminderItem;
      return {
        userId: reminderItem.userId,
        userName: reminderItem.userName,
        userEmail: reminderItem.userEmail,
        habitName: reminderItem.habitName
      };
    });

    // 5. Devolver la respuesta JSON con los recordatorios
    return NextResponse.json(reminders);

  } catch (error) {
    console.error('Error al obtener recordatorios de rutinas:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}