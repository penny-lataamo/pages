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
    activeTab: 'featured',
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

  const currentHref = () => {
    try {
      const url = new URL(window.location.href);
      url.hash = '';
      url.search = '';
      return url.href.replace(/\/$/, '');
    } catch { return window.location.href; }
  };

  const allItems = () => (state.manifest?.sections || []).flatMap((section) =>
    (section.items || []).map((item, itemIndex) => ({
      ...item,
      sectionId: section.id,
      section: section.label,
      itemIndex,
      href: absolutize(item.url),
    }))
  ).map((item) => ({
    ...item,
    current: item.href.replace(/\/$/, '') === currentHref(),
  }));

  const isFeatured = (item, index) => item.featured || item.pinned || item.sectionId === 'actual-tools' || index < 4;

  const tabs = () => {
    const sections = state.manifest?.sections || [];
    return [
      { id: 'featured', label: 'Featured' },
      ...sections.map((section) => ({ id: section.id, label: section.shortLabel || section.label })),
      { id: 'all', label: 'All' },
    ];
  };

  const visibleItems = () => {
    const q = normalize(state.query.trim());
    const items = allItems().map((item, index) => ({ ...item, featured: isFeatured(item, index) }));
    return items.filter((item) => {
      const haystack = normalize([item.title, item.description, item.tag, item.status, item.section, item.url].join(' '));
      const matchesQuery = !q || haystack.includes(q);
      const matchesTab = state.activeTab === 'all'
        || (state.activeTab === 'featured' ? item.featured : item.sectionId === state.activeTab);
      return matchesQuery && matchesTab;
    });
  };

  const groupedSearchResults = () => {
    const q = normalize(state.query.trim());
    if (!q) return null;
    const groups = new Map();
    visibleItems().forEach((item) => {
      const key = item.section || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()].map(([label, items]) => ({ label, items }));
  };

  const styles = `
    :host { all: initial; --li-ink:#050B3E; --li-muted:#667085; --li-soft:#F8F5EF; --li-card:rgba(255,255,255,.82); --li-line:rgba(5,11,62,.13); --li-accent:${escapeHtml(currentScript?.dataset.accent || '#5A21D6')}; --li-accent-2:#FF4F9A; --li-good:#16A34A; --li-radius:28px; --li-font:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color-scheme: light; }
    *, *::before, *::after { box-sizing:border-box; }
    .wrap { position:fixed; z-index:2147483000; font-family:var(--li-font); color:var(--li-ink); ${position.includes('left') ? 'left' : 'right'}:max(22px, env(safe-area-inset-right)); bottom:max(22px, env(safe-area-inset-bottom)); width:min(920px, calc(100vw - 44px)); pointer-events:none; }
    .panel { pointer-events:auto; margin-bottom:16px; height:min(760px, calc(100vh - 118px)); display:grid; grid-template-rows:auto auto 1fr auto; border:1px solid var(--li-line); border-radius:34px; overflow:hidden; background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(250,248,242,.92)); box-shadow:0 34px 110px rgba(5,11,62,.26), 0 10px 30px rgba(5,11,62,.10); backdrop-filter:blur(20px) saturate(1.28); transform-origin:calc(100% - 32px) 100%; transition:transform .22s cubic-bezier(.2,.8,.2,1), opacity .18s ease, filter .18s ease; }
    .panel[hidden] { opacity:0; transform:translateY(14px) scale(.965); filter:blur(6px); pointer-events:none; visibility:hidden; }
    .hero { padding:28px 30px 20px; background:radial-gradient(circle at 10% 0%, color-mix(in srgb, var(--li-accent) 20%, transparent), transparent 34%), radial-gradient(circle at 90% 8%, rgba(255,79,154,.18), transparent 30%), linear-gradient(180deg, rgba(255,255,255,.70), rgba(255,255,255,.28)); border-bottom:1px solid rgba(5,11,62,.08); }
    .top { display:flex; align-items:flex-start; gap:14px; }
    .mark { flex:0 0 46px; width:46px; height:46px; border-radius:18px; display:grid; place-items:center; background:rgba(255,255,255,.76); border:1px solid rgba(90,33,214,.13); box-shadow:0 14px 34px color-mix(in srgb, var(--li-accent) 22%, transparent); overflow:hidden; }
    .mark img { display:block; width:30px; height:30px; object-fit:contain; }
    .heading { min-width:0; flex:1; }
    h2 { all:unset; display:block; font:900 24px/1.02 var(--li-font); letter-spacing:-.045em; color:var(--li-ink); }
    .sub { margin-top:6px; color:var(--li-muted); font:560 13px/1.4 var(--li-font); max-width:560px; }
    .close { all:unset; cursor:pointer; width:38px; height:38px; border-radius:14px; display:grid; place-items:center; color:var(--li-muted); font:800 20px/1 var(--li-font); }
    .close:hover { background:rgba(5,11,62,.07); color:var(--li-ink); }
    .controls { padding:16px 30px 14px; display:grid; gap:13px; border-bottom:1px solid rgba(5,11,62,.08); background:rgba(255,255,255,.42); }
    .searchrow { position:relative; }
    .searchrow svg { position:absolute; left:15px; top:50%; transform:translateY(-50%); color:#7A7F8F; }
    input { all:unset; box-sizing:border-box; width:100%; height:48px; padding:0 16px 0 44px; border:1px solid rgba(5,11,62,.14); border-radius:18px; background:rgba(255,255,255,.78); color:var(--li-ink); font:700 15px/1 var(--li-font); box-shadow:inset 0 1px 0 rgba(255,255,255,.86); }
    input:focus { border-color:color-mix(in srgb, var(--li-accent) 55%, white); box-shadow:0 0 0 4px color-mix(in srgb, var(--li-accent) 14%, transparent); }
    .tabs { display:flex; gap:8px; overflow:auto; padding-bottom:2px; scrollbar-width:none; }
    .tabs::-webkit-scrollbar { display:none; }
    .tab { all:unset; cursor:pointer; white-space:nowrap; border:1px solid rgba(5,11,62,.12); border-radius:999px; padding:9px 13px; background:rgba(255,255,255,.58); color:#666D80; font:900 11px/1 var(--li-font); letter-spacing:.055em; text-transform:uppercase; }
    .tab:hover { background:#fff; color:var(--li-ink); }
    .tab[data-active="true"] { color:white; border-color:transparent; background:linear-gradient(135deg,var(--li-accent),var(--li-accent-2)); box-shadow:0 10px 24px color-mix(in srgb, var(--li-accent) 22%, transparent); }
    .body { min-height:0; overflow:auto; padding:20px 30px 22px; scrollbar-width:thin; scrollbar-color:rgba(5,11,62,.28) transparent; }
    .deck-title { display:flex; justify-content:space-between; align-items:end; gap:16px; margin:0 0 14px; }
    .deck-title h3 { all:unset; font:900 18px/1.05 var(--li-font); letter-spacing:-.035em; color:var(--li-ink); }
    .deck-title span { color:#8B91A2; font:800 11px/1 var(--li-font); letter-spacing:.06em; text-transform:uppercase; }
    .cards { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .card { position:relative; display:grid; grid-template-columns:48px minmax(0,1fr); gap:14px; min-height:126px; padding:16px; border:1px solid rgba(5,11,62,.11); border-radius:24px; text-decoration:none; color:inherit; background:var(--li-card); box-shadow:0 10px 26px rgba(5,11,62,.055); outline:none; overflow:hidden; }
    .card::after { content:""; position:absolute; inset:auto -28px -42px auto; width:120px; height:120px; border-radius:38px; transform:rotate(18deg); opacity:.55; background:linear-gradient(135deg, color-mix(in srgb, var(--li-accent) 11%, transparent), rgba(255,79,154,.10)); pointer-events:none; }
    .card:hover, .card:focus-visible, .card[data-active="true"] { transform:translateY(-2px); border-color:rgba(90,33,214,.24); box-shadow:0 18px 42px rgba(5,11,62,.10); background:rgba(255,255,255,.94); }
    .icon { width:48px; height:48px; display:grid; place-items:center; border-radius:18px; background:linear-gradient(145deg,rgba(90,33,214,.12),rgba(255,79,154,.10)); color:var(--li-accent); font:900 19px/1 var(--li-font); }
    .copy { min-width:0; position:relative; z-index:1; }
    .title { display:flex; gap:7px; align-items:center; min-width:0; font:900 15.5px/1.15 var(--li-font); letter-spacing:-.016em; color:var(--li-ink); }
    .title span:first-child { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .desc { margin-top:7px; color:var(--li-muted); font:560 13px/1.38 var(--li-font); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .meta { margin-top:12px; display:flex; flex-wrap:wrap; align-items:center; gap:7px; }
    .pill { border-radius:999px; padding:6px 8px; background:rgba(5,11,62,.06); color:#697084; font:900 10px/1 var(--li-font); letter-spacing:.025em; text-transform:uppercase; white-space:nowrap; }
    .pill.status-new { color:white; background:linear-gradient(135deg,var(--li-accent),var(--li-accent-2)); }
    .pill.status-beta { color:#7A3B00; background:#FFE6BD; }
    .pill.status-live { color:#0D6B35; background:#DDF8E7; }
    .current { margin-left:1px; width:7px; height:7px; flex:0 0 7px; border-radius:99px; background:var(--li-good); box-shadow:0 0 0 3px rgba(22,163,74,.14); }
    .open { position:absolute; right:14px; bottom:14px; width:30px; height:30px; border-radius:999px; display:grid; place-items:center; color:var(--li-accent); background:rgba(90,33,214,.08); font:900 18px/1 var(--li-font); z-index:1; }
    .group { margin:0 0 22px; }
    .group:last-child { margin-bottom:0; }
    .group-head { margin:0 0 10px; display:flex; justify-content:space-between; color:#7B8090; font:900 11px/1 var(--li-font); letter-spacing:.09em; text-transform:uppercase; }
    .empty, .loading, .error { padding:42px 18px; text-align:center; color:var(--li-muted); font:650 14px/1.45 var(--li-font); }
    .footer { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:12px 18px 16px; border-top:1px solid rgba(5,11,62,.08); color:#8C92A2; font:800 11px/1 var(--li-font); background:rgba(255,255,255,.36); }
    .kbd { border:1px solid rgba(5,11,62,.16); border-bottom-width:2px; border-radius:7px; padding:2px 5px; background:rgba(255,255,255,.78); color:#777D8C; }
    .launcher { all:unset; pointer-events:auto; cursor:pointer; margin-left:auto; display:flex; align-items:center; gap:10px; max-width:100%; height:56px; padding:0 17px 0 9px; border-radius:999px; color:white; background:linear-gradient(135deg,rgba(5,11,62,.96),rgba(90,33,214,.96) 55%,rgba(255,79,154,.94)); box-shadow:0 18px 46px rgba(5,11,62,.26), inset 0 1px 0 rgba(255,255,255,.2); font:850 14px/1 var(--li-font); letter-spacing:-.01em; transition:transform .18s ease, box-shadow .18s ease; }
    .launcher:hover { transform:translateY(-2px); box-shadow:0 22px 58px rgba(5,11,62,.30), inset 0 1px 0 rgba(255,255,255,.24); }
    .launcher:focus-visible { outline:4px solid color-mix(in srgb, var(--li-accent) 24%, transparent); outline-offset:3px; }
    .launcher-mark { width:40px; height:40px; border-radius:999px; display:grid; place-items:center; background:rgba(255,255,255,.92); box-shadow:inset 0 1px 0 rgba(255,255,255,.42), 0 8px 18px rgba(5,11,62,.16); overflow:hidden; }
    .launcher-mark img { display:block; width:27px; height:27px; object-fit:contain; }
    .launcher-text { white-space:nowrap; }
    .dot { width:8px; height:8px; border-radius:99px; background:#72FFB6; box-shadow:0 0 0 4px rgba(114,255,182,.14); }
    @media (max-width:760px) { .wrap { right:18px; left:18px; bottom:18px; width:auto; } .panel { height:min(760px, calc(100vh - 118px)); border-radius:30px; } .hero { padding:24px 24px 18px; } .controls { padding:14px 22px 13px; } .body { padding:18px 22px 20px; } .cards { grid-template-columns:1fr; } .card { min-height:112px; } }
    @media (max-width:420px) { .wrap { right:14px; left:14px; bottom:14px; } h2 { font-size:21px; } .sub { font-size:12.5px; } .top { gap:12px; } .hero { padding:22px 20px 16px; } .controls { padding:13px 18px 12px; } .body { padding:16px 18px 18px; } .card { grid-template-columns:44px minmax(0,1fr); gap:12px; padding:14px; border-radius:21px; } .icon { width:44px; height:44px; border-radius:16px; } .open { display:none; } .footer { display:none; } }
    @media (prefers-reduced-motion:reduce) { .panel, .launcher, .card { transition:none !important; } }
    @media (prefers-color-scheme:dark) { :host([data-theme="auto"]) { --li-ink:#F7F3FF; --li-muted:#B8B8C8; --li-card:rgba(255,255,255,.07); --li-line:rgba(255,255,255,.14); color-scheme:dark; } :host([data-theme="auto"]) .panel { background:linear-gradient(180deg, rgba(20,18,31,.96), rgba(10,9,17,.92)); box-shadow:0 34px 110px rgba(0,0,0,.48); } :host([data-theme="auto"]) .controls, :host([data-theme="auto"]) .footer { background:rgba(255,255,255,.04); } :host([data-theme="auto"]) input, :host([data-theme="auto"]) .tab { background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.14); } :host([data-theme="auto"]) .card:hover, :host([data-theme="auto"]) .card:focus-visible, :host([data-theme="auto"]) .card[data-active="true"] { background:rgba(255,255,255,.10); border-color:rgba(255,255,255,.16); box-shadow:0 18px 42px rgba(0,0,0,.18); } }
    :host([data-theme="dark"]) { --li-ink:#F7F3FF; --li-muted:#B8B8C8; --li-card:rgba(255,255,255,.07); --li-line:rgba(255,255,255,.14); color-scheme:dark; }
    :host([data-theme="dark"]) .panel { background:linear-gradient(180deg, rgba(20,18,31,.96), rgba(10,9,17,.92)); box-shadow:0 34px 110px rgba(0,0,0,.48); }
    :host([data-theme="dark"]) .controls, :host([data-theme="dark"]) .footer { background:rgba(255,255,255,.04); }
    :host([data-theme="dark"]) input, :host([data-theme="dark"]) .tab { background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.14); }
    :host([data-theme="dark"]) .card:hover, :host([data-theme="dark"]) .card:focus-visible, :host([data-theme="dark"]) .card[data-active="true"] { background:rgba(255,255,255,.10); border-color:rgba(255,255,255,.16); box-shadow:0 18px 42px rgba(0,0,0,.18); }
  `;

  function cardHtml(item, index) {
    const tag = item.tag ? `<span class="pill">${escapeHtml(item.tag)}</span>` : '';
    const status = item.status ? `<span class="pill status-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>` : '';
    const section = item.section ? `<span class="pill">${escapeHtml(item.section)}</span>` : '';
    const current = item.current ? '<span class="current" title="Current page"></span>' : '';
    return `<a class="card" href="${escapeHtml(item.href)}" data-index="${index}" data-active="${state.activeIndex === index}" aria-label="Open ${escapeHtml(item.title)}">
      <span class="icon">${escapeHtml(item.icon || '→')}</span>
      <span class="copy"><span class="title"><span>${escapeHtml(item.title)}</span>${current}</span><span class="desc">${escapeHtml(item.description || item.section || '')}</span><span class="meta">${status}${tag}${state.activeTab === 'all' || state.query ? section : ''}</span></span>
      <span class="open" aria-hidden="true">›</span>
    </a>`;
  }

  function bodyHtml() {
    if (!state.manifest && !state.error) return '<div class="loading">Loading Lataamo pages, tools and guides…</div>';
    if (state.error) return `<div class="error">Could not load Insider links.<br>${escapeHtml(state.error)}</div>`;
    const queryGroups = groupedSearchResults();
    let index = -1;
    if (queryGroups) {
      if (!queryGroups.length) return '<div class="empty">No matching assets. Try a broader search.</div>';
      return queryGroups.map((group) => `<div class="group"><div class="group-head"><span>${escapeHtml(group.label)}</span><span>${group.items.length}</span></div><div class="cards">${group.items.map((item) => cardHtml(item, ++index)).join('')}</div></div>`).join('');
    }
    const items = visibleItems();
    if (!items.length) return '<div class="empty">No assets in this category yet.</div>';
    const tabLabel = tabs().find((tab) => tab.id === state.activeTab)?.label || 'Assets';
    return `<div class="deck-title"><h3>${escapeHtml(tabLabel)}</h3><span>${items.length} item${items.length === 1 ? '' : 's'}</span></div><div class="cards">${items.map((item) => cardHtml(item, ++index)).join('')}</div>`;
  }

  function render() {
    host.dataset.theme = theme;
    const updated = state.manifest?.updated ? `Updated ${escapeHtml(state.manifest.updated)}` : 'Central manifest';
    const total = allItems().length;
    root.innerHTML = `<style>${styles}</style><div class="wrap">
      <section class="panel" ${state.open ? '' : 'hidden'} role="dialog" aria-modal="false" aria-label="${escapeHtml(state.manifest?.title || 'Lataamo Insider')}">
        <div class="hero"><div class="top"><div class="mark"><img src="${escapeHtml(logoUrl)}" alt="" aria-hidden="true"></div><div class="heading"><h2>${escapeHtml(state.manifest?.title || 'Lataamo Insider')}</h2><div class="sub">${escapeHtml(state.manifest?.subtitle || 'Pages, tools, guides and live internal assets.')}</div></div><button class="close" aria-label="Close Insider">×</button></div></div>
        <div class="controls"><div class="searchrow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" value="${escapeHtml(state.query)}" placeholder="Search pages, tools, guides…" aria-label="Search Lataamo Insider"></div><div class="tabs" role="tablist" aria-label="Insider categories">${tabs().map((tab) => `<button class="tab" type="button" role="tab" data-tab="${escapeHtml(tab.id)}" data-active="${state.activeTab === tab.id}" aria-selected="${state.activeTab === tab.id}">${escapeHtml(tab.label)}</button>`).join('')}</div></div>
        <div class="body">${bodyHtml()}</div><div class="footer"><span>${updated} · ${total} assets</span><span><span class="kbd">/</span> search · <span class="kbd">Esc</span> close · <span class="kbd">↵</span> open</span></div>
      </section>
      <button class="launcher" aria-expanded="${state.open}" aria-label="Open Lataamo Insider"><span class="launcher-mark"><img src="${escapeHtml(logoUrl)}" alt="" aria-hidden="true"></span><span class="launcher-text">${escapeHtml(launcherLabel)}</span><span class="dot" aria-hidden="true"></span></button>
    </div>`;
    bindEvents();
  }

  function bindEvents() {
    const launcher = root.querySelector('.launcher');
    const close = root.querySelector('.close');
    const input = root.querySelector('input');
    const cards = [...root.querySelectorAll('.card')];
    launcher?.addEventListener('click', () => toggle(!state.open));
    close?.addEventListener('click', () => toggle(false));
    input?.addEventListener('input', (event) => {
      state.query = event.target.value;
      state.activeIndex = -1;
      render();
      root.querySelector('input')?.focus();
    });
    root.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
      state.activeTab = tab.dataset.tab || 'featured';
      state.activeIndex = -1;
      render();
    }));
    cards.forEach((card) => card.addEventListener('mouseenter', () => {
      state.activeIndex = Number(card.dataset.index);
      root.querySelectorAll('.card').forEach((el) => { el.dataset.active = String(el === card); });
    }));
    root.querySelector('.body')?.addEventListener('mouseleave', () => {
      state.activeIndex = -1;
      root.querySelectorAll('.card').forEach((el) => { el.dataset.active = 'false'; });
    });
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
    const cards = root.querySelectorAll('.card');
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); state.activeIndex = Math.min(cards.length - 1, state.activeIndex + 1); render(); }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); state.activeIndex = Math.max(0, state.activeIndex - 1); render(); }
    if (event.key === 'Enter' && state.activeIndex >= 0 && cards[state.activeIndex]) { event.preventDefault(); cards[state.activeIndex].click(); }
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
