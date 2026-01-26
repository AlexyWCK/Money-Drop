const ANSWER_KEYS = ['A','B','C','D'];
const TOTAL_TIME = 60;
const BET_STEP = 100;

function $(id){
  return document.getElementById(id);
}

async function getState(){
  const r = await fetch('/api/state');
  if(!r.ok) throw new Error('state');
  return await r.json();
}

function setMessage(text){
  const el = $('message');
  if(el) el.textContent = text || '';
}

function getBets(){
  const out = {A:0,B:0,C:0,D:0};
  for(const k of ANSWER_KEYS){
    const el = $('bet'+k);
    out[k] = el ? (parseInt(el.value || '0', 10) || 0) : 0;
  }
  return out;
}

function setBet(key, value){
  const el = $('bet'+key);
  if(!el) return;
  el.value = String(Math.max(0, value|0));
}

function totalBet(b){
  return (b.A||0)+(b.B||0)+(b.C||0)+(b.D||0);
}

function clearHighlights(){
  document.querySelectorAll('[data-key]').forEach(el => el.classList.remove('good','bad'));
}

function renderChipsVisual(zoneId, amount, lingotPlaced) {
  const visual = $(zoneId);
  if(!visual) return;
  visual.innerHTML = '';
  // Lingot séparé, affiché en haut de la pile si utilisé
  if(lingotPlaced) {
    const lingotImg = document.createElement('img');
    lingotImg.src = '/static/lingot.png';
    lingotImg.alt = 'Lingot';
    lingotImg.className = 'chips-visual-img';
    visual.appendChild(lingotImg);
  }
  // Billet 5000
  let reste = amount;
  while(reste >= 5000) {
    const billet5000 = document.createElement('img');
    billet5000.src = '/static/billet5000.jpg';
    billet5000.alt = 'Billet 5000€';
    billet5000.className = 'chips-visual-img';
    visual.appendChild(billet5000);
    reste -= 5000;
  }
  // Billet 1000
  while(reste >= 1000) {
    const billet = document.createElement('img');
    billet.src = '/static/billet.jpg';
    billet.alt = 'Billet 1000€';
    billet.className = 'chips-visual-img';
    visual.appendChild(billet);
    reste -= 1000;
  }
  // Pièce 100
  while(reste >= 100) {
    const coin = document.createElement('img');
    coin.src = '/static/coin.png';
    coin.alt = 'Pièce 100€';
    coin.className = 'chips-visual-img';
    visual.appendChild(coin);
    reste -= 100;
  }
}

// Barre d'explication : alignement horizontal et espacement
function renderMoneyDescBar() {
  const bar = document.querySelector('.md-money-desc-bar');
  if(!bar) return;
  bar.innerHTML = `
    <img src="/static/coin.png" alt="Pièce 100€" /> 100€
    <img src="/static/billet.jpg" alt="Billet 1000€" /> 1000€
    <img src="/static/billet5000.jpg" alt="Billet 5000€" /> 5000€
    <img src="/static/lingot.png" alt="Lingot 10 000€" /> 10 000€
  `;
}

document.addEventListener('DOMContentLoaded', renderMoneyDescBar);

function updateVisuals(state){
  const b = getBets();
  const total = totalBet(b);
  const remaining = Math.max(0, (state?.player?.chips ?? 0) - total);

  const totalBetEl = $('totalBet');
  if(totalBetEl) totalBetEl.textContent = String(total);

  const unbetEl = $('unbet');
  if(unbetEl) unbetEl.textContent = String(remaining);

  const unbetValueEl = $('unbetValue');
  if(unbetValueEl) unbetValueEl.textContent = String(remaining);

  const totalChipsEl = $('totalChips');
  if(totalChipsEl) totalChipsEl.textContent = String(state?.player?.chips ?? 0);

  // Update images in each zone
  for(const k of ANSWER_KEYS){
    const amount = b[k] || 0;
    const lingot = (window.lingotPlacedKey === k);
    renderChipsVisual('chipsVisual'+k, amount, lingot);
    const amountEl = $('amount'+k);
    if(amountEl) amountEl.textContent = `${amount.toLocaleString('fr-FR')} €`;
    const zoneLabel = $('zoneLabel'+k);
    if(zoneLabel) zoneLabel.textContent = amount > 0 ? `${amount.toLocaleString('fr-FR')} €` : 'Glissez ici';
    const minusBtn = document.querySelector(`.md-circle-btn-minus[data-key="${k}"]`);
    if(minusBtn){
      if(amount > 0){
        minusBtn.classList.add('active');
        minusBtn.classList.remove('inactive');
      }else{
        minusBtn.classList.remove('active');
        minusBtn.classList.add('inactive');
      }
    }
  }

  // Remaining stacks visualization
  const moneyStacks = $('moneyStacks');
  if(moneyStacks){
    const stacks = Math.min(Math.ceil(remaining / 1000), 10);
    moneyStacks.innerHTML = '';
    for(let i=0;i<stacks;i++){
      const stack = document.createElement('div');
      stack.className = 'chip-stack';
      moneyStacks.appendChild(stack);
    }
  }

  const remainingBar = $('remainingBar');
  if(remainingBar){
    const totalChips = Math.max(1, state?.player?.chips ?? 1);
    const pct = Math.max(0, Math.min(100, (remaining / totalChips) * 100));
    remainingBar.style.width = `${pct}%`;
  }

  // Enable validate only when all chips placed
  const submitBtn = $('submit');
  if(submitBtn){
    submitBtn.disabled = !state?.question || !!state?.finished || !!state?.eliminated || remaining !== 0;
  }
}

function setTimerValue(seconds){
  const valueEl = $('timerValue');
  if(valueEl) valueEl.textContent = String(seconds);

  const progressEl = $('timerProgress');
  if(progressEl){
    const r = 45;
    const circumference = 2 * Math.PI * r;
    const ratio = Math.max(0, Math.min(1, seconds / TOTAL_TIME));
    const offset = circumference * (1 - ratio);
    progressEl.style.strokeDasharray = String(circumference);
    progressEl.style.strokeDashoffset = String(offset);

    if(seconds <= 5) progressEl.style.stroke = 'var(--md-danger)';
    else if(seconds <= 10) progressEl.style.stroke = 'var(--md-gold)';
    else progressEl.style.stroke = 'var(--md-cyan)';
  }
}

let timerInterval = null;
let timeRemaining = TOTAL_TIME;
let timerQuestionIndex = null;

// Cinématique: empêche de relancer l'anim sur chaque refresh
let cinematicQuestionIndex = null;

function stopTimer(){
  if(timerInterval){
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimerForQuestion(progressIndex){
  if(timerQuestionIndex === progressIndex && timerInterval) return;
  timerQuestionIndex = progressIndex;
  timeRemaining = TOTAL_TIME;
  setTimerValue(timeRemaining);
  stopTimer();

  timerInterval = setInterval(async ()=>{
    timeRemaining -= 1;
    setTimerValue(timeRemaining);
    if(timeRemaining <= 0){
      stopTimer();
      setMessage('Temps écoulé ! Soumission automatique...');
      setTimeout(()=>{ autoSubmit().catch(()=>{}); }, 250);
    }
  }, 1000);
}

function renderLeaderboard(state){
  const container = $('leaderboard');
  if(!container) return;

  // Backend provides state.leaderboard as list of {name,best_chips,best_correct}
  const entries = Array.isArray(state?.leaderboard) ? state.leaderboard : [];
  container.innerHTML = '';

  if(entries.length === 0){
    container.textContent = '(Classement vide)';
    const footer = $('leaderboardFooter');
    if(footer) footer.textContent = '';
    return;
  }

  entries.forEach((e, idx) => {
    const row = document.createElement('div');
    row.className = 'md-lb-row';

    const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
    const correct = Number(e.best_correct ?? 0);
    const chips = Number(e.best_chips ?? 0);

    row.innerHTML = `
      <div class="md-lb-top">
        <div class="md-lb-rank ${rankClass}">${idx + 1}</div>
        <div style="flex:1; min-width:0;">
          <div class="md-lb-name">${escapeHtml(String(e.name ?? ''))}</div>
          <div class="md-lb-sub">${correct} bonne${correct !== 1 ? 's' : ''} réponse${correct !== 1 ? 's' : ''}</div>
        </div>
        <div class="md-lb-score">${chips.toLocaleString('fr-FR')}<small>jetons</small></div>
      </div>
    `;
    container.appendChild(row);
  });

  const footer = $('leaderboardFooter');
  if(footer) footer.textContent = `${entries.length} joueurs connectés`;
}

function escapeHtml(str){
  return str.replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderState(state){
  clearHighlights();
  setMessage('');

  const playerNameEl = $('playerName');
  if(playerNameEl) playerNameEl.textContent = state?.player?.name ?? '...';

  const chipsEl = $('chips');
  if(chipsEl) chipsEl.textContent = String(state?.player?.chips ?? '...');

  const qCounterEl = $('qCounter');
  if(qCounterEl) qCounterEl.textContent = String((state?.progress?.index ?? 0) + 1);

  const categoryEl = $('category');
  if(categoryEl) categoryEl.textContent = state?.question?.category ?? (state?.eliminated ? 'Éliminé' : '');

  const promptEl = $('prompt');
  if(promptEl){
    if(state?.finished || state?.eliminated || !state?.question){
      promptEl.textContent = `Partie terminée. Jetons finaux: ${state?.result?.final_chips ?? state?.player?.chips ?? 0}`;
    } else {
      promptEl.textContent = state.question.prompt;
    }
  }

  // Answers
  for(const k of ANSWER_KEYS){
    const ansEl = $('ans'+k);
    if(ansEl){
      ansEl.textContent = state?.question?.answers?.[k] ?? '';
    }
  }

  // Reset bets when changing question
  if(state?.progress && timerQuestionIndex !== state.progress.index){
    for(const k of ANSWER_KEYS) setBet(k, 0);
  }

  updateVisuals(state);
  renderLeaderboard(state);

  if(state?.question && !state?.finished && !state?.eliminated){
    const idx = Number(state?.progress?.index ?? 0);

    // Joue la cinématique uniquement quand la question change
    if(window.MD_CINEMATIC && typeof window.MD_CINEMATIC.playOnce === 'function' && cinematicQuestionIndex !== idx){
      cinematicQuestionIndex = idx;
      stopTimer();
      setTimerValue(TOTAL_TIME);
      const played = window.MD_CINEMATIC.playOnce({
        index: idx,
        prompt: state.question.prompt,
        onAfterReveal: () => startTimerForQuestion(idx)
      });
      if(played) return;
    }

    startTimerForQuestion(idx);
  } else {
    stopTimer();
    setTimerValue(0);
  }
}

async function refresh(){
  const state = await getState();
  renderState(state);
}

async function submit(){
  setMessage('');
  clearHighlights();

  const state = await getState();
  const b = getBets();
  const sum = totalBet(b);

  // Web app config currently allows unbet chips, but UI wants full distribute.
  if(sum !== (state?.player?.chips ?? 0)){
    setMessage(`Vous devez miser tous vos jetons ! Misé: ${sum} / Disponible: ${state?.player?.chips ?? 0}`);
    return;
  }

  const r = await fetch('/api/bet', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(b)
  });
  const payload = await r.json().catch(()=>({ok:false, error:'erreur'}));
  if(!r.ok || !payload.ok){
    setMessage(`Erreur: ${payload.error || 'inconnue'}`);
    return;
  }

  stopTimer();

  const res = payload.resolution;
  // Cinématique de résolution type Money Drop
  if(window.MD_RESOLUTION && typeof window.MD_RESOLUTION.play === 'function'){
    try{
      await window.MD_RESOLUTION.play({ correct: res.correct, bets: b });
    }catch(e){
      // no-op: fallback to normal flow
    }
  }

  // Applique les états finaux
  document.querySelector(`.md-answer[data-key="${res.correct}"]`)?.classList.add('good');
  document.querySelector(`.md-zone[data-key="${res.correct}"]`)?.classList.add('good');
  for(const k of ANSWER_KEYS){
    if(k === res.correct) continue;
    if((b[k]||0) > 0){
      document.querySelector(`.md-answer[data-key="${k}"]`)?.classList.add('bad');
      document.querySelector(`.md-zone[data-key="${k}"]`)?.classList.add('bad');
    }
  }

  setMessage(`Bonne réponse: ${res.correct}) ${res.correct_label} | Perdus: ${res.lost} | Conservés: ${res.kept}${res.explanation ? ' — ' + res.explanation : ''}`);

  // Refresh state for next question
  setTimeout(()=>{ refresh().catch(()=>{}); }, 650);
}

async function autoSubmit(){
  // Auto-submit even if not fully distributed (backend allows it)
  const b = getBets();

  const r = await fetch('/api/bet', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(b)
  });
  const payload = await r.json().catch(()=>({ok:false, error:'erreur'}));
  if(!r.ok || !payload.ok){
    setMessage(`Erreur: ${payload.error || 'inconnue'}`);
    return;
  }

  const res = payload.resolution;
  if(window.MD_RESOLUTION && typeof window.MD_RESOLUTION.play === 'function'){
    try{
      await window.MD_RESOLUTION.play({ correct: res.correct, bets: b });
    }catch(e){
      // no-op
    }
  }

  document.querySelector(`.md-answer[data-key="${res.correct}"]`)?.classList.add('good');
  document.querySelector(`.md-zone[data-key="${res.correct}"]`)?.classList.add('good');

  setMessage(`Bonne réponse: ${res.correct}) ${res.correct_label} | Perdus: ${res.lost} | Conservés: ${res.kept}${res.explanation ? ' — ' + res.explanation : ''}`);
  setTimeout(()=>{ refresh().catch(()=>{}); }, 650);
}

function clampBetsToChips(state){
  const chips = state?.player?.chips ?? 0;
  const b = getBets();
  let sum = totalBet(b);
  if(sum <= chips) return;

  // Reduce from the biggest bet first
  const keys = [...ANSWER_KEYS].sort((a,bk) => (b[bk]||0) - (b[a]||0));
  let excess = sum - chips;
  for(const k of keys){
    if(excess <= 0) break;
    const cur = b[k] || 0;
    const delta = Math.min(cur, excess);
    b[k] = cur - delta;
    excess -= delta;
  }
  for(const k of ANSWER_KEYS) setBet(k, b[k]||0);
}

async function onAdjust(key, dir){
  const state = await getState();
  const chips = state?.player?.chips ?? 0;
  const b = getBets();
  const current = b[key] || 0;

  let next = current + (dir === 'plus' ? BET_STEP : -BET_STEP);
  next = Math.max(0, next);
  b[key] = next;

  // Cap total to chips
  const sum = totalBet(b);
  if(sum > chips){
    b[key] = Math.max(0, next - (sum - chips));
  }

  for(const k of ANSWER_KEYS) setBet(k, b[k]||0);
  updateVisuals(state);
}

function bindPlay(){
  const submitBtn = $('submit');
  if(!submitBtn) return;

  submitBtn.addEventListener('click', ()=>{ submit().catch(()=>{}); });

  // +/- buttons
  document.querySelectorAll('button[data-action][data-key]').forEach(btn => {
    btn.addEventListener('click', (ev)=>{
      const action = ev.currentTarget.getAttribute('data-action');
      const key = ev.currentTarget.getAttribute('data-key');
      if(!ANSWER_KEYS.includes(key)) return;
      onAdjust(key, action).catch(()=>{});
    });
  });

  // If user edits hidden inputs via devtools, keep totals sane
  for(const k of ANSWER_KEYS){
    const input = $('bet'+k);
    if(!input) continue;
    input.addEventListener('input', async ()=>{
      const st = await getState();
      clampBetsToChips(st);
      updateVisuals(st);
    });
  }

  refresh().catch(() => { window.location.href = '/'; });
}

bindPlay();

// Lobby UI handlers (on index.html)
async function postJson(url, data){
  const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)});
  return r.json().catch(()=>({ok:false}));
}

if(document.getElementById('btnCreate')){
  document.getElementById('btnCreate').addEventListener('click', async ()=>{
    const name = document.getElementById('lobbyName').value || '';
    const size = parseInt(document.getElementById('lobbySize').value||'2',10);
    const time_limit = parseInt(document.getElementById('lobbyTime').value||'30',10);
    // ensure session created (submit name via /start)
    if(name){
      await fetch('/start', {method:'POST', body: new URLSearchParams({name})});
    }
    const res = await postJson('/lobby/create', {size, time_limit});
    if(res.ok){
      document.getElementById('lobbyMsg').textContent = `Salon créé: ${res.lobby_id} — attendre les joueurs...`;
      // redirect to play and store lobby_id in sessionStorage
      sessionStorage.setItem('lobby_id', res.lobby_id);
      location.href = '/play';
    } else {
      document.getElementById('lobbyMsg').textContent = `Erreur: ${res.error}`;
    }
  });
}

if(document.getElementById('btnJoin')){
  document.getElementById('btnJoin').addEventListener('click', async ()=>{
    const id = document.getElementById('joinId').value.trim();
    const name = document.getElementById('lobbyName').value || '';
    if(!id){ document.getElementById('lobbyMsg').textContent = 'Indiquez l\'ID du salon.'; return; }
    if(name){ await fetch('/start', {method:'POST', body: new URLSearchParams({name})}); }
    const res = await postJson('/lobby/join', {lobby_id: id});
    if(res.ok){ sessionStorage.setItem('lobby_id', id); location.href='/play'; }
    else document.getElementById('lobbyMsg').textContent = `Erreur: ${res.error}`;
  });
}

// In play page, if sessionStorage has lobby_id, use lobby flow
if(location.pathname === '/play'){
  const lobby_id = sessionStorage.getItem('lobby_id');
  if(lobby_id){
    // poll lobby state and update UI
    const poll = async ()=>{
      try{
        const r = await fetch(`/lobby/state?lobby_id=${encodeURIComponent(lobby_id)}`);
        if(!r.ok) throw new Error('no');
        const payload = await r.json();
        if(!payload.ok) throw new Error('err');
        const st = payload.state;
        // show players list in leaderboard
        $('leaderboard').textContent = st.players.map(p=>`${p.name} — ${p.chips} jetons`).join('\n');

        if(!st.started){
          $('prompt').textContent = `En attente du démarrage... (${st.players.length}/${st.question_total || 0})`;
          // if you are creator, show start button
        } else if(st.finished){
          $('prompt').textContent = `Partie terminée. Consultez le classement.`;
        } else {
          // active question
          $('category').textContent = st.question.category;
          $('prompt').textContent = st.question.prompt;
          $('ansA').textContent = st.question.answers.A;
          $('ansB').textContent = st.question.answers.B;
          $('ansC').textContent = st.question.answers.C;
          $('ansD').textContent = st.question.answers.D;
          $('chips').textContent = `Jetons: ${st.players.find(p=>p.name===document.getElementById('playerName')?.textContent?.replace('Joueur: ','') )?.chips ?? ''}`;
          $('totalBet').textContent = $('totalBet').textContent || '0';
          document.getElementById('submit').onclick = async ()=>{
            const b = bets();
            const res = await postJson('/lobby/bet', Object.assign({lobby_id}, b));
            if(!res.ok){ setMessage(`Erreur: ${res.error}`); return; }
            setMessage('Mise envoyée. En attente des autres joueurs...');
          };
        }
      }catch(e){/* ignore */}
    };
    setInterval(poll, 1000);
    poll();
  }
}

// --- Lingot unique, drag & drop et boutons sur chaque réponse ---
let lingotUsed = false;
let lingotPlacedKey = null;

function disableLingot() {
  document.querySelectorAll('.btn-lingot').forEach(btn => btn.disabled = true);
  const lingot = document.getElementById('draggableLingot');
  if(lingot) lingot.draggable = false;
}

function enableLingot() {
  document.querySelectorAll('.btn-lingot').forEach(btn => btn.disabled = false);
  const lingot = document.getElementById('draggableLingot');
  if(lingot) lingot.draggable = true;
}

document.addEventListener('DOMContentLoaded', () => {
  const lingot = document.getElementById('draggableLingot');
  if(lingot){
    lingot.addEventListener('dragstart', (e) => {
      if(lingotUsed) { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', 'lingot');
    });
    for(const k of ANSWER_KEYS){
      const zone = document.getElementById('chipsVisual'+k);
      if(zone){
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
        });
        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          if(lingotUsed) return;
          setBet(k, (parseInt(document.getElementById('bet'+k).value)||0) + 10000);
          updateVisuals(window.lastState || {});
          lingotUsed = true;
          lingotPlacedKey = k;
          disableLingot();
        });
      }
    }
  }
  // Boutons lingot sur chaque réponse
  for(const k of ANSWER_KEYS){
    const btn = document.getElementById('btnLingot'+k);
    if(btn){
      btn.addEventListener('click', () => {
        if(lingotUsed) return;
        setBet(k, (parseInt(document.getElementById('bet'+k).value)||0) + 10000);
        updateVisuals(window.lastState || {});
        lingotUsed = true;
        lingotPlacedKey = k;
        disableLingot();
      });
    }
  }
});

// Affichage dynamique des jetons restants
function updateJetonsRestantsDisplay(state){
  // ... à compléter selon la logique backend pour afficher les quantités restantes de chaque type
}

