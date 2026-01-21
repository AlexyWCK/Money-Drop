// Menu navigation logic for Money Drop main menu

document.addEventListener('DOMContentLoaded', function () {
  const menuMain = document.getElementById('menu-main');
  const menuMulti = document.getElementById('menu-multi');
  const menuHost = document.getElementById('menu-host');
  const menuJoin = document.getElementById('menu-join');

  // Main menu buttons
  document.getElementById('btnSolo').onclick = function () {
    menuMain.style.display = 'none';
    document.getElementById('menu-solo').style.display = '';
  };
    // Solo form back
    document.getElementById('btnBackSolo').onclick = function () {
      document.getElementById('menu-solo').style.display = 'none';
      menuMain.style.display = '';
    };
  document.getElementById('btnMulti').onclick = function () {
    menuMain.style.display = 'none';
    menuMulti.style.display = '';
  };

  // Multi submenu
  document.getElementById('btnHost').onclick = function () {
    menuMulti.style.display = 'none';
    menuHost.style.display = '';
  };
  document.getElementById('btnJoin').onclick = function () {
    menuMulti.style.display = 'none';
    menuJoin.style.display = '';
    loadLobbies();
  };
  document.getElementById('btnBackMulti').onclick = function () {
    menuMulti.style.display = 'none';
    menuMain.style.display = '';
  };

  // Host form back
  document.getElementById('btnBackHost').onclick = function () {
    menuHost.style.display = 'none';
    menuMulti.style.display = '';
  };
  // Join form back
  document.getElementById('btnBackJoin').onclick = function () {
    menuJoin.style.display = 'none';
    menuMulti.style.display = '';
  };

  // Load lobbies periodically
  async function loadLobbies() {
    const list = document.getElementById('lobbiesList');
    try {
      const res = await fetch('/api/lobbies');
      const data = await res.json();
      
      if (!data.ok || !data.lobbies.length) {
        list.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 10px;">Aucun salon disponible</div>';
        setTimeout(loadLobbies, 2000);
        return;
      }

      list.innerHTML = data.lobbies.map(lobby => `
        <div style="background: rgba(33,150,243,0.1); border: 1px solid #2196F3; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s;" 
             onmouseover="this.style.background='rgba(33,150,243,0.2)'" 
             onmouseout="this.style.background='rgba(33,150,243,0.1)'"
             onclick="joinLobby('${lobby.lobby_id}')">
          <div style="font-weight: bold; color: #2196F3;">${lobby.host_name}</div>
          <div style="font-size: 12px; color: var(--muted);">${lobby.players}/${lobby.max_players} joueurs | ${lobby.time_limit}s/question</div>
        </div>
      `).join('');
      
      setTimeout(loadLobbies, 2000);
    } catch (e) {
      list.innerHTML = '<div style="color: var(--bad); text-align: center; padding: 10px;">Erreur de connexion</div>';
      setTimeout(loadLobbies, 2000);
    }
  }

  window.joinLobby = async function(lobbyId) {
    const name = document.getElementById('joinName').value.trim();
    if (!name) {
      alert('Veuillez entrer votre nom');
      return;
    }

    try {
      // Faire une vraie redirection POST (comme un formulaire)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/lobby/join';
      
      const lobbyInput = document.createElement('input');
      lobbyInput.type = 'hidden';
      lobbyInput.name = 'lobby_id';
      lobbyInput.value = lobbyId;
      form.appendChild(lobbyInput);
      
      const nameInput = document.createElement('input');
      nameInput.type = 'hidden';
      nameInput.name = 'name';
      nameInput.value = name;
      form.appendChild(nameInput);
      
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      console.error('Erreur:', e);
      alert('Erreur de connexion: ' + e.message);
    }
  };

  // Optionally: prevent double submit, add loading, etc.
});
