import { spawn } from 'child_process';

const children = [
  spawn('npx',['tsx','server.ts'],{stdio:'inherit',shell:true}),
  spawn('npx',['tsx','admin-server.ts'],{stdio:'inherit',shell:true}),
];
const stop=()=>children.forEach(c=>c.kill('SIGTERM'));
process.on('SIGINT',()=>{stop();process.exit(0)});
process.on('SIGTERM',()=>{stop();process.exit(0)});
