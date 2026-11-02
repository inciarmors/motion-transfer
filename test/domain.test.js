import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, providerPayload, publicMediaUrl, compilePrompt } from '../src/domain.js';
const base = { model:'wan3', videoUrl:'https://media.example.com/source.mp4', imageUrls:['https://media.example.com/character.png'], prompt:'Replace the main actor.', duration:8, resolution:'720p' };
test('rejects local, credential-bearing and executable media URLs',()=>{
  for(const url of ['http://example.com/a','https://127.0.0.1/a','https://[::1]/a','https://user@example.com/a','https://localhost/a','https://x.local/a','https://example.com:444/a','javascript:alert(1)','https://2130706433/a']) assert.throws(()=>publicMediaUrl(url));
});
test('password-bearing URLs are rejected',()=>{const u=new URL('https://example.com/a');u.username='fixture';u.password='fixture';assert.throws(()=>publicMediaUrl(u.href));});
test('Wan 3 requires known duration and respects its 15-second reference limit',()=>{
  assert.throws(()=>validateInput({...base,duration:16}));
  assert.throws(()=>validateInput({...base,duration:null}));
  assert.throws(()=>validateInput({...base,duration:'8'}));
  assert.equal(validateInput(base).duration,8);
});
test('provider limits are enforced independently of website limits',()=>{
  assert.throws(()=>validateInput({...base,model:'genjutsu',imageUrls:Array(9).fill(base.imageUrls[0])}));
  assert.throws(()=>validateInput({...base,model:'kling',imageUrls:Array(2).fill(base.imageUrls[0])}));
  assert.throws(()=>validateInput({...base,model:'wan-move'}));
  assert.throws(()=>validateInput({...base,resolution:'4k'}));
});
test('prompt harness is explicit, versionable and can be disabled for a raw baseline',()=>{
  const raw=validateInput(base), harness=validateInput({...base,recipe:'motion-transfer'});
  assert.equal(compilePrompt(raw),base.prompt);
  assert.match(compilePrompt(harness),/camera trajectory/);
  const p=providerPayload(harness);
  assert.equal(p.model,'wan3.0-video'); assert.equal(p.input.media[0].type,'reference_video');
  assert.equal(p.parameters.prompt_extend,false); assert.equal(p.parameters.duration,-1);
});
test('provider payload does not send unsupported fields',()=>{
  const input=validateInput({...base,model:'kling',recipe:'raw'}), p=providerPayload(input);
  assert.equal(p.character_orientation,'video'); assert.equal(p.resolution,undefined); assert.equal(p.recipe,undefined);
  const g=providerPayload(validateInput({...base,model:'genjutsu'}));
  assert.deepEqual(Object.keys(g).sort(),['video_url','image_urls','prompt','resolution'].sort());
});
