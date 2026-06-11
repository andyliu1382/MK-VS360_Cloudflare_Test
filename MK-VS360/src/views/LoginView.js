import { authStore } from '../core/authStore.js';

export function LoginView({ navigate }) {
  const container = document.createElement('main');
  container.className = 'app-shell center-screen';
  container.innerHTML = `
    <section class="panel" aria-label="Login">
      <h1 class="brand-title">MK-VS360</h1>
      <p class="muted">Sign in to manage projects, or continue as a guest to open the studio without cloud upload or share links.</p>

      <div class="tabs">
        <button class="btn tab is-active" type="button" data-mode="login">Login</button>
        <button class="btn tab" type="button" data-mode="register">Register</button>
      </div>

      <form class="form" id="login-form">
        <label class="label">
          Email
          <input class="input" id="email" type="email" autocomplete="email" required>
        </label>
        <label class="label">
          Password
          <input class="input" id="password" type="password" autocomplete="current-password" minlength="8" required>
        </label>
        <label style="display:flex;align-items:center;gap:8px;color:#aeb9c7;font-weight:700;">
          <input id="remember" type="checkbox">
          Keep me signed in
        </label>
        <div class="error" id="login-error" role="alert"></div>
        <button class="btn btn-primary" id="submit-button" type="submit">Login</button>
      </form>

      <div class="button-row">
        <button class="btn btn-ghost" type="button" id="google-button">Continue with Google</button>
        <button class="btn btn-success" type="button" id="guest-button">Continue as guest</button>
      </div>
    </section>
  `;

  let mode = 'login';
  const form = container.querySelector('#login-form');
  const submitButton = container.querySelector('#submit-button');
  const error = container.querySelector('#login-error');
  const password = container.querySelector('#password');

  function setMode(nextMode) {
    mode = nextMode;
    container.querySelectorAll('[data-mode]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.mode === mode);
    });
    submitButton.textContent = mode === 'login' ? 'Login' : 'Register and login';
    password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    error.textContent = '';
  }

  container.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    submitButton.disabled = true;
    try {
      const payload = {
        email: container.querySelector('#email').value.trim(),
        password: password.value,
        remember: container.querySelector('#remember').checked
      };
      if (mode === 'login') {
        await authStore.loginWithEmail(payload);
      } else {
        await authStore.registerWithEmail(payload);
      }
      navigate('/projects');
    } catch (err) {
      error.textContent = err.message;
    } finally {
      submitButton.disabled = false;
    }
  });

  container.querySelector('#google-button').addEventListener('click', async () => {
    error.textContent = '';
    try {
      const session = await authStore.loginWithGoogle();
      if (session) navigate('/projects');
    } catch (err) {
      error.textContent = err.message;
    }
  });

  container.querySelector('#guest-button').addEventListener('click', () => {
    const session = authStore.loginAsGuest();
    navigate(`/studio/${session.studioId}`);
  });

  return container;
}
