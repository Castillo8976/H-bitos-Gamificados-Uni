// E14 Servicio Nivel
const db=require('../config/db');
// CU-13|RF-10|E14 verificarYActualizarNivel()
exports.verificarYActualizarNivel=async(id_cuenta)=>{const[[c]]=await db.query('SELECT puntos FROM cuenta_estudiante WHERE id_cuenta=?',[id_cuenta]);const[niveles]=await db.query('SELECT * FROM nivel ORDER BY puntos_minimos DESC');for(const n of niveles){if(c.puntos>=n.puntos_minimos){await db.query('UPDATE cuenta_estudiante SET id_nivel=? WHERE id_cuenta=?',[n.id_nivel,id_cuenta]);return n;}}};
