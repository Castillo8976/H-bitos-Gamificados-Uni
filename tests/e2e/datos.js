'use strict';
const { randomUUID } = require('node:crypto');

// Exclusivas de bases efímeras E2E; nunca son credenciales de una instalación real.
const CONTRASENA = 'StudyQuest-E2E-2026!';
const ADMIN = { nombre: 'Admin Pruebas', correo: 'admin@studyquest.test', contrasena: CONTRASENA, rol: 'Administrador' };
const REVISOR = { nombre: 'Revisor Pruebas', correo: 'revisor@studyquest.test', contrasena: CONTRASENA, rol: 'Revisor institucional' };
function estudiante() {
  return { nombre: 'Estudiante Pruebas', correo: `estudiante-${randomUUID()}@studyquest.test`, contrasena: CONTRASENA };
}
function fechaFutura(dias = 7) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}
function semanaActual() {
  const jueves = new Date();
  jueves.setUTCHours(0, 0, 0, 0);
  jueves.setUTCDate(jueves.getUTCDate() + 4 - (jueves.getUTCDay() || 7));
  const anio = jueves.getUTCFullYear();
  const semana = Math.ceil((((jueves - new Date(Date.UTC(anio, 0, 1))) / 86400000) + 1) / 7);
  return `${anio}-W${String(semana).padStart(2, '0')}`;
}
module.exports = { CONTRASENA, ADMIN, REVISOR, estudiante, fechaFutura, semanaActual };
