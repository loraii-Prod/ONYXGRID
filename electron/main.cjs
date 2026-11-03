const {app,BrowserWindow,Menu,Tray,nativeImage,shell,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
let win,tray;
const PORT=3218;
app.requestSingleInstanceLock() || app.quit();
app.on('second-instance',()=>{if(win){win.show();win.focus()}});
function createWindow(){
 win=new BrowserWindow({width:1480,height:950,minWidth:950,minHeight:650,title:'ONYX GRID',backgroundColor:'#101419',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.loadURL('http://127.0.0.1:'+PORT+'/dock.html');
 win.webContents.setWindowOpenHandler(({url})=>{try{const u=new URL(url);if(u.hostname==='127.0.0.1'&&u.port===String(PORT)){shell.openExternal(url)}else if(u.protocol==='https:'){shell.openExternal(url)}}catch{}return {action:'deny'}});
 win.on('close',e=>{if(!app.isQuitting&&tray){e.preventDefault();win.hide()}});
}
app.whenReady().then(()=>{
 process.env.ONYX_DATA_DIR=path.join(app.getPath('userData'),'data');
 fs.mkdirSync(process.env.ONYX_DATA_DIR,{recursive:true});
 require('../local-server.cjs');
 createWindow();
 const img=nativeImage.createEmpty();
 tray=new Tray(img);
 tray.setToolTip('ONYX GRID');
 tray.setContextMenu(Menu.buildFromTemplate([
 {label:'Open ONYX GRID',click:()=>{win.show();win.focus()}},
 {label:'Open in browser',click:()=>shell.openExternal('http://127.0.0.1:'+PORT+'/dock.html')},
 {type:'separator'},
 {label:'Quit ONYX GRID',click:()=>{app.isQuitting=true;app.quit()}}
 ]));
 tray.on('double-click',()=>win.show());
});
app.on('window-all-closed',()=>{ /* stay available in tray */ });
