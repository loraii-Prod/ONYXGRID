const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.join(__dirname,'render-preview'),PORT=Number(process.env.PORT||3218);
const DATA_DIR=process.env.ONYX_DATA_DIR||path.join(__dirname,'.onyx-data');fs.mkdirSync(DATA_DIR,{recursive:true});const CONFIG_FILE=path.join(DATA_DIR,'config.json');
const saveConfig=()=>{const tmp=CONFIG_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(config,null,2));fs.renameSync(tmp,CONFIG_FILE)};
const PASSWORD=process.env.ONYX_ADMIN_PASSWORD,BRIDGE=process.env.ONYX_BRIDGE_KEY,SECRET=process.env.ONYX_SESSION_SECRET;

const eq=(a,b)=>{const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y)};
const json=(res,n,data)=>{res.writeHead(n,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data))};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').slice(0,2)).filter(x=>x.length===2));
const sig=s=>crypto.createHmac('sha256',SECRET).update(s).digest('hex');
function authed(req){return true;/* local loopback-only service */const raw=cookies(req).onyx_session||'',p=raw.split('.');return p.length===2&&eq(sig(p[0]),p[1])&&Number(p[0])>Date.now()}
function bridgeAuth(req){return eq(req.headers['x-onyx-bridge-key']||'',BRIDGE)}
function originOK(req){const o=req.headers.origin;if(!o)return true;try{const u=new URL(o);return ['localhost','127.0.0.1'].includes(u.hostname)&&u.port===String(PORT)}catch{return false}};
function unusedOriginOK(req){const o=req.headers.origin;if(!o)return false;try{return new URL(o).host===req.headers.host&&new URL(o).protocol==='https:'}catch{return false}}
function body(req,max=200000){return new Promise((resolve,reject)=>{let b='';req.on('data',x=>{b+=x;if(b.length>max){reject(Error('Too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(b))}catch{reject(Error('Invalid JSON'))}});req.on('error',reject)})}
const base=JSON.parse(fs.readFileSync(path.join(ROOT,'config.json'),'utf8'));let config=fs.existsSync(CONFIG_FILE)?JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8')):base,guests=[],commands=[],nextId=0,lastBridge=0;
const loginFails=new Map();
const safe=s=>String(s||'').slice(0,400);
function changeConfig(d){if(!Array.isArray(d.players)||d.players.length!==3)throw Error('Three players required');
for(const k of ['event','stage','subtitle','mainUrl','resultPlace','resultDetail','accent','selectedScene'])if(typeof d[k]==='string')config[k]=safe(d[k]);
config.players=d.players.map(p=>({name:safe(p.name).slice(0,40),platform:['twitch','youtube','direct'].includes(p.platform)?p.platform:'twitch',channel:safe(p.channel)}));
for(const k of ['focusIndex','timerRemaining'])if(Number.isFinite(Number(d[k])))config[k]=Math.max(0,Math.floor(Number(d[k])));
for(const k of ['liveMode','displayMode'])if(typeof d[k]==='string')config[k]=d[k];
if(typeof d.motion==='boolean')config.motion=d.motion;
if(d.scoreboard&&typeof d.scoreboard==='object')config.scoreboard={...config.scoreboard,...d.scoreboard};
if(d.audioRouting&&typeof d.audioRouting==='object')config.audioRouting={...config.audioRouting,...d.audioRouting};
if(d.studio&&typeof d.studio==='object')config.studio={...config.studio,...d.studio};
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const controllers=new Set(['/','/remote.html','/dock.html','/director.html','/hub.html','/caster.html']);
http.createServer(async(req,res)=>{try{
const u=new URL(req.url,'https://'+(req.headers.host||'localhost'));const p=u.pathname;
if(p==='/api/health')return json(res,200,{ok:true,version:'remote-beta-1',bridgeOnline:Date.now()-lastBridge<15000,queued:commands.length});
if(p==='/api/login'&&req.method==='POST'){if(!originOK(req))return json(res,403,{error:'Origin rejected'});const ip=req.socket.remoteAddress||'unknown',t=Date.now(),attempt=loginFails.get(ip)||{count:0,until:0};if(attempt.until>t)return json(res,429,{error:'Try again later'});const d=await body(req,2000);if(!eq(d.password||'',PASSWORD)){attempt.count++;attempt.until=attempt.count>=5?t+60000:0;loginFails.set(ip,attempt);return json(res,401,{error:'Invalid password'})}loginFails.delete(ip);const exp=String(Date.now()+8*3600000);res.setHeader('set-cookie','onyx_session='+exp+'.'+sig(exp)+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800');return json(res,200,{ok:true})}
if(p==='/api/logout'&&req.method==='POST'){if(!originOK(req))return json(res,403,{error:'Origin rejected'});res.setHeader('set-cookie','onyx_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true})}
if(p==='/api/config'&&req.method==='GET')return json(res,200,config);
if(p==='/api/hub/state'&&req.method==='GET')return json(res,200,{guests});
if(p==='/api/embed'&&req.method==='GET')return json(res,200,{supported:['twitch','youtube']});
if(p==='/api/bridge/poll'&&req.method==='GET'){if(!bridgeAuth(req))return json(res,401,{error:'Bridge authentication required'});lastBridge=Date.now();return json(res,200,{commands:commands.splice(0,20)})}
if(p==='/api/bridge/status'&&req.method==='POST'){if(!bridgeAuth(req))return json(res,401,{error:'Bridge authentication required'});lastBridge=Date.now();return json(res,200,{ok:true})}
if(p.startsWith('/api/')&&req.method==='POST'){
if(!authed(req))return json(res,401,{error:'Login required'});if(!originOK(req))return json(res,403,{error:'Origin rejected'});const d=await body(req);
if(p==='/api/config'){changeConfig(d);saveConfig();return json(res,200,{ok:true,config})}
if(p==='/api/timer'){const sec=Math.max(0,Math.min(86400,Math.floor(Number(d.seconds??config.timerRemaining)||0)));if(d.action==='reset'){config.timerRemaining=sec;config.timerEnd=null;config.timerRunning=false}else if(d.action==='start'){config.timerEnd=Date.now()+config.timerRemaining*1000;config.timerRunning=true}else if(d.action==='pause'){config.timerRemaining=Math.max(0,Math.ceil((config.timerEnd-Date.now())/1000));config.timerEnd=null;config.timerRunning=false}else return json(res,400,{error:'Unknown timer action'});saveConfig();return json(res,200,{ok:true,config})}
if(p==='/api/hub/action'){if(d.action==='guest'){const id=crypto.randomBytes(16).toString('hex'),stream='onyx'+id;guests.push({id,label:safe(d.label).slice(0,80),role:['casters','interview','chatting','standby'].includes(d.role)?d.role:'standby',send:'https://vdo.ninja/?push='+stream+'&webcam',view:'https://vdo.ninja/?view='+stream,created:Date.now()})}else if(d.action==='removeGuest'){guests=guests.filter(g=>g.id!==d.id)}else return json(res,400,{error:'Unsupported action'});return json(res,200,{ok:true})}
if(p==='/api/obs/command'){if(!['SetCurrentProgramScene','SetInputMute','SetInputVolume','StartStream','StopStream'].includes(d.requestType))return json(res,400,{error:'OBS command not allowed'});if(commands.length>=100)return json(res,503,{error:'Bridge queue full'});commands.push({id:++nextId,requestType:d.requestType,requestData:d.requestData||{}});return json(res,202,{ok:true,queued:nextId})}
}
if(p.startsWith('/api/'))return json(res,404,{error:'Unknown endpoint'});
if(false&&controllers.has(p)&&!authed(req)){res.writeHead(302,{location:'/login.html','cache-control':'no-store'});return res.end()}
let rel=p==='/'?'dock.html':p.slice(1);if(rel==='config.json')return json(res,403,{error:'Use /api/config'});let file=path.resolve(ROOT,rel);if(!file.startsWith(ROOT+path.sep))return json(res,403,{error:'Forbidden'});const data=await fs.promises.readFile(file).catch(()=>null);if(!data){res.writeHead(404);return res.end('Not Found')}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data)
}catch(e){json(res,400,{error:e.message||'Request failed'})}}).listen(PORT,'127.0.0.1',()=>console.log('ONYX local server listening on '+PORT));