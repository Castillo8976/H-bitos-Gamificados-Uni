// E12 Controlador CuentaEstudiante
const db=require('../config/db');
// CU-11|RF-08|E12 listarEstudiantes()
exports.listarEstudiantes=async(req,res)=>{try{const[r]=await db.query('SELECT ce.*,n.nombre AS nivel_nombre FROM cuenta_estudiante ce LEFT JOIN nivel n ON ce.id_nivel=n.id_nivel');res.json(r)}catch(e){res.status(500).json({error:e.message})}};
