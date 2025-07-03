// src/app/api/friends/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth';

interface InvitationFromDB {
  id: number;
  solicitante_id: number;
  solicitado_id: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fecha_envio: string;
  solicitante_nombre?: string;
  solicitante_email?: string;
  solicitado_nombre?: string;
  solicitado_email?: string;
}

/**
 * POST /api/friends/invitations
 * Para enviar una solicitud de amistad. Recibe el solicitado_id.
 */
export async function POST(request: NextRequest) {
  // Verificar autenticación
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

  const solicitanteId = authResult.user.id;

  try {
    const body = await request.json();
    const { solicitado_id } = body;

    if (!solicitado_id) {
      return NextResponse.json(
        { error: 'El ID del usuario solicitado es requerido' },
        { status: 400 }
      );
    }

    // Verificar que no se esté enviando solicitud a sí mismo
    if (solicitanteId === solicitado_id.toString()) {
      return NextResponse.json(
        { error: 'No puedes enviarte una solicitud de amistad a ti mismo' },
        { status: 400 }
      );
    }

    // Verificar que el usuario solicitado existe
    const userExists = await query({
      sql: 'SELECT id FROM usuarios WHERE id = ? AND estado = "activo"',
      args: [solicitado_id]
    });

    if (userExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'El usuario solicitado no existe o no está activo' },
        { status: 404 }
      );
    }

    // Verificar si ya son amigos
    const friendshipExists = await query({
      sql: `
        SELECT 1 FROM amistades 
        WHERE 
          (usuario_id_1 = ? AND usuario_id_2 = ?) OR 
          (usuario_id_1 = ? AND usuario_id_2 = ?)
      `,
      args: [
        Math.min(parseInt(solicitanteId), solicitado_id),
        Math.max(parseInt(solicitanteId), solicitado_id),
        Math.min(parseInt(solicitanteId), solicitado_id),
        Math.max(parseInt(solicitanteId), solicitado_id)
      ]
    });

    if (friendshipExists.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya son amigos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una invitación pendiente
    const existingInvitation = await query({
      sql: `
        SELECT id FROM invitaciones_amistad 
        WHERE 
          ((solicitante_id = ? AND solicitado_id = ?) OR 
           (solicitante_id = ? AND solicitado_id = ?)) AND 
          estado = 'pendiente'
      `,
      args: [solicitanteId, solicitado_id, solicitado_id, solicitanteId]
    });

    if (existingInvitation.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud de amistad pendiente entre estos usuarios' },
        { status: 400 }
      );
    }

    // Crear la invitación
    const result = await query({
      sql: `
        INSERT INTO invitaciones_amistad (solicitante_id, solicitado_id, estado, fecha_envio)
        VALUES (?, ?, 'pendiente', CURRENT_TIMESTAMP)
      `,
      args: [solicitanteId, solicitado_id]
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de amistad enviada correctamente',
      invitation_id: result.lastInsertRowid
    });

  } catch (error) {
    console.error('Error al enviar solicitud de amistad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/friends/invitations
 * Para que el usuario autenticado vea sus solicitudes pendientes.
 */
export async function GET(request: NextRequest) {
  // Verificar autenticación
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

  try {
    // Obtener invitaciones recibidas (donde el usuario es el solicitado)
    const receivedInvitations = await query({
      sql: `
        SELECT 
          i.id,
          i.solicitante_id,
          i.solicitado_id,
          i.estado,
          i.fecha_envio,
          u.nombre as solicitante_nombre,
          u.email as solicitante_email
        FROM invitaciones_amistad i
        JOIN usuarios u ON i.solicitante_id = u.id
        WHERE i.solicitado_id = ? AND i.estado = 'pendiente'
        ORDER BY i.fecha_envio DESC
      `,
      args: [userId]
    });

    // Obtener invitaciones enviadas (donde el usuario es el solicitante)
    const sentInvitations = await query({
      sql: `
        SELECT 
          i.id,
          i.solicitante_id,
          i.solicitado_id,
          i.estado,
          i.fecha_envio,
          u.nombre as solicitado_nombre,
          u.email as solicitado_email
        FROM invitaciones_amistad i
        JOIN usuarios u ON i.solicitado_id = u.id
        WHERE i.solicitante_id = ? AND i.estado = 'pendiente'
        ORDER BY i.fecha_envio DESC
      `,
      args: [userId]
    });

    const received = receivedInvitations.rows as unknown as InvitationFromDB[];
    const sent = sentInvitations.rows as unknown as InvitationFromDB[];

    return NextResponse.json({
      success: true,
      received_invitations: received,
      sent_invitations: sent,
      total_received: received.length,
      total_sent: sent.length
    });

  } catch (error) {
    console.error('Error al obtener invitaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}