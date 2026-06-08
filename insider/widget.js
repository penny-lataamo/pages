(() => {
  'use strict';

  const currentScript = document.currentScript;
  const scriptUrl = new URL(currentScript?.src || '/insider/widget.js', window.location.href);
  const baseUrl = new URL('./', scriptUrl).href;
  const manifestUrl = currentScript?.dataset.manifest || new URL('assets.json', baseUrl).href;
  const logoUrl = currentScript?.dataset.logo || new URL('assets/lataamo-brandmark-transparent.svg', baseUrl).href;
  const position = currentScript?.dataset.position || 'bottom-right';
  const startOpen = currentScript?.dataset.open === 'true';
  const theme = currentScript?.dataset.theme || 'auto';
  const launcherLabel = currentScript?.dataset.label || 'Insider';

  if (window.__lataamoInsiderMounted) return;
  window.__lataamoInsiderMounted = true;

  const host = document.createElement('lataamo-insider');
  host.setAttribute('aria-live', 'polite');
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  const state = {
    open: startOpen,
    query: '',
    activeIndex: -1,
    manifest: null,
    error: null,
  };

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[char]));

  const absolutize = (url) => {
    try { return new URL(url, baseUrl).href; }
    catch { return url; }
  };

  const normalize = (value = '') => value.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const allItems = () => (state.manifest?.sections || []).flatMap((section) =>
    (section.items || []).map((item) => ({ ...item, section: section.label }))
  );

  const filteredSections = () => {
    const q = normalize(state.query.trim());
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    return (state.manifest?.sections || []).map((section) => {
      const items = (section.items || [])
        .map((item) => {
          const itemPath = (() => {
            try { return new URL(item.url, baseUrl).pathname.replace(/\/$/, '') || '/'; }
            catch { return item.url; }
          })();
          const haystack = normalize([item.title, item.description, item.tag, item.status, section.label].join(' '));
          return { ...item, current: itemPath === currentPath, section: section.label, visible: !q || haystack.includes(q) };
        })
        .filter((item) => item.visible);
      return { ...section, items };
    }).filter((section) => section.items.length);
  };

  const styles = `
    :host { all: initial; --li-ink:#050B3E; --li-muted:#667085; --li-soft:#F6F3EA; --li-panel:rgba(255,255,255,.88); --li-line:rgba(5,11,62,.13); --li-accent:${escapeHtml(currentScript?.dataset.accent || '#5A21D6')}; --li-accent-2:#FF4F9A; --li-good:#16A34A; --li-radius:24px; --li-font:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    .wrap { position:fixed; z-index:2147483000; font-family:var(--li-font); color:var(--li-ink); ${position.includes('left') ? 'left' : 'right'}: max(22px, env(safe-area-inset-right)); bottom:max(22px, env(safe-area-inset-bottom)); width:min(440px, calc(100vw - 44px)); pointer-events:none; }
    .panel { pointer-events:auto; margin-bottom:16px; max-height:calc(100vh - 118px); display:flex; flex-direction:column; border:1px solid var(--li-line); border-radius:30px; overflow:hidden; background:linear-gradient(180deg, rgba(255,255,255,.94), rgba(250,248,242,.90)); box-shadow:0 28px 90px rgba(5,11,62,.22), 0 6px 22px rgba(5,11,62,.10); backdrop-filter: blur(18px) saturate(1.25); transform-origin: calc(100% - 32px) 100%; transition: transform .22s cubic-bezier(.2,.8,.2,1), opacity .18s ease, filter .18s ease; }
    .panel[hidden] { opacity:0; transform:translateY(14px) scale(.965); filter:blur(6px); pointer-events:none; visibility:hidden; }
    .hero { padding:22px 22px 17px; background:radial-gradient(circle at 14% 0%, color-mix(in srgb, var(--li-accent) 18%, transparent), transparent 35%), radial-gradient(circle at 90% 10%, rgba(255,79,154,.16), transparent 30%); border-bottom:1px solid rgba(5,11,62,.08); }
    .top { display:flex; align-items:flex-start; gap:12px; }
    .mark { flex:0 0 42px; width:42px; height:42px; border-radius:16px; display:grid; place-items:center; background:rgba(255,255,255,.74); border:1px solid rgba(90,33,214,.13); box-shadow:0 12px 30px color-mix(in srgb, var(--li-accent) 22%, transparent); overflow:hidden; }
    .mark img { display:block; width:27px; height:27px; object-fit:contain; }
    .heading { min-width:0; flex:1; }
    h2 { all:unset; display:block; font:800 20px/1.05 var(--li-font); letter-spacing:-.035em; color:var(--li-ink); }
    .sub { margin-top:5px; color:var(--li-muted); font:500 12.5px/1.35 var(--li-font); }
    .close { all:unset; cursor:pointer; width:34px; height:34px; border-radius:12px; display:grid; place-items:center; color:var(--li-muted); font:700 18px/1 var(--li-font); }
    .close:hover { background:rgba(5,11,62,.07); color:var(--li-ink); }
    .searchrow { margin-top:15px; position:relative; }
    .searchrow svg { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#7A7F8F; }
    input { all:unset; width:100%; height:43px; padding:0 14px 0 39px; border:1px solid rgba(5,11,62,.13); border-radius:16px; background:rgba(255,255,255,.72); color:var(--li-ink); font:600 14px/1 var(--li-font); box-shadow:inset 0 1px 0 rgba(255,255,255,.8); }
    input:focus { border-color:color-mix(in srgb, var(--li-accent) 55%, white); box-shadow:0 0 0 4px color-mix(in srgb, var(--li-accent) 14%, transparent); }
    .body { flex:1 1 auto; min-height:0; overflow:auto; padding:12px 14px 10px; scrollbar-width:thin; scrollbar-color:rgba(5,11,62,.28) transparent; }
    .section { padding:10px 0 8px; }
    .section-title { padding:4px 6px 10px; display:flex; align-items:center; justify-content:space-between; color:#7B8090; font:800 11px/1 var(--li-font); letter-spacing:.09em; text-transform:uppercase; }
    .count { font-weight:800; color:#A0A4B2; }
    .item { display:grid; grid-template-columns:42px minmax(0,1fr) auto; gap:14px; align-items:center; min-height:76px; padding:12px 12px; border-radius:20px; text-decoration:none; color:inherit; outline:none; border:1px solid transparent; }
    .item:hover, .item:focus-visible, .item[data-active="true"] { background:linear-gradient(135deg, rgba(90,33,214,.10), rgba(255,79,154,.07)); border-color:rgba(90,33,214,.18); box-shadow:0 10px 24px rgba(5,11,62,.08); transform:translateY(-1px); }
    .icon { width:42px; height:42px; display:grid; place-items:center; border-radius:16px; background:linear-gradient(145deg,rgba(90,33,214,.10),rgba(255,79,154,.08)); color:var(--li-accent); font:900 17px/1 var(--li-font); }
    .copy { min-width:0; }
    .title { display:flex; gap:7px; align-items:center; min-width:0; font:800 14.5px/1.15 var(--li-font); letter-spacing:-.012em; color:var(--li-ink); }
    .title span:first-child { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .desc { margin-top:5px; color:var(--li-muted); font:500 12.5px/1.34 var(--li-font); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .meta { display:flex; align-items:center; gap:7px; justify-content:flex-end; padding-left:4px; }
    .pill { border-radius:999px; padding:5px 8px; background:rgba(5,11,62,.06); color:#697084; font:800 10px/1 var(--li-font); letter-spacing:.02em; text-transform:uppercase; white-space:nowrap; }
    .pill.status-new { color:white; background:linear-gradient(135deg,var(--li-accent),var(--li-accent-2)); }
    .pill.status-beta { color:#7A3B00; background:#FFE6BD; }
    .pill.status-live { color:#0D6B35; background:#DDF8E7; }
    .arrow { color:#A1A6B4; font:900 17px/1 var(--li-font); }
    .current { margin-left:1px; width:7px; height:7px; flex:0 0 7px; border-radius:99px; background:var(--li-good); box-shadow:0 0 0 3px rgba(22,163,74,.14); }
    .empty, .loading, .error { padding:28px 16px 32px; text-align:center; color:var(--li-muted); font:600 13px/1.45 var(--li-font); }
    .footer { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 16px 14px; border-top:1px solid rgba(5,11,62,.08); color:#8C92A2; font:700 11px/1 var(--li-font); }
    .kbd { border:1px solid rgba(5,11,62,.16); border-bottom-width:2px; border-radius:7px; padding:2px 5px; background:rgba(255,255,255,.7); color:#777D8C; }
    .launcher { all:unset; pointer-events:auto; cursor:pointer; margin-left:auto; display:flex; align-items:center; gap:10px; max-width:100%; height:56px; padding:0 17px 0 9px; border-radius:999px; color:white; background:linear-gradient(135deg,rgba(5,11,62,.96),rgba(90,33,214,.96) 55%,rgba(255,79,154,.94)); box-shadow:0 18px 46px rgba(5,11,62,.26), inset 0 1px 0 rgba(255,255,255,.2); font:850 14px/1 var(--li-font); letter-spacing:-.01em; transition: transform .18s ease, box-shadow .18s ease; }
    .launcher:hover { transform:translateY(-2px); box-shadow:0 22px 58px rgba(5,11,62,.30), inset 0 1px 0 rgba(255,255,255,.24); }
    .launcher:focus-visible { outline:4px solid color-mix(in srgb, var(--li-accent) 24%, transparent); outline-offset:3px; }
    .launcher-mark { width:40px; height:40px; border-radius:999px; display:grid; place-items:center; background:rgba(255,255,255,.92); box-shadow:inset 0 1px 0 rgba(255,255,255,.42), 0 8px 18px rgba(5,11,62,.16); overflow:hidden; }
    .launcher-mark img { display:block; width:27px; height:27px; object-fit:contain; }
    .launcher-text { white-space:nowrap; }
    .dot { width:8px; height:8px; border-radius:99px; background:#72FFB6; box-shadow:0 0 0 4px rgba(114,255,182,.14); }
    @media (max-width:520px) { .wrap { right:18px; left:18px; bottom:18px; width:auto; } .panel { max-height:calc(100vh - 124px); border-radius:28px; } .hero { padding:20px 20px 16px; } .body { padding:12px 14px 10px; } .item { grid-template-columns:42px minmax(0,1fr) auto; gap:13px; padding:12px 10px; } .meta .pill:not(.status-live):not(.status-new):not(.status-beta) { display:none; } }
    @media (max-width:380px) { .wrap { right:14px; left:14px; bottom:14px; } .item { gap:11px; } .title { font-size:14px; } .desc { font-size:12px; } .pill { padding:4px 7px; } .arrow { display:none; } }
    @media (prefers-reduced-motion: reduce) { .panel, .launcher, .item { transition:none !important; } }
    @media (prefers-color-scheme: dark) { :host([data-theme="auto"]) { --li-ink:#F7F3FF; --li-muted:#B8B8C8; --li-panel:rgba(16,14,25,.90); --li-line:rgba(255,255,255,.14); color-scheme:dark; } :host([data-theme="auto"]) .panel { background:linear-gradient(180deg, rgba(20,18,31,.94), rgba(10,9,17,.90)); box-shadow:0 28px 90px rgba(0,0,0,.44); } :host([data-theme="auto"]) input { background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.14); } :host([data-theme="auto"]) .item:hover, :host([data-theme="auto"]) .item:focus-visible { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.11); } }
    :host([data-theme="dark"]) { --li-ink:#F7F3FF; --li-muted:#B8B8C8; --li-panel:rgba(16,14,25,.90); --li-line:rgba(255,255,255,.14); color-scheme:dark; }
    :host([data-theme="dark"]) .panel { background:linear-gradient(180deg, rgba(20,18,31,.94), rgba(10,9,17,.90)); box-shadow:0 28px 90px rgba(0,0,0,.44); }
    :host([data-theme="dark"]) input { background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.14); }
    :host([data-theme="dark"]) .item:hover, :host([data-theme="dark"]) .item:focus-visible, :host([data-theme="dark"]) .item[data-active="true"] { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.11); }
  `;

  function itemHtml(item, index) {
    const tag = item.tag ? `<span class="pill">${escapeHtml(item.tag)}</span>` : '';
    const status = item.status ? `<span class="pill status-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>` : '';
    const current = item.current ? '<span class="current" title="Current page"></span>' : '';
    return `<a class="item" href="${escapeHtml(absolutize(item.url))}" data-index="${index}" data-active="${state.activeIndex === index}" aria-label="Open ${escapeHtml(item.title)}">
      <span class="icon">${escapeHtml(item.icon || '→')}</span>
      <span class="copy"><span class="title"><span>${escapeHtml(item.title)}</span>${current}</span><span class="desc">${escapeHtml(item.description || item.section || '')}</span></span>
      <span class="meta">${status}${tag}<span class="arrow">›</span></span>
    </a>`;
  }

  function render() {
    host.dataset.theme = theme;
    const sections = filteredSections();
    let index = -1;
    const body = !state.manifest && !state.error
      ? '<div class="loading">Loading internal links…</div>'
      : state.error
        ? `<div class="error">Could not load Insider links.<br>${escapeHtml(state.error)}</div>`
        : sections.length
          ? sections.map((section) => `<div class="section"><div class="section-title"><span>${escapeHtml(section.label)}</span><span class="count">${section.items.length}</span></div>${section.items.map((item) => itemHtml(item, ++index)).join('')}</div>`).join('')
          : '<div class="empty">No matching assets. Try a broader search.</div>';
    const updated = state.manifest?.updated ? `Updated ${escapeHtml(state.manifest.updated)}` : 'Central manifest';
    root.innerHTML = `<style>${styles}</style><div class="wrap">
      <section class="panel" ${state.open ? '' : 'hidden'} role="dialog" aria-modal="false" aria-label="${escapeHtml(state.manifest?.title || 'Lataamo Insider')}">
        <div class="hero"><div class="top"><div class="mark"><img src="${escapeHtml(logoUrl)}" alt="" aria-hidden="true"></div><div class="heading"><h2>${escapeHtml(state.manifest?.title || 'Lataamo Insider')}</h2><div class="sub">${escapeHtml(state.manifest?.subtitle || 'Internal pages, tools and reusable assets.')}</div></div><button class="close" aria-label="Close Insider">×</button></div>
        <div class="searchrow"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" value="${escapeHtml(state.query)}" placeholder="Search assets, cases, tools…" aria-label="Search Lataamo assets"></div></div>
        <div class="body">${body}</div><div class="footer"><span>${updated}</span><span><span class="kbd">/</span> search · <span class="kbd">Esc</span> close</span></div>
      </section>
      <button class="launcher" aria-expanded="${state.open}" aria-label="Open Lataamo Insider"><span class="launcher-mark"><img src="${escapeHtml(logoUrl)}" alt="" aria-hidden="true"></span><span class="launcher-text">${escapeHtml(launcherLabel)}</span><span class="dot" aria-hidden="true"></span></button>
    </div>`;
    bindEvents();
  }

  function bindEvents() {
    const launcher = root.querySelector('.launcher');
    const close = root.querySelector('.close');
    const input = root.querySelector('input');
    const items = [...root.querySelectorAll('.item')];
    launcher?.addEventListener('click', () => toggle(!state.open));
    close?.addEventListener('click', () => toggle(false));
    input?.addEventListener('input', (event) => { state.query = event.target.value; state.activeIndex = -1; render(); root.querySelector('input')?.focus(); });
    items.forEach((item) => item.addEventListener('mouseenter', () => { state.activeIndex = Number(item.dataset.index); root.querySelectorAll('.item').forEach((el) => el.dataset.active = String(el === item)); }));
    root.querySelector('.body')?.addEventListener('mouseleave', () => { state.activeIndex = -1; root.querySelectorAll('.item').forEach((el) => el.dataset.active = 'false'); });
  }

  function toggle(open) {
    state.open = open;
    state.activeIndex = -1;
    render();
    if (open) setTimeout(() => root.querySelector('input')?.focus(), 40);
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const tag = document.activeElement?.tagName;
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) { event.preventDefault(); toggle(true); }
    }
    if (event.key === 'Escape' && state.open) toggle(false);
    if (!state.open) return;
    const items = root.querySelectorAll('.item');
    if (event.key === 'ArrowDown') { event.preventDefault(); state.activeIndex = Math.min(items.length - 1, state.activeIndex + 1); render(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); state.activeIndex = Math.max(0, state.activeIndex - 1); render(); }
    if (event.key === 'Enter' && state.activeIndex >= 0 && items[state.activeIndex]) { event.preventDefault(); items[state.activeIndex].click(); }
  });

  render();
  fetch(manifestUrl, { cache: 'no-store', mode: 'cors' })
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    })
    .then((manifest) => { state.manifest = manifest; state.error = null; render(); })
    .catch((error) => { state.error = error.message || 'Unknown error'; render(); });
})();
