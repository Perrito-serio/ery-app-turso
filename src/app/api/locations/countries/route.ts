// src/app/api/locations/countries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/locations/countries
 * Obtiene una lista de todos los países disponibles para el formulario de registro.
 * No requiere autenticación, ya que es para usuarios nuevos.
 */
export async function GET(request: NextRequest) {
  try {
    const countriesResult = await query({
      sql: 'SELECT id, nombre, codigo FROM paises ORDER BY nombre ASC',
    });

    return NextResponse.json({ countries: countriesResult.rows });

  } catch (error) {
    console.error("Error al obtener la lista de países:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
