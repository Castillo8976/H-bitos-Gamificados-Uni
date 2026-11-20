# Despliegue de la demo en Render (plan gratuito)

1. Suba la rama `deploy/demo-docente` a GitHub y, en Render, elija **New → Blueprint** con ese repositorio (usa `render.yaml`).
2. Cuando Render lo pida, escriba las tres contraseñas de la demo: `DEMO_ADMIN_PASSWORD`, `DEMO_REVISOR_PASSWORD` y `DEMO_STUDENT_PASSWORD` (mínimo 8 caracteres). No se guardan en Git.
3. Espere el primer despliegue y abra `https://<servicio>.onrender.com`.
4. Cuentas ficticias: `admin@studyquest.demo`, `revisor@studyquest.demo`, `estudiante@studyquest.demo`.

Notas:
- La base es `/tmp/studyquest-demo.sqlite`: efímera, independiente de `database.sqlite`, y se recrea y resiembra en cada arranque (el servicio gratuito se duerme tras 15 min sin uso; la primera petición tarda cerca de un minuto).
- Render gratuito bloquea el SMTP saliente, por eso la verificación por correo y el segundo factor están desactivados (`AUTH_EMAIL_VERIFICATION=false`, `AUTH_EMAIL_MFA=off`). El acceso es por contraseña con token JWT firmado con un `JWT_SECRET` que genera Render.
- Prueba local: `DATABASE_STORAGE=/tmp/demo.sqlite DEMO_ADMIN_PASSWORD=... DEMO_REVISOR_PASSWORD=... DEMO_STUDENT_PASSWORD=... node scripts/seed-demo.js && HOST=0.0.0.0 node src/server.js`.
