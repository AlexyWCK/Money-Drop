async function getState(){
  const r = await fetch('/api/state');
  if(!r.ok) throw new Error('state');
  return await r.json();
}

let timerInterval = null;
let timeRemaining = 45;

function startTimer(){
  timeRemaining = 45;
  if(timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    timeRemaining--;
    $('timer').textContent = timeRemaining;
    
    // Changement de couleur quand moins de 10 secondes
    const timerEl = $('timer');
    if(timeRemaining < 10){
      timerEl.style.background = 'linear-gradient(180deg, #ff6b6b 0%, #cc0000 100%)';
      timerEl.style.borderColor = '#ff0000';
    } else if(timeRemaining < 20){
      timerEl.style.background = 'linear-gradient(180deg, #ffa500 0%, #ff8c00 100%)';
      timerEl.style.borderColor = '#ffa500';
    } else {
      timerEl.style.background = 'linear-gradient(180deg, #c71e1e 0%, #8b0000 100%)';
      timerEl.style.borderColor = '#ff6b6b';
    }
    
    if(timeRemaining <= 0){
      clearInterval(timerInterval);
      setMessage('Temps écoulé! Soumission automatique...');
      
      // Soumettre automatiquement avec l'argent misé
      // L'argent non misé est perdu
      setTimeout(() => {
        autoSubmit();
      }, 500);
    }
  }, 1000);
}

function stopTimer(){
  if(timerInterval) clearInterval(timerInterval);
}

async function autoSubmit(){
  clearHighlights();
  
  const state = await getState();
  const b = bets();
  const sum = totalBet(b);
  
  // Soumettre automatiquement même s'il n'a pas tout misé
  const r = await fetch('/api/bet', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(b)
  });

  const payload = await r.json().catch(() => ({ok:false, error:'erreur'}));
  if(!r.ok || !payload.ok){
    setMessage(`Erreur: ${payload.error || 'inconnue'}`);
    return;
  }

  const res = payload.resolution;
  document.querySelector(`.screen-unit[data-key="${res.correct}"]`)?.classList.add('good');
  document.querySelector(`.drop-table[data-key="${res.correct}"]`)?.classList.add('good');
  ['A','B','C','D'].filter(k => k !== res.correct).forEach(k => {
    const v = b[k] || 0;
    if(v > 0) {
      document.querySelector(`.screen-unit[data-key="${k}"]`)?.classList.add('bad');
      document.querySelector(`.drop-table[data-key="${k}"]`)?.classList.add('bad');
    }
  });

  setMessage(`Bonne réponse: ${res.correct}) ${res.correct_label} | Perdus: ${res.lost} | Conservés: ${res.kept}${res.explanation ? ' — ' + res.explanation : ''}`);
  renderLeaderboard(payload.leaderboard_text);
  
  // Arrêter le chrono
  stopTimer();

  // reset inputs for next question
  ['A','B','C','D'].forEach(k => document.getElementById('bet'+k).value = '0');
  await refresh();
}

function $(id){ 
  return document.getElementById(id);
}

function bets(){
  return {
    A: parseInt($('betA').value || '0', 10),
    B: parseInt($('betB').value || '0', 10),
    C: parseInt($('betC').value || '0', 10),
    D: parseInt($('betD').value || '0', 10),
  };
}

function updateChipDisplays(){
  const b = bets();
  ['A','B','C','D'].forEach(k => {
    const amount = b[k] || 0;
    const visual = $('chipsVisual'+k);
    if(visual){
      // Créer des visuels de liasses de billets
      const numStacks = Math.min(Math.floor(amount / 100), 8);
      visual.innerHTML = '';
      for(let i = 0; i < numStacks; i++){
        const stack = document.createElement('div');
        stack.className = 'chip-stack';
        visual.appendChild(stack);
      }
    }
    // Mettre à jour le montant affiché
    const amountEl = $('amount'+k);
    if(amountEl){
      amountEl.textContent = amount > 0 ? `${amount.toLocaleString('fr-FR')} €` : '0 €';
    }
  });
}

function totalBet(b){ return (b.A||0)+(b.B||0)+(b.C||0)+(b.D||0); }

function clearHighlights(){
  document.querySelectorAll('.screen-unit').forEach(t => t.classList.remove('good','bad'));
  document.querySelectorAll('.drop-table').forEach(t => t.classList.remove('good','bad'));
}

function setMessage(text){ $('message').textContent = text || ''; }

function renderLeaderboard(text){
  $('leaderboard').textContent = text || '(vide)';
}

function renderQuestion(state){
  clearHighlights();
  setMessage('');

  $('playerName').textContent = `Joueur: ${state.player.name}`;
  $('chips').textContent = `Jetons: ${state.player.chips}`;
  const qNum = `Q${state.progress.index + 1}`;
  $('qCounter').textContent = qNum;
  if($('qCounterRight')) $('qCounterRight').textContent = qNum;

  if(state.finished || state.eliminated || !state.question){
    $('category').textContent = state.eliminated ? 'Éliminé' : 'Fin';
    $('prompt').textContent = `Partie terminée. Jetons finaux: ${state.result?.final_chips ?? state.player.chips}`;
    renderLeaderboard(state.leaderboard_text);
    document.getElementById('submit').disabled = true;
    return;
  }

  $('category').textContent = state.question.category;
  $('prompt').textContent = state.question.prompt;
  $('ansA').textContent = state.question.answers.A;
  $('ansB').textContent = state.question.answers.B;
  $('ansC').textContent = state.question.answers.C;
  $('ansD').textContent = state.question.answers.D;

  // Reset amounts to 0 € initially
  $('amountA').textContent = '0 €';
  $('amountB').textContent = '0 €';
  $('amountC').textContent = '0 €';
  $('amountD').textContent = '0 €';

  document.getElementById('submit').disabled = false;
  const b = bets();
  $('totalBet').textContent = totalBet(b);
  $('unbet').textContent = Math.max(0, state.player.chips - totalBet(b));
  updateChipDisplays();
  
  // Démarrer le chrono pour cette question
  startTimer();
}

async function submit(){
  clearHighlights();
  setMessage('');

  const state = await getState();
  const b = bets();
  const sum = totalBet(b);
  
  // Bloquer si on n'a pas misé tout l'argent
  if(sum !== state.player.chips){
    setMessage(`Vous devez miser tous vos jetons! Misé: ${sum} / Disponible: ${state.player.chips}`);
    return;
  }
  
  if(sum > state.player.chips){
    setMessage(`Mises (${sum}) > jetons disponibles (${state.player.chips}).`);
    return;
  }

  const r = await fetch('/api/bet', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(b)
  });

  const payload = await r.json().catch(() => ({ok:false, error:'erreur'}));
  if(!r.ok || !payload.ok){
    setMessage(`Erreur: ${payload.error || 'inconnue'}`);
    return;
  }

  const res = payload.resolution;
  document.querySelector(`.screen-unit[data-key="${res.correct}"]`)?.classList.add('good');
  document.querySelector(`.drop-table[data-key="${res.correct}"]`)?.classList.add('good');
  ['A','B','C','D'].filter(k => k !== res.correct).forEach(k => {
    const v = b[k] || 0;
    if(v > 0) {
      document.querySelector(`.screen-unit[data-key="${k}"]`)?.classList.add('bad');
      document.querySelector(`.drop-table[data-key="${k}"]`)?.classList.add('bad');
    }
  });

  setMessage(`Bonne réponse: ${res.correct}) ${res.correct_label} | Perdus: ${res.lost} | Conservés: ${res.kept}${res.explanation ? ' — ' + res.explanation : ''}`);
  renderLeaderboard(payload.leaderboard_text);
  
  // Arrêter le chrono
  stopTimer();

  // reset inputs for next question
  ['A','B','C','D'].forEach(k => document.getElementById('bet'+k).value = '0');
  await refresh();
}

async function refresh(){
  const state = await getState();
  renderLeaderboard(state.leaderboard_text || '');
  renderQuestion(state);
}

function bind(){
  // Ne s'exécute que s'il y a l'élément submit (page /play)
  if(!document.getElementById('submit')) return;
  
  ['A','B','C','D'].forEach(k => {
    const input = document.getElementById('bet'+k);
    input.addEventListener('input', async () => {
      const state = await getState();
      const b = bets();
      const sum = totalBet(b);
      
      // Bloquer si dépasse les jetons disponibles
      if(sum > state.player.chips){
        // Réduire la mise actuelle
        const excess = sum - state.player.chips;
        const current = b[k] || 0;
        const allowed = Math.max(0, current - excess);
        input.value = allowed;
        
        // Recalculer
        const newB = bets();
        $('totalBet').textContent = totalBet(newB);
        $('unbet').textContent = Math.max(0, state.player.chips - totalBet(newB));
        updateChipDisplays();
      } else {
        $('totalBet').textContent = totalBet(b);
        $('unbet').textContent = Math.max(0, state.player.chips - totalBet(b));
        updateChipDisplays();
      }
    });
  });
  document.getElementById('submit').addEventListener('click', submit);
}

bind();
if(document.getElementById('submit')){
  // Code de jeu (page /play)
  refresh().catch(() => { window.location.href = '/'; });
}

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
