# Esquema de Base de Datos - ERY App

## Descripción
Este archivo contiene el esquema actual de la base de datos para la aplicación ERY. 
Puedes actualizar este archivo con la estructura completa de las tablas para que pueda ser analizado en futuras implementaciones.

## Instrucciones
1. Coloca aquí el esquema completo de la base de datos
2. Incluye todas las tablas con sus columnas, tipos de datos y relaciones
3. Especifica las claves primarias, foráneas y restricciones
4. Mantén este archivo actualizado cuando hagas cambios al esquema

## Esquema Actual

```sql
-- ------------------------------------------------------------------
-- Tabla: paises
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    codigo TEXT NOT NULL UNIQUE
);

-- ------------------------------------------------------------------
-- Tabla: ciudades
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciudades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    pais_id INTEGER NOT NULL,
    FOREIGN KEY (pais_id) REFERENCES paises(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: usuarios
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    fecha_nacimiento TEXT NULL,
    telefono TEXT NULL,
    direccion TEXT NULL,
    ciudad TEXT NULL, -- Campo libre legacy (opcional)
    pais TEXT NULL,   -- Campo libre legacy (opcional)
    foto_perfil_url TEXT NULL,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo', 'suspendido', 'baneado')),
    suspension_fin TEXT NULL,
    pais_id INTEGER,
    ciudad_id INTEGER,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TEXT NULL,
    FOREIGN KEY (pais_id) REFERENCES paises(id),
    FOREIGN KEY (ciudad_id) REFERENCES ciudades(id)
);

-- ------------------------------------------------------------------
-- Tabla: roles
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_rol TEXT NOT NULL UNIQUE,
    descripcion TEXT NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------
-- Tabla: permisos
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_permiso TEXT NOT NULL UNIQUE,
    descripcion TEXT NULL,
    categoria_permiso TEXT NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------
-- Tabla: usuario_roles
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario_roles (
    usuario_id INTEGER NOT NULL,
    rol_id INTEGER NOT NULL,
    fecha_asignacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, rol_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: rol_permisos
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id INTEGER NOT NULL,
    permiso_id INTEGER NOT NULL,
    PRIMARY KEY (rol_id, permiso_id),
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: habitos (estructura final unificada)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS habitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('SI_NO', 'MEDIBLE_NUMERICO', 'MAL_HABITO')),
    meta_objetivo REAL NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: registros_habitos
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_habitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habito_id INTEGER NOT NULL,
    fecha_registro TEXT NOT NULL,
    valor_numerico REAL NULL,
    valor_booleano INTEGER NULL,
    notas TEXT NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (habito_id, fecha_registro),
    FOREIGN KEY (habito_id) REFERENCES habitos(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: rutinas
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rutinas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: rutina_habitos
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rutina_habitos (
    rutina_id INTEGER NOT NULL,
    habito_id INTEGER NOT NULL,
    PRIMARY KEY (rutina_id, habito_id),
    FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE CASCADE,
    FOREIGN KEY (habito_id) REFERENCES habitos(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: logros_criterios
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logros_criterios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    criterio_codigo TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL
);

-- ------------------------------------------------------------------
-- Tabla: logros
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    icono_url TEXT NULL,
    criterio_id INTEGER NOT NULL,
    valor_criterio INTEGER NOT NULL,
    FOREIGN KEY (criterio_id) REFERENCES logros_criterios(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: usuario_logros
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario_logros (
    usuario_id INTEGER NOT NULL,
    logro_id INTEGER NOT NULL,
    fecha_obtencion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, logro_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (logro_id) REFERENCES logros(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- Tabla: api_keys
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    usuario_id INTEGER NOT NULL,
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_uso TEXT NULL,
    revokada INTEGER DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- INDICES DE RENDIMIENTO
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_habitos_usuario_id ON habitos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_habito_fecha ON registros_habitos(habito_id, fecha_registro);
CREATE INDEX IF NOT EXISTS idx_rutinas_usuario_id ON rutinas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_pais_id ON usuarios(pais_id);
CREATE INDEX IF NOT EXISTS idx_ciudades_pais_id ON ciudades(pais_id);

-- Tablas integradas:
CREATE TABLE competencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creador_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo_meta TEXT NOT NULL CHECK(tipo_meta IN ('MAX_HABITOS_DIA', 'MAX_RACHA', 'TOTAL_COMPLETADOS')),
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK(estado IN ('activa', 'finalizada', 'cancelada')),
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creador_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE competencia_participantes (
    competencia_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    puntuacion INTEGER DEFAULT 0,
    fecha_union TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (competencia_id, usuario_id),
    FOREIGN KEY (competencia_id) REFERENCES competencias(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_competencias_creador_id ON competencias(creador_id);
CREATE INDEX IF NOT EXISTS idx_competencias_estado ON competencias(estado);
CREATE INDEX IF NOT EXISTS idx_competencia_participantes_puntuacion ON competencia_participantes(competencia_id, puntuacion DESC);


CREATE TABLE IF NOT EXISTS invitaciones_amistad (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solicitante_id INTEGER NOT NULL,
    solicitado_id INTEGER NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'aceptada', 'rechazada')),
    fecha_envio TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (solicitado_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS amistades (
    usuario_id_1 INTEGER NOT NULL,
    usuario_id_2 INTEGER NOT NULL,
    fecha_inicio TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id_1, usuario_id_2),
    CHECK (usuario_id_1 < usuario_id_2), -- Evita duplicados como (A,B) y (B,A)
    FOREIGN KEY (usuario_id_1) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id_2) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

## Notas
- Este archivo es solo para documentación y análisis
- No afecta el código de la aplicación
- Úsalo como referencia para entender las relaciones entre tablas
- Actualízalo cada vez que modifiques el esquema de la base de datos