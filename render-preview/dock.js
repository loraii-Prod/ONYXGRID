const $=id=>document.getElementById(id), names=['starting','live','casters','interview','chatting','game','break','ending'];let config={},socket=null,ready=false,pending=new Map(),seq=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const log=s=>{$('status').textContent=s;$('log').textContent=(new Date().toLocaleTimeString()+' '+s+'\n'+$('log').textContent).slice(0,5000)};
async function api(url,obj){let r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});let data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data}
async function load(){config=await(await fetch('/api/config')).json();for(let k of ['event','stage','subtitle','mainUrl'])$(k).value=config[k]||'';$('motion').checked=config.motion!==false;loadStudio();document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===(config.displayMode||'square-fill')));$('players').innerHTML=config.players.map((p,i)=>`<div class="playerrow"><label>Player ${i+1}<input id="name${i}" value="${esc(p.name)}"></label><label>Platform<select id="platform${i}"><option value="twitch" ${p.platform==='twitch'?'selected':''}>Twitch</option><option value="youtube" ${p.platform==='youtube'?'selected':''}>YouTube</option><option value="direct" ${p.platform==='direct'?'selected':''}>Direct embed</option></select></label><label class="wide">Paste Twitch / YouTube link<input id="channel${i}" value="${esc(p.channel)}" placeholder="https://www.twitch.tv/... or https://www.youtube.com/watch?v=..."><small class="embedstatus" id="embed${i}">Waiting for link</small><div class="playeractions"><button type="button" class="ghost" data-test="${i}">TEST PLAYER</button><button type="button" class="ghost" data-clear="${i}">CLEAR</button></div></label></div>`).join('');$('scenes').innerHTML=names.map(n=>`<button class="ghost" data-scene="${n}">${n.toUpperCase()}</button>`).join('');document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>switchScene(b.dataset.scene));$('focus').innerHTML=config.players.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('');$('focus').value=config.focusIndex||0;wireFeeds();setInterval(tick,300);tick()}
function tick(){let n=config.timerRunning?Math.max(0,Math.ceil((config.timerEnd-Date.now())/1000)):config.timerRemaining||0;$('timerread').textContent=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
async function save(){for(let k of ['event','stage','subtitle','mainUrl'])config[k]=$(k).value;config.motion=$('motion').checked;readStudio();config.displayMode=document.querySelector('[data-mode].active')?.dataset.mode||'square-fill';config.focusIndex=Number($('focus').value)||0;config.players=config.players.map((p,i)=>({name:$('name'+i).value,platform:$('platform'+i).value,channel:$('channel'+i).value}));config=(await api('/api/config',config)).config;log('Configuration saved');return config}
$('save').onclick=()=>save().catch(e=>log(e.message));$('focus').onchange=()=>save().catch(e=>log(e.message));$('preview').onclick=()=>window.open('/overlay.html?scene=live','_blank');$('previewStart').onclick=()=>window.open('/overlay.html?scene=starting','_blank');
async function timer(action){try{config=(await api('/api/timer',{action,seconds:Number($('minutes').value)*60})).config;tick();log('Timer '+action)}catch(e){log(e.message)}}$('timerReset').onclick=()=>timer('reset');$('timerStart').onclick=()=>timer('start');$('timerPause').onclick=()=>timer('pause');
async function sha(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}function b64(a){return btoa(String.fromCharCode(...a))}async function auth(p,s,c){return b64(await sha(b64(await sha(p+s))+c))}
function req(type,requestData={}){return new Promise((resolve,reject)=>{if(!ready)return reject(Error('OBS not connected'));let id='onyx-'+(++seq);let timeout=setTimeout(()=>{pending.delete(id);reject(Error(type+' timed out'))},8000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({op:6,d:{requestType:type,requestId:id,requestData}}))})}
$('connect').onclick=()=>{try{if(socket)socket.close();ready=false;socket=new WebSocket($('wsurl').value);socket.onmessage=async e=>{let m=JSON.parse(e.data);if(m.op===0){let d={rpcVersion:1};if(m.d.authentication)d.authentication=await auth($('password').value,m.d.authentication.salt,m.d.authentication.challenge);socket.send(JSON.stringify({op:1,d}))}if(m.op===2){ready=true;log('OBS connected · scene-specific transitions ready')}if(m.op===7){let p=pending.get(m.d.requestId);if(p){clearTimeout(p.timeout);pending.delete(m.d.requestId);m.d.requestStatus?.result?p.resolve(m.d.responseData||{}):p.reject(Error(m.d.requestStatus?.comment||'OBS request failed'))}}};socket.onclose=()=>{ready=false;log('OBS disconnected')};socket.onerror=()=>log('OBS connection error')}catch(e){log(e.message)}};
// Native OBS transition applies to all scene changes, including compact director and manual OBS switching.
async function configureSceneTransition(){
  const transitions=(await req('GetSceneTransitionList')).transitions||[];
  const fade=transitions.find(t=>t.transitionName==='Fade');
  if(!fade)throw Error('OBS Fade transition is unavailable');
  await req('SetCurrentSceneTransition',{transitionName:'Fade'});
  await req('SetCurrentSceneTransitionDuration',{transitionDuration:650});
  log('OBS scene transition: Fade · 650 ms');
}
async function switchScene(name){try{await save();await OnyxTransitions.take(req,'ONYX '+name.toUpperCase());log('On air: ONYX '+name.toUpperCase())}catch(e){log(e.message)}}
$('build').onclick=async()=>{try{await save();if(!ready)throw Error('Connect OBS first');let existing=(await req('GetSceneList')).scenes.map(s=>s.sceneName);for(let name of names){let sceneName='ONYX '+name.toUpperCase();if(!existing.includes(sceneName)){await req('CreateScene',{sceneName});log('Created '+sceneName)}let items=(await req('GetSceneItemList',{sceneName})).sceneItems;let inputName='ONYX PAGE '+name.toUpperCase();let url='http://127.0.0.1:48917/overlay.html?scene='+name;let present=items.find(i=>i.sourceName===inputName);if(!present){let inputList=(await req('GetInputList')).inputs;let inputExists=inputList.some(i=>i.inputName===inputName);if(!inputExists){await req('CreateInput',{sceneName,inputName,inputKind:'browser_source',inputSettings:{url,width:1920,height:1080,reroute_audio:true,shutdown:false,css:''},sceneItemEnabled:true})}else{await req('CreateSceneItem',{sceneName,sourceName:inputName,sceneItemEnabled:true})}}await req('SetInputSettings',{inputName,inputSettings:{url,width:1920,height:1080,reroute_audio:true},overlay:true});let sceneItems=(await req('GetSceneItemList',{sceneName})).sceneItems;let item=sceneItems.find(i=>i.sourceName===inputName);if(item)await req('SetSceneItemTransform',{sceneName,sceneItemId:item.sceneItemId,sceneItemTransform:{positionX:0,positionY:0,scaleX:1,scaleY:1,rotation:0}});if(name==='game'){
  const gameSource='ONYX LOCAL GAME CAPTURE';
  const sources=(await req('GetInputList')).inputs;
  if(!sources.some(x=>x.inputName===gameSource)){
    try{await req('CreateInput',{sceneName,inputName:gameSource,inputKind:'game_capture',inputSettings:{capture_mode:'any_fullscreen',capture_cursor:false},sceneItemEnabled:true});log('Created local game capture — configure game/window in OBS')}
    catch(err){log('Game capture needs manual setup: '+err.message)}
  }else{
    const gameItems=(await req('GetSceneItemList',{sceneName})).sceneItems;
    if(!gameItems.some(x=>x.sourceName===gameSource)){
      try{await req('CreateSceneItem',{sceneName,sourceName:gameSource,sceneItemEnabled:true})}catch(err){log('Could not add game capture: '+err.message)}
    }
  }
  // OBS scene item order: lower index is on top. Keep branding browser above capture.
  const gameItems=(await req('GetSceneItemList',{sceneName})).sceneItems;
  const overlayItem=gameItems.find(x=>x.sourceName===inputName);
  const captureItem=gameItems.find(x=>x.sourceName===gameSource);
  if(captureItem)await req('SetSceneItemTransform',{sceneName,sceneItemId:captureItem.sceneItemId,sceneItemTransform:{positionX:0,positionY:0,scaleX:1,scaleY:1,rotation:0}});
  if(overlayItem){try{await req('SetSceneItemIndex',{sceneName,sceneItemId:overlayItem.sceneItemId,sceneItemIndex:0})}catch(err){log('Check overlay layer order in OBS: '+err.message)}}
}log('Updated '+sceneName)}log('BUILD COMPLETE · 8 ONYX scenes ready (LIVE uses team POVs; GAME uses your local OBS capture). Review in OBS before going live.')}catch(e){log('Builder stopped: '+e.message)}};load().catch(e=>log(e.message));

// ONYX / GRID 2.1 — in-dashboard link converter and preview
function parseFeed(raw){
  let text=String(raw||'').trim();if(!text)return {platform:'',url:'',status:'NO SOURCE'};
  const parent=location.hostname||'127.0.0.1';
  if(/^(?:https?:\/\/)?(?:www\.)?(?:m\.)?twitch\.tv\//i.test(text)||/^[a-zA-Z0-9_]{2,25}$/.test(text)){
    const channel=text.replace(/^https?:\/\//i,'').replace(/^(?:www\.|m\.)?twitch\.tv\//i,'').split(/[/?#]/)[0].replace(/^@/,'');
    if(!/^[a-zA-Z0-9_]{2,25}$/.test(channel))return {platform:'twitch',url:'',status:'INVALID TWITCH CHANNEL'};
    return {platform:'twitch',url:'https://player.twitch.tv/?channel='+encodeURIComponent(channel)+'&parent='+encodeURIComponent(parent)+'&muted=true&autoplay=true',status:'TWITCH / READY'};
  }
  let match=text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?[^#]*?v=|live\/|embed\/|shorts\/))([\w-]{11})/i);
  if(!match&&/^[\w-]{11}$/.test(text))match=[text,text];
  if(match)return {platform:'youtube',url:'https://www.youtube.com/embed/'+match[1]+'?autoplay=1&mute=1&playsinline=1&rel=0',status:'YOUTUBE / READY'};
  return {platform:'',url:'',status:'UNSUPPORTED LINK — use a Twitch channel or YouTube video URL'};
}
function wireFeeds(){
 for(let i=0;i<3;i++){
  const input=$('channel'+i),status=$('embed'+i),platform=$('platform'+i);
  const update=()=>{const d=parseFeed(input.value);status.textContent=d.url?d.status+'  •  '+d.url:d.status;status.classList.toggle('valid',!!d.url);if(d.platform)platform.value=d.platform};
  input.addEventListener('input',update);update();
  document.querySelector('[data-test="'+i+'"]').onclick=()=>{let d=parseFeed(input.value);if(d.url)window.open(d.url,'_blank');else log(d.status)};
  document.querySelector('[data-clear="'+i+'"]').onclick=()=>{input.value='';update()};
 }
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));save().catch(e=>log(e.message))});


// ONYX / GRID 2.3 — SOLO WATCH PARTY DIRECTOR
async function directPOV(which) {
  const full=String(which).startsWith('full-');
  const index=which==='multi'?null:Number(full?String(which).slice(5):which);
  try {
    if(index!==null){
      $('focus').value=String(index);
      config.focusIndex=index;
    }
    await save();
    const target='live';
    config.liveMode=index===null?'multiview':full?'fullscreen':'focus';
    await api('/api/config',config);
    if(ready){
      await OnyxTransitions.take(req,'ONYX '+target.toUpperCase());
      log('LIVE POV: '+(index===null?'ALL THREE':config.players[index].name));
    }else{
      log('POV selection saved. Connect OBS for automatic live scene switching.');
    }
    document.querySelectorAll('[data-director]').forEach(b=>b.classList.toggle('active',b.dataset.director===String(which)));
    $('directorStatus').textContent=index===null?'ALL THREE / MULTIVIEW':config.players[index].name+(full?' / FULLSCREEN':' / FOCUS');
  }catch(e){log('POV switch failed: '+e.message)}
}
document.querySelectorAll('[data-director]').forEach(b=>b.addEventListener('click',()=>directPOV(b.dataset.director)));
document.addEventListener('keydown',e=>{
  if(e.altKey&&!e.ctrlKey&&!e.metaKey&&['1','2','3','4','5','6','7'].includes(e.key)){
    e.preventDefault();directPOV(e.key==='4'?'multi':Number(e.key)>=5?'full-'+String(Number(e.key)-5):String(Number(e.key)-1));
  }
});
$('openCompact').onclick=()=>window.open('/director.html','ONYX Director','width=530,height=620');

// Studio editor (separate from POV players; updating it never reloads ONYX LIVE)
function loadStudio(){const st=config.studio||{};$('casterCount').value=String(st.casterCount||1);for(let i=0;i<3;i++){ $('casterName'+i).value=st.casters?.[i]?.name||'';$('casterRole'+i).value=st.casters?.[i]?.role||'';}for(const k of ['interviewer','interviewerRole','guest','guestRole','guest2','guest2Role','topic','chatLabel'])$(k).value=st[k]||''}
function readStudio(){const st=config.studio||{};st.casterCount=Number($('casterCount').value)||1;st.casters=Array.from({length:3},(_,i)=>({name:$('casterName'+i).value,role:$('casterRole'+i).value}));for(const k of ['interviewer','interviewerRole','guest','guestRole','guest2','guest2Role','topic','chatLabel'])st[k]=$(k).value;config.studio=st}
$('saveStudio').onclick=()=>save().catch(e=>log(e.message));$('previewStudio').onclick=()=>window.open('/overlay.html?scene=casters','_blank');
