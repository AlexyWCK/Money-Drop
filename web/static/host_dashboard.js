(function(){
  const lobbyId = window.LOBBY_ID;
  const msgEl = document.getElementById('hostMsg');

  function setMsg(t){ msgEl.textContent = t || ''; }

  // Musique de décompte pour l'hôte uniquement
  const countdownMusic = new Audio('/static/musique_décompte.mp3');
  countdownMusic.loop = true;
  countdownMusic.volume = 0.5;
  let musicPlaying = false;

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
    
    // Gérer la musique de décompte
    const timeRemaining = p?.time_remaining ?? 0;
    if(timeRemaining > 0 && !musicPlaying) {
      countdownMusic.play().catch(e => console.log('Impossible de jouer la musique:', e));
      musicPlaying = true;
    } else if(timeRemaining <= 0 && musicPlaying) {
      countdownMusic.pause();
      countdownMusic.currentTime = 0;
      musicPlaying = false;
    }
  });

  function render(state){
    document.getElementById('phase').textContent = state.phase;
    document.getElementById('timeRemaining').textContent = String(state.time_remaining ?? '-');
    document.getElementById('qIndex').textContent = String((state.question_index ?? 0) + 1);
    document.getElementById('qTotal').textContent = String(state.question_total ?? '-');

    // Arrêter la musique si on n'est pas en phase question
    if(state.phase !== 'question' && musicPlaying) {
      countdownMusic.pause();
      countdownMusic.currentTime = 0;
      musicPlaying = false;
    }

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

    // Classement trié par score
    const leaderboard = document.getElementById('leaderboard');
    if(leaderboard){
      leaderboard.innerHTML = '';
      const sorted = [...(state.players || [])].sort((a,b) => b.score - a.score);
      sorted.forEach((p, idx) => {
        const rank = idx + 1;
        const row = document.createElement('div');
        row.className = 'lobby-lb-item';
        
        let medal = '';
        if(rank === 1) medal = '🥇';
        else if(rank === 2) medal = '🥈';
        else if(rank === 3) medal = '🥉';
        else medal = `#${rank}`;
        
        row.innerHTML = `
          <div class="lb-rank">${medal}</div>
          <div class="lb-name">${escapeHtml(p.name)}</div>
          <div class="lb-score">${p.score} €</div>
        `;
        leaderboard.appendChild(row);
      });
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
  document.getElementById('btnPause').onclick = () => socket.emit('host_pause', { lobby_id: lobbyId });
  document.getElementById('btnResume').onclick = () => socket.emit('host_resume', { lobby_id: lobbyId });
  document.getElementById('btnForce').onclick = () => socket.emit('host_force_validate', { lobby_id: lobbyId });
  document.getElementById('btnReveal').onclick = () => socket.emit('host_reveal_answer', { lobby_id: lobbyId });
  document.getElementById('btnNext').onclick = () => socket.emit('host_next_question', { lobby_id: lobbyId });
})();
