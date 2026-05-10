/* ── StudyHub · Signup Page ── */
'use strict';

// Clear autofill after paint
setTimeout(function () {
  ['su-first','su-last','su-username','su-email','su-pw'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !el.matches(':focus')) el.value = '';
  });
}, 50);

// Password visibility toggle
document.querySelectorAll('.pw-toggle').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var inp = document.getElementById(btn.dataset.target);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
});

// Clear invalid on input
document.querySelectorAll('.field-input').forEach(function(inp) {
  inp.addEventListener('input', function() { inp.classList.remove('is-invalid'); });
});

function showAlert(msg, type) {
  var box = document.getElementById('alert-box');
  box.textContent   = msg;
  box.className     = 'alert-box is-' + type;
  box.style.display = 'block';
}

// Password strength meter
var suPw    = document.getElementById('su-pw');
var pwStr   = document.getElementById('pw-strength');
var pwFill  = document.getElementById('pw-fill');
var pwLabel = document.getElementById('pw-label');

if (suPw) suPw.addEventListener('input', function() {
  var v = suPw.value;
  if (!v) { pwStr.style.display = 'none'; return; }
  pwStr.style.display = 'flex';
  var score = 0;
  if (v.length >= 8)           score++;
  if (v.length >= 12)          score++;
  if (/[A-Z]/.test(v))         score++;
  if (/[0-9]/.test(v))         score++;
  if (/[^A-Za-z0-9]/.test(v))  score++;
  var lvl = [
    { w:'20%', c:'#f87171', t:'Very weak' },
    { w:'40%', c:'#fb923c', t:'Weak'      },
    { w:'60%', c:'#fbbf24', t:'Fair'      },
    { w:'80%', c:'#34d399', t:'Good'      },
    { w:'100%',c:'#10b981', t:'Strong'    }
  ][Math.min(score, 4)];
  pwFill.style.width      = lvl.w;
  pwFill.style.background = lvl.c;
  pwLabel.textContent     = lvl.t;
  pwLabel.style.color     = lvl.c;
});

document.getElementById('signup-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var first_name = document.getElementById('su-first').value.trim();
  var last_name  = document.getElementById('su-last').value.trim();
  var username   = document.getElementById('su-username').value.trim().toLowerCase();
  var email      = document.getElementById('su-email').value.trim().toLowerCase();
  var password   = document.getElementById('su-pw').value;
  var btn        = document.getElementById('signup-btn');

  var ok = true;
  function markBad(id) { var el=document.getElementById(id); if(el) el.classList.add('is-invalid'); ok=false; }

  if (!first_name) markBad('su-first');
  if (!last_name)  markBad('su-last');
  if (!ok) { showAlert('Please enter your first and last name.', 'error'); return; }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    markBad('su-username');
    showAlert('Username: 3–30 chars, letters/numbers/underscores only.', 'error');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    markBad('su-email');
    showAlert('Please enter a valid email address.', 'error');
    return;
  }
  if (password.length < 8) {
    markBad('su-pw');
    showAlert('Password must be at least 8 characters.', 'error');
    return;
  }

  btn.disabled = true;
  btn.querySelector('.btn-text').style.display    = 'none';
  btn.querySelector('.btn-spinner').style.display = 'inline';

  try {
    var res  = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name, last_name, username, email, password })
    });
    var data = await res.json();
    if (res.ok) {
      showAlert('Account created! Redirecting…', 'success');
      setTimeout(function() { window.location.href = data.redirect || '/?registered=1'; }, 800);
    } else {
      showAlert(data.error || 'Sign up failed. Please try again.', 'error');
      btn.disabled = false;
      btn.querySelector('.btn-text').style.display    = 'inline';
      btn.querySelector('.btn-spinner').style.display = 'none';
    }
  } catch(err) {
    showAlert('Network error. Please try again.', 'error');
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display    = 'inline';
    btn.querySelector('.btn-spinner').style.display = 'none';
  }
});
