const Cuenta = require('../models/Cuenta');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// CREAR
async function crearCuenta(nombre, correo, contrasena) {
  const hash = await bcrypt.hash(contrasena, 10);
  const cuenta = await Cuenta.create({
    id_cuenta: crypto.randomUUID(),
    nombre,
    correo,
    contrasena_hash: hash
  });
  console.log('✅ Cuenta creada:', cuenta.id_cuenta, cuenta.nombre);
  return cuenta;
}

// LEER TODAS
async function listarCuentas() {
  const cuentas = await Cuenta.findAll();
  console.log('📋 Cuentas:', cuentas.map(c => ({ id: c.id_cuenta, nombre: c.nombre, correo: c.correo })));
  return cuentas;
}

// LEER UNA
async function obtenerCuenta(id) {
  const cuenta = await Cuenta.findByPk(id);
  console.log('🔍 Cuenta encontrada:', cuenta?.nombre ?? 'No existe');
  return cuenta;
}

// ACTUALIZAR
async function actualizarCuenta(id, datos) {
  const [filas] = await Cuenta.update(datos, { where: { id_cuenta: id } });
  console.log(filas > 0 ? '✅ Cuenta actualizada' : '⚠️ No se encontró la cuenta');
}

// ELIMINAR
async function eliminarCuenta(id) {
  const filas = await Cuenta.destroy({ where: { id_cuenta: id } });
  console.log(filas > 0 ? '🗑️ Cuenta eliminada' : '⚠️ No se encontró la cuenta');
}

module.exports = { crearCuenta, listarCuentas, obtenerCuenta, actualizarCuenta, eliminarCuenta };