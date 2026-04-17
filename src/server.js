require('dotenv').config();
const app=require('./app');
app.listen(process.env.PORT||3000,()=>console.log('Servidor en http://localhost:'+(process.env.PORT||3000)));
