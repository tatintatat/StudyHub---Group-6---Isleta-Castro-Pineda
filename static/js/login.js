/* ── StudyHub · Login Page ── */
'use strict';

if (new URLSearchParams(location.search).get('registered') === '1') {
  document.getElementById('registered-banner').style.display = 'block';
}

function showAlert(msg, type) {
  var b = document.getElementById('alert-box');
  b.textContent = msg;
  b.className = 'alert-box is-' + type;
  b.style.display = 'block';
}

function showModal(icon, title, body, primaryHref) {
  document.getElementById('modal-icon').textContent  = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = body;
  var primary = document.getElementById('modal-primary');
  primary.href    = primaryHref || '#';
  primary.onclick = null;
  primary.textContent = 'Create account';
  document.getElementById('modal-ghost').style.display = '';
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('login-id').focus();
}

async function doLogin() {
  var identifier = document.getElementById('login-id').value.trim();
  var password   = document.getElementById('login-pw').value;
  document.getElementById('alert-box').style.display = 'none';

  if (!identifier) { showAlert('Please enter your username or email.', 'error'); return; }
  if (!password)   { showAlert('Please enter your password.', 'error'); return; }

  var btn = document.getElementById('login-btn');
  btn.disabled = true;
  document.getElementById('btn-text').style.display = 'none';
  document.getElementById('btn-spin').style.display = 'inline';

  try {
    var res  = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier, password: password })
    });
    var data = await res.json();

    if (res.ok) {
      showAlert('Signed in! Redirecting…', 'success');
      window.location.href = data.redirect || '/dashboard';
    } else if (res.status === 404 || res.status === 401) {
      btn.disabled = false;
      document.getElementById('btn-text').style.display = 'inline';
      document.getElementById('btn-spin').style.display = 'none';
      if (res.status === 404) {
        showModal('🔍', 'Account not found',
          'No account is registered with <strong>' + identifier + '</strong>. Would you like to create a free account?',
          '/signup');
      } else {
        showModal('🔒', 'Incorrect password',
          'The password you entered is wrong. Double-check and try again.', '#');
        var primary = document.getElementById('modal-primary');
        primary.textContent = 'Try again';
        primary.onclick = function(e) {
          e.preventDefault(); closeModal();
          document.getElementById('login-pw').value = '';
          document.getElementById('login-pw').focus();
        };
        document.getElementById('modal-ghost').style.display = 'none';
      }
    } else {
      showAlert(data.error || 'Sign in failed. Please try again.', 'error');
      btn.disabled = false;
      document.getElementById('btn-text').style.display = 'inline';
      document.getElementById('btn-spin').style.display = 'none';
    }
  } catch(e) {
    showAlert('Network error. Please try again.', 'error');
    btn.disabled = false;
    document.getElementById('btn-text').style.display = 'inline';
    document.getElementById('btn-spin').style.display = 'none';
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('modal').style.display !== 'flex') {
    doLogin();
  }
});
