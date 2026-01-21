(function(){
  const lobbyId = window.LOBBY_ID;
  const msgEl = document.getElementById('hostMsg');

  function setMsg(t){ msgEl.textContent = t || ''; }

  // Connexion SocketIO sur le même host que la page
  const socket = io(window.location.origin, { transports: ['websocket','polling'] });

  socket.on('connect', () => {
    socket.emit('join_lobby', { lobby_id: lobbyId, role: 'host' });
  });

  socket.on('error_msg', (p) => setMsg(p?.error || 'Erreur'));
  socket.on('state', (state) => render(state));
  socket.on('tick', (p) => {
    const el = document.getElementById('timeRemaining');
    if(el) el.textContent = String(p?.time_remaining ?? '-');
  });

  function render(state){
    document.getElementById('phase').textContent = state.phase;
    document.getElementById('timeRemaining').textContent = String(state.time_remaining ?? '-');
    document.getElementById('qIndex').textContent = String((state.question_index ?? 0) + 1);
    document.getElementById('qTotal').textContent = String(state.question_total ?? '-');

    document.getElementById('category').textContent = state.question?.category ?? '';
    document.getElementById('prompt').textContent = state.question?.prompt ?? (state.phase === 'waiting' ? 'En attente…' : '');

    const answers = document.getElementById('answers');
    answers.innerHTML = '';
    const a = state.question?.answers || {};
    for(const k of ['A','B','C','D']){
      if(!a[k]) continue;
      const el = document.createElement('div');
      el.className = 'lobby-answer';
      el.innerHTML = `<div class="key">${k}</div><div>${a[k]}</div>`;
      answers.appendChild(el);
    }

    const players = document.getElementById('players');
    players.innerHTML = '';
    for(const p of (state.players || [])){
      const row = document.createElement('div');
      row.className = 'lobby-player';
      row.innerHTML = `
        <div style="min-width:0;">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="meta">Choix: ${p.choice ?? '-'} ${p.is_correct === true ? '✓' : p.is_correct === false ? '✗' : ''}</div>
        </div>
        <div style="text-align:right;">
          <div class="name">${p.score}</div>
          <div class="meta">points</div>
        </div>
      `;
      players.appendChild(row);
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

  document.getElementById('btnStart').onclick = () => socket.emit('host_start', { lobby_id: lobbyId });
  document.getElementById('btnAsk').onclick = () => socket.emit('host_launch_question', { lobby_id: lobbyId });
  document.getElementById('btnPause').onclick = () => socket.emit('host_pause', { lobby_id: lobbyId });
  document.getElementById('btnResume').onclick = () => socket.emit('host_resume', { lobby_id: lobbyId });
  document.getElementById('btnForce').onclick = () => socket.emit('host_force_validate', { lobby_id: lobbyId });
  document.getElementById('btnNext').onclick = () => socket.emit('host_next_question', { lobby_id: lobbyId });
})();
