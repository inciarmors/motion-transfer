import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { request } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/server.js';
import { createStore } from '../src/store.js';
const input={model:'kling',videoUrl:'https://media.example.com/a.mp4',imageUrls:['https://media.example.com/a.png'],prompt:''};
async function fixture(t,override={}){
  const directory=mkdtempSync(join(tmpdir(),'motion-test-'));let submissions=0;
  const providers={catalog:()=>[{id:'kling',configured:true}],submit:async()=>{submissions++;return 'provider-1';},poll:async()=>({status:'completed',outputUrl:'https://media.example.com/o.mp4'}),...override};
  const server=createApp({directory,providers});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));rmSync(directory,{recursive:true,force:true});});
  return {url:`http://127.0.0.1:${server.address().port}`,directory,submissions:()=>submissions};
}
const post=(url,body,key=randomUUID(),headers={})=>fetch(`${url}/api/jobs`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key,...headers},body:JSON.stringify(body)});
test('submit, persist, poll and deduplicate even concurrent submissions',async t=>{
  const f=await fixture(t),key=randomUUID();
  const responses=await Promise.all([post(f.url,input,key),post(f.url,input,key)]);
  const [a,b]=await Promise.all(responses.map(r=>r.json()));
  assert.equal(a.id,b.id);assert.equal(f.submissions(),1);
  const polled=await(await fetch(`${f.url}/api/jobs/${a.id}`)).json();assert.equal(polled.status,'completed');
  assert.equal((statSync(join(f.directory,'jobs.json')).mode&0o777),0o600);
  assert.equal((await post(f.url,{...input,prompt:'different'},key)).status,409);
});
test('cross-origin, DNS rebinding and non-JSON writes are rejected',async t=>{
  const f=await fixture(t);
  assert.equal((await post(f.url,input,randomUUID(),{Origin:'https://evil.example.com'})).status,403);
  const badHostStatus = await new Promise((resolve,reject)=>{
    const r=request(f.url+'/api/models',{headers:{Host:'evil.example.com'}},response=>{response.resume();resolve(response.statusCode);});
    r.on('error',reject);r.end();
  });
  assert.equal(badHostStatus,403);
  assert.equal((await post(f.url,input,randomUUID(),{'Content-Type':'text/plain'})).status,415);
  assert.equal(f.submissions(),0);
});
test('secrets, journals and captures are not served by the static server',async t=>{
  const f=await fixture(t);
  for(const p of ['/.env','/.git/config','/.data/jobs.json','/captures/session.har'])assert.equal((await fetch(f.url+p)).status,404);
  assert.equal((await fetch(`${f.url}/`)).headers.get('referrer-policy'),'no-referrer');
});
test('a timed-out submit is persisted as unknown and never automatically retried',async t=>{
  let calls=0;const f=await fixture(t,{submit:async()=>{calls++;throw new Error('private error');}}),key=randomUUID();
  const j=await(await post(f.url,input,key)).json();assert.equal(j.status,'submission_unknown');assert.ok(!j.error.includes('private'));
  await post(f.url,input,key);assert.equal(calls,1);
});
test('recovery marks interrupted submissions unknown instead of resending them',()=>{
  const dir=mkdtempSync(join(tmpdir(),'motion-store-'));
  try{const store=createStore(dir);store.jobs.push({id:'local-id',status:'submitting'});store.save();assert.equal(createStore(dir).jobs[0].status,'submission_unknown');}
  finally{rmSync(dir,{recursive:true,force:true});}
});
test('upload validates content bytes before contacting storage',async t=>{
  let calls=0;const f=await fixture(t,{upload:async()=>{calls++;return 'https://media.example.com/a.png';}});
  const r=await fetch(`${f.url}/api/uploads`,{method:'POST',headers:{'Content-Type':'image/png'},body:'<html>not an image</html>'});
  assert.equal(r.status,400);assert.equal(calls,0);
});
test('preview works without a key or submission',async t=>{
  const f=await fixture(t,{catalog:()=>[{id:'kling',configured:false}]});
  const r=await fetch(`${f.url}/api/preview`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  assert.equal(r.status,200);assert.equal(f.submissions(),0);assert.equal((await post(f.url,input)).status,503);
});
