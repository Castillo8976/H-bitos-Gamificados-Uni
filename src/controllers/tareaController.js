// E12|E13 Controlador Tareas
const svc=require('../services/tareaService');
// CU-01|RF-01|E12 listarTareas()
exports.listarTareas=async(req,res)=>{try{res.json(await svc.obtenerTodas())}catch(e){res.status(500).json({error:e.message})}};
// CU-02|RF-02|E12 crearTarea()
exports.crearTarea=async(req,res)=>{try{res.status(201).json(await svc.crear(req.body))}catch(e){res.status(400).json({error:e.message})}};
// CU-03|RF-03|E12 actualizarTarea()
exports.actualizarTarea=async(req,res)=>{try{res.json(await svc.actualizar(req.params.id,req.body))}catch(e){res.status(400).json({error:e.message})}};
// CU-04|RF-04|E12 eliminarTarea()
exports.eliminarTarea=async(req,res)=>{try{await svc.eliminar(req.params.id);res.json({mensaje:'Eliminada'})}catch(e){res.status(400).json({error:e.message})}};
