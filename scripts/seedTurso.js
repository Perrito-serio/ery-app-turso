require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const { createClient } = require('@libsql/client');

const NUM_USERS_TO_CREATE = 1000; // Puedes ajustar este valor
const DEFAULT_PASSWORD = 'password123';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function seedTurso() {
  try {
    console.log('🌱 Iniciando el script para poblar la base de datos Turso...');

    // Obtener el ID del rol 'usuario_estandar'
    const roles = await db.execute("SELECT id FROM roles WHERE nombre_rol = 'usuario_estandar' LIMIT 1");
    if (roles.rows.length === 0) throw new Error("El rol 'usuario_estandar' no se encontró.");
    const standardRoleId = roles.rows[0].id;

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (let i = 0; i < NUM_USERS_TO_CREATE; i++) {
      const nombre = faker.person.firstName();
      const apellido = faker.person.lastName();
      const email = faker.internet.email({ firstName: nombre, lastName: apellido, provider: 'example.com' }).toLowerCase();
      const fecha_nacimiento = faker.date.past({ years: 30, refDate: '2004-01-01' }).toISOString().split('T')[0];
      const direccion = faker.location.streetAddress();
      const ciudad = faker.location.city();
      const pais = faker.location.country();

      // Insertar usuario
      const result = await db.execute({
        sql: `INSERT INTO usuarios (nombre, apellido, email, password_hash, fecha_nacimiento, direccion, ciudad, pais, activo)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        args: [nombre, apellido, email, passwordHash, fecha_nacimiento, direccion, ciudad, pais, 1],
      });
      const newUserId = result.lastInsertRowid;

      // Asignar rol
      await db.execute({
        sql: `INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)`,
        args: [newUserId, standardRoleId],
      });

      if ((i + 1) % 10 === 0) console.log(`➕ ${i + 1} usuarios insertados...`);
    }

    console.log('🚀 ¡Proceso completado! Usuarios insertados en Turso.');
    console.log(`La contraseña para todos los usuarios de prueba es: "${DEFAULT_PASSWORD}"`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

seedTurso();
