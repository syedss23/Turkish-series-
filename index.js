document.addEventListener('DOMContentLoaded', () => {
  // Sidebar controls
  const sbar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => sbar.classList.toggle('open'));
  document.getElementById('sidebarClose')?.addEventListener('click', () => sbar.classList.remove('open'));

  // Utility: move filter bar under New Episodes
  function moveFilterBarBelowNewEpisodes() {
    const filterBar = document.querySelector('.filter-bar');
    const newEpisodesSection = document.querySelector('.new-episodes-section');
    if (filterBar && newEpisodesSection && newEpisodesSection.parentNode) {
      newEpisodesSection.parentNode.insertBefore(filterBar, newEpisodesSection.nextSibling);
    }
  }
  moveFilterBarBelowNewEpisodes();

  // ====== MODERN SCHEDULE BAR (Compact + Countdown + LIVE) ======
  const scheduleBar = document.getElementById('schedule-bar');
  if (scheduleBar) {
    fetch('shedule.json')
      .then(r => r.json())
      .then(schedule => {
        if (!Array.isArray(schedule) || !schedule.length) {
          scheduleBar.innerHTML = `
            <div style="color:#ffd700;font-size:1em;padding:1em;text-align:center;">
              No schedule yet.
            </div>`;
          return;
        }

        scheduleBar.innerHTML = schedule.map(item => {
          const title = item.title || '';
          const poster = item.poster || '';
          const day = item.day || '';
          const time = item.time || '';
          const type = item.type || '';
          const live = !!item.live;
          const countdown = item.countdown || '';

          return `
            <div class="schedule-entry"
                 title="${title}"
                 style="display:flex;align-items:center;gap:8px;margin-right:12px;
                        background:#14141a;padding:6px 10px;border-radius:12px;
                        box-shadow:0 1px 5px rgba(0,0,0,0.4);min-width:fit-content;">
              ${poster ? `
                <img src="${poster}" alt="${title}" loading="lazy" decoding="async"
                     style="width:30px;height:30px;object-fit:cover;border-radius:6px;">` : ''
              }
              <div style="display:flex;flex-direction:column;line-height:1.15;min-width:0;">
                <!-- Title -->
                <div style="font-weight:700;font-size:0.92em;color:#23c6ed;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span class="title" style="overflow-wrap:anywhere;">${title}</span>
                  ${live ? '<span style="background:#ff2d2d;color:#fff;padding:1px 6px;border-radius:6px;font-size:0.7em;">LIVE</span>' : ''}
                </div>

                <!-- One compact line: day • time • type (small, old-style) -->
                <div class="schedule-row"
                     style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px;font-size:0.86em;line-height:1.25;">
                  ${day  ? `<span class="day"  style="color:#ffd267;font-weight:600;">${day}</span>` : ''}
                  ${(day && time) ? '<span class="dot" style="opacity:.6;">•</span>' : ''}
                  ${time ? `<span class="time" style="color:#9fd3ff;font-weight:600;">${time}</span>` : ''}
                  ${type ? `<span class="dot" style="opacity:.6;">•</span><span class="type" style="color:#23c6ed;font-weight:600;">${type}</span>` : ''}
                </div>

                <!-- Countdown below, slightly smaller -->
                ${countdown ? `<div class="countdown"
                                  data-time="${countdown}"
                                  style="color:#ffd84d;font-size:0.78em;margin-top:2px;"></div>` : ''}
              </div>
            </div>
          `;
        }).join('');

        // Countdown updater
        const countdowns = scheduleBar.querySelectorAll('.countdown');
        countdowns.forEach(el => {
          const targetTime = Date.parse(el.dataset.time);
          if (isNaN(targetTime)) { el.textContent = ''; return; }

          const tick = () => {
            const diff = targetTime - Date.now();
            if (diff <= 0) {
              el.textContent = 'Now Playing';
              clearInterval(id);
              return;
            }
            const hrs  = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            el.textContent = `Starts in ${hrs}h ${mins}m ${secs}s`;
          };
          tick();
          const id = setInterval(tick, 1000);
        });
      })
      .catch(() => {
        scheduleBar.innerHTML = `
          <div style="color:#ffd700;font-size:1em;padding:1em;text-align:center;">
            Could not load schedule.
          </div>`;
      });
  }

  // ===== New Episodes Horizontal Card Grid =====
  const newGrid = document.getElementById('new-episodes-grid');
  if (newGrid) {
    fetch('episode-data/index.json')
      .then(r => r.json())
      .then(files => Promise.all(
        files.map(path =>
          fetch(path)
            .then(res => res.ok ? res.json() : [])
            .then(data => (Array.isArray(data) ? data.map(ep => ({ ...ep, _src: path })) : []))
            .catch(() => [])
        )
      ))
      .then(arrays => {
        const allEpisodes = arrays.flat().filter(ep => ep.timestamp);
        allEpisodes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestEps = allEpisodes.slice(0, 5);

        if (!latestEps.length) {
          newGrid.innerHTML = `<div style="color:#fff;font-size:1em;padding:1.2em;text-align:center;">No new episodes found.</div>`;
          moveFilterBarBelowNewEpisodes();
          return;
        }

        newGrid.innerHTML = `
          <div style="display:flex;gap:14px;overflow-x:auto;padding:0 2px 2px 2px;">
            ${latestEps.map(ep => `
              <div class="episode-card-pro"
                   style="flex:0 0 166px;min-width:150px;max-width:172px;
                          border-radius:13px;background:#182837;
                          box-shadow:0 4px 18px #0fd1cec7,0 2px 10px #0003;">
                <img src="${ep.thumb || ep.poster || ''}"
                     class="episode-img-pro"
                     alt="${ep.title || ('Episode ' + (ep.ep || ''))}"
                     loading="lazy" decoding="async"
                     style="display:block;border-radius:13px 13px 0 0;width:100%;
                            height:110px;object-fit:cover;">
                <div class="episode-title-pro"
                     style="margin:15px 0 4px 0;font-family:'Montserrat',sans-serif;
                            font-size:1.07em;font-weight:700;color:#fff;text-align:center;">
                  ${ep.title || 'Episode ' + (ep.ep || '')}
                  <span class="new-badge-pro"
                        style="margin-left:7px;background:#ffd700;color:#182734;
                               font-size:.78em;border-radius:5px;padding:2.3px 9px;">NEW</span>
                </div>
                <a href="${ep.shortlink || ep.download || '#'}"
                   class="watch-btn-pro"
                   target="_blank" rel="noopener"
                   style="margin-bottom:13px;width:86%;display:block;
                          background:linear-gradient(90deg,#009aff 65%,#ffd700 100%);
                          color:#fff;font-weight:700;text-decoration:none;text-align:center;
                          border-radius:5px;padding:8px 0;font-family:'Montserrat',sans-serif;
                          font-size:1em;box-shadow:0 1px 10px #0087ff14;
                          margin-left:auto;margin-right:auto;">
                  Watch Now
                </a>
              </div>
            `).join('')}
          </div>
        `;
        moveFilterBarBelowNewEpisodes();
      })
      .catch(() => {
        newGrid.innerHTML = `<div style="color:#fff;font-size:1em;padding:1.2em;text-align:center;">Could not load new episodes.</div>`;
        moveFilterBarBelowNewEpisodes();
      });
  }

  // ------------- Series homepage grid: unchanged -------------
  const grid = document.getElementById('series-grid');
  if (grid) {
    const search   = document.getElementById('search');
    const pillDub  = document.getElementById('pill-dub');
    const pillSub  = document.getElementById('pill-sub');
    const subLangs = document.getElementById('sub-langs');

    let SERIES = [];
    const qs = new URLSearchParams(location.search);
    let state = {
      track: qs.get('track') || localStorage.getItem('track')   || 'dubbed',
      lang:  qs.get('lang')  || localStorage.getItem('subLang') || 'en',
      q: ''
    };

    fetch('series.json')
      .then(r => { if (!r.ok) throw new Error('Series JSON not found. Check /series.json'); return r.json(); })
      .then(data => { SERIES = Array.isArray(data) ? data : []; hydrateUI(); render(); })
      .catch(err => { grid.innerHTML = `<div style="color:#f44;padding:1.2em;">Error: ${err.message}</div>`; });

    function hydrateUI() {
      setPrimary(state.track);
      toggleSubLangs();
      subLangs?.querySelectorAll('.pill').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === state.lang);
        b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang));
      });
    }

    function setPrimary(track) {
      state.track = track;
      localStorage.setItem('track', track);
      pillDub?.classList.toggle('active', track === 'dubbed');
      pillSub?.classList.toggle('active', track === 'sub');
      pillDub?.setAttribute('aria-pressed', String(track === 'dubbed'));
      pillSub?.setAttribute('aria-pressed', String(track === 'sub'));
    }

    function toggleSubLangs() {
      if (!subLangs) return;
      subLangs.classList.toggle('hidden', state.track !== 'sub');
    }

    function setLang(lang) {
      state.lang = lang;
      localStorage.setItem('subLang', lang);
      subLangs?.querySelectorAll('.pill').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
        b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
      });
    }

    pillDub?.addEventListener('click', () => { setPrimary('dubbed'); toggleSubLangs(); render(); });
    pillSub?.addEventListener('click', () => { setPrimary('sub'); toggleSubLangs(); render(); });
    subLangs?.addEventListener('click', e => {
      const t = e.target;
      if (t && t.matches('.pill') && t.dataset.lang) { setLang(t.dataset.lang); render(); }
    });
    search?.addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); render(); });

    function render() {
      let list = SERIES;
      if (state.track === 'dubbed') {
        list = list.filter(s => s.track === 'dubbed');
      } else {
        list = list.filter(s => s.track === 'sub' && s.subLang === state.lang);
      }
      if (state.q) list = list.filter(s => (s.title || '').toLowerCase().includes(state.q));
      grid.innerHTML = list.length ? list.map(s => `
        <a class="card" href="series.html?series=${s.slug}">
          <img src="${s.poster}" alt="${s.title}" loading="lazy" decoding="async">
          <div class="title">${s.title}</div>
        </a>
      `).join('') : `<div style="color:#fff;font-size:1.1em;padding:1.5em;">No series found.</div>`;
    }
  }
});
