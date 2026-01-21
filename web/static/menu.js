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

  // Optionally: prevent double submit, add loading, etc.
});
