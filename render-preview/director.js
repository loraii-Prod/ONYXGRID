const status=document.getElementById('status');
async function sha(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
function b64(a){return btoa(String.fromCharCode(...a))}
async function auth(p,s,c){return b64(await sha(b64(await sha(p+s))+c))}
async function obsSwitch(scene){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket('ws://127.0.0.1:4455');let timeout=setTimeout(()=>{ws.close();reject(Error('OBS connection timed out'))},6500);
  ws.onerror=()=>{clearTimeout(timeout);reject(Error('Connect OBS WebSocket (Tools → WebSocket Server Settings)'))};
  ws.onmessage=async e=>{try{const m=JSON.parse(e.data);
   if(m.op===0){let d={rpcVersion:1};if(m.d.authentication)d.authentication=await auth(document.getElementById('password').value,m.d.authentication.salt,m.d.authentication.challenge);ws.send(JSON.stringify({op:1,d}))}
   if(m.op===2)ws.send(JSON.stringify({op:6,d:{requestType:'SetCurrentProgramScene',requestId:'switch',requestData:{sceneName:'ONYX '+scene.toUpperCase()}}}));
   if(m.op===7){clearTimeout(timeout);ws.close();m.d.requestStatus?.result?resolve():reject(Error(m.d.requestStatus?.comment||'Scene switch failed'))}
  }catch(err){clearTimeout(timeout);ws.close();reject(err)}};
 });
}
async function choose(which){
 try{
  const c=await(await fetch('/api/config',{cache:'no-store'})).json();
  const full=String(which).startsWith('full-');
  const idx=full?Number(String(which).slice(5)):Number(which);
  if(which!=='multi')c.focusIndex=idx;
  c.liveMode=which==='multi'?'multiview':full?'fullscreen':'focus';
  const r=await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)});
  if(!r.ok)throw Error('Could not save focus');
  await obsSwitch('live');
  document.querySelectorAll('[data-i]').forEach(b=>b.classList.toggle('active',b.dataset.i===String(which)));
  status.textContent='ON AIR: '+(which==='multi'?'ALL THREE':c.players[idx].name+(full?' / FULLSCREEN':' / FOCUS'));
 }catch(e){status.textContent='ERROR: '+e.message}
}
document.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>choose(b.dataset.i));
document.addEventListener('keydown',e=>{if(e.altKey&&['1','2','3','4','5','6','7'].includes(e.key)){e.preventDefault();choose(e.key==='4'?'multi':Number(e.key)>=5?'full-'+String(Number(e.key)-5):String(Number(e.key)-1))}});
