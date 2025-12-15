// episode.js (with Barbarossa Source 2 support)

const params = new URLSearchParams(window.location.search);
const slug = params.get('series');
const season = params.get('season');
const epNum = params.get('ep');
const source = params.get('source'); // NEW: Get source parameter
const container = document.getElementById('episode-view') || document.body;

if (!slug || !epNum) {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found (missing series or ep in URL)</div>`;
  throw new Error("Missing required param");
}

let jsonFile, backUrl;
if (season) {
  // Check if this is Barbarossa S1 Source 2
  const isBarbarossaS1Source2 = slug === 'barbarossa' && season === '1' && source === '2';
  
  // Use source2 JSON file for Barbarossa S1 Source 2, otherwise use default
  jsonFile = isBarbarossaS1Source2 
    ? `episode-data/${slug}-s${season}-source2.json`
    : `episode-data/${slug}-s${season}.json`;
  
  backUrl = `series.html?series=${slug}&season=${season}`;
} else {
  jsonFile = `episode-data/${slug}.json`;
  backUrl = `series.html?series=${slug}`;
}

const HOW_TO_DOWNLOAD_URL = "https://t.me/howtodownloadd1/10";
const PREMIUM_CHANNEL_URL = "https://t.me/itzmezain1/2905";

Promise.all([
  fetch('series.json').then(r => r.ok ? r.json() : []),
  fetch(jsonFile).then(r => r.ok ? r.json() : [])
]).then(([seriesList, episodesArray]) => {
  const meta = Array.isArray(seriesList) ? seriesList.find(s => s.slug === slug) : null;
  const ep = Array.isArray(episodesArray)
    ? episodesArray.find(e => String(e.ep) === String(epNum))
    : null;

  if (!ep) {
    container.innerHTML = `<div style="color:#fff;padding:30px;">Episode not found (ep=${epNum}) in ${jsonFile}</div>`;
    return;
  }

  renderEpisode();

  function renderEpisode() {
    const server3EmbedHTML = ep.embed3 || null;
    const server3URL = ep.watch3 || null;

    container.innerHTML = `
      <div class="pro-episode-view-polished">
        <div class="pro-episode-header-polished">
          <a class="pro-back-btn-polished" href="${backUrl}" title="Back">
            <svg width="23" height="23" viewBox="0 0 20 20" class="svg-arrow">
              <polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
            Back
          </a>
          <div class="pro-header-title-wrap">
            <span class="pro-series-bigname">${meta ? meta.title : slug.replace(/-/g, " ").toUpperCase()}</span>
            <span class="pro-ep-strong-title">${ep.title || `Episode ${ep.ep}`}</span>
          </div>
        </div>

        <!-- Sponsor Announcement -->
<div class="fullscreen-alert-msg" style="
  background: linear-gradient(90deg, #223958 20%, #091728 90%);
  padding: 15px 14px 22px 14px;
  border-radius: 10px;
  border: 2px solid #23c6ed;
  color: #23c6ed;
  font-size: 1.07em;
  margin: 18px 0 20px 0;
  font-family: inherit;
  font-weight: 600;
  line-height: 1.5;
  text-align:center;">

  <!-- Sponsor Logo -->
  <img src="sponsor.png"
       alt="Sponsor Logo"
       style="width:60px;height:60px;object-fit:cover;border-radius:12px;
       border:2px solid rgba(255,212,0,0.6);
       box-shadow:0 6px 16px rgba(255,212,0,0.6);
       margin-bottom:8px;">

  <!-- Sponsor Title -->
  <div style="font-size:1.12em;color:#ffd700;margin-top:5px;">
    Episode Sponsored by <span style="color:#fff;font-weight:800;">FX Reall Accadmy</span>
  </div>

  <!-- Sponsor Description -->
  <div style="font-size:1em;margin-top:10px;">
    Rozana <b>Forex &amp; Gold (XAUUSD)</b> trading signals ke saath  
    clear <b>Entry · SL · TP</b>, risk-managed setups &amp; live updates paayein.<br><br>

    Chahe beginner ho ya pro, smart signals follow karke  
    <b>aasani se earning start kar sakte ho</b> — sahi risk management ke saath  
    <b>lakhs tak kamaane ka mauka</b> mil sakta hai 🚀<br><br>
  </div>

  <!-- Start Earning Button -->
  <a href="https://t.me/+OKnw3z4Uq28wYzRk"
     target="_blank"
     style="
       display:inline-block;
       background:linear-gradient(135deg,#ffd22e,#ff9f00);
       color:#000;
       font-weight:800;
       padding:10px 22px;
       border-radius:12px;
       text-decoration:none;
       box-shadow:0 6px 14px rgba(255,165,0,0.45);
       font-size:0.95em;
       letter-spacing:0.5px;">
    🚀 Start Earning Now
  </a>

  <!-- Disclaimer Title -->
  <div style="margin-top:14px;font-size:1em;color:#ffd700;">
    ⚠️ Disclaimer:
  </div>

  <!-- Disclaimer Text -->
  <div style="font-size:0.86em;color:#ffb3b3;font-weight:500;margin-top:4px;">
    Forex &amp; Gold trading high-risk hoti hai.  
    Profit guaranteed nahi hota.  
    Hamesha apni research aur sahi risk management ke saath trade karein.
  </div>

</div>
        <!-- Player 1 -->
        <div class="pro-episode-embed-polished">
          ${ep.embed ? ep.embed : '<div style="padding:50px 0;color:#ccc;text-align:center;">No streaming available</div>'}
        </div>

        <!-- Player 2 -->
        <div class="pro-episode-embed-polished" style="margin-top:20px;">
          ${ep.embed2 ? ep.embed2 : '<div style="padding:50px 0;color:#ccc;text-align:center;">Second video not available</div>'}
        </div>

        <!-- Watch Server 3 -->
        <div style="margin:22px 0 10px 0;">
          <button id="watch3Btn"
                  class="pro-download-btn-polished"
                  style="display:block;width:100%;max-width:500px;margin:0 auto 12px auto;background:#e53935;color:#fff;"
                  ${server3EmbedHTML || server3URL ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#6b2a2a;color:#ddd;'"}>▶️ Watch (Server 3)</button>
        </div>

        <!-- Download Buttons -->
        <div style="margin:10px 0 8px 0;">
          <a class="pro-download-btn-polished"
              href="${ep.download || "#"}"
              download
              style="display:block;width:100%;max-width:500px;margin:0 auto 12px auto;background:#198fff;"
              ${ep.download ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>📥 Telegram Download (Server 1)</a>
        </div>

        <div style="margin:8px 0;">
          <button class="pro-download-btn-polished"
                  id="download2Btn"
                  style="display:block;width:100%;max-width:500px;margin:0 auto;background:#30c96b;"
                  ${ep.download2 ? "" : "tabindex='-1' aria-disabled='true' style='pointer-events:none;opacity:0.7;background:#555;'"}>📥 Download (Server 2)</button>
        </div>

        <a class="pro-tutorial-btn"
          href="${HOW_TO_DOWNLOAD_URL}"
          target="_blank"
          rel="noopener"
          style="display:block;background:#234a63;color:#fff;padding:12px 28px;margin:8px 0 0 0;border-radius:8px;text-align:center;font-weight:600;text-decoration:none;font-size:1.03em;">
          📘 How to Download (Tutorial)
        </a>

        <a class="pro-premium-btn"
          href="${PREMIUM_CHANNEL_URL}"
          target="_blank"
          rel="noopener"
          style="display:block;background:#099c7d;color:#fff;padding:13px 28px;margin:12px 0 0 0;border-radius:8px;text-align:center;font-weight:600;font-size:1.11em;text-decoration:none;letter-spacing:0.01em;">
          🌟 Join Premium Channel
        </a>
      </div>

      <!-- Modal for Watch Server 3 -->
      <div id="watch3Modal" style="position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;z-index:1000;padding:16px;">
        <div id="watch3Box" style="width:100%;max-width:920px;aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;position:relative;">
          <button id="watch3Close" aria-label="Close" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:6px;padding:8px 10px;cursor:pointer;z-index:3;">✕</button>
          <div id="watch3Content" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#bbb;font:600 14px system-ui;">Loading…</div>
        </div>
      </div>
    `;

    // --- Lazy load video embeds ---
    const embedWraps = container.querySelectorAll('.pro-episode-embed-polished');
    embedWraps.forEach(embedWrap => {
      const placeholders = embedWrap.querySelectorAll('[data-embed-src]');
      if (placeholders.length) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              const src = e.target.getAttribute('data-embed-src');
              const i = document.createElement("iframe");
              i.src = src;
              i.loading = 'lazy';
              i.width = '100%';
              i.height = '100%';
              i.setAttribute('frameborder', "0");
              i.setAttribute('allow', "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share");
              i.setAttribute('referrerpolicy', "strict-origin-when-cross-origin");
              i.setAttribute('allowfullscreen', "");
              e.target.replaceWith(i);
              io.unobserve(e.target);
            }
          });
        }, { rootMargin: '400px' });
        placeholders.forEach(el => io.observe(el));
      }

      embedWrap.querySelectorAll('iframe').forEach((f, idx) => {
        const shouldLazy = idx > 0 || window.matchMedia('(max-width: 767px)').matches;
        if (shouldLazy && !f.hasAttribute('loading')) f.setAttribute('loading', 'lazy');
        if (!f.hasAttribute('referrerpolicy')) f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        if (!f.hasAttribute('allow')) f.setAttribute('allow', "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share");
        if (!f.hasAttribute('width')) f.setAttribute('width', "100%");
        if (!f.hasAttribute('height')) f.setAttribute('height', "100%");
        if (!f.hasAttribute('frameborder')) f.setAttribute('frameborder', "0");
        if (!f.hasAttribute('allowfullscreen')) f.setAttribute('allowfullscreen', '');
        if (!f.hasAttribute('decoding')) f.setAttribute('decoding', 'async');
      });
    });

    // Download 2 Button Action
    const download2Btn = document.getElementById("download2Btn");
    if (download2Btn && ep.download2) {
      download2Btn.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = ep.download2;
      });
    }

    // Watch Server 3 behavior
    const watch3Btn = document.getElementById("watch3Btn");
    const watch3Modal = document.getElementById("watch3Modal");
    const watch3Content = document.getElementById("watch3Content");
    const watch3Close = document.getElementById("watch3Close");

    if (watch3Btn && (server3EmbedHTML || server3URL)) {
      watch3Btn.addEventListener("click", (e) => {
        e.preventDefault();
        // If a direct URL is provided, open in new tab
        if (server3URL) {
          window.open(server3URL, "_blank", "noopener");
          return;
        }
        // Otherwise, show modal with provided HTML (iframe/snippet)
        if (server3EmbedHTML) {
          watch3Content.innerHTML = server3EmbedHTML;
          const iframe = watch3Content.querySelector("iframe");
          if (iframe) {
            if (!iframe.hasAttribute('width')) iframe.setAttribute('width', '100%');
            if (!iframe.hasAttribute('height')) iframe.setAttribute('height', '100%');
            iframe.setAttribute('loading', 'lazy');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow', "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share");
            iframe.setAttribute('referrerpolicy', "strict-origin-when-cross-origin");
            iframe.setAttribute('allowfullscreen', '');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.display = 'block';
          }
          watch3Modal.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }
      });
    }

    // Close modal handlers
    if (watch3Close && watch3Modal) {
      const closeModal = () => {
        watch3Modal.style.display = 'none';
        document.body.style.overflow = '';
        watch3Content.innerHTML = '';
      };
      watch3Close.addEventListener('click', closeModal);
      watch3Modal.addEventListener('click', (e) => {
        if (e.target === watch3Modal) closeModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && watch3Modal.style.display === 'flex') {
          e.preventDefault();
          watch3Close.click();
        }
      });
    }
  }
}).catch((err) => {
  container.innerHTML = `<div style="color:#fff;padding:30px;">Could not load episode info. Error: ${err.message}</div>`;
});
