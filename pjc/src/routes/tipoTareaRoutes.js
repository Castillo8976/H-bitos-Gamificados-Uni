const r=require('express').Router(),c=require('../controllers/tipoTareaController');
r.get('/',c.listarTipos);r.post('/',c.crearTipo);module.exports=r;
