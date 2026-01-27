(function(){
  const lobbyId = window.LOBBY_ID;
  const msgEl = document.getElementById('message');
  const playerName = window.PLAYER_NAME || 'Joueur';
  
  let currentState = null;
  let myPlayerName = '';
  let myChips = 10000;
  let myLingots = 1;
  let currentLingotBet = null; // 'A', 'B', 'C', 'D' ou null
  
  let currentBets = { A: 0, B: 0, C: 0, D: 0 };
  let hasBet = false;
  let gameStarted = false;
  let timerActive = false;
  let resolving = false;
  let lastResolvedQuestionIndex = null;
  let hasShownGameOver = false;

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
    currentLingotBet = null; // Reset lingot bet on new question
    
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
          
          // Activer les mises uniquement si le joueur a encore des jetons ou un lingot
          if(myChips > 0 || myLingots > 0){
            enableBetting();
            timerActive = true;
            setMsg('Placez vos jetons et votre lingot !', 'info');
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
      const previousLingots = myLingots;
      myPlayerName = me.name;
      myChips = me.score || 0;
      myLingots = (me.lingots !== undefined) ? me.lingots : 1;
      
      // Restaurer le placement du lingot si présent dans l'état (reconnexion)
      if (state.phase === 'question' && me.bet_lingot) {
         currentLingotBet = me.bet_lingot;
      }
      
      document.getElementById('playerName').textContent = myPlayerName;
      document.getElementById('chips').textContent = myChips;
      document.getElementById('lingotCount').textContent = myLingots;
      
      const lDisp = document.getElementById('lingotDisplay');
      // Afficher le status lingot
      if(lDisp) lDisp.style.display = (myLingots > 0 || currentLingotBet) ? '' : 'none';

      // Si le joueur vient de perdre (passage à 0 jetons ET 0 lingots)
      const isEliminated = (myChips <= 0 && myLingots <= 0);
      const wasEliminated = (previousChips <= 0 && previousLingots <= 0);

      if(gameStarted && isEliminated && !wasEliminated && !hasShownGameOver){
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
    document.getElementById('lingotDisplay').style.display = 'none';
    
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
      if(myChips <= 0 && myLingots <= 0){
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
        if(amountEl) amountEl.textContent = currentBets[k] > 0 ? currentBets[k].toLocaleString('fr-FR') + ' €' : '';
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

      // Afficher le lingot dans le leaderboard
      const lingotSpan = document.createElement('span');
      if (p.lingots > 0) {
          lingotSpan.textContent = ' 💎';
          name.appendChild(lingotSpan);
      }
      
      row.appendChild(badge);
      row.appendChild(name);
      row.appendChild(score);
      lb.appendChild(row);
    });

    const footer = document.getElementById('leaderboardFooter');
    footer.textContent = `${players.length} joueur${players.length > 1 ? 's' : ''} connecté${players.length > 1 ? 's' : ''}`;
  }

  function sendBets() {
      if (!lobbyId) return;
      socket.emit('player_bets', {
          lobby_id: lobbyId,
          bets: currentBets,
          bet_lingot: currentLingotBet
      });
  }

  // Gestion des mises
  function updateBetDisplay(){
    const keys = ['A','B','C','D'];
    let totalBet = 0;
    
    keys.forEach(k => {
      const input = document.getElementById('bet'+k);
      const inputVisible = document.getElementById('inputBet'+k);
      const amount = document.getElementById('amount'+k);
      const label = document.getElementById('zoneLabel'+k);
      const visual = document.getElementById('chipsVisual'+k);
      const lingotBtn = document.getElementById('btnLingot'+k);
      
      // Update local storage inputs
      if(input){
        input.value = currentBets[k];
        totalBet += currentBets[k];
      }
      
      // Update Visible Input
      if(inputVisible){
        if(document.activeElement !== inputVisible){
             inputVisible.value = currentBets[k] > 0 ? currentBets[k] : '';
        }
      }
      
      if(amount) amount.textContent = currentBets[k] > 0 ? currentBets[k].toLocaleString('fr-FR') + ' €' : '';
      if(label) label.textContent = currentBets[k] > 0 ? currentBets[k].toLocaleString('fr-FR') + ' €' : 'Glissez ici';
      
      // Update Lingot Button
      if(lingotBtn) {
         if (currentLingotBet === k) {
             lingotBtn.style.opacity = '1';
             lingotBtn.style.transform = 'scale(1.2)';
             lingotBtn.style.border = '2px solid #ffd700';
             lingotBtn.style.borderRadius = '20%';
             lingotBtn.style.boxShadow = '0 0 10px gold';
         } else {
             lingotBtn.style.opacity = (myLingots > 0 || currentLingotBet) ? '0.7' : '0.2';
             lingotBtn.style.transform = 'scale(1)';
             lingotBtn.style.border = 'none';
             lingotBtn.style.boxShadow = 'none';
         }
      }

      // Visualisation des jetons (lingots, billets, pièces)
      if(visual){
        visual.innerHTML = '';
        let val = currentBets[k];
        
        // Stacks de monnaie
        const ingots = Math.floor(val / 5000);
        val %= 5000;
        const bills = Math.floor(val / 1000);
        val %= 1000;
        const coins = Math.floor(val / 100);

        const addToken = (src, cls, width) => {
            const img = document.createElement('img');
            img.src = '/static/' + src;
            img.className = cls || 'token-img';
            img.style.height = width || '40px';
            img.style.marginRight = '-15px'; 
            img.style.filter = 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))';
            visual.appendChild(img);
        };

        for(let i=0; i<ingots; i++) addToken('lingot.png', 'token-ingot');
        for(let i=0; i<bills; i++) addToken('billet.jpg', 'token-bill');
        for(let i=0; i<coins; i++) addToken('coin.png', 'token-coin');
        
        // Bonus Lingot 
        if(currentLingotBet === k) {
            const b = document.createElement('img');
            b.src = '/static/lingot.png';
            b.className = 'token-bonus-lingot';
            b.style.height = '60px'; // Bigger
            b.style.position = 'absolute';
            b.style.top = '-40px';
            b.style.right = '10px';
            b.style.zIndex = '100';
            b.style.filter = 'drop-shadow(0 0 10px #ffee00)';
            b.style.transform = 'rotate(15deg)';
            visual.appendChild(b);
            visual.style.position = 'relative';
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
        let val = unbet;
        const ingots = Math.floor(val / 5000);
        val %= 5000;
        const bills = Math.floor(val / 1000);
        val %= 1000;
        const coins = Math.floor(val / 100);

        const addToken = (src) => {
            const img = document.createElement('img');
            img.src = '/static/' + src;
            img.style.height = '30px';
            img.style.marginRight = '-10px';
            moneyStacks.appendChild(img);
        };

        // Limiter l'affichage
        const maxItems = 40; 
        let count = 0;
        for(let i=0; i<ingots && count<maxItems; i++, count++) addToken('lingot.png');
        for(let i=0; i<bills && count<maxItems; i++, count++) addToken('billet.jpg');
        for(let i=0; i<coins && count<maxItems; i++, count++) addToken('coin.png');
      }
    }
  }

  // Gestion des inputs de mise
  document.querySelectorAll('.md-bet-input').forEach(input => {
    const handleBetInput = (e, roundUp) => {
      // Bloquer si le joueur est éliminé
      if(myChips <= 0){
        e.target.value = '';
        if (myLingots <= 0) {
            setMsg('❌ Vous êtes éliminé ! Vous n\'avez plus de jetons.', 'error');
        }
        return;
      }
      if(hasBet || !currentState || currentState.phase !== 'question') {
           e.target.value = currentBets[e.target.dataset.key] > 0 ? currentBets[e.target.dataset.key] : '';
           return;
      }

      const key = e.target.dataset.key;
      let val = parseInt(e.target.value, 10);
      if(isNaN(val)) val = 0;
      
      val = Math.max(0, val);
      
      // Arrondir à la centaine supérieure si demandé
      if(roundUp && val > 0) {
          val = Math.ceil(val / 100) * 100;
      }
      
      // Vérifier si on ne dépasse pas le total
      const otherBets = Object.keys(currentBets).reduce((acc, k) => k===key ? acc : acc + currentBets[k], 0);
      const maxPossible = Math.max(0, myChips - otherBets);
      
      if(val > maxPossible){
          val = maxPossible;
      }
      
      if(roundUp || val > maxPossible) {
         e.target.value = val > 0 ? val : '';
      }
      
      currentBets[key] = val;
      updateBetDisplay();
      sendBets();
    };

    input.addEventListener('input', (e) => handleBetInput(e, false));
    input.addEventListener('change', (e) => handleBetInput(e, true));
  });

  // Gestion des mises lingots
  document.querySelectorAll('.md-btn-lingot').forEach(btn => {
      btn.addEventListener('click', (e) => {
          if(myChips <= 0 && myLingots <= 0) return; 
          if(hasBet || !currentState || currentState.phase !== 'question') return;

          const key = btn.dataset.key;
          
          if(currentLingotBet === key) {
              // Enlever le lingot
              currentLingotBet = null;
          } else {
              // Placer ou Déplacer
              // Possible seulement si on a un lingot en reserve ou déjà placé
              if (myLingots > 0 || currentLingotBet !== null) {
                  currentLingotBet = key;
              }
          }
          updateBetDisplay();
          sendBets();
      });
  });

  // Gestion du timeout
  socket.on('tick', (p) => {
    if(!timerActive) return;
    const remaining = p?.time_remaining ?? 0;
    document.getElementById('timerValue').textContent = Math.max(0, remaining);
    updateTimerProgress(remaining);
  });

  function enableBetting(){
    document.querySelectorAll('.md-bet-input').forEach(btn => btn.disabled = false);
    document.querySelectorAll('.md-btn-lingot').forEach(btn => btn.disabled = false);
  }

  function disableBetting(){
    document.querySelectorAll('.md-bet-input').forEach(btn => btn.disabled = true);
    document.querySelectorAll('.md-btn-lingot').forEach(btn => btn.disabled = true);
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
