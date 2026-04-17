const r=require('express').Router(),c=require('../controllers/notificacionController');
r.get('/:id',c.listarNotificaciones);module.exports=r;
