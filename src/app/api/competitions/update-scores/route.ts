// src/app/api/competitions/update-scores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Row } from '@libsql/client';

// --- Interfaces ---
interface Competition extends Row {
  id: number;
  creador_id: number;
  nombre: string;
  descripcion: string | null;
  tipo_meta: 'MAX_HABITOS_DIA' | 'MAX_RACHA' | 'TOTAL_COMPLETADOS';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  meta_objetivo: number;
  valor: number;
}

interface Participant extends Row {
  usuario_id: number;
  competencia_id: number;
  puntuacion: number;
  fecha_union: string;
}

interface UpdateResult {
  competition_id: number;
  competition_name: string;
  participants_updated: number;
  status: 'success' | 'error';
  error_message?: string;
}

// --- Funciones auxiliares ---
async function getActiveCompetitions(): Promise<Competition[]> {
  const result = await query({
    sql: `SELECT * FROM competencias 
          WHERE estado = 'activa' 
            AND DATE(fecha_inicio) <= DATE('now') 
            AND DATE(fecha_fin) >= DATE('now')
          ORDER BY fecha_inicio ASC`,
    args: []
  });

  return result.rows as Competition[];
}

async function getCompetitionParticipants(competitionId: number): Promise<Participant[]> {
  const result = await query({
    sql: 'SELECT * FROM competencia_participantes WHERE competencia_id = ?',
    args: [competitionId]
  });

  return result.rows as Participant[];
}

async function calculateMaxHabitsPerDay(userId: number, fechaInicio: string, fechaFin: string): Promise<number> {
  const result = await query({
    sql: `SELECT MAX(daily_count) as max_habits
          FROM (
            SELECT DATE(rh.fecha_registro) as fecha, COUNT(*) as daily_count
            FROM registros_habitos rh
            JOIN habitos h ON rh.habito_id = h.id
            WHERE h.usuario_id = ?
              AND DATE(rh.fecha_registro) >= DATE(?)
              AND DATE(rh.fecha_registro) <= DATE(?)
              AND (
                (h.tipo = 'SI_NO' AND rh.valor_booleano = 1) OR
                (h.tipo = 'MEDIBLE_NUMERICO' AND rh.valor_numerico > 0) OR
                (h.tipo = 'MAL_HABITO' AND rh.valor_booleano = 0)
              )
            GROUP BY DATE(rh.fecha_registro)
          ) daily_stats`,
    args: [userId, fechaInicio, fechaFin]
  });

  return (result.rows[0]?.max_habits as number) || 0;
}

async function calculateMaxStreak(userId: number, fechaInicio: string, fechaFin: string): Promise<number> {
  // Obtener todos los registros exitosos del usuario en el período
  const result = await query({
    sql: `SELECT DATE(rh.fecha_registro) as fecha
          FROM registros_habitos rh
          JOIN habitos h ON rh.habito_id = h.id
          WHERE h.usuario_id = ?
            AND DATE(rh.fecha_registro) >= DATE(?)
            AND DATE(rh.fecha_registro) <= DATE(?)
            AND (
              (h.tipo = 'SI_NO' AND rh.valor_booleano = 1) OR
              (h.tipo = 'MEDIBLE_NUMERICO' AND rh.valor_numerico > 0) OR
              (h.tipo = 'MAL_HABITO' AND rh.valor_booleano = 0)
            )
          GROUP BY DATE(rh.fecha_registro)
          ORDER BY DATE(rh.fecha_registro)`,
    args: [userId, fechaInicio, fechaFin]
  });

  const dates = result.rows.map(row => new Date(row.fecha as string));
  
  if (dates.length === 0) return 0;
  
  let maxStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1];
    const currentDate = dates[i];
    const diffTime = currentDate.getTime() - prevDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  return maxStreak;
}

async function calculateTotalCompleted(userId: number, fechaInicio: string, fechaFin: string): Promise<number> {
  const result = await query({
    sql: `SELECT COUNT(*) as total
          FROM registros_habitos rh
          JOIN habitos h ON rh.habito_id = h.id
          WHERE h.usuario_id = ?
            AND DATE(rh.fecha_registro) >= DATE(?)
            AND DATE(rh.fecha_registro) <= DATE(?)
            AND (
              (h.tipo = 'SI_NO' AND rh.valor_booleano = 1) OR
              (h.tipo = 'MEDIBLE_NUMERICO' AND rh.valor_numerico > 0) OR
              (h.tipo = 'MAL_HABITO' AND rh.valor_booleano = 0)
            )`,
    args: [userId, fechaInicio, fechaFin]
  });

  return (result.rows[0]?.total as number) || 0;
}

async function updateCompetitionScores(competition: Competition): Promise<UpdateResult> {
  try {
    const { id: competitionId, tipo_meta, fecha_inicio, fecha_fin, nombre } = competition;
    
    // Obtener todos los participantes
    const participants = await getCompetitionParticipants(competitionId);
    
    let participantsUpdated = 0;
    
    for (const participant of participants) {
      let score = 0;
      
      switch (tipo_meta) {
        case 'MAX_HABITOS_DIA':
          score = await calculateMaxHabitsPerDay(participant.usuario_id, fecha_inicio, fecha_fin);
          break;
        case 'MAX_RACHA':
          score = await calculateMaxStreak(participant.usuario_id, fecha_inicio, fecha_fin);
          break;
        case 'TOTAL_COMPLETADOS':
          score = await calculateTotalCompleted(participant.usuario_id, fecha_inicio, fecha_fin);
          break;
      }
      
      // Actualizar puntuación solo si ha cambiado
      if (score !== participant.puntuacion) {
        await query({
          sql: 'UPDATE competencia_participantes SET puntuacion = ? WHERE competencia_id = ? AND usuario_id = ?',
          args: [score, competitionId, participant.usuario_id]
        });
        participantsUpdated++;
      }
    }
    
    return {
      competition_id: competitionId,
      competition_name: nombre,
      participants_updated: participantsUpdated,
      status: 'success'
    };
    
  } catch (error) {
    console.error(`Error updating competition ${competition.id}:`, error);
    return {
      competition_id: competition.id,
      competition_name: competition.nombre,
      participants_updated: 0,
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function finalizeExpiredCompetitions(): Promise<number> {
  const result = await query({
    sql: `UPDATE competencias 
          SET estado = 'finalizada' 
          WHERE estado = 'activa' 
            AND DATE(fecha_fin) < DATE('now')
            AND estado != 'finalizada'`,
    args: []
  });

  return result.rowsAffected || 0;
}

// --- Endpoints ---

/**
 * POST /api/competitions/update-scores
 * Actualizar puntuaciones de todas las competencias activas
 * Este endpoint puede ser llamado por un cron job o proceso programado
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar si hay una clave de API para procesos automatizados (opcional)
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    // Si hay configurada una API key para cron jobs, verificarla
    if (process.env.CRON_API_KEY && apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json({
        message: 'API key inválida para procesos automatizados'
      }, { status: 401 });
    }

    const startTime = Date.now();
    
    // Finalizar competencias expiradas
    const expiredCompetitions = await finalizeExpiredCompetitions();
    
    // Obtener competencias activas
    const activeCompetitions = await getActiveCompetitions();
    
    if (activeCompetitions.length === 0) {
      return NextResponse.json({
        message: 'No hay competencias activas para actualizar',
        expired_competitions_finalized: expiredCompetitions,
        execution_time_ms: Date.now() - startTime
      });
    }
    
    // Actualizar puntuaciones de cada competencia
    const updateResults: UpdateResult[] = [];
    
    for (const competition of activeCompetitions) {
      const result = await updateCompetitionScores(competition);
      updateResults.push(result);
    }
    
    // Calcular estadísticas
    const successfulUpdates = updateResults.filter(r => r.status === 'success').length;
    const failedUpdates = updateResults.filter(r => r.status === 'error').length;
    const totalParticipantsUpdated = updateResults.reduce((sum, r) => sum + r.participants_updated, 0);
    
    const executionTime = Date.now() - startTime;
    
    return NextResponse.json({
      message: 'Actualización de puntuaciones completada',
      summary: {
        total_competitions_processed: activeCompetitions.length,
        successful_updates: successfulUpdates,
        failed_updates: failedUpdates,
        total_participants_updated: totalParticipantsUpdated,
        expired_competitions_finalized: expiredCompetitions,
        execution_time_ms: executionTime
      },
      details: updateResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en actualización masiva de puntuaciones:', error);
    return NextResponse.json({
      message: 'Error interno del servidor durante la actualización',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * GET /api/competitions/update-scores
 * Obtener información sobre el estado de las competencias activas
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener competencias activas
    const activeCompetitions = await getActiveCompetitions();
    
    // Obtener estadísticas básicas de cada competencia
    const competitionStats = [];
    
    for (const competition of activeCompetitions) {
      const participants = await getCompetitionParticipants(competition.id);
      
      competitionStats.push({
        id: competition.id,
        name: competition.nombre,
        type: competition.tipo_meta,
        start_date: competition.fecha_inicio,
        end_date: competition.fecha_fin,
        participants_count: participants.length,
        last_score_update: 'No disponible' // Podrías agregar un campo de timestamp en la tabla
      });
    }
    
    return NextResponse.json({
      active_competitions_count: activeCompetitions.length,
      competitions: competitionStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener información de competencias:', error);
    return NextResponse.json({
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}