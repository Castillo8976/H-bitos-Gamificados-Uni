// E12 Controlador TipoTarea
const db=require('../config/db');
// CU-05|RF-05|E12 listarTipos()
exports.listarTipos=async(req,res)=>{try{const[r]=await db.query('SELECT * FROM tipo_tarea');res.json(r)}catch(e){res.status(500).json({error:e.message})}};
exports.crearTipo=async(req,res)=>{try{const{nombre,descripcion}=req.body;const[r]=await db.query('INSERT INTO tipo_tarea(nombre,descripcion)VALUES(?,?)',[nombre,descripcion]);res.status(201).json({id:r.insertId,nombre,descripcion})}catch(e){res.status(400).json({error:e.message})}};
