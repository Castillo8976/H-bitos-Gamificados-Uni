module.exports=(fields)=>(req,res,next)=>{const m=fields.filter(f=>!req.body[f]);if(m.length)return res.status(400).json({error:`Campos requeridos: ${m.join(', ')}`});next();};
