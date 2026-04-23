const r=require('express').Router(),c=require('../controllers/estudianteController');
r.get('/',c.listarEstudiantes);module.exports=r;
