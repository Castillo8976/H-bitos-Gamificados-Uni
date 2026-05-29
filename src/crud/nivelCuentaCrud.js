/**
 * @fileoverview Controlador CRUD para la entidad NivelCuenta.
 * Gestiona el catálogo de niveles de la plataforma e incluye
 * la regla de negocio que evalúa y asigna el nivel correcto
 * a un usuario según sus puntos acumulados.
 *
 * @module crud/nivelCuentaCrud
 * @requires ../models/NivelCuenta
 * @requires crypto
 *
 * // RF-07 | E12 - NivelCuentaService
 */

const NivelCuenta = require('../crud-models/models/NivelCuenta');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR (CATÁLOGO)
// ─────────────────────────────────────────

/**
 * Crea un nivel en el catálogo global de la plataforma.
 *
 * Esta función es de uso administrativo para poblar el catálogo.
 * Los niveles se insertan en orden ascendente de puntos_minimos.
 *
 * // RF-07 | E12 - crearNivel()
 *
 * @async
 * @param {string}      nombre         - Nombre del nivel (ej: 'Principiante').
 * @param {string}      descripcion    - Descripción del nivel.
 * @param {number}      puntos_minimos - Puntos mínimos para alcanzarlo.
 * @param {number}      orden          - Posición en la jerarquía (1 = básico).
 * @param {string|null} [icono=null]   - Nombre del archivo de ícono.
 * @returns {Promise<NivelCuenta>} El nivel creado.
 *
 * @example
 * await crearNivel('Principiante', 'Estás comenzando tu camino', 0, 1, 'nivel_1.svg');
 * await crearNivel('Estudiante',   'Ya tienes experiencia',      100, 2, 'nivel_2.svg');
 * await crearNivel('Avanzado',     'Dominas tus hábitos',        500, 3, 'nivel_3.svg');
 * await crearNivel('Maestro',      'Has alcanzado la cima',      1000, 4, 'nivel_4.svg');
 */
async function crearNivel(nombre, descripcion, puntos_minimos, orden, icono = null) {
  const nivel = await NivelCuenta.create({
    id_nivel: crypto.randomUUID(),
    nombre,
    descripcion,
    puntos_minimos,
    orden,
    icono
  });

  console.log(`✅ Nivel creado: "${nivel.nombre}" | Mín. ${nivel.puntos_minimos} pts | Orden: ${nivel.orden}`);
  return nivel;
}


// ─────────────────────────────────────────
// LEER TODOS
// ─────────────────────────────────────────

/**
 * Lista todos los niveles del catálogo ordenados por jerarquía.
 *
 * // RF-07 | E12 - listarNiveles()
 *
 * @async
 * @returns {Promise<NivelCuenta[]>} Niveles ordenados de menor a mayor.
 */
async function listarNiveles() {
  const niveles = await NivelCuenta.findAll({
    order: [['orden', 'ASC']]
  });

  console.log('📋 Niveles:', niveles.map(n => ({
    orden: n.orden,
    nombre: n.nombre,
    puntos_minimos: n.puntos_minimos
  })));

  return niveles;
}


// ─────────────────────────────────────────
// LEER UNO
// ─────────────────────────────────────────

/**
 * Obtiene un nivel específico por UUID.
 *
 * @async
 * @param {string} id - UUID del nivel.
 * @returns {Promise<NivelCuenta|null>}
 */
async function obtenerNivel(id) {
  const nivel = await NivelCuenta.findByPk(id);
  console.log('🔍 Nivel encontrado:', nivel?.nombre ?? 'No existe');
  return nivel;
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza los datos de un nivel del catálogo.
 *
 * @async
 * @param {string} id    - UUID del nivel.
 * @param {Object} datos - Campos a actualizar.
 * @returns {Promise<void>}
 */
async function actualizarNivel(id, datos) {
  const [filas] = await NivelCuenta.update(datos, { where: { id_nivel: id } });
  console.log(filas > 0 ? '✅ Nivel actualizado' : '⚠️ No se encontró el nivel');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina un nivel del catálogo.
 *
 * @async
 * @param {string} id - UUID del nivel.
 * @returns {Promise<void>}
 */
async function eliminarNivel(id) {
  const filas = await NivelCuenta.destroy({ where: { id_nivel: id } });
  console.log(filas > 0 ? '🗑️ Nivel eliminado' : '⚠️ No se encontró el nivel');
}


// ─────────────────────────────────────────
// EVALUAR NIVEL ACTUAL (REGLA DE NEGOCIO)
// ─────────────────────────────────────────

/**
 * Determina el nivel que le corresponde a una cuenta según
 * sus puntos totales acumulados.
 *
 * Implementa la regla de negocio RF-07: busca el nivel con el
 * mayor puntos_minimos que sea ≤ al total de puntos del usuario.
 *
 * // CU-05 | RF-07 | E12 - evaluarNivelCuenta()
 *
 * @async
 * @param {number} totalPuntos - Total de puntos acumulados por la cuenta.
 * @returns {Promise<NivelCuenta|null>} El nivel correspondiente, o null si no hay niveles.
 *
 * @example
 * const nivel = await evaluarNivelCuenta(350);
 * // → Nivel 'Estudiante' si su umbral es 100 y el siguiente es 500
 */
async function evaluarNivelCuenta(totalPuntos) {
  const { Op } = require('sequelize');

  // Busca el nivel más alto cuyo umbral no supere los puntos del usuario
  const nivel = await NivelCuenta.findOne({
    where: {
      puntos_minimos: { [Op.lte]: totalPuntos }
    },
    order: [['puntos_minimos', 'DESC']] // El más alto que pueda alcanzar
  });

  if (nivel) {
    console.log(`🎖️ Nivel actual con ${totalPuntos} pts: "${nivel.nombre}" (mín. ${nivel.puntos_minimos} pts)`);
  } else {
    console.log(`⚠️ No se encontró nivel para ${totalPuntos} pts`);
  }

  return nivel;
}


/**
 * Siembra el catálogo de niveles con los 4 niveles base de la plataforma.
 * Se ejecuta una sola vez durante la inicialización del sistema.
 *
 * // RF-07 | E12 - sembrarNiveles()
 *
 * @async
 * @returns {Promise<void>}
 */
async function sembrarNiveles() {
  const existentes = await NivelCuenta.count();
  if (existentes > 0) {
    console.log('ℹ️ Los niveles ya están sembrados');
    return;
  }

  const niveles = [
    { nombre: 'Principiante', descripcion: 'Estás dando tus primeros pasos como estudiante gamificado.', puntos_minimos: 0,    orden: 1, icono: 'nivel_1.svg' },
    { nombre: 'Estudiante',   descripcion: 'Ya tienes experiencia y estás construyendo buenos hábitos.',  puntos_minimos: 100,  orden: 2, icono: 'nivel_2.svg' },
    { nombre: 'Avanzado',     descripcion: 'Dominas tus hábitos de estudio y eres constante.',            puntos_minimos: 500,  orden: 3, icono: 'nivel_3.svg' },
    { nombre: 'Maestro',      descripcion: 'Has alcanzado la cima. Eres un referente de disciplina.',     puntos_minimos: 1000, orden: 4, icono: 'nivel_4.svg' }
  ];

  for (const datos of niveles) {
    await crearNivel(datos.nombre, datos.descripcion, datos.puntos_minimos, datos.orden, datos.icono);
  }

  console.log('🌱 Catálogo de niveles sembrado con éxito (4 niveles)');
}


module.exports = {
  crearNivel,
  listarNiveles,
  obtenerNivel,
  actualizarNivel,
  eliminarNivel,
  evaluarNivelCuenta,
  sembrarNiveles
};
