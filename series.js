// series.js — ready to replace (with Barbarossa Source Selector feature)
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  // Source tracking for Barbarossa S1
  let currentSource = 1;
  const isBarbarossaS1 = (slug === 'barbarossa' || slug === 'barbarossa-brothers') && seasonQuery === '1';

  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  function jsonFor(season) {
    if (!slug) return null;
    
    // Special handling for Barbarossa S1 with source selector
    if ((slug === 'barbarossa' || slug === 'barbarossa-brothers') && season === '1') {
      if (currentSource === 2) {
        return `episode-data/${slug}-s${season}-source2.json`;
      }
      return `episode-data/${slug}-s${season}.json`;
    }
    
    // Regular logic for other series
    if (lang === 'dub') return `episode-data/${slug}-s${season}.json`;
    if (lang && ['en', 'hi', 'ur'].includes(lang)) return `episode-data/${slug}-s${season}-${lang}.json`;
    return `episode-data/${slug}-s${season}.json`;
  }

  function bust(url) {
    const v = (qs.get('v') || '1');
    return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  }

  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:99999;font-family:Montserrat,sans-serif;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2600);
    } catch (e) { console.warn('toast error', e); }
  }

  // injected styles (keeps cards compact if no CSS update) + small animations
  const injectedStyles = `
    /* minimal safety styles in case CSS doesn't load */
    .pro-episodes-row-pro{ -webkit-overflow-scrolling: touch; }

    /* loading / smooth transition helpers */
    .pro-episodes-row-wrap-pro { transition: min-height .18s ease; }
    .pro-episodes-row-wrap-pro.is-loading { opacity: .72; pointer-events: none; filter: blur(.6px) contrast(.98); }
    .pro-episode-card-pro { transition: transform .28s ease, opacity .28s ease; }
    .reveal-item { opacity: 0; transform: translateY(10px); }
    .reveal-item.show { opacity: 1; transform: translateY(0); }
  `;
  try { const s = document.createElement('style'); s.textContent = injectedStyles; document.head.appendChild(s); } catch(e){}

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`=/]/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c];
    });
  }

  // Try several candidate episode JSON paths and return episodes + diagnostics
  async function fetchEpisodesWithCandidates(season) {
    const candidates = [
      `episode-data/${slug}-${lang}-sub-s${season}.json`,
      `episode-data/${slug}-s${season}.json`,
      `episode-data/${slug}-s${season}-${lang}.json`,
      `episode-data/${slug}-s${season}-en.json`,
      `episode-data/${slug}-s${season}-hi.json`,
      `episode-data/${slug}-s${season}-ur.json`,
      `episode-data/${slug}-s${season}-sub.json`,
      `episode-data/${slug}-s${season}-en-sub.json`
    ].filter(Boolean);

    const tried = [];

    for (const cand of candidates) {
      try {
        const path = cand.startsWith('/') ? cand : '/' + cand.replace(/^/+/, '');
        const url = bust(path);
        const resp = await fetch(url, { cache: 'no-cache' });
        const rec = { path: cand, ok: resp.ok, status: resp.status, err: null };
        const text = await resp.text();
        try {
          const parsed = JSON.parse(text);
          return { episodes: parsed, tried: [...tried, rec] };
        } catch (parseErr) {
          rec.err = 'json-parse: ' + (parseErr.message || parseErr);
          tried.push(rec);
          continue;
        }
      } catch (fetchErr) {
        tried.push({ path: cand, ok: false, status: null, err: String(fetchErr) });
        continue;
      }
    }

    throw { tried };
  }

  // Special fetch for Barbarossa with source selector
  async function fetchBarbarossaEpisodes(season, source) {
    const fileName = source === 2 
      ? `episode-data/${slug}-s${season}-source2.json`
      : `episode-data/${slug}-s${season}.json`;
    
    try {
      const path = fileName.startsWith('/') ? fileName : '/' + fileName.replace(/^/+/, '');
      const url = bust(path);
      const resp = await fetch(url, { cache: 'no-cache' });
      
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} for ${fileName}`);
      }
      
      const text = await resp.text();
      const parsed = JSON.parse(text);
      return { episodes: parsed, tried: [{ path: fileName, ok: true, status: resp.status }] };
    } catch (err) {
      throw { tried: [{ path: fileName, ok: false, err: String(err) }] };
    }
  }

  (async function init() {
    try {
      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r, { once: true }));
      }
      // small pause so layout available
      await new Promise(r => setTimeout(r, 20));

      const detailsEl = document.getElementById('series-details');
      if (!detailsEl) {
        console.warn('series.js: #series-details not found');
        return;
      }

      // load series.json
      let seriesList;
      try {
        const r = await fetch('/series.json', { cache: 'no-cache' });
        if (!r.ok) throw new Error('series.json HTTP ' + r.status);
        const j = await r.json();
        seriesList = Array.isArray(j) ? j : (j && Array.isArray(j.series) ? j.series : null);
      } catch (e) {
        detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Could not load series list. Try again later.</div>`;
        console.error('Failed loading series.json', e);
        return;
      }

      if (!slug) {
        detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Open a series from Home or the Series tab.</div>`;
        return;
      }

      const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;
      if (!meta) {
        detailsEl.innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
        return;
      }

      // Ensure view is at top of the page when opening a series
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch(e){ window.scrollTo(0,0); }

      document.title = `${meta.title} – SmTv Urdu`;

      const premiumMsg = `
        <div class="premium-channel-message">
          <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.
          <div class="premium-btn-row"><a href="/premium.html" class="btn-primary" rel="noopener">Join Premium</a></div>
        </div>
      `;

      detailsEl.innerHTML = `
        <section class="pro-series-header-pro">
          <a href="/index.html" class="pro-series-back-btn-pro" title="Back" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          </a>
          <img class="pro-series-poster-pro" src="${escapeHtml(meta.poster || '')}" alt="${escapeHtml(meta.title || '')}">
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${escapeHtml(meta.title || '')}</h2>
            <div class="pro-series-desc-pro">${escapeHtml((meta.desc && meta.desc.en) ? meta.desc.en : (meta.desc || ''))}</div>
            ${premiumMsg}
          </div>
        </section>

        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px;"></nav>

        <div id="source-selector-container" style="display:none;"></div>

        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap" style="margin-top:14px;"></section>
      `;

      // build seasons
      let seasons = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
      } else if (Array.isArray(meta.seasons)) {
        seasons = meta.seasons.map(s => String(s));
      } else seasons = ['1'];

      const tabsEl = document.getElementById('pro-seasons-tabs');
      tabsEl.innerHTML = seasons.map(s => `<button data-season="${s}" class="pro-season-tab-pro${s === seasonQuery ? ' active' : ''}">Season ${s}</button>`).join('');
      
      tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
        btn.addEventListener('click', () => {
          tabsEl.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const newSeason = btn.dataset.season;
          
          // Update source selector visibility
          updateSourceSelector(newSeason);
          
          loadSeason(newSeason).catch(err => {
            console.error('loadSeason error', err);
          });
        });
      });

      // Initialize source selector for Barbarossa S1
      function updateSourceSelector(season) {
        const container = document.getElementById('source-selector-container');
        if (!container) return;

        const showSelector = (slug === 'barbarossa' || slug === 'barbarossa-brothers') && season === '1';
        
        if (showSelector) {
          container.style.display = 'block';
          container.innerHTML = `
            <div class="source-selector">
              <button class="source-btn active" data-source="1">Source 1</button>
              <button class="source-btn" data-source="2">Source 2</button>
            </div>
          `;
          
          // Add click handlers
          container.querySelectorAll('.source-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              currentSource = parseInt(this.dataset.source);
              
              // Update button states
              container.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
              this.classList.add('active');
              
              // Reload episodes with new source
              toast(`Loading Source ${currentSource}...`);
              loadSeason(season).catch(err => {
                console.error('Source switch error', err);
                toast('Failed to load source');
              });
            });
          });
        } else {
          container.style.display = 'none';
          container.innerHTML = '';
          currentSource = 1; // Reset to default
        }
      }

      // Initial source selector setup
      updateSourceSelector(seasonQuery);

      // initial load (keep at top)
      await loadSeason(seasonQuery);
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch(e){ window.scrollTo(0,0); }

      async function loadSeason(season) {
        const wrap = document.getElementById('pro-episodes-row-wrap');
        if (!wrap) return;

        // lock current height to avoid jump during replacement
        const prevMin = wrap.style.minHeight || '';
        const prevClientH = wrap.clientHeight || 0;
        if (prevClientH > 0) wrap.style.minHeight = prevClientH + 'px';

        // show loading state
        wrap.classList.add('is-loading');
        wrap.innerHTML = `<div style="color:#ddd;padding:12px 0;">Loading episodes...</div>`;

        try {
          // Use special Barbarossa fetch if applicable
          const isBarbarossaSpecial = (slug === 'barbarossa' || slug === 'barbarossa-brothers') && season === '1';
          
          const { episodes, tried } = await (async () => {
            try {
              if (isBarbarossaSpecial) {
                return await fetchBarbarossaEpisodes(season, currentSource);
              } else {
                return await fetchEpisodesWithCandidates(season);
              }
            } catch (err) {
              throw err;
            }
          })();

          if (!Array.isArray(episodes) || episodes.length === 0) {
            wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            wrap.classList.remove('is-loading');
            wrap.style.minHeight = prevMin;
            return;
          }

          // build compact carousel cards (add reveal-item class for animation)
          const cardsHtml = episodes.map(ep => {
            const epNum = escapeHtml(String(ep.ep || ''));
            const epTitle = escapeHtml(ep.title || ('Episode ' + epNum));
            const thumb = escapeHtml(ep.thumb || 'default-thumb.jpg');
            const episodeUrl = `episode.html?series=${encodeURIComponent(slug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(ep.ep)}${lang?('&lang='+encodeURIComponent(lang)) : ''}`;
            return `
              <a class="pro-episode-card-pro reveal-item" href="${episodeUrl}" tabindex="-1" aria-label="${epTitle}">
                <div class="pro-ep-thumb-wrap-pro">
                  <img class="pro-ep-thumb-pro" src="${thumb}" alt="${epTitle}">
                  <span class="pro-ep-num-pro">Ep ${epNum}</span>
                </div>
                <div class="pro-ep-title-pro">${epTitle}</div>
              </a>
            `;
          }).join('');

          const tutorialBlock = `
            <div class="pro-tutorial-title">How to Watch Episodes</div>
            <div class="pro-video-frame-wrap">${HOWTO_PROCESS_1}</div>
            <div style="height:14px"></div>
            <div class="pro-tutorial-title" style="margin-top:12px;">How to Watch (Old Process)</div>
            <div class="pro-video-frame-wrap">${HOWTO_PROCESS_2}</div>
          `;

          // render without focusing any element or calling scrollIntoView
          wrap.innerHTML = `<div class="pro-episodes-row-pro" role="list">${cardsHtml}</div>` + tutorialBlock;

          // reveal animation: staggered
          const scroller = wrap.querySelector('.pro-episodes-row-pro');
          if (scroller) {
            const items = Array.from(scroller.querySelectorAll('.reveal-item'));
            items.forEach((it, i) => {
              setTimeout(() => {
                try { it.classList.add('show'); } catch(e){}
              }, 60 + i * 26);
            });
          }

          // clear loading and restore minHeight after a short delay
          setTimeout(() => {
            wrap.classList.remove('is-loading');
            wrap.style.minHeight = prevMin;
          }, 360);

        } catch (err) {
          let errorMsg = 'No episodes found';
          let details = '';
          
          if (err && err.tried && err.tried.length > 0) {
            const lastTried = err.tried[err.tried.length - 1];
            if (lastTried.err && lastTried.err.includes('json-parse')) {
              errorMsg = 'JSON file has syntax error';
              details = `Check file: ${lastTried.path}`;
            } else if (!lastTried.ok) {
              errorMsg = 'Episode file not found';
              details = `Looking for: ${lastTried.path}`;
            }
          }
          
          wrap.innerHTML = `
            <div style="background:#1a1f2e;color:#fff;padding:18px;border-radius:12px;border:1px solid #ff6b6b;">
              <div style="font-size:16px;font-weight:700;color:#ff6b6b;margin-bottom:8px;">⚠️ ${errorMsg}</div>
              ${details ? `<div style="font-size:13px;color:#aaa;font-family:monospace;">${details}</div>` : ''}
            </div>
          `;
          
          console.error('Episode load error:', err);
          wrap.classList.remove('is-loading');
          wrap.style.minHeight = prevMin;
        }
      }

    } catch (err) {
      console.error('series.js fatal', err);
      const el = document.getElementById('series-details');
      if (el) el.innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    }
  })();
})();
