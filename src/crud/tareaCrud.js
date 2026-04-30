const Tarea = require('../models/Tarea');
const crypto = require('crypto');

// CREAR
async function crearTarea(id_cuenta, nombre, fecha_entrega, prioridad, id_materia = null) {
  const tarea = await Tarea.create({
    id_tarea: crypto.randomUUID(),
    id_cuenta,
    nombre,
    fecha_entrega,
    prioridad,
    id_materia
  });
  console.log('✅ Tarea creada:', tarea.id_tarea, tarea.nombre);
  return tarea;
}

// LEER TODAS DE UNA CUENTA
async function listarTareas(id_cuenta) {
  const tareas = await Tarea.findAll({ where: { id_cuenta } });
  console.log('📋 Tareas:', tareas.map(t => ({ id: t.id_tarea, nombre: t.nombre, estado: t.estado, prioridad: t.prioridad })));
  return tareas;
}

// LEER UNA
async function obtenerTarea(id) {
  const tarea = await Tarea.findByPk(id);
  console.log('🔍 Tarea encontrada:', tarea?.nombre ?? 'No existe');
  return tarea;
}

// ACTUALIZAR
async function actualizarTarea(id, datos) {
  const [filas] = await Tarea.update(datos, { where: { id_tarea: id } });
  console.log(filas > 0 ? '✅ Tarea actualizada' : '⚠️ No se encontró la tarea');
}

// MARCAR COMPLETADA
async function completarTarea(id) {
  const hoy = new Date().toISOString().split('T')[0];
  const [filas] = await Tarea.update(
    { estado: 'Completada', fecha_completada: hoy },
    { where: { id_tarea: id } }
  );
  console.log(filas > 0 ? '✅ Tarea marcada como completada' : '⚠️ No se encontró la tarea');
}

// ELIMINAR
async function eliminarTarea(id) {
  const filas = await Tarea.destroy({ where: { id_tarea: id } });
  console.log(filas > 0 ? '🗑️ Tarea eliminada' : '⚠️ No se encontró la tarea');
}

module.exports = { crearTarea, listarTareas, obtenerTarea, actualizarTarea, completarTarea, eliminarTarea };