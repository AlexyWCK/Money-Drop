(function(){
  const lobbyId = window.LOBBY_ID;
  const msgEl = document.getElementById('message');
  
  let currentState = null;
  let myPlayerName = '';
  let myChips = 1000;
  let currentBets = { A: 0, B: 0, C: 0, D: 0 };
  let hasBet = false;
  let gameStarted = false;

  // Connexion SocketIO sur le même host que la page
  const socket = io(window.location.origin, { transports: ['websocket','polling'] });

  socket.on('connect', () => {
    socket.emit('join_lobby', { lobby_id: lobbyId, role: 'player' });
  });

  socket.on('error_msg', (p) => setMsg(p?.error || 'Erreur', 'error'));
  
  socket.on('state', (state) => {
    currentState = state;
    
    // Récupérer mes informations
    const me = state.players?.find(p => p.socket_id === socket.id);
    if(me){
      myPlayerName = me.name;
      myChips = me.score || 1000;
      document.getElementById('playerName').textContent = myPlayerName;
      document.getElementById('chips').textContent = myChips;
    }
    
    // Gérer la transition entre lobby et jeu
    // On reste en mode lobby si: phase=waiting ET aucune question n'a encore été lancée
    const inLobbyWaitingRoom = state.phase === 'waiting' && (state.question_total === 10 || state.question_total === 7) && state.question_index === 0 && !state.question;
    
    if(inLobbyWaitingRoom && !gameStarted){
      showLobbyWaiting(state);
    } else {
      if(!gameStarted){
        gameStarted = true;
        showGameBoard();
      }
      render(state);
    }
  });

  socket.on('tick', (p) => {
    const remaining = p?.time_remaining ?? 0;
    document.getElementById('timerValue').textContent = Math.max(0, remaining);
    updateTimerProgress(remaining);
  });

  // Animation cinématique pour nouvelle question
  socket.on('new_question', () => {
    if(window.triggerQuestionAnimation){
      window.triggerQuestionAnimation();
    }
    hasBet = false;
    currentBets = { A: 0, B: 0, C: 0, D: 0 };
    updateBetDisplay();
  });

  // Animation résolution
  socket.on('reveal_answer', (data) => {
    if(window.triggerResolutionAnimation){
      window.triggerResolutionAnimation(data.correct);
    }
  });

  function showLobbyWaiting(state){
    document.getElementById('lobbyWaiting').style.display = 'flex';
    document.getElementById('gameBoard').style.display = 'none';
    document.getElementById('chipsDisplay').style.display = 'none';
    
    // Afficher la liste des joueurs
    const playersList = document.getElementById('lobbyPlayersList');
    const playerCount = document.getElementById('lobbyPlayerCount');
    
    playerCount.textContent = state.players?.length || 0;
    playersList.innerHTML = '';
    
    (state.players || []).forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'md-lobby-player-item';
      
      const avatar = document.createElement('div');
      avatar.className = 'md-lobby-player-avatar';
      avatar.textContent = (p.name || '?')[0].toUpperCase();
      
      const name = document.createElement('div');
      name.className = 'md-lobby-player-name';
      name.textContent = p.name || 'Joueur';
      
      item.appendChild(avatar);
      item.appendChild(name);
      
      // Badge hôte pour le premier joueur
      if(idx === 0){
        const badge = document.createElement('div');
        badge.className = 'md-lobby-player-badge';
        badge.textContent = '👑 Hôte';
        item.appendChild(badge);
      }
      
      playersList.appendChild(item);
    });
  }

  function showGameBoard(){
    document.getElementById('lobbyWaiting').style.display = 'none';
    document.getElementById('gameBoard').style.display = 'flex';
    document.getElementById('chipsDisplay').style.display = '';
  }

  function render(state){
    // Question
    document.getElementById('qCounter').textContent = String((state.question_index || 0) + 1);
    document.getElementById('category').textContent = state.question?.category ?? '';
    document.getElementById('prompt').textContent = state.question?.prompt ?? (state.phase === 'waiting' ? 'En attente du démarrage...' : '');
    document.getElementById('timerValue').textContent = String(state.time_remaining ?? 60);

    // Réponses
    const answersKeys = ['A','B','C','D'];
    answersKeys.forEach(k => {
      const textEl = document.getElementById('ans'+k);
      const amountEl = document.getElementById('amount'+k);
      if(state.question?.answers?.[k]){
        textEl.textContent = state.question.answers[k];
        textEl.parentElement.style.display = '';
        if(amountEl) amountEl.textContent = currentBets[k] + ' €';
      } else {
        textEl.parentElement.style.display = 'none';
      }
    });

    // Classement
    renderLeaderboard(state.players || []);

    // Messages selon la phase
    if(state.phase === 'waiting'){
      setMsg('En attente du démarrage...', 'info');
      disableBetting();
    } else if(state.phase === 'question'){
      if(!hasBet){
        setMsg('Placez vos jetons et validez votre mise !', 'info');
        enableBetting();
      }
    } else if(state.phase === 'results'){
      setMsg(state.correct ? `✓ Réponse correcte: ${state.correct}` : '✗ Résultats', 'info');
      disableBetting();
    } else if(state.phase === 'paused'){
      setMsg('Pause...', 'info');
      disableBetting();
    } else if(state.phase === 'finished'){
      setMsg('Partie terminée !', 'success');
      disableBetting();
    }
  }

  function renderLeaderboard(players){
    const lb = document.getElementById('leaderboard');
    lb.innerHTML = '';
    
    // Trier par score
    const sorted = [...players].sort((a,b) => b.score - a.score);
    
    sorted.forEach((p, idx) => {
      const rank = idx + 1;
      const row = document.createElement('div');
      row.className = 'md-lb-item';
      if(p.name === myPlayerName) row.classList.add('md-lb-item-me');
      
      const badge = document.createElement('div');
      badge.className = 'md-lb-rank';
      if(rank === 1) badge.classList.add('md-lb-rank-gold');
      else if(rank === 2) badge.classList.add('md-lb-rank-silver');
      else if(rank === 3) badge.classList.add('md-lb-rank-bronze');
      badge.textContent = rank;
      
      const name = document.createElement('div');
      name.className = 'md-lb-name';
      name.textContent = p.name;
      
      const score = document.createElement('div');
      score.className = 'md-lb-score';
      score.innerHTML = `<strong>${p.score}</strong><br/>jetons`;
      
      row.appendChild(badge);
      row.appendChild(name);
      row.appendChild(score);
      lb.appendChild(row);
    });

    const footer = document.getElementById('leaderboardFooter');
    footer.textContent = `${players.length} joueur${players.length > 1 ? 's' : ''} connecté${players.length > 1 ? 's' : ''}`;
  }

  // Gestion des mises
  function updateBetDisplay(){
    const keys = ['A','B','C','D'];
    let totalBet = 0;
    
    keys.forEach(k => {
      const input = document.getElementById('bet'+k);
      const amount = document.getElementById('amount'+k);
      const label = document.getElementById('zoneLabel'+k);
      const visual = document.getElementById('chipsVisual'+k);
      
      if(input){
        input.value = currentBets[k];
        totalBet += currentBets[k];
      }
      if(amount) amount.textContent = currentBets[k] + ' €';
      if(label) label.textContent = currentBets[k] > 0 ? currentBets[k] + ' €' : 'Glissez ici';
      
      // Visualisation des jetons
      if(visual){
        visual.innerHTML = '';
        const numChips = Math.min(Math.floor(currentBets[k] / 100), 10);
        for(let i = 0; i < numChips; i++){
          const chip = document.createElement('div');
          chip.className = 'md-chip';
          visual.appendChild(chip);
        }
      }
    });
    
    const unbet = myChips - totalBet;
    document.getElementById('totalBet').textContent = totalBet;
    document.getElementById('unbetValue').textContent = unbet;
    document.getElementById('unbet').textContent = unbet;
    document.getElementById('totalChips').textContent = myChips;
    
    const percent = myChips > 0 ? (unbet / myChips) * 100 : 0;
    document.getElementById('remainingBar').style.width = percent + '%';
    
    // Visualisation jetons restants
    const moneyStacks = document.getElementById('moneyStacks');
    if(moneyStacks){
      moneyStacks.innerHTML = '';
      const numChips = Math.min(Math.floor(unbet / 100), 10);
      for(let i = 0; i < numChips; i++){
        const chip = document.createElement('div');
        chip.className = 'md-chip';
        moneyStacks.appendChild(chip);
      }
    }
  }

  // Boutons +/-
  document.querySelectorAll('.md-circle-btn').forEach(btn => {
    btn.onclick = () => {
      if(hasBet || !currentState || currentState.phase !== 'question') return;
      
      const key = btn.dataset.key;
      const action = btn.dataset.action;
      const step = 100;
      
      if(action === 'plus'){
        const totalBet = Object.values(currentBets).reduce((a,b) => a+b, 0);
        if(totalBet + step <= myChips){
          currentBets[key] += step;
        }
      } else if(action === 'minus'){
        if(currentBets[key] >= step){
          currentBets[key] -= step;
        }
      }
      
      updateBetDisplay();
    };
  });

  // Bouton valider
  document.getElementById('submit').onclick = () => {
    if(hasBet || !currentState || currentState.phase !== 'question') return;
    
    const totalBet = Object.values(currentBets).reduce((a,b) => a+b, 0);
    if(totalBet === 0){
      setMsg('⚠ Vous devez placer au moins un jeton !', 'error');
      return;
    }
    
    // Envoyer les mises au serveur
    socket.emit('player_bets', { lobby_id: lobbyId, bets: currentBets });
    hasBet = true;
    setMsg('✓ Mise validée !', 'success');
    disableBetting();
  };

  function enableBetting(){
    document.querySelectorAll('.md-circle-btn').forEach(btn => btn.disabled = false);
    document.getElementById('submit').disabled = false;
  }

  function disableBetting(){
    document.querySelectorAll('.md-circle-btn').forEach(btn => btn.disabled = true);
    document.getElementById('submit').disabled = true;
  }

  function updateTimerProgress(remaining){
    const progress = document.getElementById('timerProgress');
    if(!progress) return;
    const maxTime = 60;
    const percent = Math.max(0, remaining / maxTime);
    const circumference = 2 * Math.PI * 45;
    progress.style.strokeDashoffset = circumference * (1 - percent);
  }

  function setMsg(text, type){
    if(!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'md-message';
    if(type === 'error') msgEl.classList.add('md-message-error');
    else if(type === 'success') msgEl.classList.add('md-message-success');
  }

  // Initialisation
  updateBetDisplay();
  disableBetting();
})();
