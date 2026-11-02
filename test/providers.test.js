import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviders } from '../src/providers.js';
const response=data=>new Response(JSON.stringify(data),{status:200});
const input={model:'kling',videoUrl:'https://media.example.com/a.mp4',imageUrls:['https://media.example.com/a.png'],prompt:'',resolution:null};
test('fal polling uses owner/app routes and validates output',async()=>{
  const calls=[];
  const p=createProviders({FAL_KEY:'test-placeholder'},async(url,opts)=>{calls.push({url,opts});return response(calls.length===1?{status:'COMPLETED'}:{video:{url:'https://media.example.com/output.mp4'}});});
  const result=await p.poll({input,providerId:'request-1'});
  assert.equal(result.status,'completed');
  assert.equal(calls[0].url,'https://queue.fal.run/fal-ai/kling-video/requests/request-1/status');
  assert.equal(calls[0].opts.redirect,'error');
});
test('keys and upstream error bodies never enter client-visible errors',async()=>{
  const p=createProviders({FAL_KEY:'test-placeholder'},async()=>new Response('private provider response',{status:401}));
  await assert.rejects(()=>p.submit(input,'test'),e=>!e.message.includes('private')&&e.definitive===true&&e.message.includes('401'));
  assert.ok(!JSON.stringify(p.catalog()).includes('test-placeholder'));
});
test('unknown submission outcomes are distinct from definitive rejections',async()=>{
  const p=createProviders({FAL_KEY:'test-placeholder'},async()=>{throw new Error('private connection info');});
  await assert.rejects(()=>p.submit(input,'test'),e=>!e.definitive&&!e.message.includes('private'));
});
test('Alibaba uses task_id rather than tracing request_id',async()=>{
  const calls=[];
  const p=createProviders({DASHSCOPE_API_KEY:'test-placeholder',ALIBABA_API_BASE:'https://example.cn-beijing.maas.aliyuncs.com'},async(url,opts)=>{calls.push({url,opts});return response({request_id:'trace-1',output:{task_id:'task-1'}});});
  assert.equal(await p.submit({...input,model:'wan3',recipe:'raw',resolution:'720p'},'test'),'task-1');
  assert.equal(calls[0].opts.headers['X-DashScope-Async'],'enable');
});
test('Alibaba terminal and expired statuses are normalized',async()=>{
  for(const [s,expected] of [['PENDING','queued'],['RUNNING','running'],['SUCCEEDED','completed'],['FAILED','failed'],['UNKNOWN','failed']]){
    const p=createProviders({DASHSCOPE_API_KEY:'test-placeholder',ALIBABA_API_BASE:'https://example.cn-beijing.maas.aliyuncs.com'},async()=>response({output:{task_status:s,video_url:'https://media.example.com/o.mp4'}}));
    assert.equal((await p.poll({input:{...input,model:'wan3'},providerId:'task-1'})).status,expected);
  }
});
test('custom adapter supports authenticated local service without arbitrary browser endpoints',async()=>{
  let sent;
  const p=createProviders({CUSTOM_API_URL:'http://127.0.0.1:8188/api',CUSTOM_API_KEY:'test-placeholder'},async(url,opts)=>{sent={url,opts};return response({id:'own-job'});});
  assert.equal(await p.submit({...input,model:'custom'},'same-key'),'own-job');
  assert.equal(sent.url,'http://127.0.0.1:8188/api/jobs'); assert.equal(sent.opts.headers['Idempotency-Key'],'same-key');
  assert.throws(()=>createProviders({CUSTOM_API_URL:'http://external.example.com'}));
  assert.throws(()=>createProviders({ALIBABA_API_BASE:'https://malicious.example.com'}));
});
test('request identifiers cannot redirect polling to another destination',async()=>{
  const p=createProviders({FAL_KEY:'test-placeholder'},async()=>{throw new Error('must not fetch');});
  await assert.rejects(()=>p.poll({input,providerId:'../../anything'}),/valid request ID/);
});
