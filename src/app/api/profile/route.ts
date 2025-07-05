// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse as createWebAuthError } from '@/lib/mobileAuthUtils';
import { verifyApiToken, createAuthErrorResponse as createApiTokenError } from '@/lib/apiTokenAuth'; // Asegúrate de que esta importación exista en tu proyecto.
import { query } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// --- GET con Autenticación Dual ---
export async function GET(request: NextRequest) {
    // --- CAMBIO 1: LÓGICA DE AUTENTICACIÓN DUAL ---
    let authResult;
    // Revisa si la petición viene de la app móvil (con cabecera Authorization)
    if (request.headers.has('Authorization')) {
        authResult = await verifyApiToken(request);
    } else {
    // Si no, asume que es una sesión web (con cookies)
        authResult = await getAuthenticatedUser(request);
    }

    // Si la autenticación falla por cualquier método, devuelve un error
    if (!authResult.success) {
        const errorResponse = request.headers.has('Authorization') 
            ? createApiTokenError(authResult) 
            : createWebAuthError(authResult);
        return errorResponse;
    }
    // --- FIN DEL CAMBIO 1 ---

    const userId = authResult.user.id;
    if (!userId) {
        return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
    }

    try {
        // --- CAMBIO 2: CONSULTA SQL CORREGIDA ---
        // Se ajusta la consulta para que coincida con el esquema de la base de datos.
        // Se obtiene el rol de la tabla `usuario_roles` y se une con `roles`.
        const userRs = await query({
            sql: `
                SELECT 
                    u.id, 
                    u.nombre, 
                    u.email, 
                    u.fecha_creacion, 
                    u.ultimo_acceso as ultimo_login, 
                    u.estado, 
                    u.suspension_fin,
                    r.nombre_rol as rol
                FROM usuarios u
                LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
                LEFT JOIN roles r ON ur.rol_id = r.id
                WHERE u.id = ?
            `,
            args: [parseInt(userId, 10)]
        });
        // --- FIN DEL CAMBIO 2 ---

        if (userRs.rows.length === 0) {
            return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
        }

        const userProfile = userRs.rows[0];

        return NextResponse.json(userProfile);

    } catch (error) {
        console.error(`Error al obtener el perfil del usuario ID ${userId}:`, error);
        return NextResponse.json({ message: 'Error interno del servidor al obtener el perfil.' }, { status: 500 });
    }
}


// Esquema de validación con Zod (sin cambios)
const updateProfileSchema = z.object({
    nombre: z.string()
        .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
        .regex(/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/, { message: "El nombre solo puede contener letras y espacios." })
        .optional(),
    contraseñaActual: z.string().optional(),
    nuevaContraseña: z.string()
        .min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres." })
        .optional()
        .or(z.literal('')),
    confirmarNuevaContraseña: z.string().optional(),
})
.partial()
.refine(data => {
    if (data.nuevaContraseña && !data.contraseñaActual) {
        return false;
    }
    return true;
}, {
    message: "Se requiere la contraseña actual para establecer una nueva.",
    path: ["contraseñaActual"],
})
.refine(data => {
    if (data.nuevaContraseña && data.nuevaContraseña !== data.confirmarNuevaContraseña) {
        return false;
    }
    return true;
}, {
    message: "La nueva contraseña y su confirmación no coinciden.",
    path: ["confirmarNuevaContraseña"],
})
.refine(data => {
    return !!data.nombre || !!data.nuevaContraseña;
}, {
    message: "Se debe proporcionar un nombre o una nueva contraseña para actualizar.",
});


// --- PUT con Autenticación Dual ---
export async function PUT(request: NextRequest) {
    // --- CAMBIO 3: LÓGICA DE AUTENTICACIÓN DUAL ---
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
    // --- FIN DEL CAMBIO 3 ---

    const userId = authResult.user.id;
    if (!userId) {
        return NextResponse.json({ message: 'No se pudo identificar al usuario desde la sesión.' }, { status: 401 });
    }

    let body;
    try { body = await request.json(); } 
    catch (error) { return NextResponse.json({ message: 'Cuerpo de la solicitud JSON inválido.' }, { status: 400 }); }

    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: "Datos de entrada inválidos.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { nombre, contraseñaActual, nuevaContraseña } = validation.data;

    try {
        const updateFields: string[] = [];
        const updateValues: (string | number | null)[] = [];

        // Lógica para cambio de contraseña
        if (nuevaContraseña && contraseñaActual) {
            const userRs = await query({
                sql: 'SELECT password_hash FROM usuarios WHERE id = ?',
                args: [parseInt(userId, 10)]
            });
            if (userRs.rows.length === 0) {
                return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
            }
            const currentPasswordHash = (userRs.rows[0] as any).password_hash;
            
            const isPasswordMatch = await bcrypt.compare(contraseñaActual, currentPasswordHash);
            if (!isPasswordMatch) {
                return NextResponse.json({ message: 'La contraseña actual es incorrecta.' }, { status: 403 });
            }

            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(nuevaContraseña, salt);
            updateFields.push('password_hash = ?');
            updateValues.push(newPasswordHash);
        }

        // Lógica para cambio de nombre
        if (nombre) {
            updateFields.push('nombre = ?');
            updateValues.push(nombre);
        }
        
        if (updateFields.length === 0) {
            return NextResponse.json({ message: 'No se proporcionaron campos válidos para actualizar.' }, { status: 400 });
        }

        // También actualizamos la fecha de actualización
        updateFields.push('fecha_actualizacion = CURRENT_TIMESTAMP');
        
        const sqlSetClause = updateFields.join(', ');
        updateValues.push(parseInt(userId, 10));

        await query({
            sql: `UPDATE usuarios SET ${sqlSetClause} WHERE id = ?`,
            args: updateValues
        });

        return NextResponse.json({ message: "Tu perfil ha sido actualizado exitosamente." });

    } catch (error) {
        console.error(`Error al actualizar el perfil del usuario ID ${userId}:`, error);
        return NextResponse.json({ message: 'Error interno del servidor al actualizar el perfil.' }, { status: 500 });
    }
}
