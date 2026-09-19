'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const requiredDirectories = ['config','models','services','controllers','routes','middlewares','validators','public','views'];

for (const directory of requiredDirectories) {
  assert.equal(fs.statSync(path.join(root, 'src', directory)).isDirectory(), true, `Falta src/${directory}`);
}

const jsFiles = directory => fs.readdirSync(path.join(root, 'src', directory))
  .filter(file => file.endsWith('.js'))
  .map(file => path.join(root, 'src', directory, file));

for (const file of jsFiles('controllers')) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /sequelize\.define|DataTypes\./, `${path.basename(file)} define tablas desde un controlador`);
}

for (const file of jsFiles('routes')) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /require\(['"]\.\.\/models\//, `${path.basename(file)} accede directamente a modelos`);
  assert.doesNotMatch(source, /require\(['"]\.\.\/services\//, `${path.basename(file)} contiene acceso directo a servicios`);
}

for (const file of jsFiles('services')) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /\bdocument\.|\bwindow\.|res\.render\(|res\.json\(/, `${path.basename(file)} depende de la interfaz visual/HTTP`);
}

assert.equal(fs.existsSync(path.join(root, 'src', 'app.js')), true);
assert.equal(fs.existsSync(path.join(root, 'src', 'server.js')), true);
console.log('✅ Arquitectura MVC: responsabilidades y dependencias permitidas verificadas');
