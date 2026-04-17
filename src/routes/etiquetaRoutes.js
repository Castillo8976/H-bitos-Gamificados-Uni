const r=require('express').Router(),c=require('../controllers/etiquetaController');
r.get('/',c.listarEtiquetas);r.post('/',c.crearEtiqueta);module.exports=r;
