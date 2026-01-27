(function(){
  const lobbyId = window.LOBBY_ID;
  const msgEl = document.getElementById('message');
  const playerName = window.PLAYER_NAME || 'Joueur';
  
  let currentState = null;
  let myPlayerName = '';
  let myChips = 1000;
  let currentBets = { A: 0, B: 0, C: 0, D: 0 };
  let hasBet = false;
  let gameStarted = false;
  let timerActive = false;
  let resolving = false;
  let lastResolvedQuestionIndex = null;
  let hasShownGameOver = false; // Pour tracker si on a déjà montré le Game Over

  // Connexion SocketIO sur le même host que la page
  const socket = io(window.location.origin, { transports: ['websocket','polling'] });

  socket.on('connect', () => {
    // Rejoindre le lobby avec le nom du joueur
    socket.emit('join_lobby', { 
      lobby_id: lobbyId, 
      role: 'player',
      player_name: playerName
    });
  });

  socket.on('error_msg', (p) => setMsg(p?.error || 'Erreur', 'error'));
  
  // Événement déclenché quand l'hôte lance la partie
  socket.on('game_started', () => {
    if(!gameStarted){
      gameStarted = true;
      // Affichage immédiat du plateau de jeu (sans attendre)
      showGameBoard();
    }
  });

  // Animation cinématique pour nouvelle question
  socket.on('new_question', () => {
    // Si le joueur est éliminé et qu'on affiche Game Over, basculer en mode spectateur
    if(myChips <= 0 && hasShownGameOver){
      showGameBoard(); // Revenir au plateau de jeu
    }
    
    hasBet = false;
    currentBets = { A: 0, B: 0, C: 0, D: 0 };
    updateBetDisplay();
    
    // Déclencher l'animation de question (currentState devrait être à jour)
    if(currentState?.question?.prompt && window.MD_CINEMATIC){
      timerActive = false;
      disableBetting();
      setMsg('Question en cours...', 'info');
      
      window.MD_CINEMATIC.playOnce({
        index: currentState.question_index,
        prompt: currentState.question.prompt,
        onAfterReveal: () => {
          // Après l'animation : plateau visible + mises possibles (sauf si éliminé) + timer actif
          renderAnswers(currentState);
          
          // Activer les mises uniquement si le joueur a encore des jetons
          if(myChips > 0){
            enableBetting();
            timerActive = true;
            setMsg('Placez vos jetons et validez votre mise !', 'info');
          } else {
            disableBetting();
            timerActive = false;
            setMsg('👻 Mode spectateur - Vous êtes éliminé mais pouvez continuer à suivre la partie', 'info');
          }
        }
      });
    }
  });
  
  socket.on('state', (state) => {
    currentState = state;
    
    // Récupérer mes informations
    const me = state.players?.find(p => p.socket_id === socket.id);
    if(me){
      const previousChips = myChips;
      myPlayerName = me.name;
      myChips = me.score || 0;
      document.getElementById('playerName').textContent = myPlayerName;
      document.getElementById('chips').textContent = myChips;
      
      // Si le joueur vient de perdre (passage à 0 jetons) et qu'on n'a pas encore montré le Game Over
      if(gameStarted && myChips <= 0 && previousChips > 0 && !hasShownGameOver){
        hasShownGameOver = true;
        showGameOver();
        return;
      }
    }
    
    // Gérer la transition entre lobby et jeu
    const inLobbyWaitingRoom = !gameStarted && state.phase === 'waiting' && state.question_index === 0 && !state.question;
    
    if(inLobbyWaitingRoom){
      showLobbyWaiting(state);
    } else {
      if(!gameStarted){
        gameStarted = true;
        showGameBoard();
      }
      render(state);
    }
  });

  async function playResolutionOnce(correct, questionIndex){
    if(!window.MD_RESOLUTION || !correct) return;
    if(resolving) return;
    if(questionIndex != null && lastResolvedQuestionIndex === questionIndex) return;

    resolving = true;
    timerActive = false;
    if(questionIndex != null) lastResolvedQuestionIndex = questionIndex;
    try{
      // S'assurer que les mises sont définies même si le joueur n'a rien misé
      const bets = currentBets || { A: 0, B: 0, C: 0, D: 0 };
      await window.MD_RESOLUTION.play({ correct, bets });
    } finally {
      resolving = false;
    }
  }

  // Animation résolution
  socket.on('reveal_answer', (data) => {
    playResolutionOnce(data?.correct, data?.question_index);
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
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('gameBoard').style.display = 'flex';
    document.getElementById('chipsDisplay').style.display = '';
  }

  function showGameOver(){
    document.getElementById('lobbyWaiting').style.display = 'none';
    document.getElementById('gameBoard').style.display = 'none';
    document.getElementById('gameOver').style.display = 'flex';
    document.getElementById('finalScore').textContent = myChips + ' €';
    timerActive = false;
    disableBetting();
  }

  function render(state){
    // Question
    const qIndex = (state.question_index || 0) + 1;
    document.getElementById('qCounter').textContent = String(qIndex);
    document.getElementById('category').textContent = state.question?.category ?? '';
    document.getElementById('prompt').textContent = state.question?.prompt ?? '';
    document.getElementById('timerValue').textContent = String(state.time_remaining ?? 60);

    // Ne pas déclencher l'animation cinématique ici, elle est gérée par l'événement new_question
    renderAnswers(state);

    // Classement
    renderLeaderboard(state.players || []);

    // Messages selon la phase
    if(state.phase === 'waiting'){
      setMsg('En attente du lancement de la partie...', 'info');
      disableBetting();
      timerActive = false;
    } else if(state.phase === 'question'){
      // Afficher message pour joueurs éliminés (mode spectateur)
      if(myChips <= 0){
        setMsg('👻 Mode spectateur - Vous êtes éliminé mais pouvez continuer à suivre la partie', 'info');
        disableBetting();
        timerActive = false;
      } else {
        // Le message sera géré par l'animation new_question
        timerActive = (state.question && !resolving);
      }
    } else if(state.phase === 'results'){
      setMsg(state.correct ? `✓ Réponse correcte: ${state.correct}` : '✗ Résultats', 'info');
      disableBetting();
      timerActive = false;
      // Si on arrive ici sans avoir reçu reveal_answer (ex: refresh), on joue l'animation
      if(state.correct){
        playResolutionOnce(state.correct, state.question_index);
      }
    } else if(state.phase === 'paused'){
      setMsg('Pause...', 'info');
      disableBetting();
      timerActive = false;
    } else if(state.phase === 'finished'){
      setMsg('Partie terminée !', 'success');
      disableBetting();
      timerActive = false;
    }
  }

  function renderAnswers(state){
    // Réponses
    const answersKeys = ['A','B','C','D'];
    answersKeys.forEach(k => {
      const textEl = document.getElementById('ans'+k);
      const amountEl = document.getElementById('amount'+k);
      const answerCard = textEl?.parentElement;
      
      if(state.question?.answers?.[k]){
        textEl.textContent = state.question.answers[k];
        if(answerCard) answerCard.style.display = '';
        if(amountEl) amountEl.textContent = currentBets[k] + ' €';
      } else {
        if(answerCard) answerCard.style.display = 'none';
      }
    });
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
      let badgeText = rank;
      if(rank === 1) {
        badge.classList.add('md-lb-rank-gold');
        badgeText = '🥇';
      }
      else if(rank === 2) {
        badge.classList.add('md-lb-rank-silver');
        badgeText = '🥈';
      }
      else if(rank === 3) {
        badge.classList.add('md-lb-rank-bronze');
        badgeText = '🥉';
      }
      badge.textContent = badgeText;
      
      const name = document.createElement('div');
      name.className = 'md-lb-name';
      // Afficher en rouge si éliminé
      if(p.score <= 0){
        name.style.color = '#e53935';
        name.textContent = p.name + ' (Éliminé)';
      } else {
        name.textContent = p.name;
      }
      
      const score = document.createElement('div');
      score.className = 'md-lb-score';
      // Afficher en rouge si éliminé
      if(p.score <= 0){
        score.style.color = '#e53935';
      }
      score.textContent = p.score + ' €';
      
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
    
    const unbet = myChips > 0 ? myChips - totalBet : 0;
    document.getElementById('totalBet').textContent = totalBet;
    document.getElementById('unbetValue').textContent = unbet;
    document.getElementById('unbet').textContent = unbet;
    document.getElementById('totalChips').textContent = myChips > 0 ? myChips : 0;
    
    const percent = myChips > 0 ? (unbet / myChips) * 100 : 0;
    document.getElementById('remainingBar').style.width = percent + '%';
    
    // Visualisation jetons restants
    const moneyStacks = document.getElementById('moneyStacks');
    if(moneyStacks){
      moneyStacks.innerHTML = '';
      if(myChips > 0){
        const numChips = Math.min(Math.floor(unbet / 100), 10);
        for(let i = 0; i < numChips; i++){
          const chip = document.createElement('div');
          chip.className = 'md-chip';
          moneyStacks.appendChild(chip);
        }
      }
    }
  }

  // Boutons +/-
  document.querySelectorAll('.md-circle-btn').forEach(btn => {
    btn.onclick = () => {
      // Bloquer si le joueur est éliminé
      if(myChips <= 0){
        setMsg('❌ Vous êtes éliminé ! Vous n\'avez plus de jetons.', 'error');
        return;
      }
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

  // Gestion du timeout - validation automatique quand le temps est écoulé
  socket.on('tick', (p) => {
    if(!timerActive) return;
    const remaining = p?.time_remaining ?? 0;
    document.getElementById('timerValue').textContent = Math.max(0, remaining);
    updateTimerProgress(remaining);
    // SUPPRESSION : plus de mise automatique à la dernière seconde
  });

  function enableBetting(){
    document.querySelectorAll('.md-circle-btn').forEach(btn => btn.disabled = false);
  }

  function disableBetting(){
    document.querySelectorAll('.md-circle-btn').forEach(btn => btn.disabled = true);
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
  
  // Gestionnaire pour le bouton Mode spectateur dans le Game Over
  const btnSpectator = document.getElementById('btnSpectator');
  if(btnSpectator){
    btnSpectator.addEventListener('click', () => {
      // Revenir au plateau de jeu en mode spectateur
      showGameBoard();
      if(currentState){
        render(currentState);
      }
    });
  }
})();
