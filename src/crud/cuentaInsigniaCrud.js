/**
 * @fileoverview Controlador CRUD para la entidad CuentaInsignia.
 * Gestiona el desbloqueo y consulta de insignias obtenidas por cada usuario.
 * Implementa la regla de negocio que impide desbloquear la misma insignia
 * dos veces para el mismo usuario (PK compuesta garantiza unicidad en BD).
 *
 * @module crud/cuentaInsigniaCrud
 * @requires ../models/CuentaInsignia
 * @requires ../models/Insignia
 *
 * // RF-05 | E12 - InsigniaService
 */

const CuentaInsignia = require('../crud-models/models/CuentaInsignia');
const Insignia = require('../crud-models/models/Insignia');


// ─────────────────────────────────────────
// DESBLOQUEAR INSIGNIA (CREAR)
// ─────────────────────────────────────────

/**
 * Desbloquea una insignia para una cuenta si aún no la tiene.
 *
 * Implementa la regla de negocio RF-05: una insignia no puede
 * desbloquearse dos veces para el mismo usuario. Verifica la existencia
 * antes de insertar para devolver un resultado claro al llamador.
 *
 * // CU-06 | RF-05 | E12 - desbloquearInsignia()
 *
 * @async
 * @param {string} id_cuenta   - UUID de la cuenta que desbloquea la insignia.
 * @param {string} id_insignia - UUID de la insignia a desbloquear.
 * @returns {Promise<{desbloqueada: boolean, registro: CuentaInsignia|null}>}
 *   - desbloqueada: true si se creó el registro, false si ya existía.
 *   - registro: la instancia creada, o null si ya existía.
 *
 * @example
 * const resultado = await desbloquearInsignia(id_cuenta, id_insignia);
 * if (resultado.desbloqueada) {
 *   console.log('¡Nueva insignia desbloqueada!');
 * } else {
 *   console.log('Ya tenías esta insignia');
 * }
 */
async function desbloquearInsignia(id_cuenta, id_insignia) {
  // Verifica si la insignia ya fue desbloqueada por este usuario
  const yaExiste = await CuentaInsignia.findOne({
    where: { id_cuenta, id_insignia }
  });

  if (yaExiste) {
    console.log(`⚠️ La insignia ${id_insignia} ya fue desbloqueada por la cuenta ${id_cuenta}`);
    return { desbloqueada: false, registro: null };
  }

  // La PK compuesta (id_cuenta, id_insignia) garantiza unicidad a nivel de BD
  const registro = await CuentaInsignia.create({ id_cuenta, id_insignia });

  console.log(`🏅 ¡Insignia desbloqueada! Cuenta: ${id_cuenta} | Insignia: ${id_insignia}`);
  return { desbloqueada: true, registro };
}


// ─────────────────────────────────────────
// LISTAR INSIGNIAS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Lista todas las insignias desbloqueadas por una cuenta,
 * incluyendo los detalles de cada insignia (JOIN con tabla insignia).
 *
 * // CU-06 | RF-05 | E12 - listarInsigniasDesbloqueadas()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<CuentaInsignia[]>} Registros con datos de insignia incluidos.
 */
async function listarInsigniasDesbloqueadas(id_cuenta) {
  const registros = await CuentaInsignia.findAll({
    where: { id_cuenta },
    include: [{
      model: Insignia,
      attributes: ['nombre', 'descripcion', 'icono']
    }]
  });

  console.log(`📋 Insignias de la cuenta ${id_cuenta}:`, registros.map(r => ({
    insignia: r.insignia?.nombre ?? r.id_insignia,
    fecha: r.fecha_obtenida
  })));

  return registros;
}


// ─────────────────────────────────────────
// VERIFICAR SI UNA CUENTA TIENE UNA INSIGNIA
// ─────────────────────────────────────────

/**
 * Verifica si una cuenta ya tiene desbloqueada una insignia específica.
 *
 * // CU-06 | RF-05 | E12 - tieneInsignia()
 *
 * @async
 * @param {string} id_cuenta   - UUID de la cuenta.
 * @param {string} id_insignia - UUID de la insignia a verificar.
 * @returns {Promise<boolean>} true si ya la tiene, false si no.
 */
async function tieneInsignia(id_cuenta, id_insignia) {
  const registro = await CuentaInsignia.findOne({
    where: { id_cuenta, id_insignia }
  });
  return registro !== null;
}


// ─────────────────────────────────────────
// ELIMINAR (REVOCAR INSIGNIA)
// ─────────────────────────────────────────

/**
 * Revoca una insignia de una cuenta (uso administrativo).
 *
 * @async
 * @param {string} id_cuenta   - UUID de la cuenta.
 * @param {string} id_insignia - UUID de la insignia a revocar.
 * @returns {Promise<void>}
 */
async function revocarInsignia(id_cuenta, id_insignia) {
  const filas = await CuentaInsignia.destroy({
    where: { id_cuenta, id_insignia }
  });
  console.log(filas > 0 ? '🗑️ Insignia revocada' : '⚠️ No se encontró el registro');
}


// ─────────────────────────────────────────
// EVALUAR CONDICIONES (REGLA DE NEGOCIO CENTRAL)
// ─────────────────────────────────────────

/**
 * Evalúa si una cuenta cumple las condiciones para desbloquear
 * insignias específicas y las otorga automáticamente.
 *
 * Esta función implementa la regla de negocio central de RF-05:
 * el sistema evalúa automáticamente las condiciones tras cada acción.
 *
 * Condiciones soportadas (según datos semilla del DDL):
 * - 'primera_tarea'     → el usuario completó al menos 1 tarea
 * - '7_sesiones_semana' → 7 sesiones en los últimos 7 días
 * - '5_tareas_seguidas' → 5 tareas completadas en total
 * - '10_pomodoros'      → 10 sesiones con modo_enfoque = true
 *
 * // CU-03 | CU-06 | RF-05 | E12 - evaluarInsignias()
 *
 * @async
 * @param {string} id_cuenta          - UUID de la cuenta a evaluar.
 * @param {Object} contexto           - Datos del estado actual del usuario.
 * @param {number} contexto.totalTareasCompletadas - Total histórico de tareas completadas.
 * @param {number} contexto.totalPomodoros         - Total de sesiones Pomodoro completadas.
 * @param {number} contexto.sesionesUltimaSemana   - Sesiones en los últimos 7 días.
 * @returns {Promise<string[]>} Nombres de las insignias recién desbloqueadas.
 *
 * @example
 * const nuevas = await evaluarInsignias(id_cuenta, {
 *   totalTareasCompletadas: 1,
 *   totalPomodoros: 0,
 *   sesionesUltimaSemana: 0
 * });
 * // → ['Primera tarea'] si se cumple esa condición
 */
async function evaluarInsignias(id_cuenta, contexto) {
  const insigniasDesbloqueadas = [];

  // Mapa de condiciones evaluables
  const reglas = [
    {
      condicion: 'primera_tarea',
      cumple: () => contexto.totalTareasCompletadas >= 1
    },
    {
      condicion: '5_tareas_seguidas',
      cumple: () => contexto.totalTareasCompletadas >= 5
    },
    {
      condicion: '7_sesiones_semana',
      cumple: () => contexto.sesionesUltimaSemana >= 7
    },
    {
      condicion: '10_pomodoros',
      cumple: () => contexto.totalPomodoros >= 10
    }
  ];

  for (const regla of reglas) {
    if (!regla.cumple()) continue;

    // Busca la insignia por condición
    const insignia = await Insignia.findOne({ where: { condicion: regla.condicion } });
    if (!insignia) continue;

    // Intenta desbloquear (no hace nada si ya la tiene)
    const resultado = await desbloquearInsignia(id_cuenta, insignia.id_insignia);
    if (resultado.desbloqueada) {
      insigniasDesbloqueadas.push(insignia.nombre);
    }
  }

  if (insigniasDesbloqueadas.length > 0) {
    console.log(`🎉 Nuevas insignias desbloqueadas: ${insigniasDesbloqueadas.join(', ')}`);
  }

  return insigniasDesbloqueadas;
}


module.exports = {
  desbloquearInsignia,
  listarInsigniasDesbloqueadas,
  tieneInsignia,
  revocarInsignia,
  evaluarInsignias
};
