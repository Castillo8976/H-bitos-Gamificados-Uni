const Insignia = require('../models/Insignia');
const crypto = require('crypto');

// CREAR
async function crearInsignia(nombre, descripcion, condicion, icono = null) {
  const insignia = await Insignia.create({
    id_insignia: crypto.randomUUID(),
    nombre,
    descripcion,
    condicion,
    icono
  });
  console.log('✅ Insignia creada:', insignia.id_insignia, insignia.nombre);
  return insignia;
}

// LEER TODAS
async function listarInsignias() {
  const insignias = await Insignia.findAll();
  console.log('📋 Insignias:', insignias.map(i => ({ id: i.id_insignia, nombre: i.nombre, condicion: i.condicion })));
  return insignias;
}

// LEER UNA
async function obtenerInsignia(id) {
  const insignia = await Insignia.findByPk(id);
  console.log('🔍 Insignia encontrada:', insignia?.nombre ?? 'No existe');
  return insignia;
}

// ACTUALIZAR
async function actualizarInsignia(id, datos) {
  const [filas] = await Insignia.update(datos, { where: { id_insignia: id } });
  console.log(filas > 0 ? '✅ Insignia actualizada' : '⚠️ No se encontró la insignia');
}

// ELIMINAR
async function eliminarInsignia(id) {
  const filas = await Insignia.destroy({ where: { id_insignia: id } });
  console.log(filas > 0 ? '🗑️ Insignia eliminada' : '⚠️ No se encontró la insignia');
}

module.exports = { crearInsignia, listarInsignias, obtenerInsignia, actualizarInsignia, eliminarInsignia };