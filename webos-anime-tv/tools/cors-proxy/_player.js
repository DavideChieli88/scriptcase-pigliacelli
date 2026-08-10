(function() {
    const numericId = "1099972";
    const MODE = "mv";
    
    let currentSrc     = "https:\/\/media-498.d2b.you:8443\/proxy\/media-619\/hls\/1099972\/master.m3u8?t=a4ca0715de589d21&e=1785432583875&b=570";
    let currentToken   = "a4ca0715de589d21";
    let currentExpire  = 1785432583875;
    window.__EXTERNAL_SUBS = [];
    window.__SUBS_ORIGIN   = "https:\/\/cdn.v1.media-619.d2b.you";
    window.__CACHE_HOSTS = ["media-498.d2b.you","media-498.d2b.you:8443","cdn.v3.media-217.d2b.you","cdn.v3.media-684.d2b.you"];
    // Indicatore sorgente di riproduzione (righetta colorata nei controlli)
    function computeServeMode(u){
      if(!u) return null;
      if(u.indexOf('/proxy/') !== -1) return 'lan';
      var host=''; try{ host=new URL(u, location.href).host; }catch(e){ return 'origin'; }
      var bare=host.split(':')[0];
      var ch=window.__CACHE_HOSTS||[];
      if(ch.indexOf(host)!==-1 || ch.indexOf(bare)!==-1) return 'cache';
      return 'origin';
    }
    function updateServeBar(){
      var el=document.getElementById('serveBar');
      if(!el) return;
      var m=computeServeMode(currentSrc);
      el.setAttribute('data-mode', m||'');
      var L={origin:'Origin (diretto)',lan:'LAN (cache \u2192 origin via 10G)',cache:'Cache (hot)'};
      el.title = m ? ('Riproduzione: '+(L[m]||m)) : '';
    }
    window.updateServeBar = updateServeBar;
    try { updateServeBar(); } catch(_){}
    const video = document.getElementById('video');
    try { window.addEventListener('message', function(ev){ if (ev && ev.data && ev.data.type === 'cx_trailer_mute') { try { video.muted = !!ev.data.muted; if (!video.muted && video.volume === 0) { video.volume = 0.6; } } catch(_) {} } }); } catch(_) {}
    const container = document.querySelector('.player-container');

    // Disabilita menu contestuale tasto destro sul player
    container.addEventListener('contextmenu', e => e.preventDefault());
    video.addEventListener('contextmenu', e => e.preventDefault());

    const makePosKey = MODE === 'tv'
        ? () => 'cx_pos_' + numericId + '_s' + current.s + 'e' + current.e
        : () => 'cx_pos_' + numericId + '_mv';
    const refreshUrl = () => IS_TRAILER
        ? '/xtoken.php?imdb=' + encodeURIComponent(numericId) + '&tr=1'
        : (MODE === 'tv'
            ? '/t/' + encodeURIComponent(numericId) + '/' + current.s + '/' + current.e
            : '/t/' + encodeURIComponent(numericId));
    const MIN_RESUME = 15, END_MARGIN = 30, NEXT_EP_WINDOW = 60;
    const IS_TRAILER = false;
    let lastSaved = 0;
    let navigating = false;
    const readSavedPos = () => { try { const v = parseFloat(localStorage.getItem(makePosKey())); return Number.isFinite(v) && v > 0 ? v : 0; } catch (_) { return 0; } };
    const savePos = t => { if (IS_TRAILER) return; try { localStorage.setItem(makePosKey(), String(t)); } catch (_) {} };
    const clearPos = () => { try { localStorage.removeItem(makePosKey()); } catch (_) {} };

    const rebuildSrc = () => currentSrc
        .replace(/([?&])t=[^&]*/, '$1t=' + encodeURIComponent(currentToken))
        .replace(/([?&])e=[^&]*/, '$1e=' + encodeURIComponent(currentExpire));

    const signUrl = u => u
        .replace(/([?&])t=[^&]*/, '$1t=' + encodeURIComponent(currentToken))
        .replace(/([?&])e=[^&]*/, '$1e=' + encodeURIComponent(currentExpire));

    (function installUrlSigner() {
        
        const PAT = /\/hls\//;
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string' && PAT.test(url)) url = signUrl(url);
            return origOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
        };
        const origFetch = window.fetch;
        window.fetch = function(input, init) {
            try {
                if (typeof input === 'string' && PAT.test(input)) input = signUrl(input);
                else if (input && input.url && PAT.test(input.url)) input = new Request(signUrl(input.url), input);
            } catch (_) {}
            return origFetch.call(this, input, init);
        };
    })();

    let hlsInstance = null, refreshTimer = null, corruptShown = false;
    let playbackStarted = false, netRecover = 0, netRecoverTimer = null, lastHiddenAt = 0, pausedWhenHidden = false;
    const recentBg = function(){ return document.hidden || (Date.now() - lastHiddenAt < 20000); };

    function showCorrupt(reason) {
        if (corruptShown) return;
        corruptShown = true;
        try { hlsInstance && hlsInstance.destroy(); } catch (_) {}
        if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
        container.classList.add('corrupt');
        container.classList.remove('started');
        if (!container.querySelector('.corrupt-badge')) {
            const block = document.createElement('div'); block.className = 'corrupt-block';
            const badge = document.createElement('div'); badge.className = 'corrupt-badge';
            badge.innerHTML = '<div class="corrupt-title">File non riproducibile</div>'
                + '<div class="corrupt-sub">Questo contenuto Ã¨ corrotto o il download Ã¨ fallito. Riprova piÃ¹ tardi.</div>';
            container.insertBefore(block, video.nextSibling);
            container.insertBefore(badge, block.nextSibling);
        }
        console.warn('[player] corrupt:', reason);
    }

    function hlsErrorHandler(_, d) {
        if (!d || !d.fatal) return;
        const t = d.type, det = d.details || '';
        // Parsing reale del contenuto = file davvero non valido (anche dopo l'avvio).
        const parseErr = det.indexOf('Parsing') !== -1 || det.indexOf('parsingError') !== -1;
        // Errore media (stallo buffer dopo che il tab e' andato in background per il pop): prova recupero.
        if (t === 'mediaError' && !parseErr) {
            try { hlsInstance.recoverMediaError(); return; } catch (_) {}
        }
        // Errore di rete DOPO l'avvio (tipico mobile: il pop apre un tab -> background -> frammenti/manifest in timeout):
        // NON e' 'corrotto', si recupera ricaricando da dove era.
        if (t === 'networkError' && !parseErr && (playbackStarted || recentBg())) {
            netRecover++;
            const wait = Math.min(8000, 600 * netRecover);
            if (netRecoverTimer) clearTimeout(netRecoverTimer);
            netRecoverTimer = setTimeout(function () {
                try { hlsInstance && hlsInstance.startLoad(); video.play().catch(function(){}); } catch (_) {}
            }, wait);
            return;
        }
        // Parse di frammento DOPO l'avvio, causato dal pop che manda il tab in background: recupera, non 'corrotto'.
        if (parseErr && playbackStarted && recentBg()) {
            netRecover++;
            const wait = Math.min(8000, 600 * netRecover);
            if (netRecoverTimer) clearTimeout(netRecoverTimer);
            netRecoverTimer = setTimeout(function () {
                try { hlsInstance && hlsInstance.startLoad(); video.play().catch(function(){}); } catch (_) {}
            }, wait);
            return;
        }
        // File realmente non riproducibile: parse error in foreground, o non e' mai partito (manifest iniziale ko).
        if (parseErr || !playbackStarted) {
            showCorrupt(t + ':' + det);
        } else {
            console.error('HLS fatal (no-recover)', d);
        }
    }

    const initPlayer = (startAt) => {
        const baseSrc = rebuildSrc();
        if (window.Hls && Hls.isSupported()) {
            if (hlsInstance) { try { hlsInstance.destroy(); } catch (_) {} }
            hlsInstance = new Hls({
                maxBufferLength: 30, maxMaxBufferLength: 60, maxBufferSize: 60*1024*1024,
                backBufferLength: 10, fragLoadingMaxRetry: 6,
            });            const preloadM3u8 = !!(window.PLAYER_OPTS && window.PLAYER_OPTS.preload_m3u8);
            let _hlsLoaded = false;
            const _doLoad = () => {
                if (_hlsLoaded || !hlsInstance) return;
                _hlsLoaded = true;
                hlsInstance.once(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(()=>{}); });
                hlsInstance.loadSource(baseSrc);
            };
            window._hlsLazyLoad = _doLoad;
            if (preloadM3u8) { _doLoad(); }
            hlsInstance.attachMedia(video);
            hlsInstance.on(Hls.Events.ERROR, hlsErrorHandler);
            hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => populateAudioMenu(hlsInstance.audioTracks || []));
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                populateAudioMenu(hlsInstance.audioTracks || []);
                renderSubsTracksAndMenu();
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = baseSrc;
            video.addEventListener('loadedmetadata', () => renderSubsTracksAndMenu(), { once: true });
        }
        let _lastT = 0;
        video.addEventListener('timeupdate', () => { if (video.currentTime > 0) { playbackStarted = true; _lastT = video.currentTime; } });
        video.addEventListener('playing', () => { playbackStarted = true; netRecover = 0; });
        video.addEventListener('error', () => {
            const code = video.error && video.error.code;
            // Su hls.js (Android/MSE) gli errori reali passano da hlsErrorHandler: qui non toccare il blob MSE.
            if (hlsInstance) {
                if (playbackStarted || recentBg()) return;
                if (code === 2 || code === 3 || code === 4) showCorrupt('video.error code=' + code);
                return;
            }
            // Path nativo (iOS Safari): dopo l'avvio o se il tab e' (stato) in background per il pop, NON 'corrotto'. Ricarica e riprendi.
            if (playbackStarted || recentBg()) {
                netRecover++;
                const wait = Math.min(8000, 600 * netRecover);
                const resumeAt = _lastT || 0;
                if (netRecoverTimer) clearTimeout(netRecoverTimer);
                netRecoverTimer = setTimeout(function(){
                    try {
                        const onMeta = function(){ try { video.currentTime = resumeAt; } catch (_) {} video.play().catch(function(){}); };
                        video.addEventListener('loadedmetadata', onMeta, { once: true });
                        video.load();
                        video.play().catch(function(){});
                    } catch (_) {}
                }, wait);
                return;
            }
            if (code === 2 || code === 3 || code === 4) {
                showCorrupt('video.error code=' + code);
            }
        });
        scheduleTokenRefresh();
    };

    async function rotateToken() {
        try {
            const r = await fetch(refreshUrl(), { credentials: 'same-origin' });
            if (!r.ok) return scheduleTokenRefresh(30);
            const data = await r.json();
            if (!data.url || !data.expire) return scheduleTokenRefresh(30);
            const m = data.url.match(/[?&]t=([^&]+)/);
            if (!m) return scheduleTokenRefresh(30);
            currentToken = decodeURIComponent(m[1]); currentExpire = data.expire;
            scheduleTokenRefresh();
        } catch (_) { scheduleTokenRefresh(30); }
    }
    function scheduleTokenRefresh(override) {
        if (refreshTimer) clearTimeout(refreshTimer);
        
        const ms = override != null ? override * 1000 : Math.max(10000, currentExpire - Date.now() - 30000);
        refreshTimer = setTimeout(rotateToken, ms);
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') { lastHiddenAt = Date.now(); try { pausedWhenHidden = !!(video && video.paused); } catch (_) { pausedWhenHidden = false; } return; }
        if (Date.now() >= currentExpire - 30000) rotateToken();
        // Tornati in foreground dopo il pop: rianima il player se si era impantanato (nessun overlay se non e' davvero corrotto).
        if (!corruptShown) {
            netRecover = 0;
            if (netRecoverTimer) { clearTimeout(netRecoverTimer); netRecoverTimer = null; }
            try { hlsInstance && hlsInstance.startLoad(); } catch (_) {}
            // NON riprendere automaticamente se l'utente aveva messo in PAUSA prima di cambiare tab
            if (!pausedWhenHidden) {
                setTimeout(function(){ try { video.play().catch(function(){}); } catch (_) {} }, 300);
            }
        }
    });

    const fmtTime = s => {
        if (!Number.isFinite(s)) return '0:00';
        s = Math.max(0, Math.floor(s));
        const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
        return (h > 0 ? h + ':' + String(m).padStart(2,'0') : m) + ':' + String(sec).padStart(2,'0');
    };

    const resumeOverlay = document.getElementById('resumeOverlay');
    const resumeTimeEl  = document.getElementById('resumeTime');
    const btnResume     = document.getElementById('resumeContinue');
    const btnFromStart  = document.getElementById('resumeFromStart');

    const startPlayback = (atSeconds, forcePlay) => {
        resumeOverlay.classList.remove('show');
        const _preloadOn = !!(window.PLAYER_OPTS && window.PLAYER_OPTS.preload_m3u8);
        if (_preloadOn || forcePlay) {
            container.classList.add('loading');
            setTimeout(() => container.classList.remove('loading'), 15000);
        }
        initPlayer(atSeconds);
        if (forcePlay && window._hlsLazyLoad) window._hlsLazyLoad();
        const begin = () => {
            if (atSeconds > 0 && Number.isFinite(video.duration) && Math.abs(video.currentTime - atSeconds) > 1) {
                try { video.currentTime = atSeconds; } catch (_) {}
            }
            container.classList.remove('loading');
            if ((_preloadOn && autoplayEnabled) || forcePlay) {
                video.play().then(
                    () => container.classList.remove('loading'),
                    () => container.classList.remove('loading')
                );
            }
        };
        if (video.readyState >= 1) { begin(); return; }
        video.addEventListener('loadedmetadata', begin, { once: true });
    };

    const saved = readSavedPos();
    if (!currentSrc) {

    } else if (!IS_TRAILER && saved >= MIN_RESUME) {
        resumeTimeEl.textContent = fmtTime(saved);
        resumeOverlay.classList.add('show');
        btnResume.onclick    = () => startPlayback(saved, true);
        btnFromStart.onclick = () => { clearPos(); startPlayback(0, true); };
    } else {
        startPlayback(0, IS_TRAILER);
    }

    video.addEventListener('timeupdate', () => {
        if (navigating) return;
        const t = video.currentTime;
        if (!Number.isFinite(t) || t < MIN_RESUME) return;
        if (video.duration && t > video.duration - END_MARGIN) { clearPos(); return; }
        if (Math.abs(t - lastSaved) > 5) { savePos(t); lastSaved = t; }
    });
    video.addEventListener('ended', clearPos);
    try { video.addEventListener('ended', function(){ if (IS_TRAILER) { try { window.parent && window.parent.postMessage({ type: 'cx_trailer_ended' }, '*'); } catch (_) {} } }); } catch (_) {}

    video.addEventListener('play',  () => { container.classList.remove('paused','stopped'); container.classList.add('started'); document.getElementById('playBtn').querySelector('.material-icons').textContent = 'pause'; document.getElementById('playPauseCenter').querySelector('.material-icons').textContent = 'pause'; });
    video.addEventListener('pause', () => { container.classList.add('paused'); document.getElementById('playBtn').querySelector('.material-icons').textContent = 'play_arrow'; document.getElementById('playPauseCenter').querySelector('.material-icons').textContent = 'play_arrow'; });
    video.addEventListener('waiting', () => container.classList.add('loading'));
    video.addEventListener('playing', () => container.classList.remove('loading'));
    video.addEventListener('canplay', () => container.classList.remove('loading'));
    video.addEventListener('play', () => container.classList.remove('loading'));
    video.addEventListener('loadeddata', () => container.classList.remove('loading'));

    const togglePlay = () => { if (video.paused) { if (window._hlsLazyLoad) window._hlsLazyLoad(); video.play().catch(()=>{}); } else { video.pause(); } };
    document.getElementById('playBtn').addEventListener('click', togglePlay);
    document.getElementById('playPauseCenter').addEventListener('click', togglePlay);

    const SEEK_STEP = 10;
    let lastTap = 0, pendingToggle = null;
    const flashSeek = (side) => {
        const el = document.createElement('div');
        el.className = 'seek-flash seek-' + side;
        el.innerHTML = '<span class="material-icons">' + (side === 'fwd' ? 'forward_10' : 'replay_10') + '</span>';
        container.appendChild(el);
        setTimeout(() => el.remove(), 600);
    };
    video.addEventListener('click', (e) => {
        const now = Date.now();
        const rect = video.getBoundingClientRect();
        const side = (e.clientX - rect.left) < rect.width / 2 ? 'back' : 'fwd';
        if (now - lastTap < 300) {
            if (pendingToggle) { clearTimeout(pendingToggle); pendingToggle = null; }
            if (side === 'fwd') video.currentTime = Math.min(video.duration || 0, video.currentTime + SEEK_STEP);
            else                video.currentTime = Math.max(0, video.currentTime - SEEK_STEP);
            flashSeek(side);
            lastTap = 0;
            return;
        }
        lastTap = now;
        pendingToggle = setTimeout(() => { togglePlay(); pendingToggle = null; }, 300);
    });

    const progressContainer = document.getElementById('progressContainer');
    const progressFilled = document.getElementById('progressFilled');
    const progressTooltip = document.getElementById('progressTooltip');
    const timeDisplay = document.getElementById('timeDisplay');

    const burnCover = document.querySelector('.burn-cover');
    const BURN_DURATION = +(window.PLAYER_OPTS && window.PLAYER_OPTS.burn_duration) || 0;
    const BURN_ENABLED  = !!(window.PLAYER_OPTS && window.PLAYER_OPTS.burn_enabled);
    const BURN_INTERVALS = (BURN_ENABLED && BURN_DURATION > 0) ? [[0, BURN_DURATION]] : []; 

    function positionBurnCover() {
        if (!burnCover) return;  // niente cover quando burn_enabled=false â skip
        if (!video.videoWidth || !video.videoHeight) {
            burnCover.style.left = '0'; burnCover.style.right = '0';
            burnCover.style.bottom = '0'; burnCover.style.height = '14.5%';
            return;
        }
        const ew = video.clientWidth, eh = video.clientHeight;
        const vr = video.videoWidth / video.videoHeight;
        const er = ew / eh;
        let visW, visH, offsetX, offsetY;
        if (er > vr) { visH = eh; visW = eh * vr; offsetX = (ew - visW) / 2; offsetY = 0; }
        else         { visW = ew; visH = ew / vr; offsetX = 0; offsetY = (eh - visH) / 2; }
        const leftPx  = Math.max(0, Math.floor(offsetX) - 1);
        const rightEd = Math.ceil(offsetX + visW) + 1;
        burnCover.style.left   = leftPx + 'px';
        burnCover.style.width  = (rightEd - leftPx) + 'px';
        burnCover.style.right  = 'auto';
        burnCover.style.bottom = Math.max(0, Math.floor(offsetY) - 1) + 'px';
        burnCover.style.height = Math.ceil(visH * 0.145) + 'px';
    }
    positionBurnCover();
    video.addEventListener('loadedmetadata', positionBurnCover);
    video.addEventListener('resize', positionBurnCover);
    window.addEventListener('resize', positionBurnCover);
    window.addEventListener('orientationchange', positionBurnCover);
    if (window.ResizeObserver) new ResizeObserver(positionBurnCover).observe(video);

    const COUNTDOWN_SEC = 8;
    let countdownTimer = null, countdownStart = 0;
    function stopCountdown() {
        if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
        const cd = document.getElementById('nextEpCountdown'); if (cd) cd.textContent = '';
        const pr = document.getElementById('nextEpProgress'); if (pr) pr.style.width = '0%';
    }
    function startCountdown() {
        const card = document.getElementById('nextEpCard');
        if (!card || countdownTimer) return;
        countdownStart = Date.now();
        const cd = document.getElementById('nextEpCountdown');
        const pr = document.getElementById('nextEpProgress');
        countdownTimer = setInterval(() => {
            const elapsed = (Date.now() - countdownStart) / 1000;
            const left = COUNTDOWN_SEC - elapsed;
            if (left <= 0) {
                stopCountdown();
                const s = parseInt(card.dataset.nextS), e = parseInt(card.dataset.nextE);
                if (Number.isFinite(s) && Number.isFinite(e)) loadEpisode(s, e);
                return;
            }
            if (cd) cd.textContent = ' Â· ' + Math.ceil(left) + 's';
            if (pr) pr.style.width = ((elapsed / COUNTDOWN_SEC) * 100) + '%';
        }, 100);
    }
    video.addEventListener('pause', stopCountdown);
    video.addEventListener('seeking', stopCountdown);

    function goNext(card) {
        stopCountdown();
        const s = parseInt(card.dataset.nextS), e = parseInt(card.dataset.nextE);
        if (Number.isFinite(s) && Number.isFinite(e)) loadEpisode(s, e);
    }
    (function() {
        const card = document.getElementById('nextEpCard');
        if (!card) return;
        card.addEventListener('click', ev => { ev.preventDefault(); goNext(card); });
        const btn = document.getElementById('nextEpBtn');
        if (btn) btn.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); goNext(card); });
    })();

    video.addEventListener('timeupdate', () => {
        if (!video.duration || progressContainer.classList.contains('dragging')) return;
        progressFilled.style.width = (video.currentTime/video.duration*100) + '%';
        timeDisplay.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
        const remaining = video.duration - video.currentTime;
        const _creditsStart = (window.PLAYER_OPTS && window.PLAYER_OPTS.skip_intro && window.PLAYER_OPTS.skip_intro.ranges && window.PLAYER_OPTS.skip_intro.ranges.credits && window.PLAYER_OPTS.skip_intro.ranges.credits.start) || null;
        const _showNext = (_creditsStart != null && video.currentTime >= _creditsStart) || (remaining <= NEXT_EP_WINDOW && remaining > 0);
        if (_showNext) {
            const wasVisible = container.classList.contains('show-next-ep');
            container.classList.add('show-next-ep');
            if (!wasVisible && !countdownTimer && document.getElementById('nextEpCard')) startCountdown();
        } else {
            container.classList.remove('show-next-ep');
            stopCountdown();
        }
        const t = video.currentTime;
        const inBurn = BURN_INTERVALS.some(([a, b]) => t >= a && t <= b);
        if (burnCover) burnCover.classList.toggle('show', inBurn);
    });

    const pctFromX = x => {
        const r = progressContainer.getBoundingClientRect();
        return Math.max(0, Math.min(1, (x - r.left) / r.width));
    };
    const updateTooltip = x => {
        const pct = pctFromX(x);
        const t = pct * (video.duration || 0);
        progressTooltip.textContent = fmtTime(t);
        progressTooltip.style.left = (pct * 100) + '%';
    };
    let dragging = false;
    const onMove = e => {
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        updateTooltip(x);
        if (dragging) {
            const pct = pctFromX(x);
            progressFilled.style.width = (pct*100) + '%';
        }
    };
    const onEnd = e => {
        if (!dragging) return;
        const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const pct = pctFromX(x);
        video.currentTime = pct * (video.duration || 0);
        dragging = false;
        progressContainer.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    };
    const onStart = e => {
        dragging = true;
        progressContainer.classList.add('dragging');
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        updateTooltip(x);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: true });
        document.addEventListener('touchend', onEnd);
    };
    progressContainer.addEventListener('mousedown', onStart);
    progressContainer.addEventListener('touchstart', onStart, { passive: true });
    progressContainer.addEventListener('mousemove', e => { if (!dragging) updateTooltip(e.clientX); });

    const volBtn = document.getElementById('volumeBtn');
    const volBar = document.querySelector('.volume-bar');
    const volFilled = document.getElementById('volumeFilled');
    function _volIcon() {
        const ic = volBtn.querySelector('.material-icons');
        if (!ic) return;
        if (video.muted || video.volume === 0) ic.textContent = 'volume_off';
        else if (video.volume < 0.5) ic.textContent = 'volume_down';
        else ic.textContent = 'volume_up';
    }
    function _volSync() {
        const v = video.muted ? 0 : video.volume;
        if (volFilled) volFilled.style.width = (v * 100) + '%';
        _volIcon();
    }
    function _setVolFromX(clientX) {
        const r = volBar.getBoundingClientRect();
        if (r.width <= 0) return;
        let v = (clientX - r.left) / r.width;
        v = Math.max(0, Math.min(1, v));
        video.volume = v;
        video.muted = v === 0;
        _volSync();
        try { localStorage.setItem('cx_vol', String(v)); } catch (_) {}
    }
    volBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        if (!video.muted && video.volume === 0) { video.volume = 0.5; }
        _volSync();
    });
    let _volDrag = false;
    volBar.addEventListener('mousedown', e => { _volDrag = true; _setVolFromX(e.clientX); e.preventDefault(); });
    window.addEventListener('mousemove', e => { if (_volDrag) _setVolFromX(e.clientX); });
    window.addEventListener('mouseup',   () => { _volDrag = false; });
    volBar.addEventListener('click', e => { if (!_volDrag) _setVolFromX(e.clientX); });
    volBar.addEventListener('touchstart', e => { if (e.touches[0]) { _volDrag = true; _setVolFromX(e.touches[0].clientX); } }, { passive: true });
    window.addEventListener('touchmove', e => { if (_volDrag && e.touches[0]) _setVolFromX(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchend',   () => { _volDrag = false; });
    video.addEventListener('volumechange', () => { if (!_volDrag) _volSync(); });
    document.addEventListener('keydown', e => {
        if (['ArrowUp','ArrowDown'].indexOf(e.key) === -1) return;
        if (['INPUT','TEXTAREA'].indexOf((e.target.tagName || '').toUpperCase()) !== -1) return;
        e.preventDefault();
        let v = video.volume + (e.key === 'ArrowUp' ? 0.05 : -0.05);
        v = Math.max(0, Math.min(1, v));
        video.volume = v; video.muted = v === 0; _volSync();
        try { localStorage.setItem('cx_vol', String(v)); } catch (_) {}
    });
    try {
        const _v = parseFloat(localStorage.getItem('cx_vol') || '');
        if (!isNaN(_v) && _v >= 0 && _v <= 1) video.volume = _v;
    } catch (_) {}
    _volSync();

    const pipBtn = document.getElementById('pipBtn');
    const autoplayEnabled = !!(window.PLAYER_OPTS && window.PLAYER_OPTS.autoplay_enabled);
    if (pipBtn && document.pictureInPictureEnabled && !video.disablePictureInPicture) {
        pipBtn.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) await document.exitPictureInPicture();
                else await video.requestPictureInPicture();
            } catch (_) {}
        });
        video.addEventListener('enterpictureinpicture', () => {
            pipBtn.querySelector('.material-icons').textContent = 'picture_in_picture';
            pipBtn.title = 'Esci da Picture in Picture';
        });
        video.addEventListener('leavepictureinpicture', () => {
            pipBtn.querySelector('.material-icons').textContent = 'picture_in_picture_alt';
            pipBtn.title = 'Picture in Picture';
        });
    } else if (pipBtn) {
        pipBtn.style.display = 'none';
    }

    // Subtitle/Audio dropdowns (vidbix-style)
    const LANG_NAMES = { ita:'Italiano', it:'Italiano', eng:'English', en:'English', spa:'EspaÃ±ol', es:'EspaÃ±ol',
                         fra:'FranÃ§ais', fre:'FranÃ§ais', fr:'FranÃ§ais', deu:'Deutsch', ger:'Deutsch', de:'Deutsch',
                         por:'PortuguÃªs', pt:'PortuguÃªs', jpn:'æ¥æ¬èª', ja:'æ¥æ¬èª',
                         rus:'Ð ÑÑÑÐºÐ¸Ð¹', ru:'Ð ÑÑÑÐºÐ¸Ð¹', ukr:'Ð£ÐºÑÐ°ÑÐ½ÑÑÐºÐ°', uk:'Ð£ÐºÑÐ°ÑÐ½ÑÑÐºÐ°',
                         tur:'TÃ¼rkÃ§e', tr:'TÃ¼rkÃ§e', ara:'Ø§ÙØ¹Ø±Ø¨ÙØ©', ar:'Ø§ÙØ¹Ø±Ø¨ÙØ©', kor:'íêµ­ì´', ko:'íêµ­ì´',
                         pol:'Polski', pl:'Polski' };
    function langDisplay(code, name) {
        const k = (code || '').toLowerCase();
        if (LANG_NAMES[k]) return LANG_NAMES[k];
        if (name) return name;
        if (k === 'und' || k === '' || k === 'for') return '';
        return (code || '').toUpperCase() || 'Sconosciuto';
    }
    let externalSubs = (window.__EXTERNAL_SUBS || []);
    function renderSubsTracksAndMenu() {
        // VTT vivono SEMPRE sull'origin (mai sul cache). Usa __SUBS_ORIGIN se iniettato dal panel.
        const m = (currentSrc || '').match(/^(https?:\/\/[^\/]+)/);
        const ORIGIN = window.__SUBS_ORIGIN || (m ? m[1] : '');
        Array.from(video.querySelectorAll('track')).forEach(t => t.remove());
        externalSubs.forEach((s) => {
            const tr = document.createElement('track');
            tr.kind = 'subtitles';
            tr.srclang = (s.lang || 'und').slice(0, 3);
            { const ld = langDisplay(s.lang); tr.label = ld ? (ld + (s.forced ? ' (Forced)' : '')) : (s.forced ? 'Forced' : 'Sottotitoli'); }
            tr.src = ORIGIN + s.url;
            video.appendChild(tr);
        });
        let defIdx = externalSubs.findIndex(s => /^ita?$/i.test(s.lang) && s.forced);
        if (defIdx < 0) defIdx = -1;
        setTimeout(() => switchSubtitles(defIdx), 50);
        populateSubtitlesMenu(externalSubs);
    }
    function subLabelFor(t) {
        const ld = langDisplay(t.lang, t.name);
        if (ld) return ld + (t.forced ? ' (Forced)' : '');
        return t.forced ? 'Forced' : 'Sottotitoli';
    }
    function audioLabelFor(t, idx) {
        return langDisplay(t.lang, t.name) || ('Traccia ' + (idx + 1));
    }
    function populateSubtitlesMenu(tracks) {
        const menu = document.getElementById('subtitlesMenu');
        const dropdown = document.getElementById('subtitlesDropdown');
        const list = tracks || [];
        if (menu && dropdown) {
            dropdown.style.display = list.length === 0 ? 'none' : '';
            if (list.length) {
                menu.innerHTML = '<div class="dropdown-header">Sottotitoli</div>';
                const off = document.createElement('div');
                off.className = 'dropdown-item';
                off.dataset.sub = '-1';
                off.textContent = 'Disattivati';
                off.onclick = () => switchSubtitles(-1);
                menu.appendChild(off);
                list.forEach((t, idx) => {
                    const it = document.createElement('div');
                    it.className = 'dropdown-item';
                    it.dataset.sub = idx;
                    it.textContent = subLabelFor(t);
                    it.onclick = () => switchSubtitles(idx);
                    menu.appendChild(it);
                });
            }
        }
        const sub = document.getElementById('subsSubmenu');
        if (sub && list.length) {
            sub.innerHTML = '';
            const off = document.createElement('div');
            off.className = 'submenu-item';
            off.dataset.subSettings = '-1';
            off.textContent = 'Disattivati';
            off.onclick = () => switchSubtitles(-1);
            sub.appendChild(off);
            list.forEach((t, idx) => {
                const it = document.createElement('div');
                it.className = 'submenu-item';
                it.dataset.subSettings = idx;
                it.textContent = subLabelFor(t);
                it.onclick = () => switchSubtitles(idx);
                sub.appendChild(it);
            });
        }
    }
    function populateAudioMenu(tracks) {
        const menu = document.getElementById('audioMenu');
        const dropdown = document.getElementById('audioDropdown');
        const list = tracks || [];
        if (menu && dropdown) {
            dropdown.style.display = list.length <= 1 ? 'none' : '';
            if (list.length > 1) {
                menu.innerHTML = '<div class="dropdown-header">Audio</div>';
                list.forEach((t, idx) => {
                    const it = document.createElement('div');
                    it.className = 'dropdown-item' + ((idx === (hlsInstance && hlsInstance.audioTrack)) ? ' active' : '');
                    it.dataset.audio = idx;
                    it.textContent = audioLabelFor(t, idx);
                    it.onclick = () => switchAudio(idx);
                    menu.appendChild(it);
                });
            }
        }
        const sub = document.getElementById('audioSubmenu');
        if (sub && list.length > 1) {
            sub.innerHTML = '';
            list.forEach((t, idx) => {
                const it = document.createElement('div');
                it.className = 'submenu-item' + ((idx === (hlsInstance && hlsInstance.audioTrack)) ? ' active' : '');
                it.dataset.audioSettings = idx;
                it.textContent = audioLabelFor(t, idx);
                it.onclick = () => switchAudio(idx);
                sub.appendChild(it);
            });
        }
    }
    function switchSubtitles(idx) {
        const tt = video.textTracks;
        for (let i = 0; i < tt.length; i++) {
            tt[i].mode = (i === idx) ? 'showing' : 'disabled';
        }
        updateDropdownActive('subtitlesMenu', 'sub', idx);
        document.querySelectorAll('#subsSubmenu .submenu-item').forEach(i2 => i2.classList.toggle('active', parseInt(i2.dataset.subSettings, 10) === idx));
        const dd = document.getElementById('subtitlesDropdown'); if (dd) dd.classList.remove('open');
        const settingsMenu = document.getElementById('settingsMenu'); if (settingsMenu) settingsMenu.classList.remove('active');
    }
    function switchAudio(idx) {
        if (hlsInstance) hlsInstance.audioTrack = idx;
        updateDropdownActive('audioMenu', 'audio', idx);
        document.querySelectorAll('#audioSubmenu .submenu-item').forEach(i2 => i2.classList.toggle('active', parseInt(i2.dataset.audioSettings, 10) === idx));
        const dd = document.getElementById('audioDropdown'); if (dd) dd.classList.remove('open');
        const settingsMenu = document.getElementById('settingsMenu'); if (settingsMenu) settingsMenu.classList.remove('active');
    }
    function updateDropdownActive(menuId, key, val) {
        document.querySelectorAll('#' + menuId + ' .dropdown-item').forEach(i => i.classList.remove('active'));
        const sel = document.querySelector('#' + menuId + ' .dropdown-item[data-' + key + '="' + val + '"]');
        if (sel) sel.classList.add('active');
    }
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const trigger = dropdown.querySelector('.btn, .btn-icon');
        if (!trigger) return;
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('open'); });
            dropdown.classList.toggle('open');
        });
    });
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
    });

    document.getElementById('fullscreenBtn').addEventListener('click', async () => {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.webkitCurrentFullScreenElement;
        const isInVideoFs = video.webkitDisplayingFullscreen;
        if (!fsEl && !isInVideoFs) {
            // Try container fullscreen first (desktop, Android)
            if (container.requestFullscreen) {
                try { await container.requestFullscreen(); } catch (_) {}
            } else if (container.webkitRequestFullscreen) {
                try { container.webkitRequestFullscreen(); } catch (_) {}
            } else if (video.webkitEnterFullscreen) {
                // iOS Safari: can only fullscreen the <video> element
                try { video.webkitEnterFullscreen(); } catch (_) {}
            } else if (video.webkitRequestFullscreen) {
                try { video.webkitRequestFullscreen(); } catch (_) {}
            }
            if (screen.orientation && screen.orientation.lock) {
                try { await screen.orientation.lock('landscape'); } catch (_) {}
            }
        } else {
            if (document.exitFullscreen) { try { document.exitFullscreen(); } catch (_) {} }
            else if (document.webkitExitFullscreen) { try { document.webkitExitFullscreen(); } catch (_) {} }
            else if (video.webkitExitFullscreen) { try { video.webkitExitFullscreen(); } catch (_) {} }
            if (screen.orientation && screen.orientation.unlock) {
                try { screen.orientation.unlock(); } catch (_) {}
            }
        }
    });

    let hideTimer;
    const bumpActive = () => {
        container.classList.add('show-cursor','active');
        container.classList.remove('idle');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            const settingsOpen = document.getElementById('settingsMenu')?.classList.contains('active');
            const sidebarOpen  = document.getElementById('episodesSidebar')?.classList.contains('open');
            if (!video.paused && !sidebarOpen && !settingsOpen) {
                container.classList.remove('show-cursor','active');
                container.classList.add('idle');
            }
        }, 3000);
    };
    bumpActive();
    container.addEventListener('pointerdown', bumpActive);
    container.addEventListener('pointermove', bumpActive);
    video.addEventListener('pointerdown', bumpActive);
    video.addEventListener('touchstart', bumpActive, { passive: true });
    container.addEventListener('mouseleave', () => { if (!video.paused) container.classList.add('idle'); });

    document.addEventListener('keydown', e => {
        if (e.target.matches('input,select,textarea')) return;
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
        else if (e.code === 'ArrowRight') video.currentTime = Math.min(video.duration||0, video.currentTime + 10);
        else if (e.code === 'ArrowLeft')  video.currentTime = Math.max(0, video.currentTime - 10);
        else if (e.code === 'KeyF') document.getElementById('fullscreenBtn').click();
        else if (e.code === 'KeyP') document.getElementById('pipBtn')?.click();
        else if (e.code === 'KeyM') volBtn.click();
    });

    document.querySelectorAll('.submenu-item[data-speed]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.submenu-item[data-speed]').forEach(x => x.classList.remove('active'));
            el.classList.add('active');
            const sp = parseFloat(el.dataset.speed);
            video.playbackRate = sp;
            document.getElementById('speedLabel').textContent = (sp === 1 ? '1x' : sp + 'x') + ' âº';
            const mi = el.closest('.menu-item');
            if (mi) mi.classList.remove('open');
        });
    });

    const gotoPage = (name) => {
        document.querySelectorAll('#settingsMenu .menu-page').forEach(p => {
            p.classList.toggle('active', p.dataset.page === name);
        });
    };
    document.querySelectorAll('#settingsMenu .menu-item[data-target]').forEach(mi => {
        mi.addEventListener('click', e => { e.stopPropagation(); gotoPage(mi.dataset.target); });
    });
    document.querySelectorAll('#settingsMenu .menu-back').forEach(b => {
        b.addEventListener('click', e => { e.stopPropagation(); gotoPage(b.dataset.back); });
    });
    
    const settingsMenu = document.getElementById('settingsMenu');
    const observer = new MutationObserver(() => { if (!settingsMenu.classList.contains('active')) gotoPage('main'); });
    observer.observe(settingsMenu, { attributes: true, attributeFilter: ['class'] });

    
    
    (function() {
        function detectDeviceName() {
            var ua = navigator.userAgent || '';
            if (/SmartTV|Smart-TV|SMART-TV|Tizen/i.test(ua)) return 'Samsung Smart TV';
            if (/Web0S|WebOS|WEBOS|NetCast/i.test(ua)) return 'LG Smart TV';
            if (/BRAVIA|Sony.*TV/i.test(ua)) return 'Sony Bravia TV';
            if (/Philips|PhilipsTV/i.test(ua)) return 'Philips Smart TV';
            if (/Viera|Panasonic/i.test(ua)) return 'Panasonic TV';
            if (/Hisense/i.test(ua)) return 'Hisense Smart TV';
            if (/TCL/i.test(ua)) return 'TCL Smart TV';
            if (/HbbTV/i.test(ua)) return 'Smart TV';
            if (/CrKey|Chromecast/i.test(ua)) return 'Google Chromecast';
            if (/Apple\s?TV|AppleTV/i.test(ua)) return 'Apple TV';
            if (/Roku/i.test(ua)) return 'Roku';
            if (/FireTV|AFT[A-Z]/i.test(ua)) return 'Amazon Fire TV';
            if (/PlayStation\s?5|PS5/i.test(ua)) return 'PlayStation 5';
            if (/PlayStation|PS4/i.test(ua)) return 'PlayStation 4';
            if (/Xbox/i.test(ua)) return 'Xbox';
            if (/iPhone/i.test(ua)) {
                var iosMatch = ua.match(/OS (\d+)[_.](\d+)/i);
                if (iosMatch) return 'iPhone (iOS ' + iosMatch[1] + '.' + iosMatch[2] + ')';
                return 'iPhone';
            }
            if (/iPad/i.test(ua)) {
                var w = screen.width, h = screen.height;
                if (w > h) { var t = w; w = h; h = t; }
                if (w >= 1024) return 'iPad Pro';
                return 'iPad';
            }
            if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'iPad';
            if (/Android/i.test(ua)) {
                var m = ua.match(/;\s*([^;)]+)\s+Build\//i);
                var model = m ? m[1].trim() : '';
                if (model) {
                    if (/^SM-/i.test(model)) return 'Samsung ' + model;
                    if (/Samsung/i.test(model)) return model;
                    if (/Pixel/i.test(model)) return 'Google ' + model;
                    if (/Redmi|POCO/i.test(model)) return 'Xiaomi ' + model;
                    if (/Mi\s?\d/i.test(model)) return 'Xiaomi ' + model;
                    if (/ONEPLUS|IN20|KB20|LE2|NE2|AC21|CPH25/i.test(model)) return 'OnePlus ' + model;
                    if (/VOG|ELE|LYA|CLT|ANA|NOH|Huawei/i.test(model)) return 'Huawei ' + model;
                    if (/OPPO|CPH|RMX/i.test(model)) return 'OPPO ' + model;
                    if (/vivo|V20|V21|V23|V25|V27|V29/i.test(model)) return 'Vivo ' + model;
                    if (/Motorola|moto/i.test(model)) return 'Motorola ' + model;
                    if (/Nokia/i.test(model)) return 'Nokia ' + model;
                    if (/Sony|Xperia/i.test(model)) return 'Sony ' + model;
                    if (/LG-|LM-/i.test(model)) return 'LG ' + model;
                    if (/Realme/i.test(model)) return 'Realme ' + model;
                    return model;
                }
                return /Mobile/i.test(ua) ? 'Telefono Android' : 'Tablet Android';
            }
            if (/CrOS/i.test(ua)) return 'Chromebook';
            if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
            if (/Windows/i.test(ua)) return /Windows NT 10/i.test(ua) ? 'PC Windows 10/11' : 'PC Windows';
            if (/Linux/i.test(ua)) return 'PC Linux';
            return 'Dispositivo sconosciuto';
        }
        try {
            // Tenta prima Sec-CH-UA-Model via userAgentData (Android moderno restituisce modello reale)
            if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
                navigator.userAgentData.getHighEntropyValues(['model']).then(function(r){
                    if (r && r.model && r.model !== 'K') window._dm = r.model;
                    else window._dm = detectDeviceName();
                }).catch(function(){ window._dm = detectDeviceName(); });
            } else {
                window._dm = detectDeviceName();
            }
        } catch(e) { window._dm = detectDeviceName(); }
    })();

    (function heartbeat() {
        let sid;
        try {
            sid = localStorage.getItem('cx_sid');
            if (!sid) { sid = (crypto.randomUUID && crypto.randomUUID()) ||
                ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8); return v.toString(16); }));
                localStorage.setItem('cx_sid', sid); }
        } catch (_) { sid = Date.now()+'-'+Math.random().toString(16).slice(2); }

        const HB_INTERVAL = 60000;
        let pausedDelta = 0, seekDelta = 0;

        // Referer del PRIMO video visto in questa scheda: lo si cattura una volta e si conserva
        // (sopravvive alla navigazione interna serie->puntata). Priorita': sessionStorage > document.referrer esterno > HTTP_REFERER lato server.
        window.__D2B_EMBED_REF = "https:\/\/altadefinizionex.co\/musicale\/34419-justin-timberlake-futuresexloveshow-live-from-madison-square-garden-streaming.html";
        (function(){
            var ref = null;
            try { ref = sessionStorage.getItem('d2b_ref') || null; } catch(_){}
            if (!ref) {
                var dr = document.referrer || '';
                if (dr) { try { var h = new URL(dr).hostname || ''; if (h && h !== location.hostname && h.indexOf('vidxgo') === -1) ref = dr; } catch(_){} }
            }
            if (!ref && window.__D2B_EMBED_REF) ref = window.__D2B_EMBED_REF;
            if (ref) { try { sessionStorage.setItem('d2b_ref', ref); } catch(_){} }
            window.__d2b_ref = ref;
        })();
        const buildPayload = () => {
            const p = {
                sid,
                imdb: numericId,
                type: MODE === 'tv' ? 'episode' : 'movie',
                pos: Math.floor(video.currentTime || 0),
                dur: Number.isFinite(video.duration) ? Math.floor(video.duration) : 0,
                playing: video.paused ? 0 : 1,
                ref: (window.__d2b_ref || null),
            };
                        if (hlsInstance && hlsInstance.levels && hlsInstance.currentLevel >= 0) {
                const lv = hlsInstance.levels[hlsInstance.currentLevel];
                if (lv) {
                    p.ql = lv.height ? lv.height + 'p' : 'auto';
                    p.qh = lv.height || null;
                    p.qb = lv.bitrate || null;
                }
            }
            if (pausedDelta) { p.paused = pausedDelta; pausedDelta = 0; }
            if (seekDelta)   { p.seek   = seekDelta;   seekDelta   = 0; }
            if (window._dm) p.dm = window._dm;
            return p;
        };

        let kicked = false, hbTimer = null;
        const handleKick = (info) => {
            if (kicked) return;
            kicked = true;
            try { video.pause(); } catch (_) {}
            try { if (hlsInstance) hlsInstance.destroy(); } catch (_) {}
            if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
            try { localStorage.removeItem('cx_sid'); } catch (_) {}
            const isVpn = info && info.block_type === 'asn';
            const icon = isVpn ? 'vpn_lock' : 'block';
            const title = isVpn ? 'VPN / Proxy rilevato' : 'Sessione interrotta';
            const msg = isVpn
                ? 'Disabilitalo per continuare con la visione.'
                : 'Questa sessione di visione Ã¨ stata chiusa. Aggiorna la pagina per riprovare.';
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:99999;display:grid;place-items:center;color:#fff;font-family:inherit;margin:0;padding:20px;box-sizing:border-box';
            ov.innerHTML =
              '<div style="width:100%;max-width:420px;padding:40px 36px;text-align:center;background:#141414;border:1px solid rgba(229,9,20,.4);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;gap:16px">' +
                '<div style="width:60px;height:60px;border-radius:50%;background:rgba(229,9,20,.15);border:1px solid rgba(229,9,20,.4);display:flex;align-items:center;justify-content:center"><span class="material-icons" style="font-size:30px;color:#ff3040">' + icon + '</span></div>' +
                '<h2 style="font-size:20px;font-weight:600;margin:0">' + title + '</h2>' +
                '<p style="font-size:14px;color:rgba(255,255,255,.6);line-height:1.55;margin:0 0 4px;max-width:320px;text-align:center">' + msg + '</p>' +
                '<button onclick="location.reload()" style="background:#e50914;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(229,9,20,.35);min-width:180px;display:inline-flex;align-items:center;justify-content:center;text-align:center">Riprova</button>' +
              '</div>';
            document.body.appendChild(ov);
        };

        // Nuova versione del file caricata mentre l'utente guarda â pausa + overlay "Riprendi"
        let _newVerShown = false;
        const handleNewVersion = () => {
            if (_newVerShown || kicked) return;
            _newVerShown = true;
            const pos = video.currentTime || 0;
            try { video.pause(); } catch (_) {}
            const ov = document.createElement('div');
            ov.id = 'newVerOverlay';
            ov.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:99999;display:grid;place-items:center;color:#fff;font-family:inherit;padding:20px;box-sizing:border-box';
            ov.innerHTML =
              '<div style="width:100%;max-width:420px;padding:40px 36px;text-align:center;background:#141414;border:1px solid rgba(229,9,20,.4);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;gap:16px">' +
                '<div style="width:60px;height:60px;border-radius:50%;background:rgba(229,9,20,.15);border:1px solid rgba(229,9,20,.4);display:flex;align-items:center;justify-content:center"><span class="material-icons" style="font-size:30px;color:#ff3040">autorenew</span></div>' +
                '<h2 style="font-size:20px;font-weight:600;margin:0">Nuova versione del video disponibile</h2>' +
                '<p style="font-size:14px;color:rgba(255,255,255,.6);line-height:1.55;margin:0 0 4px;max-width:320px">Clicca Riprendi per continuare la visione dal punto in cui eri.</p>' +
                '<button id="newVerResume" style="background:#e50914;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(229,9,20,.35);min-width:180px;display:inline-flex;align-items:center;justify-content:center;gap:8px"><span class="material-icons" style="font-size:18px">play_arrow</span>Riprendi</button>' +
              '</div>';
            document.body.appendChild(ov);
            document.getElementById('newVerResume').onclick = () => {
                // Salva la posizione, RIGENERA il session-id (cosÃ¬ il heartbeat parte da una
                // sessione nuova con started_at=ADESSO > version_changed_at â niente loop del modal)
                // e ricarica la pagina pulita sul file nuovo.
                try { savePos(video.currentTime || pos || 0); } catch (_) {}
                try {
                    var newSid = (crypto.randomUUID && crypto.randomUUID()) ||
                                 (Date.now() + '-' + Math.random().toString(16).slice(2));
                    localStorage.setItem('cx_sid', newSid);
                } catch (_) {}
                ov.remove();
                location.reload();
            };
        };

        const send = () => {
            if (kicked) return;
            if (!Number.isFinite(video.duration) || video.duration <= 0) return;
            try {
                fetch('/hb', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(buildPayload()), keepalive: true })
                    .then(async r => {
                        if (r.status === 410) { const j = await r.json().catch(()=>null); handleKick(j); return; }
                        const j = await r.json().catch(() => null);
                        if (j && j.kicked) { handleKick(j); return; }
                        if (j && j.new_version && !IS_TRAILER) handleNewVersion();
                    })
                    .catch(() => {});
            } catch (_) {}
        };

        video.addEventListener('pause',          () => { pausedDelta++; send(); });
        video.addEventListener('play',           () => { send(); });
        video.addEventListener('seeking',        () => { seekDelta++;   });
        video.addEventListener('playing',        () => { send(); }, { once: false });
        
        video.addEventListener('loadedmetadata', () => { send(); }, { once: true });
        video.addEventListener('durationchange', () => { send(); }, { once: true });

        hbTimer = setInterval(send, HB_INTERVAL);

        const beacon = () => {
            try {
                const body = JSON.stringify(buildPayload());
                if (navigator.sendBeacon) navigator.sendBeacon('/hb',
                    new Blob([body], { type: 'application/json' }));
            } catch (_) {}
        };
        window.addEventListener('pagehide',     beacon);
        window.addEventListener('beforeunload', beacon);
    })();
})();

function toggleSettings(e){ e.stopPropagation(); document.getElementById('settingsMenu').classList.toggle('active'); }
document.addEventListener('click', e => { const sb = document.querySelector('.settings-btn'); if (sb && !sb.contains(e.target)) document.getElementById('settingsMenu').classList.remove('active'); });