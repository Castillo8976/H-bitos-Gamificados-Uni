// E12|E9 Servicio Tareas
const db=require('../config/db');
// CU-01|RF-01|E12 obtenerTodas()
exports.obtenerTodas=async()=>{const[r]=await db.query('SELECT * FROM tarea');return r;};
// CU-02|RF-02|E12 crear()
exports.crear=async(d)=>{const[r]=await db.query('INSERT INTO tarea(titulo,descripcion,fecha_limite,prioridad,id_tipo_tarea,id_cuenta)VALUES(?,?,?,?,?,?)',[d.titulo,d.descripcion,d.fecha_limite,d.prioridad,d.id_tipo_tarea,d.id_cuenta]);return{id:r.insertId,...d};};
// CU-03|RF-03|E12 actualizar()
exports.actualizar=async(id,d)=>{await db.query('UPDATE tarea SET titulo=?,descripcion=?,fecha_limite=?,prioridad=?,completada=? WHERE id_tarea=?',[d.titulo,d.descripcion,d.fecha_limite,d.prioridad,d.completada,id]);return{id,...d};};
// CU-04|RF-04|E12 eliminar()
exports.eliminar=async(id)=>{await db.query('DELETE FROM tarea WHERE id_tarea=?',[id]);};
