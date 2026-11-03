(() => {
  'use strict';
  const sections = [...document.querySelectorAll('.inline-cameras[data-camera-role]')];
  if (!sections.length) return;
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const button = (label, fn) => { const b = el('button', label); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const anchor = (label, url) => { const a = el('a', label); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; };
  const message = (section, text) => { section.querySelector('.camera-msg').textContent = text; };
  async function api(action, data) {
    const res = await fetch('/api/hub/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
  }
  async function refresh() {
    const res = await fetch('/api/hub/state', { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load camera list');
    const data = await res.json();
    for (const section of sections) {
      const list = section.querySelector('.camera-list');
      const cameras = (data.guests || []).filter(x => x.role === section.dataset.cameraRole);
      const cards = cameras.map(camera => {
        const card = el('article', undefined, 'camera-item');
        card.append(el('strong', camera.label));
        const actions = el('div', undefined, 'camera-actions');
        actions.append(anchor('Open sender', camera.send), anchor('Open receiver', camera.view));
        actions.append(button('Copy sender', async () => { try { await navigator.clipboard.writeText(camera.send); message(section, 'Sender link copied'); } catch { message(section, 'Copy unavailable; open sender to copy its URL'); } }));
        actions.append(button('Copy receiver', async () => { try { await navigator.clipboard.writeText(camera.view); message(section, 'Receiver link copied'); } catch { message(section, 'Copy unavailable; open receiver to copy its URL'); } }));
        const preview = el('div');
        actions.append(button('Preview', () => { preview.replaceChildren(); const frame = el('iframe'); frame.title = 'Preview ' + camera.label; frame.src = camera.view; frame.allow = 'autoplay; fullscreen'; preview.append(frame); }));
        actions.append(button('Stop preview', () => preview.replaceChildren()));
        actions.append(button('Remove', async () => { if (!confirm('Remove camera ' + camera.label + '?')) return; try { await api('removeGuest', { id: camera.id }); await refresh(); } catch (e) { message(section, e.message); } }));
        card.append(actions, preview);
        return card;
      });
      list.replaceChildren(...cards);
      if (!cameras.length) list.append(el('p', 'No cameras added yet.', 'camera-help'));
    }
  }
  for (const section of sections) {
    const input = section.querySelector('.camera-name');
    const create = section.querySelector('.camera-create');
    const add = async () => {
      const label = input.value.trim();
      if (!label) { message(section, 'Enter a camera name first.'); return; }
      create.disabled = true;
      try { await api('guest', { label, role: section.dataset.cameraRole }); input.value = ''; await refresh(); message(section, 'Camera link created. Send the sender link to the guest.'); }
      catch (e) { message(section, e.message); }
      finally { create.disabled = false; }
    };
    create.addEventListener('click', add);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  }
  refresh().catch(e => sections.forEach(s => message(s, e.message)));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh().catch(() => {}); });
})();
