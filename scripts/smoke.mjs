import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3131','--hostname','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
try{
 for(let i=0;i<100&&!output.includes('Ready');i++){if(server.exitCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,100))}
 assert.match(output,/Ready/);
 for(const path of ['/','/auth','/auth/reset','/studio-ai','/integrazioni']){const r=await fetch('http://127.0.0.1:3131'+path);assert.equal(r.status,200,path);console.log('PASS page',path)}
 for(const [path,method]of [['/api/integration-status','GET'],['/api/generate-copy','POST'],['/api/lead-finder','POST']]){const r=await fetch('http://127.0.0.1:3131'+path,{method,headers:{'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});assert.equal(r.status,401,path);const body=await r.json();assert.ok(body.error);console.log('PASS anonymous request rejected',path)}
 const status=await fetch('http://127.0.0.1:3131/api/integration-status',{headers:{Authorization:'Bearer invalid-token'}});assert.equal(status.status,401);console.log('PASS invalid session rejected');
}finally{server.kill('SIGTERM')}
