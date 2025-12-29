// series.js - WITH FEATURE TOGGLE SYSTEM AND SHORTLINK REDIRECTION
(function () {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const seasonQuery = qs.get('season') || '1';

  let currentSource = 1;
  let featureConfig = null; // Store loaded config
  let currentEpisodesData = []; // Store episode data for shortlink checking

  const HOWTO_PROCESS_1 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg466/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;
  const HOWTO_PROCESS_2 = `<iframe class="rumble" width="640" height="360" src="https://rumble.com/embed/v6yg45g/?pub=4ni0h4" frameborder="0" allowfullscreen></iframe>`;

  // LOAD CONFIG.JSON AT START
  async function loadFeatureConfig() {
    try {
      const response = await fetch('/config.json', { cache: 'no-cache' });
      if (response.ok) {
        const config = await response.json();
        featureConfig = config.redirectionFeatures;
        console.log('Feature config loaded:', featureConfig);
      } else {
        console.warn('config.json not found, defaulting to sponsor popup');
        featureConfig = { shortlink: false, sponsorPopup: true };
      }
    } catch (error) {
      console.warn('Error loading config.json:', error);
      featureConfig = { shortlink: false, sponsorPopup: true };
    }
  }

  // HANDLE EPISODE CLICK WITH FEATURE TOGGLE AND SHORTLINK CHECK
  function handleEpisodeClick(event, episodeData) {
    event.preventDefault();
    
    if (!featureConfig) {
      console.error('Config not loaded yet');
      return;
    }

    const { seriesSlug, season, episode, lang, source } = episodeData;

    // Check which feature is enabled
    if (featureConfig.shortlink && !featureConfig.sponsorPopup) {
      // SHORTLINK MODE: Check if episode has shortlink in JSON
      const episodeObj = currentEpisodesData.find(ep => String(ep.ep) === String(episode));
      
      if (episodeObj && episodeObj.shortlink) {
        // Episode has shortlink - redirect to it
        console.log('Redirecting to shortlink:', episodeObj.shortlink);
        
        // Track with Google Analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'shortlink_redirect', {
            'episode': seriesSlug + '_s' + season + 'e' + episode,
            'shortlink_url': episodeObj.shortlink
          });
        }
        
        window.location.href = episodeObj.shortlink;
        return;
      } else {
        // No shortlink found - open episode.html directly
        console.log('No shortlink found, opening episode page directly');
      }
    }

    // DEFAULT: SPONSOR POPUP MODE or NO SHORTLINK - Go to episode.html
    let episodeUrl = `episode.html?series=${encodeURIComponent(seriesSlug)}&season=${encodeURIComponent(season)}&ep=${encodeURIComponent(episode)}`;
    
    if (lang) {
      episodeUrl += '&lang=' + encodeURIComponent(lang);
    }
    
    if (source) {
      episodeUrl += '&source=' + encodeURIComponent(source);
    }
    
    // Track with Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'episode_page_visit', {
        'episode': seriesSlug + '_s' + season + 'e' + episode,
        'access_type': featureConfig.sponsorPopup ? 'sponsor_popup' : 'direct'
      });
    }
    
    console.log('Opening episode page:', episodeUrl);
    window.location.href = episodeUrl;
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
    } catch (e) {}
  }

  const injectedStyles = `
    .pro-episodes-row-pro{ -webkit-overflow-scrolling: touch; }
    .pro-episodes-row-wrap-pro { transition: min-height .18s ease; }
    .pro-episodes-row-wrap-pro.is-loading { opacity: .72; pointer-events: none; }
    .pro-episode-card-pro { transition: transform .28s ease, opacity .28s ease; }
    .reveal-item { opacity: 0; transform: translateY(10px); }
    .reveal-item.show { opacity: 1; transform: translateY(0); }
  `;
  try { 
    const s = document.createElement('style'); 
    s.textContent = injectedStyles; 
    document.head.appendChild(s); 
  } catch(e){}

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`=/]/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' }[c];
    });
  }

  async function fetchEpisodesWithCandidates(season) {
    const candidates = [
      `episode-data/${slug}-${lang}-sub-s${season}.json`,
      `episode-data/${slug}-s${season}.json`,
      `episode-data/${slug}-s${season}-${lang}.json`,
      `episode-data/${slug}-s${season}-en.json`,
      `episode-data/${slug}-s${season}-hi.json`,
      `episode-data/${slug}-s${season}-ur.json`
    ].filter(Boolean);

    const tried = [];

    for (const cand of candidates) {
      try {
        const path = cand.startsWith('/') ? cand : '/' + cand;
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

  async function fetchBarbarossaEpisodes(season, source) {
    const fileName = source === 2 
      ? `episode-data/${slug}-s${season}-source2.json`
      : `episode-data/${slug}-s${season}.json`;
    
    try {
      const path = fileName.startsWith('/') ? fileName : '/' + fileName;
      const url = bust(path);
      const resp = await fetch(url, { cache: 'no-cache' });
      
      if (!resp.ok) {
        throw new Error('HTTP ' + resp.status);
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
      // LOAD CONFIG FIRST
      await loadFeatureConfig();

      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r, { once: true }));
      }
      await new Promise(r => setTimeout(r, 20));

      const detailsEl = document.getElementById('series-details');
      if (!detailsEl) {
        console.warn('series.js: #series-details not found');
        return;
      }

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

        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs"></nav>
        <div id="source-selector-container" style="display:none;"></div>
        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap"></section>
      `;

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
          updateSourceSelector(newSeason);
          loadSeason(newSeason).catch(err => console.error('loadSeason error', err));
        });
      });

      function updateSourceSelector(season) {
        const container = document.getElementById('source-selector-container');
        if (!container) return;

        const showSelector = slug === 'barbarossa' && season === '1';
        
        if (showSelector) {
          container.style.display = 'block';
          container.innerHTML = `
            <div class="source-selector">
              <button class="source-btn active" data-source="1">Source 1</button>
              <button class="source-btn" data-source="2">Source 2</button>
            </div>
          `;
          
          container.querySelectorAll('.source-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              currentSource = parseInt(this.dataset.source);
              container.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
              this.classList.add('active');
              toast('Loading Source ' + currentSource + '...');
              loadSeason(season).catch(err => {
                console.error('Source switch error', err);
                toast('Failed to load source');
              });
            });
          });
        } else {
          container.style.display = 'none';
          container.innerHTML = '';
          currentSource = 1;
        }
      }

      updateSourceSelector(seasonQuery);
      await loadSeason(seasonQuery);
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch(e){ window.scrollTo(0,0); }

      async function loadSeason(season) {
        const wrap = document.getElementById('pro-episodes-row-wrap');
        if (!wrap) return;

        const prevMin = wrap.style.minHeight || '';
        const prevClientH = wrap.clientHeight || 0;
        if (prevClientH > 0) wrap.style.minHeight = prevClientH + 'px';

        wrap.classList.add('is-loading');
        wrap.innerHTML = `<div style="color:#ddd;padding:12px 0;">Loading episodes...</div>`;

        try {
          const isBarbarossaSpecial = slug === 'barbarossa' && season === '1';
          
          const result = isBarbarossaSpecial 
            ? await fetchBarbarossaEpisodes(season, currentSource)
            : await fetchEpisodesWithCandidates(season);

          const episodes = result.episodes;

          // STORE EPISODES DATA FOR SHORTLINK CHECKING
          currentEpisodesData = episodes;

          if (!Array.isArray(episodes) || episodes.length === 0) {
            wrap.innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            wrap.classList.remove('is-loading');
            wrap.style.minHeight = prevMin;
            return;
          }

          const cardsHtml = episodes.map(ep => {
            const epNum = escapeHtml(String(ep.ep || ''));
            const epTitle = escapeHtml(ep.title || ('Episode ' + epNum));
            const thumb = escapeHtml(ep.thumb || 'default-thumb.jpg');
            
            // Determine source parameter
            const isBarbarossaS1Source2 = slug === 'barbarossa' && season === '1' && currentSource === 2;
            const sourceParam = isBarbarossaS1Source2 ? currentSource : null;
            
            return `
              <a class="pro-episode-card-pro reveal-item" 
                 href="#" 
                 data-series="${escapeHtml(slug)}"
                 data-season="${escapeHtml(season)}"
                 data-episode="${epNum}"
                 data-lang="${escapeHtml(lang)}"
                 data-source="${sourceParam || ''}"
                 tabindex="-1" 
                 aria-label="${epTitle}">
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

          wrap.innerHTML = `<div class="pro-episodes-row-pro" role="list">${cardsHtml}</div>` + tutorialBlock;

          // ADD CLICK HANDLERS TO EPISODE CARDS
          const episodeCards = wrap.querySelectorAll('.pro-episode-card-pro');
          episodeCards.forEach(card => {
            card.addEventListener('click', function(e) {
              handleEpisodeClick(e, {
                seriesSlug: this.dataset.series,
                season: this.dataset.season,
                episode: this.dataset.episode,
                lang: this.dataset.lang || null,
                source: this.dataset.source || null
              });
            });
          });

          const scroller = wrap.querySelector('.pro-episodes-row-pro');
          if (scroller) {
            const items = Array.from(scroller.querySelectorAll('.reveal-item'));
            items.forEach((it, i) => {
              setTimeout(() => {
                try { it.classList.add('show'); } catch(e){}
              }, 60 + i * 26);
            });
          }

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
              details = 'Check file: ' + lastTried.path;
            } else if (!lastTried.ok) {
              errorMsg = 'Episode file not found';
              details = 'Looking for: ' + lastTried.path;
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
