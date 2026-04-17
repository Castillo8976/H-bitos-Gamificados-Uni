// E12 Controlador Etiqueta
const db=require('../config/db');
exports.listarEtiquetas=async(req,res)=>{try{const[r]=await db.query('SELECT * FROM etiqueta');res.json(r)}catch(e){res.status(500).json({error:e.message})}};
exports.crearEtiqueta=async(req,res)=>{try{const{nombre,color}=req.body;const[r]=await db.query('INSERT INTO etiqueta(nombre,color)VALUES(?,?)',[nombre,color]);res.status(201).json({id:r.insertId,nombre,color})}catch(e){res.status(400).json({error:e.message})}};
