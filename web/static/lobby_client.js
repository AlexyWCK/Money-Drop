(function(){
  const lobbyId = window.LOBBY_ID;
  const msgEl = document.getElementById('clientMsg');
  const answersEl = document.getElementById('answers');

  let currentState = null;
  let selected = null;

  function setMsg(t){ msgEl.textContent = t || ''; }

  const socket = io({ transports: ['websocket','polling'] });

  socket.on('connect', () => {
    socket.emit('join_lobby', { lobby_id: lobbyId, role: 'player' });
  });

  socket.on('error_msg', (p) => setMsg(p?.error || 'Erreur'));
  socket.on('state', (state) => {
    currentState = state;
    render(state);
  });
  socket.on('tick', (p) => {
    const el = document.getElementById('timeRemaining');
    if(el) el.textContent = String(p?.time_remaining ?? '-');
  });

  function render(state){
    document.getElementById('phase').textContent = state.phase;
    document.getElementById('timeRemaining').textContent = String(state.time_remaining ?? '-');
    document.getElementById('category').textContent = state.question?.category ?? '';
    document.getElementById('prompt').textContent = state.question?.prompt ?? (state.phase === 'waiting' ? 'En attente du serveur…' : '');

    const players = document.getElementById('players');
    players.innerHTML = '';
    for(const p of (state.players || [])){
      const row = document.createElement('div');
      row.className = 'lobby-player';
      row.innerHTML = `
        <div style="min-width:0;">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="meta">Score: ${p.score}</div>
        </div>
        <div class="meta">${p.choice ?? ''}</div>
      `;
      players.appendChild(row);
    }

    renderAnswers(state);
  }

  function renderAnswers(state){
    answersEl.innerHTML = '';
    const a = state.question?.answers || {};
    const phase = state.phase;

    for(const k of ['A','B','C','D']){
      if(!a[k]) continue;
      const el = document.createElement('div');
      el.className = 'lobby-answer';
      if(selected === k) el.classList.add('selected');

      // Results highlight
      if(phase === 'results' && state.correct){
        if(k === state.correct) el.classList.add('correct');
        else if(selected === k) el.classList.add('wrong');
      }

      el.innerHTML = `<div class="key">${k}</div><div>${a[k]}</div>`;

      el.onclick = () => {
        if(phase !== 'question') return;
        selected = k;
        socket.emit('player_answer', { lobby_id: lobbyId, choice: k });
        renderAnswers(currentState);
        setMsg('Choix envoyé au serveur.');
      };

      answersEl.appendChild(el);
    }

    if(phase === 'results'){
      setMsg(state.correct ? `Réponse correcte: ${state.correct}` : 'Résultats…');
    } else if(phase === 'paused'){
      setMsg('Pause…');
    } else if(phase === 'waiting'){
      setMsg('En attente du host…');
    } else {
      setMsg('');
    }
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }
})();
