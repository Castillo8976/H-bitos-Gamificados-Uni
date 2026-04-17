const r=require('express').Router(),c=require('../controllers/tareaController');
r.get('/',c.listarTareas);r.post('/',c.crearTarea);r.put('/:id',c.actualizarTarea);r.delete('/:id',c.eliminarTarea);
module.exports=r;
