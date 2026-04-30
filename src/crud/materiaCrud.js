const Materia = require('../models/Materia');
const crypto = require('crypto');

// CREAR
async function crearMateria(id_cuenta, nombre, horario = null) {
  const materia = await Materia.create({
    id_materia: crypto.randomUUID(),
    id_cuenta,
    nombre,
    horario
  });
  console.log('✅ Materia creada:', materia.id_materia, materia.nombre);
  return materia;
}

// LEER TODAS DE UNA CUENTA
async function listarMaterias(id_cuenta) {
  const materias = await Materia.findAll({ where: { id_cuenta } });
  console.log('📋 Materias:', materias.map(m => ({ id: m.id_materia, nombre: m.nombre })));
  return materias;
}

// LEER UNA
async function obtenerMateria(id) {
  const materia = await Materia.findByPk(id);
  console.log('🔍 Materia encontrada:', materia?.nombre ?? 'No existe');
  return materia;
}

// ACTUALIZAR
async function actualizarMateria(id, datos) {
  const [filas] = await Materia.update(datos, { where: { id_materia: id } });
  console.log(filas > 0 ? '✅ Materia actualizada' : '⚠️ No se encontró la materia');
}

// ELIMINAR
async function eliminarMateria(id) {
  const filas = await Materia.destroy({ where: { id_materia: id } });
  console.log(filas > 0 ? '🗑️ Materia eliminada' : '⚠️ No se encontró la materia');
}

module.exports = { crearMateria, listarMaterias, obtenerMateria, actualizarMateria, eliminarMateria };