-- ============================================================
-- DDL MySQL — Plataforma Web Gamificada de Hábitos de Estudio
-- Motor: MySQL (XAMPP) — Compatible con MySQL 5.7+
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS preferencia_visual;
DROP TABLE IF EXISTS reporte;
DROP TABLE IF EXISTS meta;
DROP TABLE IF EXISTS recordatorio;
DROP TABLE IF EXISTS reto;
DROP TABLE IF EXISTS punto;
DROP TABLE IF EXISTS cuenta_insignia;
DROP TABLE IF EXISTS insignia;
DROP TABLE IF EXISTS sesion_estudio;
DROP TABLE IF EXISTS tarea;
DROP TABLE IF EXISTS materia;
DROP TABLE IF EXISTS cuenta;

SET FOREIGN_KEY_CHECKS = 1;

-- TABLA cuenta | RF01, RNF12
CREATE TABLE cuenta (
  idcuenta       VARCHAR(36)  NOT NULL,
  nombre         VARCHAR(60)  NOT NULL,
  correo         VARCHAR(100) NOT NULL,
  contrasenahash VARCHAR(255) NOT NULL,
  fecharegistro  DATE         NOT NULL,
  activa         TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT pk_cuenta PRIMARY KEY (idcuenta),
  CONSTRAINT uq_correo UNIQUE (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA preferencia_visual | RF13 — relación 1:1
CREATE TABLE preferencia_visual (
  idpreferencia    VARCHAR(36) NOT NULL,
  idcuenta         VARCHAR(36) NOT NULL,
  tema             VARCHAR(20) NOT NULL DEFAULT 'purple',
  modooscuro       TINYINT(1)  NOT NULL DEFAULT 0,
  avatar           VARCHAR(50),
  fechaactualizado DATE        NOT NULL,
  CONSTRAINT pk_preferencia PRIMARY KEY (idpreferencia),
  CONSTRAINT uq_pref_cuenta UNIQUE (idcuenta),
  CONSTRAINT fk_pref_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA materia | RF01, RF09
CREATE TABLE materia (
  idmateria VARCHAR(36) NOT NULL,
  idcuenta  VARCHAR(36) NOT NULL,
  nombre    VARCHAR(80) NOT NULL,
  horario   VARCHAR(100),
  activa    TINYINT(1)  NOT NULL DEFAULT 1,
  CONSTRAINT pk_materia PRIMARY KEY (idmateria),
  CONSTRAINT fk_mat_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA tarea | RF02, RF03, RF09
CREATE TABLE tarea (
  idtarea         VARCHAR(36)  NOT NULL,
  idcuenta        VARCHAR(36)  NOT NULL,
  idmateria       VARCHAR(36),
  nombre          VARCHAR(120) NOT NULL,
  fechaentrega    DATE         NOT NULL,
  prioridad       VARCHAR(10)  NOT NULL,
  estado          VARCHAR(15)  NOT NULL DEFAULT 'Pendiente',
  fechacompletada DATE,
  CONSTRAINT pk_tarea PRIMARY KEY (idtarea),
  CONSTRAINT fk_tar_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tar_materia FOREIGN KEY (idmateria)
    REFERENCES materia(idmateria) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA sesion_estudio | RF10, RF11, RF12
CREATE TABLE sesion_estudio (
  idsesion        VARCHAR(36) NOT NULL,
  idcuenta        VARCHAR(36) NOT NULL,
  idtarea         VARCHAR(36),
  fecha           DATE        NOT NULL,
  duracionminutos INT         NOT NULL,
  modoenfoque     TINYINT(1)  NOT NULL DEFAULT 0,
  CONSTRAINT pk_sesion PRIMARY KEY (idsesion),
  CONSTRAINT fk_ses_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ses_tarea FOREIGN KEY (idtarea)
    REFERENCES tarea(idtarea) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA insignia | RF05
CREATE TABLE insignia (
  idinsignia  VARCHAR(36)  NOT NULL,
  nombre      VARCHAR(80)  NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  condicion   VARCHAR(100) NOT NULL,
  icono       VARCHAR(50),
  CONSTRAINT pk_insignia PRIMARY KEY (idinsignia),
  CONSTRAINT uq_ins_nombre UNIQUE (nombre),
  CONSTRAINT uq_ins_condicion UNIQUE (condicion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA cuenta_insignia — N:M | RF05
CREATE TABLE cuenta_insignia (
  idcuenta      VARCHAR(36) NOT NULL,
  idinsignia    VARCHAR(36) NOT NULL,
  fechaobtenida DATE        NOT NULL,
  CONSTRAINT pk_ci PRIMARY KEY (idcuenta, idinsignia),
  CONSTRAINT fk_ci_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ci_insignia FOREIGN KEY (idinsignia)
    REFERENCES insignia(idinsignia) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA punto | RF03, RF07
CREATE TABLE punto (
  idpunto  VARCHAR(36) NOT NULL,
  idcuenta VARCHAR(36) NOT NULL,
  cantidad INT         NOT NULL,
  origen   VARCHAR(20) NOT NULL,
  idorigen VARCHAR(36),
  fecha    DATE        NOT NULL,
  CONSTRAINT pk_punto PRIMARY KEY (idpunto),
  CONSTRAINT fk_pto_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA reto | RF06
CREATE TABLE reto (
  idreto           VARCHAR(36)  NOT NULL,
  idcuenta         VARCHAR(36)  NOT NULL,
  descripcion      VARCHAR(200) NOT NULL,
  condicion        VARCHAR(100) NOT NULL,
  puntosrecompensa INT          NOT NULL,
  semana           VARCHAR(10)  NOT NULL,
  progreso         INT          NOT NULL DEFAULT 0,
  completado       TINYINT(1)   NOT NULL DEFAULT 0,
  CONSTRAINT pk_reto PRIMARY KEY (idreto),
  CONSTRAINT uq_reto_semana UNIQUE (idcuenta, semana),
  CONSTRAINT fk_reto_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA meta | RF15
CREATE TABLE meta (
  idmeta        VARCHAR(36)  NOT NULL,
  idcuenta      VARCHAR(36)  NOT NULL,
  semana        VARCHAR(10)  NOT NULL,
  descripcion   VARCHAR(200) NOT NULL,
  valorobjetivo INT          NOT NULL,
  valoractual   INT          NOT NULL DEFAULT 0,
  cumplida      TINYINT(1)   NOT NULL DEFAULT 0,
  CONSTRAINT pk_meta PRIMARY KEY (idmeta),
  CONSTRAINT uq_meta_semana UNIQUE (idcuenta, semana),
  CONSTRAINT fk_meta_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA recordatorio | RF04, RNF15
CREATE TABLE recordatorio (
  idrecordatorio  VARCHAR(36)  NOT NULL,
  idtarea         VARCHAR(36)  NOT NULL,
  idcuenta        VARCHAR(36)  NOT NULL,
  fechaprogramada DATE         NOT NULL,
  mensaje         VARCHAR(200) NOT NULL,
  enviado         TINYINT(1)   NOT NULL DEFAULT 0,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT pk_recordatorio PRIMARY KEY (idrecordatorio),
  CONSTRAINT fk_rec_tarea FOREIGN KEY (idtarea)
    REFERENCES tarea(idtarea) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rec_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLA reporte | RF11
CREATE TABLE reporte (
  idreporte         VARCHAR(36)  NOT NULL,
  idcuenta          VARCHAR(36)  NOT NULL,
  semana            VARCHAR(10)  NOT NULL,
  tareascompletadas INT          NOT NULL DEFAULT 0,
  horasestudiadas   DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  puntosobtenidos   INT          NOT NULL DEFAULT 0,
  fechagenerado     DATE         NOT NULL,
  CONSTRAINT pk_reporte PRIMARY KEY (idreporte),
  CONSTRAINT uq_rep_semana UNIQUE (idcuenta, semana),
  CONSTRAINT fk_rep_cuenta FOREIGN KEY (idcuenta)
    REFERENCES cuenta(idcuenta) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX idx_tarea_estado    ON tarea(idcuenta, estado);
CREATE INDEX idx_tarea_prioridad ON tarea(idcuenta, prioridad);
CREATE INDEX idx_tarea_fecha     ON tarea(idcuenta, fechaentrega);
CREATE INDEX idx_sesion_fecha    ON sesion_estudio(idcuenta, fecha);
CREATE INDEX idx_punto_cuenta    ON punto(idcuenta);
CREATE INDEX idx_reto_semana     ON reto(idcuenta, semana);
CREATE INDEX idx_rec_pendiente   ON recordatorio(activo, enviado, fechaprogramada);
CREATE INDEX idx_rep_semana      ON reporte(idcuenta, semana);

-- ============================================================
-- DATOS SEMILLA — Insignias
-- ============================================================
INSERT INTO insignia VALUES
('ins-001','Primera tarea','Completaste tu primera tarea','primera_tarea','star.svg'),
('ins-002','Semana perfecta','7 sesiones en una semana','7_sesiones_semana','fire.svg'),
('ins-003','Racha de 5','5 tareas completadas seguidas','5_tareas_seguidas','lightning.svg'),
('ins-004','Madrugador','Sesion antes de las 8am','sesion_antes_8am','sunrise.svg'),
('ins-005','Pomodoro Pro','10 sesiones Pomodoro completadas','10_pomodoros','tomato.svg');
