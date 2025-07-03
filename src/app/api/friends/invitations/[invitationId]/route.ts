// src/app/api/friends/invitations/[invitationId]/route.ts
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
}

/**
 * PUT /api/friends/invitations/{invitationId}
 * Para aceptar o rechazar una solicitud. Al aceptar, crea un registro en amistades.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
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
  const invitationId = params.invitationId;

  try {
    const body = await request.json();
    const { action } = body; // 'accept' o 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'La acción debe ser "accept" o "reject"' },
        { status: 400 }
      );
    }

    // Verificar que la invitación existe y el usuario tiene permisos para modificarla
    const invitationResult = await query({
      sql: `
        SELECT id, solicitante_id, solicitado_id, estado
        FROM invitaciones_amistad 
        WHERE id = ? AND estado = 'pendiente'
      `,
      args: [invitationId]
    });

    if (invitationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitación no encontrada o ya procesada' },
        { status: 404 }
      );
    }

    const invitation = invitationResult.rows[0] as unknown as InvitationFromDB;

    // Verificar que el usuario actual es el solicitado (solo el solicitado puede aceptar/rechazar)
    if (invitation.solicitado_id.toString() !== userId) {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar esta invitación' },
        { status: 403 }
      );
    }

    const newStatus = action === 'accept' ? 'aceptada' : 'rechazada';

    // Actualizar el estado de la invitación
    await query({
      sql: `
        UPDATE invitaciones_amistad 
        SET estado = ? 
        WHERE id = ?
      `,
      args: [newStatus, invitationId]
    });

    // Si se acepta la invitación, crear la amistad
    if (action === 'accept') {
      const userId1 = Math.min(invitation.solicitante_id, invitation.solicitado_id);
      const userId2 = Math.max(invitation.solicitante_id, invitation.solicitado_id);

      await query({
        sql: `
          INSERT INTO amistades (usuario_id_1, usuario_id_2, fecha_inicio)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `,
        args: [userId1, userId2]
      });
    }

    return NextResponse.json({
      success: true,
      message: action === 'accept' 
        ? 'Solicitud de amistad aceptada correctamente' 
        : 'Solicitud de amistad rechazada',
      action: action,
      invitation_id: invitationId
    });

  } catch (error) {
    console.error('Error al procesar invitación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}