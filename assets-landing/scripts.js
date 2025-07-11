import { API_BASE, JWT, loadToken, saveToken, apiFetch, GOOGLE_CLIENT_ID } from '../config.js';

let isSignup = false;
let modal, authLink, loginBtn, signupBtn, nameInput, switchLink;
let handleModal, handleInput, handleSubmitBtn, handleError;

function handleAuthLink() {
  if (JWT) {
    authLink.textContent = 'Logout';
    authLink.onclick     = () => { 
      saveToken(null);
      location.reload();
    };
  } else {
    authLink.textContent = 'Login';
    authLink.onclick     = () => modal.classList.remove('hidden');
  }
}

function renderAuthMode() {
  if (isSignup) {
    document.querySelector('.auth-content h2').textContent = 'Sign Up';
    loginBtn.style.display  = 'none';
    signupBtn.style.display = 'inline-block';
    nameInput.style.display = 'block';
    switchLink.textContent  = 'Already have an account? Login';
  } else {
    document.querySelector('.auth-content h2').textContent = 'Sign In';
    loginBtn.style.display  = 'inline-block';
    signupBtn.style.display = 'none';
    nameInput.style.display = 'none';
    switchLink.textContent  = 'Don’t have an account? Sign Up';
  }
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Enhanced animation classes on scroll
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-on-scroll');
      if (entry.target.classList.contains('features')) {
        entry.target.querySelectorAll('.feature-card').forEach((card, i) => {
          setTimeout(() => card.classList.add('animate-on-scroll'), i * 100);
        });
      }
      if (entry.target.classList.contains('use-cases')) {
        entry.target.querySelectorAll('.use-case').forEach((uc, i) => {
          setTimeout(() => uc.classList.add('animate-on-scroll'), i * 150);
        });
      }
    }
  });
}, observerOptions);
document.querySelectorAll('section').forEach(s => observer.observe(s));

// Hover effects for feature cards
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-10px) rotateX(5deg) scale(1.02)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
});

// Track simple clicks
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => console.log('Button clicked:', btn.textContent));
});




document.addEventListener('DOMContentLoaded', () => {
  // wire up auth elements
  modal        = document.getElementById('auth-modal');
  authLink     = document.querySelector('.btn-auth');
  loginBtn     = document.getElementById('btn-login');
  signupBtn    = document.getElementById('btn-signup');
  nameInput    = document.getElementById('auth-name');
  switchLink   = document.getElementById('switch-auth');

  // wire up handle elements
  handleModal      = document.getElementById('handle-modal');
  handleInput      = document.getElementById('handle-input');
  handleSubmitBtn  = document.getElementById('btn-handle-submit');
  handleError      = document.getElementById('handle-error');

  // ① initial auth‑link state
  handleAuthLink();

  // ② load any saved JWT
  loadToken(() => {
    // if we already had a token, kick off the post‑login flow
    if (JWT) afterLoginFlow();
  });

  // auth‑mode switch
  renderAuthMode();
  switchLink.onclick = () => {
    isSignup = !isSignup;
    document.getElementById('auth-error').textContent = '';
    renderAuthMode();
  };

  // close login/signup modal
  document.getElementById('btn-close').onclick = () => modal.classList.add('hidden');

  // LOGIN
  loginBtn.onclick = async () => {
    const email    = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    try {
      const { access_token } = await apiFetch('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password })
      });
      saveToken(access_token);
      handleAuthLink();
      modal.classList.add('hidden');
      await afterLoginFlow();
    } catch (e) {
      document.getElementById('auth-error').textContent = e.message;
    }
  };

  // SIGNUP
  signupBtn.onclick = async () => {
    const email    = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name     = document.getElementById('auth-name').value;
    try {
      const { access_token } = await apiFetch('/auth/signup', {
        method: 'POST', body: JSON.stringify({ email, password, name })
      });
      saveToken(access_token);
      handleAuthLink();
      modal.classList.add('hidden');
      await afterLoginFlow();
    } catch (err) {
      console.error("Signup failed:", err);
      if (err.message.startsWith("API error 422")) {
        const res  = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        });
        const body = await res.json();
        document.getElementById('auth-error').textContent =
          (body.detail || []).map(d => d.msg).join("; ") || "Invalid data";
      } else {
        document.getElementById('auth-error').textContent = err.message;
      }
    }
  };

  // GOOGLE SIGN‑IN
  document.getElementById('btn-google').onclick = async () => {
    try {
      const idToken = await new Promise(resolve => {
        const w = window.open(
          `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}` +
          `&response_type=id_token&scope=openid%20email&redirect_uri=${location.origin}/oauth-callback.html` +
          `&nonce=${Date.now()}`,
          '_blank','width=500,height=600'
        );
        window.addEventListener('message', e => {
          if (e.data.id_token) { w.close(); resolve(e.data.id_token); }
        });
      });
      const { access_token } = await apiFetch('/auth/google', {
        method: 'POST', body: JSON.stringify({ id_token: idToken })
      });
      saveToken(access_token);
      handleAuthLink();
      modal.classList.add('hidden');
      await afterLoginFlow();
    } catch (e) {
      document.getElementById('auth-error').textContent = e.message;
    }
  };

  // HANDLE‑SUBMIT
  handleSubmitBtn.onclick = async () => {
    const username = handleInput.value.trim();
    if (!username) {
      handleError.textContent = "Please enter a username.";
      return;
    }
    try {
      const updatedUser = await apiFetch('/user/me/leetcode', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      handleModal.classList.add('hidden');
      renderLeaderboard();
    } catch (e) {
      handleError.textContent = e.message;
    }
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// After login or signup, fetch /user/me, decide whether to show handle modal
async function afterLoginFlow() {
  try {
    const me = await apiFetch('/user/me');
    if (!me.leetcode_username) {
      handleInput.value = '';
      handleError.textContent = '';
      handleModal.classList.remove('hidden');
    } else {
      renderLeaderboard();
    }
  } catch (e) {
    console.error("Could not fetch /user/me:", e);
  }
}

  // Leaderboard renderer
  async function renderLeaderboard() {
    try {
      const data = await apiFetch('/leaderboard');
      let html = '<h2>Institution Leaderboard</h2><table><tr><th>#</th><th>User</th><th>Score</th><th>Branch</th><th>Year</th></tr>';
      data.forEach((row,i) => {
        html += `<tr${row.is_friend?' class="highlight"':''}>
          <td>${i+1}</td><td>${row.username}</td><td>${row.score}</td>
          <td>${row.branch||'-'}</td><td>${row.year||'-'}</td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('demo')
        .insertAdjacentHTML('afterend', `<section class="leaderboard">${html}</section>`);
    } catch (e) {
      console.error(e);
    }
  }

  // initial leaderboard if already logged in
  if (JWT) renderLeaderboard();
