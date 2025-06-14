// src/lib/db.ts
import { createClient, Client, InStatement, ResultSet } from '@libsql/client';

let db: Client;

// CORRECCIÓN: Se añade "export" para que la función sea visible desde otros archivos.
export function getDbClient(): Client {
  if (!db) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error('Falta la variable de entorno TURSO_DATABASE_URL');
    }
    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error('Falta la variable de entorno TURSO_AUTH_TOKEN');
    }

    db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    console.log('Cliente de base de datos Turso inicializado.');
  }
  return db;
}

export async function query(sql: InStatement): Promise<ResultSet> {
  const client = getDbClient();
  try {
    return await client.execute(sql);
  } catch (error) {
    let queryString: string;
    let params: any[] = [];
    if (typeof sql === 'string') {
        queryString = sql;
    } else {
        queryString = sql.sql;
        if (Array.isArray(sql.args)) {
            params = sql.args;
        }
    }
    console.error('Error al ejecutar la consulta en Turso:', {
      sql: queryString,
      params,
      error,
    });
    throw error;
  }
}