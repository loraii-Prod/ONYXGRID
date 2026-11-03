"use strict";
const $ = (id) => document.getElementById(id);
const val = (id) => $(id).value;
const msg = (s) => { $('message').textContent = s; };
const scenes = ['starting', 'live', 'casters', 'interview', 'chatting', 'break', 'ending', 'game'];
let hub;
async function action(action, data = {}) { const r = await fetch('/api/hub/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) }); const j = await r.json(); if (!r.ok)
    throw Error(j.error || 'Failed'); await refresh(); }
function node(tag, text) { const e = document.createElement(tag); e.textContent = text; return e; }
function btn(label, fn) { const b = node('button', label); b.addEventListener('click', fn); return b; }
function link(label, url) { const a = node('a', label); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
async function refresh() {
 const r=await fetch('/api/hub/state'); if(!r.ok)throw Error('Unable to load cameras');
 const state=await r.json(); const guests=state.guests||[];
 $('cameraCount').textContent=`${guests.length} camera${guests.length===1?'':'s'} configured`;
 const cards=guests.map((x,i)=>{
  const card=node('article','');card.className='camera-card';
  const heading=node('h3',`Camera ${i+1}: ${x.label} · ${x.role}`);
  const preview=node('div','Preview off');preview.className='muted';
  const controls=node('div','');controls.className='row';
  controls.append(btn('Preview',()=>{preview.replaceChildren();const frame=document.createElement('iframe');frame.title=`Preview ${x.label}`;frame.src=x.view;frame.allow='camera; microphone; autoplay; fullscreen';preview.append(frame)}),btn('Stop preview',()=>preview.replaceChildren(node('span','Preview off'))));
  const links=node('div','');links.className='row';links.append(link('Open sender',x.send),link('Open receiver',x.view));
  const actions=node('div','');actions.className='row';actions.append(btn('Copy sender',()=>navigator.clipboard.writeText(x.send).then(()=>msg('Sender link copied'))),btn('Copy receiver',()=>navigator.clipboard.writeText(x.view).then(()=>msg('Receiver link copied'))),btn('Remove',()=>{if(confirm(`Remove ${x.label}?`))run(()=>action('removeGuest',{id:x.id}))}));
  card.append(heading,preview,controls,links,actions);return card;
 });$('guestList').replaceChildren(...cards);
}
async function run(fn) { try {
    await fn();
    msg('Saved.');
}
catch (e) {
    msg('Error: ' + e.message);
} }
$('invite').addEventListener('click', () => run(() => action('guest', { label: val('guestName'), role: val('role') })));
refresh().catch(e => msg(e.message));
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh().catch(() => {}); });
