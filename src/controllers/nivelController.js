// E12 Controlador Nivel
const db=require('../config/db');
// CU-09|RF-07|E12 listarNiveles()
exports.listarNiveles=async(req,res)=>{try{const[r]=await db.query('SELECT * FROM nivel ORDER BY puntos_minimos ASC');res.json(r)}catch(e){res.status(500).json({error:e.message})}};
exports.crearNivel=async(req,res)=>{try{const{nombre,icono,puntos_minimos}=req.body;const[r]=await db.query('INSERT INTO nivel(nombre,icono,puntos_minimos)VALUES(?,?,?)',[nombre,icono,puntos_minimos]);res.status(201).json({id:r.insertId,nombre,icono,puntos_minimos})}catch(e){res.status(400).json({error:e.message})}};
