// E12 Servicio Notificaciones
const db=require('../config/db');
// CU-14|RF-11|E12 crearNotificacion()
exports.crearNotificacion=async(id_cuenta,tipo,mensaje)=>{await db.query('INSERT INTO historial_notificacion(id_cuenta,tipo,mensaje,fecha)VALUES(?,?,?,NOW())',[id_cuenta,tipo,mensaje]);};
