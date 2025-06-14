// scripts/seedDatabase.js

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const path = require('path');

// Cargar las variables de entorno desde el archivo .env.local
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// --- Configuración ---
const NUM_USERS_TO_CREATE = 30000; // <--- Cambio principal aquí
const CHUNK_SIZE = 1000; // Tamaño del lote para inserciones
const DEFAULT_PASSWORD = 'password123';

// --- Configuración de la Base de Datos ---
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function seedDatabase() {
  let connection;
  console.log('🌱 Iniciando el script para poblar la base de datos...');

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión a la base de datos exitosa.');

    console.log("🔍 Buscando el ID del rol 'usuario_estandar'...");
    const [roles] = await connection.execute("SELECT id FROM roles WHERE nombre_rol = 'usuario_estandar' LIMIT 1");
    
    if (roles.length === 0) {
      throw new Error("El rol 'usuario_estandar' no se encontró en la base de datos.");
    }
    
    const standardRoleId = roles[0].id;
    console.log(`✓ Rol 'usuario_estandar' encontrado con ID: ${standardRoleId}`);

    console.log(`⚙️  Generando e insertando ${NUM_USERS_TO_CREATE} usuarios en lotes de ${CHUNK_SIZE}...`);
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    
    let usersToInsert = [];
    let totalUsersCreated = 0;

    for (let i = 0; i < NUM_USERS_TO_CREATE; i++) {
      const nombre = faker.person.firstName();
      const apellido = faker.person.lastName();
      const email = faker.internet.email({ firstName: nombre, lastName: apellido, provider: 'example.com' }).toLowerCase();

      usersToInsert.push([
        nombre,
        apellido,
        email,
        passwordHash,
        faker.date.past({ years: 30, refDate: '2004-01-01' }),
        faker.location.streetAddress(),
        faker.location.city(),
        faker.location.country(),
        true
      ]);

      // Si el lote está lleno o es la última iteración, inserta los datos
      if (usersToInsert.length === CHUNK_SIZE || i === NUM_USERS_TO_CREATE - 1) {
        console.log(`➕ Insertando lote de ${usersToInsert.length} usuarios...`);
        const sqlInsertUsers = `
          INSERT INTO usuarios (nombre, apellido, email, password_hash, fecha_nacimiento, direccion, ciudad, pais, activo)
          VALUES ?
        `;
        const [result] = await connection.query(sqlInsertUsers, [usersToInsert]);
        const firstInsertedId = result.insertId;
        console.log(`✓ ${result.affectedRows} usuarios creados exitosamente en este lote.`);
        totalUsersCreated += result.affectedRows;

        console.log("🔗 Asignando roles a los nuevos usuarios del lote...");
        const userRolesToInsert = [];
        for (let j = 0; j < result.affectedRows; j++) {
            const newUserId = firstInsertedId + j;
            userRolesToInsert.push([newUserId, standardRoleId]);
        }

        const sqlInsertRoles = `
            INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ?
        `;
        await connection.query(sqlInsertRoles, [userRolesToInsert]);
        console.log(`✓ Rol asignado a ${userRolesToInsert.length} nuevos usuarios.`);

        // Limpia el array para el siguiente lote
        usersToInsert = []; 
      }
    }

    console.log('\n🚀 ¡Proceso completado! La base de datos ha sido poblada con datos de prueba.');
    console.log(`- Se crearon un total de ${totalUsersCreated} usuarios.`);
    console.log(`- La contraseña para todos los usuarios de prueba es: "${DEFAULT_PASSWORD}"`);

  } catch (error) {
    console.error('\n❌ Ocurrió un error durante el proceso:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión a la base de datos cerrada.');
    }
  }
}

seedDatabase();