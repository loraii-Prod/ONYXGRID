"use strict";
const links = [
    { path: '/dock.html', label: 'Production' },
    { path: '/caster.html', label: 'Caster View' },
    { path: '/hub.html', label: 'Guest Cameras' }
];
function currentPath() { return window.location.pathname.toLowerCase(); }
function makeLink(item) {
    const link = document.createElement('a');
    link.href = item.path === '/hub.html' ? '/hub.html#guests' : item.path;
    link.textContent = item.label;
    link.className = 'grid9-nav-link';
    if (currentPath() === item.path) {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'page');
    }
    return link;
}
function mountNavigation() {
    // Replace legacy navigation rather than stacking a second row.
    document.querySelectorAll('.onyx-tool-nav').forEach((old) => old.remove());
    const nav = document.createElement('nav');
    nav.className = 'grid9-nav';
    nav.setAttribute('aria-label', 'Broadcast workspace navigation');
    const brand = document.createElement('div');
    brand.className = 'grid9-brand';
    brand.textContent = 'ONYX / GRID';
    nav.append(brand);
    const group = document.createElement('div');
    group.className = 'grid9-nav-links';
    links.forEach(item => group.append(makeLink(item)));
    nav.append(group);
    const target = document.querySelector('.dock') || document.body;
    target.insertBefore(nav, target.firstChild);
    document.body.classList.add('grid9-ui');
}
if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mountNavigation, { once: true });
else
    mountNavigation();
