-- E11 — DDL SQLite — Plataforma Web Gamificada de Hábitos de Estudio
-- Línea oficial: Node.js + Express + Sequelize ORM + SQLite | CRF-001
-- Fuente semántica: E7-diccionario-datos.md

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cuenta (
  id_cuenta VARCHAR(36) NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  correo VARCHAR(100) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  activa INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0,1)),
  CONSTRAINT pk_cuenta PRIMARY KEY (id_cuenta),
  CONSTRAINT uq_cuenta_correo UNIQUE (correo)
);

CREATE TABLE IF NOT EXISTS nivel_cuenta (
  id_nivel VARCHAR(36) NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  puntos_minimos INTEGER NOT NULL DEFAULT 0 CHECK (puntos_minimos >= 0),
  orden INTEGER NOT NULL DEFAULT 1 CHECK (orden > 0),
  icono VARCHAR(50),
  CONSTRAINT pk_nivel_cuenta PRIMARY KEY (id_nivel),
  CONSTRAINT uq_nivel_cuenta_nombre UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS preferencia_visual (
  id_preferencia VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  tema VARCHAR(20) NOT NULL DEFAULT 'purple'
    CHECK (tema IN ('purple','teal','amber','coral','blue','green')),
  modo_oscuro INTEGER NOT NULL DEFAULT 0 CHECK (modo_oscuro IN (0,1)),
  avatar VARCHAR(50),
  fecha_actualizado DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT pk_preferencia_visual PRIMARY KEY (id_preferencia),
  CONSTRAINT uq_preferencia_visual_cuenta UNIQUE (id_cuenta),
  CONSTRAINT fk_preferencia_visual_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS materia (
  id_materia VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  horario VARCHAR(100),
  activa INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0,1)),
  CONSTRAINT pk_materia PRIMARY KEY (id_materia),
  CONSTRAINT fk_materia_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tarea (
  id_tarea VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  id_materia VARCHAR(36),
  nombre VARCHAR(120) NOT NULL,
  fecha_entrega DATE NOT NULL,
  prioridad VARCHAR(10) NOT NULL CHECK (prioridad IN ('Alta','Media','Baja')),
  estado VARCHAR(15) NOT NULL DEFAULT 'Pendiente'
    CHECK (estado IN ('Pendiente','Completada')),
  fecha_completada DATE,
  CONSTRAINT pk_tarea PRIMARY KEY (id_tarea),
  CONSTRAINT fk_tarea_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tarea_materia FOREIGN KEY (id_materia)
    REFERENCES materia(id_materia) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS sesion_estudio (
  id_sesion VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  id_tarea VARCHAR(36),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos > 0),
  modo_enfoque INTEGER NOT NULL DEFAULT 0 CHECK (modo_enfoque IN (0,1)),
  CONSTRAINT pk_sesion_estudio PRIMARY KEY (id_sesion),
  CONSTRAINT fk_sesion_estudio_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sesion_estudio_tarea FOREIGN KEY (id_tarea)
    REFERENCES tarea(id_tarea) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS insignia (
  id_insignia VARCHAR(36) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  condicion VARCHAR(100) NOT NULL,
  icono VARCHAR(50),
  CONSTRAINT pk_insignia PRIMARY KEY (id_insignia),
  CONSTRAINT uq_insignia_nombre UNIQUE (nombre),
  CONSTRAINT uq_insignia_condicion UNIQUE (condicion)
);

CREATE TABLE IF NOT EXISTS cuenta_insignia (
  id_cuenta VARCHAR(36) NOT NULL,
  id_insignia VARCHAR(36) NOT NULL,
  fecha_obtenida DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT pk_cuenta_insignia PRIMARY KEY (id_cuenta,id_insignia),
  CONSTRAINT fk_cuenta_insignia_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cuenta_insignia_insignia FOREIGN KEY (id_insignia)
    REFERENCES insignia(id_insignia) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS punto (
  id_punto VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  origen VARCHAR(20) NOT NULL CHECK (origen IN ('Tarea','Reto','Sesion')),
  id_origen VARCHAR(36),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT pk_punto PRIMARY KEY (id_punto),
  CONSTRAINT fk_punto_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS reto (
  id_reto VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  condicion VARCHAR(100) NOT NULL,
  puntos_recompensa INTEGER NOT NULL CHECK (puntos_recompensa > 0),
  semana VARCHAR(10) NOT NULL,
  progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso >= 0),
  completado INTEGER NOT NULL DEFAULT 0 CHECK (completado IN (0,1)),
  CONSTRAINT pk_reto PRIMARY KEY (id_reto),
  CONSTRAINT uq_reto_cuenta_semana UNIQUE (id_cuenta,semana),
  CONSTRAINT fk_reto_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS meta (
  id_meta VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  semana VARCHAR(10) NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  valor_objetivo INTEGER NOT NULL CHECK (valor_objetivo > 0),
  valor_actual INTEGER NOT NULL DEFAULT 0 CHECK (valor_actual >= 0),
  cumplida INTEGER NOT NULL DEFAULT 0 CHECK (cumplida IN (0,1)),
  CONSTRAINT pk_meta PRIMARY KEY (id_meta),
  CONSTRAINT uq_meta_cuenta_semana UNIQUE (id_cuenta,semana),
  CONSTRAINT fk_meta_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS recordatorio (
  id_recordatorio VARCHAR(36) NOT NULL,
  id_tarea VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  fecha_programada DATE NOT NULL,
  mensaje VARCHAR(200) NOT NULL,
  enviado INTEGER NOT NULL DEFAULT 0 CHECK (enviado IN (0,1)),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  CONSTRAINT pk_recordatorio PRIMARY KEY (id_recordatorio),
  CONSTRAINT fk_recordatorio_tarea FOREIGN KEY (id_tarea)
    REFERENCES tarea(id_tarea) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_recordatorio_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS notificacion (
  id_notificacion VARCHAR(36) NOT NULL,
  id_cuenta VARCHAR(36) NOT NULL,
  tipo VARCHAR(20) NOT NULL
    CHECK (tipo IN ('Insignia','Reto','Meta','Nivel','Sistema')),
  mensaje VARCHAR(200) NOT NULL,
  leida INTEGER NOT NULL DEFAULT 0 CHECK (leida IN (0,1)),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT pk_notificacion PRIMARY KEY (id_notificacion),
  CONSTRAINT fk_notificacion_cuenta FOREIGN KEY (id_cuenta)
    REFERENCES cuenta(id_cuenta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tarea_estado ON tarea(id_cuenta,estado);
CREATE INDEX IF NOT EXISTS idx_tarea_prioridad ON tarea(id_cuenta,prioridad);
CREATE INDEX IF NOT EXISTS idx_tarea_fecha ON tarea(id_cuenta,fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_sesion_fecha ON sesion_estudio(id_cuenta,fecha);
CREATE INDEX IF NOT EXISTS idx_punto_cuenta ON punto(id_cuenta);
CREATE INDEX IF NOT EXISTS idx_reto_semana ON reto(id_cuenta,semana);
CREATE INDEX IF NOT EXISTS idx_recordatorio_pendiente
  ON recordatorio(activo,enviado,fecha_programada);
CREATE INDEX IF NOT EXISTS idx_notificacion_cuenta
  ON notificacion(id_cuenta,leida,fecha);

INSERT OR IGNORE INTO insignia
  (id_insignia,nombre,descripcion,condicion,icono)
VALUES
  ('ins-001','Primera tarea','Completaste tu primera tarea','primera_tarea','star.svg'),
  ('ins-002','Semana perfecta','7 sesiones en una semana','7_sesiones_semana','fire.svg'),
  ('ins-003','Racha de 5','5 tareas completadas seguidas','5_tareas_seguidas','lightning.svg'),
  ('ins-004','Madrugador','Sesion antes de las 8am','sesion_antes_8am','sunrise.svg'),
  ('ins-005','Pomodoro Pro','10 sesiones Pomodoro completadas','10_pomodoros','tomato.svg');

INSERT OR IGNORE INTO nivel_cuenta
  (id_nivel,nombre,descripcion,puntos_minimos,orden,icono)
VALUES
  ('niv-001','Principiante','Estás dando tus primeros pasos como estudiante gamificado.',0,1,'nivel_1.svg'),
  ('niv-002','Estudiante','Ya tienes experiencia y estás construyendo buenos hábitos.',100,2,'nivel_2.svg'),
  ('niv-003','Avanzado','Dominas tus hábitos de estudio y eres constante.',500,3,'nivel_3.svg'),
  ('niv-004','Maestro','Has alcanzado la cima. Eres un referente de disciplina.',1000,4,'nivel_4.svg');
