// ONYX GRID 5.8 OBS browser refresh + larger focus thumbnails
const params=new URLSearchParams(location.search),scene=(params.get('scene')||'starting').toLowerCase(),root=document.getElementById('root');let previous='',timerText='';let lastLiveLayout=null,liveSwitchTimer=null;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function embed(p){
  let ch=String(p.channel||'').trim(); if(!ch)return '';
  const host=location.hostname || '127.0.0.1';
  let platform=String(p.platform||'').toLowerCase();
  if(/(?:^|\.)twitch\.tv\//i.test(ch))platform='twitch';
  if(/(?:youtu\.be\/|youtube\.com\/)/i.test(ch))platform='youtube';
  if(platform==='twitch'){
    ch=ch.replace(/^https?:\/\//i,'').replace(/^(?:www\.)?twitch\.tv\//i,'').split(/[/?#]/)[0].replace(/^@/,'');
    if(!/^[a-zA-Z0-9_]{2,25}$/.test(ch))return '';
    return 'https://player.twitch.tv/?channel='+encodeURIComponent(ch)+'&parent='+encodeURIComponent(host)+'&autoplay=true&muted=true';
  }
  if(platform==='youtube'){
    let id=ch.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*?&)?v=|live\/|embed\/|shorts\/))([\w-]{11})/);
    if(!id && /^[\w-]{11}$/.test(ch))id=[ch,ch];
    return id?'https://www.youtube.com/embed/'+id[1]+'?autoplay=1&mute=1&playsinline=1&rel=0':'';
  }
  return /^https:\/\//.test(ch)?ch:'';
}
function feed(p,i){let url=embed(p);return `<article class="feed" data-slot="${i}" data-url="${esc(url)}"><div class="feedinner">${url?`<iframe src="${esc(url)}" allow="autoplay; encrypted-media; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`:`<div class="offline"><span class="o-mark"><img src="/assets/onyx-emblem.png" alt=""></span><span>FEED NOT ASSIGNED</span></div>`}</div><div class="feedlabel"><span class="feedindex">0${i+1}</span><span>${esc(p.name)}</span></div></article>`}
function emblem(){return `<img class="onyx-symbol-img" src="/assets/onyx-emblem.png" alt="ONYX emblem">`}
function broadcastHeader(c,detail){return `<div class="broadcasttop"><img class="onyx-logo onyx-logo-header" src="/assets/onyx-wordmark-transparent.png" alt="ONYX"><div class="topdetail">${esc(detail||c.stage)}</div></div>`}
function stage(c){return `<div class="meta"><span>${esc(c.event)}</span><span class="meta-rule"></span><span>${esc(c.stage)}</span></div>`}
function hero(c,kind){
 const event=esc(c.event),stageName=esc(c.stage);
 const header=`<header class="nx-header"><div class="nx-logo"><img src="/assets/onyx-wordmark-transparent.png" alt="ONYX"></div><div class="nx-header-meta">${event} <span>/</span> ${stageName}</div><div class="nx-live-mark"><i></i> ONYX GRID / BROADCAST</div></header>`;
 if(kind==='starting')return `<section class="nx-screen nx-starting"><div class="nx-noise"></div><div class="nx-hero-emblem"><img src="/assets/onyx-emblem.png" alt=""></div>${header}<div class="nx-start-index">01 / PRE-SHOW TRANSMISSION</div><main class="nx-start-main"><div class="nx-eyebrow">THE BROADCAST IS ABOUT TO BEGIN</div><h1>STARTING<span>SOON<span class="nx-dot">.</span></span></h1><div class="nx-start-line"></div><p>THE GRID IS WARMING UP <span>↗</span></p></main><footer class="nx-footer"><div>ONYX / GRID <small>INDEPENDENT TEAMCAST</small></div><div class="nx-start-ticker">BLACK <b>—</b> WHITE <b>—</b> ACADEMY</div><div class="nx-clock"><small>LIVE IN</small><strong id="clock">00:00</strong></div></footer></section>`;
 if(kind==='break')return `<section class="nx-screen nx-break"><div class="nx-break-stripes"></div>${header}<div class="nx-break-side">TRANSMISSION PAUSED / 02</div><main class="nx-break-main"><div class="nx-break-indicator"><span></span> SIGNAL HOLD / TEMPORARY</div><div class="nx-break-frame"><div class="nx-break-small">DON'T GO ANYWHERE</div><h1>BE RIGHT<br><em>BACK</em><span>.</span></h1><div class="nx-break-under">THE SHOW CONTINUES SHORTLY <b>↗</b></div></div></main><aside class="nx-break-panel"><div class="nx-panel-top">GRID STATUS <i></i> STANDBY</div><img src="/assets/onyx-emblem.png" alt=""><div class="nx-panel-bottom">RETURNING TO THE BROADCAST</div><div class="nx-panel-clock"><small>RETURNING IN</small><strong id="clock">00:00</strong></div></aside><footer class="nx-break-footer"><span>ONYX / GRID</span><span>${stageName}</span><span>HOLDING SIGNAL — PLEASE STAND BY</span></footer></section>`;
 return `<section class="nx-screen nx-ending"><div class="nx-ending-halo"></div>${header}<div class="nx-end-number">03 / END OF TRANSMISSION</div><main class="nx-ending-main"><div class="nx-end-eyebrow">THE BROADCAST HAS CONCLUDED</div><h1>THANKS FOR<br><span>WATCHING.</span></h1><div class="nx-end-line"></div><p>SEE YOU ON THE NEXT GRID.</p></main><div class="nx-end-monogram"><img src="/assets/onyx-emblem.png" alt=""></div><footer class="nx-ending-footer"><div>TRANSMISSION COMPLETE <strong>GG.</strong></div><div>${event} <span>/</span> ${stageName}</div><div>ONYX / GRID — SIGNING OFF</div></footer></section>`;
}
function studioShell(c,kind,content){return `<section class="studio-broadcast studio-${kind}"><div class="sb-grid"></div><div class="sb-arc"></div><div class="sb-watermark">GRID / ONYX</div><header class="sb-header"><div class="sb-brand"><img class="onyx-logo" src="/assets/onyx-wordmark-transparent.png" alt="ONYX"></div><div class="sb-section">${kind==='casters'?'CAST DESK':kind==='interview'?'THE INTERVIEW':'AFTER HOURS'} <b> / TEAMCAST</b></div><div class="sb-status"><i></i> ON AIR</div></header><div class="sb-content">${content}</div><footer class="sb-footer"><span>ONYX / GRID — INDEPENDENT TEAMCAST</span><span>${esc(c.event)} / ${esc(c.stage)}</span><span>ONYX / GRID — STUDIO</span></footer></section>`}
function studioPerson(name,role,index,extra='',cameraUrl=''){const camera=cameraUrl?`<iframe class="sb-camera-feed" src="${esc(cameraUrl)}" allow="autoplay; camera; microphone; fullscreen" referrerpolicy="no-referrer" title="Camera ${index}"></iframe>`:'';return `<article class="sb-person ${extra} ${cameraUrl?'has-camera':''}"><div class="sb-person-top"><span>0${index}</span><span class="sb-mic">${cameraUrl?'◉ &nbsp; CAMERA FEED':'◉ &nbsp; AUDIO ONLY'}</span></div><div class="sb-person-mark">${camera||`<img src="/assets/onyx-emblem.png" alt="">`}</div><div class="sb-person-bottom"><strong>${esc(name||'CASTER')}</strong><small>${esc(role||'COMMENTATOR')}</small></div><div class="sb-person-accent"></div></article>`}
function studioRender(c){const cams=window.onyxGuestCameras||[];const cam=(role,index)=>cams.filter(g=>g.role===role)[index]?.view||'';const st=c.studio||{};const casters=st.casters||[];const count=Math.max(1,Math.min(3,Number(st.casterCount)||1));if(scene==='casters'){const people=Array.from({length:count},(_,i)=>studioPerson(casters[i]?.name,casters[i]?.role,i+1,'',cam('casters',i))).join('');return studioShell(c,'casters',`<div class="sb-eyebrow">THE VOICES BEHIND THE RACE <span> / 0${count} ON MIC</span></div><div class="sb-title">CAST <em>DESK</em><span class="sb-title-period">.</span></div><div class="sb-people count-${count}">${people}</div>`)}if(scene==='interview'){const people=studioPerson(st.interviewer,st.interviewerRole,1,'sb-interviewer',cam('interview',0))+studioPerson(st.guest,st.guestRole,2,'sb-guest',cam('interview',1))+(st.guest2?.trim()?studioPerson(st.guest2,st.guest2Role,3,'sb-guest',cam('interview',2)):'');return studioShell(c,'interview',`<div class="sb-eyebrow">THE CONVERSATION / POST-MATCH</div><div class="sb-title sb-title-interview">INTERVIEW<span class="sb-title-period">.</span></div><div class="sb-people count-${st.guest2?.trim()?3:2}">${people}</div>`)}const people=Array.from({length:count},(_,i)=>studioPerson(casters[i]?.name,casters[i]?.role,i+1,'',cam('casters',i))).join('');return studioShell(c,'chatting',`<div class="sb-eyebrow">COMMUNITY / BEYOND THE RACE</div><div class="sb-title">JUST <em>CHATTING</em><span class="sb-title-period">.</span></div><div class="sb-chat-layout"><div class="sb-chat-left"><div class="sb-topic-kicker">TONIGHT'S TOPIC / 01</div><div class="sb-topic">${esc(st.topic||'POST-MATCH DISCUSSION')}</div><div class="sb-people count-${count}">${people}</div></div><aside class="sb-chat-panel"><div class="sb-chat-panel-top"><i></i> ${esc(st.chatLabel||'COMMUNITY / LIVE CHAT')}</div><div class="sb-chat-symbol"><img src="/assets/onyx-emblem.png" alt=""></div><div class="sb-chat-panel-foot">COMMUNITY CONVERSATION<br>CHAT SPACE / OPTIONAL</div></aside></div>`)}
function render(c){root.dataset.display=c.displayMode||"square-fill";root.className='overlay '+(c.motion?'motion':'still');let p=c.players||[];let html='';if(['starting','break','ending'].includes(scene))html=hero(c,scene);else if(scene==='legacy-multiview')html=`<div class="studio-multi-header">${broadcastHeader(c,'BLACK  /  WHITE  /  ACADEMY')}</div><main class="multigrid threefeeds">${p.map(feed).join('')}</main>${stage(c)}`;else if(scene==='legacy-focus'){let idx=Number(c.focusIndex)||0,others=p.map((x,i)=>({x,i})).filter(x=>x.i!==idx);html=`${broadcastHeader(c,'PLAYER FOCUS')}<main class="focusgrid"><div class="bigfeed">${feed(p[idx]||p[0],idx)}</div><div class="smallfeeds">${others.map(({x,i})=>feed(x,i)).join('')}</div></main>${stage(c)}`;}else if(scene==='legacy-main')html=`<main class="mainfeed">${feed({name:'OFFICIAL FEED',platform:'direct',channel:c.mainUrl},0)}</main><div class="mainbrand">ONYX <span>LIVE</span></div>`;else if(scene==='game')html=`<section class="local-game-scene"><div class="local-game-top"><img src="/assets/onyx-wordmark-transparent.png" alt="ONYX"><div class="local-game-live"><i></i> LOCAL GAME / ON AIR</div></div><div class="local-game-bottom"><span class="local-game-rule"></span><div class="local-game-footer"><span>${esc(c.event)} <b>/ ${esc(c.stage)}</b></span><span>ONYX / GRID</span></div></div></section>`;else if(['casters','interview','chatting'].includes(scene))html=studioRender(c);else if(scene==='results')html=`<section class="resultpage">${broadcastHeader(c,'MATCH RESULT')}<div class="resultbody"><div class="resulteyebrow">${esc(c.event)} / ${esc(c.stage)}</div><div class="resultplace">${esc(c.resultPlace)}</div><div class="resultline"></div><div class="resultdetail">${esc(c.resultDetail)}</div><div class="resultbrand"><img class="onyx-logo" src="/assets/onyx-wordmark-transparent.png" alt="ONYX"></div></div></section>`;root.innerHTML=html}
// Persistent LIVE: each iframe is created once and NEVER moved or replaced during POV changes.
function liveInit(c){
 root.innerHTML=`<div class="live-design" aria-hidden="true"><div class="live-design-grid"></div><div class="live-design-arc"></div><div class="live-design-word">ONYX</div><div class="live-design-slash"></div><div class="live-design-side">TEAMCAST / 2026 &nbsp; — &nbsp; GRID SYSTEM</div><div class="live-design-coordinates">48° / 02 &nbsp; // &nbsp; 03 CAMERAS</div></div><div class="live-heading"><div class="live-heading-brand"><img class="onyx-logo live-logo" src="/assets/onyx-wordmark-transparent.png" alt="ONYX"><small>TEAMCAST</small></div><div class="live-heading-right"><span class="live-heading-pulse"></span> WATCH PARTY <span class="live-heading-sep">/</span> TRACKMANIA <span class="live-heading-sep">/</span> 03 POV</div></div><main class="persistent-stage">${c.players.map((p,i)=>`<article class="persistent-feed" data-slot="${i}"><div class="persistent-video"></div><div class="feedlabel"><span class="feedindex">0${i+1}</span><span class="persistent-name">${esc(p.name)}</span></div></article>`).join('')}</main><div class="live-bottom"><span class="live-footer-brand">ONYX / GRID <b>2.9</b></span><span id="live-event"></span><span class="live-footer-teams">BLACK <i>/</i> WHITE <i>/</i> ACADEMY</span><button type="button" class="live-audio-status" title="Click to enable selected POV audio in OBS Interact">ALL POVS MUTED</button></div>`;
 liveScoreboard(c);
 const audioButton=root.querySelector('.live-audio-status');if(audioButton)audioButton.addEventListener('click',onyxEnableAudio);
}

// Audio-follow-video. Provider SDKs are required; cross-origin iframe DOM audio is inaccessible.
const onyxPlayers=new Map();
let onyxTwitchPromise=null,onyxYoutubePromise=null;
let onyxAudioUnlocked=false,onyxAudioLastKey="";
function onyxLoadScript(url,ready){return new Promise((resolve,reject)=>{
 if(ready()){resolve();return}
 const script=document.createElement('script');script.src=url;script.async=true;
 script.onload=()=>{if(ready())resolve();else reject(new Error('Player SDK did not initialize'))};
 script.onerror=()=>reject(new Error('Player SDK unavailable'));
 document.head.append(script);
})}
function onyxTwitchSDK(){return onyxTwitchPromise||(onyxTwitchPromise=onyxLoadScript('https://player.twitch.tv/js/embed/v1.js',()=>!!window.Twitch?.Player))}
function onyxYoutubeSDK(){return onyxYoutubePromise||(onyxYoutubePromise=new Promise((resolve,reject)=>{
 if(window.YT?.Player){resolve();return}
 const prior=window.onYouTubeIframeAPIReady;
 window.onYouTubeIframeAPIReady=()=>{if(typeof prior==='function')prior();resolve()};
 const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
 script.onerror=()=>reject(new Error('YouTube SDK unavailable'));
 document.head.append(script);
 }))}
function onyxAudioSync(mode,focus,force=false){
 const wanted=mode==='multiview'?-1:focus;
 let selected=null;
 for(const [index,item] of onyxPlayers){
  const audible=index===wanted;
  if(!item.ready)continue;
  if(audible)selected=item;
  // Retry every poll when unmuting, as the embed may reject autoplay sound.
  if(!force&&!audible&&item.lastAudible===false)continue;
  try{
   if(item.platform==='twitch'){
    item.player.setMuted(!audible);
    if(audible&&typeof item.player.setVolume==='function')item.player.setVolume(1);
   }else if(item.platform==='youtube'){
    if(audible){item.player.unMute();item.player.setVolume(100)}
    else item.player.mute();
   }
   item.lastAudible=audible;
  }catch(err){console.warn('ONYX audio routing:',err);item.lastAudible=null}
 }
 const badge=root.querySelector('.live-audio-status');
 if(!badge)return;
 if(wanted<0){badge.textContent='ALL POVS MUTED';return}
 if(!selected){badge.textContent='AUDIO / PLAYER LOADING';return}
 let muted=null;
 try{
  if(selected.platform==='twitch'&&typeof selected.player.getMuted==='function')muted=selected.player.getMuted();
  if(selected.platform==='youtube'&&typeof selected.player.isMuted==='function')muted=selected.player.isMuted();
 }catch(e){}
 badge.textContent=muted===true?'AUDIO BLOCKED · CLICK ENABLE AUDIO':muted===false?'AUDIO ACTIVE / '+(root.querySelector(`.persistent-feed[data-slot="${focus}"] .persistent-name`)?.textContent||'POV'):'AUDIO UNVERIFIED · CLICK ENABLE AUDIO';
}
function onyxEnableAudio(){
 onyxAudioUnlocked=true;
 onyxAudioSync(root.dataset.liveMode||'multiview',Number(root.dataset.focus)||0,true);
 const badge=root.querySelector('.live-audio-status');if(badge)badge.title='If audio is still blocked, use OBS Browser Source > Interact and click the player';
}
function onyxCreatePlayer(video,p,index,url){
 const platform=/twitch\.tv/i.test(url)?'twitch':/youtube\.com/i.test(url)?'youtube':'direct';
 const item={platform,url,player:null,ready:false,lastAudible:null};onyxPlayers.set(index,item);
 const id='onyx-video-'+index;
 video.replaceChildren();
 if(platform==='direct'){
  const frame=document.createElement('iframe');frame.src=url;frame.allow='autoplay; encrypted-media; fullscreen';video.append(frame);
  // Direct embeds cannot be muted cross-origin; fail safe: do not promise audio routing.
  const msg=document.createElement('span');msg.className='audio-unsupported';msg.textContent='DIRECT EMBED · AUDIO NOT CONTROLLED';video.append(msg);
  return;
 }
 const mount=document.createElement('div');mount.id=id;mount.className='onyx-player-mount';video.append(mount);
 const ready=()=>{
  if(onyxPlayers.get(index)!==item)return;
  item.ready=true;item.lastAudible=null;
  onyxAudioSync(root.dataset.liveMode||'multiview',Number(root.dataset.focus)||0);
 };
 if(platform==='twitch'){
  onyxTwitchSDK().then(()=>{
   if(onyxPlayers.get(index)!==item)return;
   const channel=new URL(url).searchParams.get('channel');
   item.player=new Twitch.Player(id,{channel,parent:[location.hostname],width:'100%',height:'100%',autoplay:true,muted:true,controls:true});
   item.player.addEventListener(Twitch.Player.READY,ready);
   if(Twitch.Player.PLAY)item.player.addEventListener(Twitch.Player.PLAY,()=>onyxAudioSync(root.dataset.liveMode||'multiview',Number(root.dataset.focus)||0,true));
  }).catch(err=>onyxFallback(item,video,url,err));
 }else{
  onyxYoutubeSDK().then(()=>{
   if(onyxPlayers.get(index)!==item)return;
   const videoId=new URL(url).pathname.split('/').pop();
   item.player=new YT.Player(id,{videoId,width:'100%',height:'100%',playerVars:{autoplay:1,mute:1,playsinline:1,rel:0,controls:1},events:{onReady:e=>{e.target.mute();ready()},onStateChange:()=>onyxAudioSync(root.dataset.liveMode||'multiview',Number(root.dataset.focus)||0,true)}});
  }).catch(err=>onyxFallback(item,video,url,err));
 }
}
function onyxFallback(item,video,url,err){
 console.warn('ONYX player SDK fallback (audio stays muted):',err);
 if(onyxPlayers.get([...onyxPlayers].find(([,v])=>v===item)?.[0])!==item)return;
 video.replaceChildren();const frame=document.createElement('iframe');frame.src=url;frame.allow='autoplay; encrypted-media; fullscreen';video.append(frame);
 const msg=document.createElement('span');msg.className='audio-unsupported';msg.textContent='AUDIO CONTROL UNAVAILABLE';video.append(msg);
}
// GRID 5.0: deterministic, interruptible broadcast motion engine.
// Position and size are interpolated directly; video elements never unmount.
let liveTween=null,liveCurrent=null;
// Symmetric cubic ease-in-out: gradual acceleration AND deceleration, with no linear push.
const moveEase=t=>{t=Math.max(0,Math.min(1,t));return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
const onyxClamp=t=>Math.max(0,Math.min(1,t));
function liveTargets(mode,focus,display){
 const full={x:0,y:0,w:1920,h:1080,a:1};
 if(mode==='multiview'){
  if(display==='square-fill'||display==='square-fit')return [0,1,2].map(i=>({x:15+i*635,y:190,w:620,h:700,a:1}));
  return [0,1,2].map(i=>({x:38+i*629,y:350,w:591,h:332.4375,a:1}));
 }
 if(mode==='focus')return [0,1,2].map(i=>i===focus?
   {x:32,y:178,w:1300,h:731.25,a:1}:
   {x:1374,y:([0,1,2].filter(n=>n!==focus).indexOf(i)===0?226:558),w:500,h:281.25,a:1});
 return [0,1,2].map(i=>i===focus?full:{x:960,y:540,w:0,h:0,a:0});
}
// Keep provider players at a stable 1280x720 viewport. Twitch embeds may
// enforce minimum dimensions and letterbox when asked to render at 402x226.
// Explicit pixel geometry: do not rely on CSS custom properties or iframe zoom.
// A stable 1280x720 player is centered and cropped only for square-fill.
function onyxSizePlayer(el,w,h,mode,display){
 const mount=el.querySelector('.onyx-player-mount');
 if(!mount)return;
 const square=mode==='multiview'&&(display==='square-fill'||display==='square-fit');
 const fill=square&&display==='square-fill';
 const scale=(fill?Math.max(w/1280,h/720):Math.min(w/1280,h/720))||0;
 const x=(w-1280*scale)/2,y=(h-720*scale)/2;
 // Position the unscaled viewport, then scale it. Inline important wins old CSS.
 mount.style.setProperty('left',x+'px','important');
 mount.style.setProperty('top',y+'px','important');
 mount.style.setProperty('width','1280px','important');
 mount.style.setProperty('height','720px','important');
 mount.style.setProperty('transform','scale('+scale+')','important');
 mount.style.setProperty('transform-origin','top left','important');
 const frame=mount.querySelector('iframe');
 if(frame){
  frame.style.setProperty('width','1280px','important');
  frame.style.setProperty('height','720px','important');
  frame.style.setProperty('transform','none','important');
 }
}
function livePaint(rects,mode,focus){
 const panels=[...root.querySelectorAll('.persistent-feed')];
 panels.forEach((el,i)=>{
  const r=rects[i];if(!r)return;
  const props={left:r.x+'px',top:r.y+'px',width:Math.max(0,r.w)+'px',height:Math.max(0,r.h)+'px',opacity:String(r.a)};
  for(const [key,val] of Object.entries(props))el.style.setProperty(key,val,'important');
  el.style.setProperty('pointer-events',r.a>.9?'auto':'none','important');
  el.style.setProperty('z-index',i===focus?'3':'2','important');
  el.style.setProperty('visibility','visible','important');
  onyxSizePlayer(el,Math.max(0,r.w),Math.max(0,r.h),mode,root.dataset.display);
 });
 const fullscreen=mode==='fullscreen';
 root.classList.toggle('pro-fullscreen',fullscreen);
 // Optical framing fades rather than snapping at the fullscreen boundary.
 const frameOpacity=Math.max(0,Math.min(1,1-Math.max(...rects.map(r=>r.w))/1920));
 root.style.setProperty('--onyx-frame-opacity',String(frameOpacity));
}
function liveScoreboard(c){const host=root.querySelector('.persistent-stage');if(!host)return;let board=root.querySelector('#onyx-scoreboard');if(!board){board=document.createElement('div');board.id='onyx-scoreboard';board.style.cssText='position:absolute;z-index:40;left:50%;top:10px;transform:translateX(-50%);display:flex;align-items:center;gap:15px;background:rgba(8,10,14,.94);border:1px solid #e8d324;padding:9px 20px;color:#fff;font:700 20px Arial;white-space:nowrap;pointer-events:none;box-shadow:0 8px 25px #0009';host.appendChild(board)}const s=c.scoreboard||{};board.style.display=s.enabled?'flex':'none';const safe=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));board.innerHTML=`<span>${safe(s.teamA)}</span><strong style="color:#e8d324;font-size:25px">${Number(s.scoreA)||0} : ${Number(s.scoreB)||0}</strong><span>${safe(s.teamB)}</span><small style="color:#a9abb0;font-size:12px">${safe(s.map)} · ${safe(s.format)}</small>`}
function liveUpdate(c){
 liveScoreboard(c);
 if(!root.querySelector('.persistent-stage'))liveInit(c);
 root.dataset.display=c.liveMode==='multiview'?'square-fill':(c.displayMode||'square-fill');
 root.dataset.onyxVersion='7.1';
 root.className='overlay pro-live '+(c.motion?'motion':'still');
 const mode=['multiview','focus','fullscreen'].includes(c.liveMode)?c.liveMode:'multiview';
 const focus=Math.max(0,Math.min(2,Number(c.focusIndex)||0));
 const effectiveDisplay=mode==='multiview'?'square-fill':(c.displayMode||'square-fill');
 const key=mode+':'+focus+':'+effectiveDisplay;
 root.dataset.liveMode=mode;root.dataset.focus=String(focus);
 const target=liveTargets(mode,focus,effectiveDisplay);
 const now=performance.now();
 // Start from the currently displayed geometry, even during rapid cuts.
 if(!liveCurrent)liveCurrent=target.map(r=>({...r}));
 if(lastLiveLayout!==key){
  const from=liveCurrent.map(r=>({...r}));
  if(liveTween){cancelAnimationFrame(liveTween.frame);liveTween=null}
  const duration=c.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches?850:0;
  const prior=lastLiveLayout||'';
  const swappingFocus=prior.startsWith('focus:')&&mode==='focus';
  const tween={start:now,from,to:target,duration,frame:0,key,swappingFocus};
  liveTween=tween;
  function step(t){
   if(liveTween!==tween)return;
   const progress=duration?onyxClamp((t-tween.start)/duration):1;
   liveCurrent=tween.from.map((r,i)=>{
    // Tiny stagger for secondary panels while all panels ease at both ends.
    const delay=tween.swappingFocus&&i!==focus?0.035:0;
    const f=moveEase(onyxClamp((progress-delay)/(1-delay)));
    const e=tween.to[i],v={};
    for(const k of ['x','y','w','h','a'])v[k]=r[k]+(e[k]-r[k])*f;
    return v;
   });
   livePaint(liveCurrent,mode,focus);
   if(progress<1)tween.frame=requestAnimationFrame(step);
   else liveTween=null;
  }
  step(now);
 }
 lastLiveLayout=key;
 if(!liveTween)livePaint(liveCurrent,mode,focus);
 onyxAudioSync(mode,focus);
 const event=root.querySelector('#live-event');if(event)event.textContent=(c.event||'')+' / '+(c.stage||'');
 (c.players||[]).forEach((p,i)=>{
  const slot=root.querySelector(`.persistent-feed[data-slot="${i}"]`);if(!slot)return;
  slot.querySelector('.persistent-name').textContent=p.name;
  const video=slot.querySelector('.persistent-video'),url=embed(p);
  if(video.dataset.url===url)return;
  video.dataset.url=url;
  video.replaceChildren();
  if(url)onyxCreatePlayer(video,p,i,url)
  else {onyxPlayers.delete(i);video.innerHTML='<div class="offline"><span class="o-mark"><img src="/assets/onyx-emblem.png" alt=""></span><span>FEED NOT ASSIGNED</span></div>';}
 });
}
function tick(c){let clock=document.getElementById('clock');if(!clock)return;let n=c.timerRunning?Math.max(0,Math.ceil((c.timerEnd-Date.now())/1000)):c.timerRemaining||0;clock.textContent=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
let cfg=null;let cameraSignature='';async function refreshCameras(){if(!['casters','interview','chatting'].includes(scene))return;try{const response=await fetch('/api/hub/state',{cache:'no-store'});if(!response.ok)return;const data=await response.json();const cams=Array.isArray(data.guests)?data.guests:[];const signature=JSON.stringify(cams.map(g=>[g.id,g.role,g.view]));if(signature!==cameraSignature){cameraSignature=signature;window.onyxGuestCameras=cams;previous='';}}catch(e){console.warn('ONYX camera sync',e)}}refreshCameras();setInterval(refreshCameras,3000);async function refresh(){try{let c=await(await fetch('/api/config',{cache:'no-store'})).json();let stable=JSON.stringify({...c,timerEnd:null,timerRemaining:null,timerRunning:null});if(scene==='live'){liveUpdate(c);previous=stable}else if(stable!==previous){let oldFeeds=[...root.querySelectorAll('.feed[data-slot]')].map(e=>({slot:e.dataset.slot,url:e.dataset.url,frame:e.querySelector('iframe')}));const oldCameras=[...root.querySelectorAll('.sb-camera-feed')].map(e=>({url:e.getAttribute('src'),frame:e}));previous=stable;render(c);for(const old of oldCameras){const fresh=[...root.querySelectorAll('.sb-camera-feed')].find(e=>e.getAttribute('src')===old.url);if(fresh)fresh.replaceWith(old.frame)}for(const old of oldFeeds){let fresh=root.querySelector('.feed[data-slot="'+old.slot+'"]');if(fresh&&old.frame&&fresh.dataset.url===old.url){let frame=fresh.querySelector('iframe');if(frame)frame.replaceWith(old.frame)}}}cfg=c;tick(c)}catch(e){console.warn('ONYX refresh',e);root.innerHTML='<div style="padding:65px;color:#efc500;font:32px Arial">ONYX v0.4: CONFIG ERROR — '+esc(e.message)+'</div>'}}refresh();setInterval(refresh,1600);setInterval(()=>{if(cfg)tick(cfg)},250);

window.addEventListener('error', function(e) {
  const el=document.createElement('div');
  el.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#a40000;color:white;padding:14px;font:20px monospace;z-index:9999';
  el.textContent='ONYX SCRIPT ERROR: '+e.message;
  document.body.appendChild(el);
});
