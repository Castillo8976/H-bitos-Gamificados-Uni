const r=require('express').Router(),c=require('../controllers/nivelController');
r.get('/',c.listarNiveles);r.post('/',c.crearNivel);module.exports=r;
