// E12 Controlador Notificaciones
const db=require('../config/db');
// CU-12|RF-09|E12 listarNotificaciones()
exports.listarNotificaciones=async(req,res)=>{try{const[r]=await db.query('SELECT * FROM historial_notificacion WHERE id_cuenta=? ORDER BY fecha DESC',[req.params.id]);res.json(r)}catch(e){res.status(500).json({error:e.message})}};
