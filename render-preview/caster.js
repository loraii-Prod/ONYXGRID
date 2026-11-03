"use strict";
const $ = (id) => document.getElementById(id);
let cfg;
let ws = null;
let connected = false;
let pending = new Map();
let seq = 0;
const sceneNames = ['ONYX STARTING SOON', 'ONYX LIVE', 'ONYX CASTERS', 'ONYX INTERVIEW', 'ONYX CHATTING', 'ONYX BREAK', 'ONYX ENDING', 'ONYX GAME'];
function message(s, bad = false) { $('notice').textContent = s; $('notice').classList.toggle('error', bad); }
function state(s) { $('connection').textContent = s; $('connection').classList.toggle('on', s === 'OBS CONNECTED'); }
async function sha(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
function b64(a) { return btoa(String.fromCharCode(...a)); }
async function auth(p, s, c) { return b64(await sha(b64(await sha(p + s)) + c)); }
function request(type, data = {}) { return new Promise((resolve, reject) => { if (!ws || !connected)
    return reject(Error('Connect OBS first')); const id = String(++seq); pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ op: 6, d: { requestType: type, requestId: id, requestData: data } })); setTimeout(() => { if (pending.has(id)) {
    pending.delete(id);
    reject(Error('OBS request timed out'));
} }, 5000); }); }
function connect() {
    if (ws) {
        ws.close();
        ws = null;
    }
    connected = false;
    state('CONNECTING');
    const sock = new WebSocket('ws://127.0.0.1:4455');
    ws = sock;
    sock.onmessage = async (ev) => {
        try {
            const m = JSON.parse(ev.data);
            if (m.op === 0) {
                const d = { rpcVersion: 1, eventSubscriptions: 4 };
                if (m.d.authentication)
                    d.authentication = await auth(($('password')).value, m.d.authentication.salt, m.d.authentication.challenge);
                sock.send(JSON.stringify({ op: 1, d }));
            }
            if (m.op === 2) {
                connected = true;
                state('OBS CONNECTED');
                message('Connected. Ready to direct.');
                await refreshScenes();
                await applyAudio();
                await discoverAudioInputs();
                const current = await request('GetCurrentProgramScene');
                await applySceneAudio(current.currentProgramSceneName);
            }
            if (m.op === 7) {
                const p = pending.get(m.d.requestId);
                if (p) {
                    pending.delete(m.d.requestId);
                    m.d.requestStatus?.result ? p.resolve(m.d.responseData) : p.reject(Error(m.d.requestStatus?.comment || 'OBS request failed'));
                }
            }
            if (m.op === 5 && m.d.eventType === 'CurrentProgramSceneChanged') {
                const scene = m.d.eventData.sceneName;
                $('onair').textContent = scene;
                void applySceneAudio(scene);
            }
        }
        catch (e) {
            message(e.message, true);
        }
    };
    sock.onerror = () => { state('OBS OFFLINE'); message('Could not connect. Enable OBS WebSocket on port 4455.', true); };
    sock.onclose = () => { connected = false; state('OBS OFFLINE'); for (const p of pending.values())
        p.reject(Error('OBS disconnected')); pending.clear(); };
}
async function refreshScenes() { try {
    const r = await request('GetSceneList');
    const available = new Set((r.scenes || []).map((x) => x.sceneName));
    document.querySelectorAll('[data-scene]').forEach(b => { b.disabled = !available.has(b.dataset.scene); b.title = b.disabled ? 'Build scenes from the full ONYX producer dashboard first' : ''; });
    const current = await request('GetCurrentProgramScene');
    $('onair').textContent = current.currentProgramSceneName || 'Unknown';
}
catch (e) {
    message(e.message, true);
} }
async function save() { const r = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }); if (!r.ok)
    throw Error((await r.json()).error || 'Could not save'); cfg = (await r.json()).config; }
async function switchScene(name) { await OnyxTransitions.take(request, name); await applyAudio(); await applySceneAudio(name); $('onair').textContent = name; }
async function layout(mode, index = cfg.focusIndex) { try {
    cfg.liveMode = mode;
    cfg.focusIndex = index;
    await save();
    paint();
    if (connected) {
        await switchScene('ONYX LIVE');
        await applyAudio();
    }
    ;
    message(`${mode.toUpperCase()} · ${mode === 'multiview' ? 'ALL POVS' : cfg.players[index].name}`);
}
catch (e) {
    message(e.message, true);
} }
async function applyAudio() { if (!connected || !cfg.audioRouting?.enabled)
    return; const a = cfg.audioRouting; const selected = a.manual ? a.manualIndex : (cfg.liveMode === 'multiview' ? -1 : cfg.focusIndex); const sources = a.sources.filter(Boolean); if (new Set(sources).size !== sources.length) {
    $('audioStatus').textContent = 'Duplicate audio input names. Assign unique sources.';
    return;
} const errors = []; for (let i = 0; i < 3; i++) {
    const inputName = a.sources[i]?.trim();
    if (!inputName)
        continue;
    try {
        await request('SetInputMute', { inputName, inputMuted: i !== selected });
    }
    catch (e) {
        errors.push(`${inputName}: ${e.message}`);
    }
} $('audioStatus').textContent = errors.length ? errors.join(' | ') : `Mixer: ${selected < 0 ? 'all POV inputs muted' : `POV ${selected + 1} active`}`; }
const AUDIO_KEY = 'onyx.grid.audio.v1';
const defaultAudio = { enabled: false, mic: '', spotify: '', game: '', fadeMs: 1500, manual: false };
let audioPrefs = { ...defaultAudio };
let audioEpoch = 0;
const audioOriginalVolumes = new Map();
const musicScenes = new Set(['ONYX STARTING SOON', 'ONYX BREAK', 'ONYX ENDING']);
const gameScenes = new Set(['ONYX LIVE', 'ONYX GAME']);
const voiceScenes = new Set(['ONYX LIVE', 'ONYX GAME', 'ONYX CASTERS', 'ONYX INTERVIEW', 'ONYX CHATTING']);
function loadAudioPrefs() { try {
    const raw = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}');
    audioPrefs = { ...defaultAudio, ...raw };
}
catch {
    audioPrefs = { ...defaultAudio };
} }
function renderAudioPrefs() { for (const role of ['mic', 'spotify', 'game'])
    ($('am-' + role)).value = audioPrefs[role]; ($('am-enabled')).checked = audioPrefs.enabled; ($('am-manual')).checked = audioPrefs.manual; ($('am-fade')).value = String(audioPrefs.fadeMs); }
async function discoverAudioInputs() { if (!connected)
    return; const response = await request('GetInputList'); const names = (response.inputs || []).map((i) => String(i.inputName)); for (const role of ['mic', 'spotify', 'game']) {
    const el = $('am-' + role);
    el.replaceChildren();
    for (const name of ['', ...names]) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name || 'Not assigned';
        el.append(option);
    }
} renderAudioPrefs(); }
function saveAudioPrefs() { const next = { enabled: ($('am-enabled')).checked, manual: ($('am-manual')).checked, fadeMs: Math.max(0, Math.min(5000, Number(($('am-fade')).value) || 0)), mic: ($('am-mic')).value, spotify: ($('am-spotify')).value, game: ($('am-game')).value }; const selected = [next.mic, next.spotify, next.game].filter(Boolean); if (new Set(selected).size !== selected.length)
    throw Error('Assign a different OBS input to each role. Mixed inputs cannot be safely controlled.'); audioPrefs = next; localStorage.setItem(AUDIO_KEY, JSON.stringify(next)); $('am-status').textContent = 'Saved on this browser. ' + (next.enabled ? 'Automatic routing enabled.' : 'Routing disabled.'); }
async function fadeInput(inputName, target, ms, epoch) { const current = await request('GetInputVolume', { inputName }); const start = Number(current.inputVolumeMul) || 0; if (!audioOriginalVolumes.has(inputName) && start > 0)
    audioOriginalVolumes.set(inputName, start); if (target > 0)
    target = audioOriginalVolumes.get(inputName) ?? 1; const steps = Math.max(1, Math.ceil(ms / 100)); for (let i = 1; i <= steps; i++) {
    if (epoch !== audioEpoch || !connected)
        return;
    const t = i / steps;
    await request('SetInputVolume', { inputName, inputVolumeMul: start + (target - start) * t });
    if (i < steps)
        await new Promise(r => setTimeout(r, ms / steps));
} }
async function applySceneAudio(scene) { if (!connected || !audioPrefs.enabled || audioPrefs.manual)
    return; const { mic, spotify, game, fadeMs } = audioPrefs; const entries = [['mic', mic, voiceScenes.has(scene) ? 1 : 0], ['spotify', spotify, musicScenes.has(scene) ? 1 : 0], ['game', game, gameScenes.has(scene) ? 1 : 0]]; const epoch = ++audioEpoch; const errors = []; await Promise.all(entries.filter(([, name]) => name).map(async ([role, name, target]) => { try {
    if (target > 0)
        await request('SetInputMute', { inputName: name, inputMuted: false });
    await fadeInput(name, target, fadeMs, epoch);
    if (epoch === audioEpoch && target === 0)
        await request('SetInputMute', { inputName: name, inputMuted: true });
}
catch (e) {
    errors.push(role + ': ' + e.message);
} })); if (epoch === audioEpoch)
    $('am-status').textContent = errors.length ? errors.join(' | ') : 'Applied ' + scene + ' audio profile'; }
function showTools() { const s = cfg.scoreboard || { enabled: false, teamA: '', teamB: '', scoreA: 0, scoreB: 0, map: '', format: '' }; for (const [id, v] of Object.entries({ teamA: s.teamA, teamB: s.teamB, scoreA: s.scoreA, scoreB: s.scoreB, mapName: s.map, matchFormat: s.format }))
    ($(id)).value = String(v); ($('scoreEnabled')).checked = s.enabled; const a = cfg.audioRouting || { enabled: false, sources: ['', '', ''], manual: false, manualIndex: 0 }; ($('audioEnabled')).checked = a.enabled; ($('manualAudio')).checked = a.manual; ($('manualIndex')).value = String(a.manualIndex); for (let i = 0; i < 3; i++)
    $(`audio${i}`).value = a.sources[i] || ''; }
function paint() { document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === cfg.liveMode)); document.querySelectorAll('[data-pov]').forEach(b => { const i = Number(b.dataset.pov); b.classList.toggle('active', i === cfg.focusIndex); b.textContent = cfg.players[i].name || `POV ${i + 1}`; }); ($('event')).value = cfg.event || ''; ($('stage')).value = cfg.stage || ''; cfg.players.forEach((p, i) => { ($(`name${i}`)).value = p.name; ($(`url${i}`)).value = p.channel; }); $('mode-label').textContent = `${cfg.liveMode.toUpperCase()} · ${cfg.liveMode === 'multiview' ? '1:1 SQUARE' : '16:9'}`; }
async function setup() {
    try {
        cfg = await (await fetch('/api/config', { cache: 'no-store' })).json();
        cfg.displayMode = 'square-fill';
        loadAudioPrefs();
        paint();
        showTools();
        renderAudioPrefs();
        $('am-discover').onclick = () => void discoverAudioInputs().catch(e => message(e.message, true));
        $('am-save').onclick = () => { try {
            saveAudioPrefs();
            if (connected)
                void request('GetCurrentProgramScene').then(x => applySceneAudio(x.currentProgramSceneName));
        }
        catch (e) {
            message(e.message, true);
        } };
        document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => layout(b.dataset.mode));
        document.querySelectorAll('[data-pov]').forEach(b => b.onclick = () => layout(cfg.liveMode === 'multiview' ? 'focus' : cfg.liveMode, Number(b.dataset.pov)));
        document.querySelectorAll('[data-scene]').forEach(b => b.onclick = async () => { try {
            await switchScene(b.dataset.scene);
            message('Scene changed');
        }
        catch (e) {
            message(e.message, true);
        } });
        $('scoreSave').onclick = async () => { try {
            cfg.scoreboard = { enabled: ($('scoreEnabled')).checked, teamA: ($('teamA')).value, teamB: ($('teamB')).value, scoreA: Number(($('scoreA')).value), scoreB: Number(($('scoreB')).value), map: ($('mapName')).value, format: ($('matchFormat')).value };
            await save();
            message('Scoreboard updated');
        }
        catch (e) {
            message(e.message, true);
        } };
        $('audioSave').onclick = async () => { try {
            cfg.audioRouting = { enabled: ($('audioEnabled')).checked, sources: [0, 1, 2].map(i => ($(`audio${i}`)).value.trim()), manual: ($('manualAudio')).checked, manualIndex: Number(($('manualIndex')).value) };
            await save();
            await applyAudio();
            message('Audio routing saved');
        }
        catch (e) {
            message(e.message, true);
        } };
        $('audioApply').onclick = () => void applyAudio().catch(e => message(e.message, true));
        $('connect').onclick = connect;
        $('save').onclick = async () => { try {
            cfg.event = ($('event')).value;
            cfg.stage = ($('stage')).value;
            cfg.displayMode = 'square-fill';
            cfg.players.forEach((p, i) => { p.name = ($(`name${i}`)).value; p.channel = ($(`url${i}`)).value; const url = p.channel.toLowerCase(); p.platform = url.includes('youtu') ? 'youtube' : 'twitch'; });
            await save();
            paint();
            message('Saved. Overlay updates automatically.');
        }
        catch (e) {
            message(e.message, true);
        } };
        document.addEventListener('keydown', e => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)
            return; if (e.altKey && ['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
            e.preventDefault();
            if (e.key === '4')
                void layout('multiview');
            else if (e.key === '5')
                void layout('fullscreen');
            else if (e.key === '6')
                void switchScene('ONYX BREAK');
            else if (e.key === '7')
                void switchScene('ONYX LIVE');
            else
                void layout('focus', Number(e.key) - 1);
        } });
        message('Ready. Paste POV links, save, and connect OBS.');
    }
    catch (e) {
        message(e.message, true);
    }
}
void setup();
