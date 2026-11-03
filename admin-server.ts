import express from 'express';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.ADMIN_PORT || 3001);

async function start(){
  const vite = await createViteServer({ server:{middlewareMode:true}, appType:'mpa' });
  app.get('/', (_req,res)=>res.redirect('/admin.html'));
  app.use(vite.middlewares);
  app.listen(PORT,'0.0.0.0',()=>console.log(`EventSphere Admin running on http://localhost:${PORT}`));
}
start();
