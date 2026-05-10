/* StudyHub — auth.js */

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs ── */
  const viewLogin  = document.getElementById('view-login');
  const viewSignup = document.getElementById('view-signup');
  const alertBox   = document.getElementById('alert-box');

  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  const goSignup   = document.getElementById('go-signup');
  const goLogin    = document.getElementById('go-login');

  const loginBtn   = document.getElementById('login-btn');
  const signupBtn  = document.getElementById('signup-btn');

  const suPwInput  = document.getElementById('su-pw');
  const pwStrength = document.getElementById('pw-strength');
  const pwFill     = document.getElementById('pw-fill');
  const pwLabel    = document.getElementById('pw-label');

  /* ── Make sure login shows first ── */
  viewLogin.style.display  = 'block';
  viewSignup.style.display = 'none';

  /* ── View switching ── */
  function showLogin() {
    viewLogin.style.display  = 'block';
    viewSignup.style.display = 'none';
    clearAlert();
    window.scrollTo(0, 0);
  }

  function showSignup() {
    viewLogin.style.display  = 'none';
    viewSignup.style.display = 'block';
    clearAlert();
  }

  goSignup && goSignup.addEventListener('click', showSignup);
  goLogin  && goLogin.addEventListener('click',  showLogin);

  /* ── Alert helpers ── */
  function showAlert(msg, type) {
    alertBox.textContent = msg;
    alertBox.className   = 'alert-box is-' + type;
    alertBox.style.display = 'block';
  }

  function clearAlert() {
    alertBox.style.display = 'none';
    alertBox.textContent   = '';
    alertBox.className     = 'alert-box';
  }

  /* ── Button loading state ── */
  function setLoading(btn, isLoading) {
    const text    = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    btn.disabled  = isLoading;
    text.style.display    = isLoading ? 'none'   : 'inline';
    spinner.style.display = isLoading ? 'inline' : 'none';
  }

  /* ── Password-visibility toggles ── */
  document.querySelectorAll('.pw-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.type = target.type === 'password' ? 'text' : 'password';
      btn.setAttribute('aria-pressed', target.type === 'text');
    });
  });

  /* ── Password strength meter ── */
  if (suPwInput) {
    suPwInput.addEventListener('input', function () {
      const val = suPwInput.value;
      if (!val) { pwStrength.style.display = 'none'; return; }
      pwStrength.style.display = 'flex';
      const score = calcStrength(val);
      const levels = [
        { width: '20%', color: '#e74c3c', label: 'Very weak' },
        { width: '40%', color: '#e67e22', label: 'Weak'      },
        { width: '60%', color: '#f1c40f', label: 'Fair'      },
        { width: '80%', color: '#2ecc71', label: 'Good'      },
        { width: '100%',color: '#27ae60', label: 'Strong'    },
      ];
      const level   = levels[Math.min(score, 4)];
      pwFill.style.width      = level.width;
      pwFill.style.background = level.color;
      pwLabel.textContent     = level.label;
      pwLabel.style.color     = level.color;
    });
  }

  function calcStrength(pw) {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  }

  /* ── Form validation helpers ── */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateUsername(u) {
    return /^[a-zA-Z0-9_]{3,30}$/.test(u);
  }

  function markInvalid(input) {
    input.classList.add('is-invalid');
    input.addEventListener('input', function clear() {
      input.classList.remove('is-invalid');
      input.removeEventListener('input', clear);
    });
  }

  /* ── Login form submit ── */
  loginForm && loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAlert();

    const identifier = loginForm.identifier.value.trim();
    const password   = loginForm.password.value;

    if (!identifier) { markInvalid(loginForm.identifier); showAlert('Please enter your username or email.', 'error'); return; }
    if (!password)   { markInvalid(loginForm.password);   showAlert('Please enter your password.',          'error'); return; }

    setLoading(loginBtn, true);

    try {
      const res  = await fetch('/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('Signed in! Redirecting…', 'success');
        setTimeout(() => { window.location.href = data.redirect || '/dashboard'; }, 600);
      } else {
        showAlert(data.error || 'Sign in failed. Please try again.', 'error');
        setLoading(loginBtn, false);
      }
    } catch {
      showAlert('Network error. Please try again.', 'error');
      setLoading(loginBtn, false);
    }
  });

  /* ── Signup form submit ── */
  signupForm && signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAlert();

    const first_name = signupForm.first_name.value.trim();
    const last_name  = signupForm.last_name.value.trim();
    const username   = signupForm.username.value.trim().toLowerCase();
    const email      = signupForm.email.value.trim().toLowerCase();
    const password   = signupForm.password.value;

    let valid = true;

    if (!first_name) { markInvalid(signupForm.first_name); valid = false; }
    if (!last_name)  { markInvalid(signupForm.last_name);  valid = false; }

    if (!validateUsername(username)) {
      markInvalid(signupForm.username);
      showAlert('Username must be 3–30 characters, letters/numbers/underscores only.', 'error');
      return;
    }

    if (!validateEmail(email)) {
      markInvalid(signupForm.email);
      showAlert('Please enter a valid email address.', 'error');
      return;
    }

    if (password.length < 8) {
      markInvalid(signupForm.password);
      showAlert('Password must be at least 8 characters.', 'error');
      return;
    }

    if (!valid) { showAlert('Please fill in all required fields.', 'error'); return; }

    setLoading(signupBtn, true);

    try {
      const res  = await fetch('/api/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ first_name, last_name, username, email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('Account created! Redirecting…', 'success');
        setTimeout(() => { window.location.href = data.redirect || '/dashboard'; }, 700);
      } else {
        showAlert(data.error || 'Sign up failed. Please try again.', 'error');
        setLoading(signupBtn, false);
      }
    } catch {
      showAlert('Network error. Please try again.', 'error');
      setLoading(signupBtn, false);
    }
  });

  /* ── Handle ?error= from Google OAuth ── */
  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'google_cancelled') {
    showAlert('Google sign-in was cancelled. Try again or use username/password.', 'error');
  } else if (params.get('error') === 'google_token_failed') {
    showAlert('Google sign-in failed. Please try again.', 'error');
  }

});