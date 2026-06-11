import { authStore } from '../core/authStore.js';
import { projectStore } from '../core/projectStore.js';
import { StudioShell } from '../studio/StudioShell.js';

export function StudioView({ params, navigate }) {
  const session = authStore.getSession();
  const projectId = params.projectId;
  const isGuestProject = projectId.startsWith('guest-') || session?.role === 'guest';
  const container = document.createElement('main');
  container.className = 'app-shell';
  container.innerHTML = `
    <header class="topbar">
      <a href="${session?.role === 'member' ? '/projects' : '/login'}" data-link>MK-VS360 Studio</a>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="muted" id="project-label">${isGuestProject ? 'Guest session' : projectId}</span>
        ${session?.role === 'member' ? '<a class="btn btn-ghost" href="/projects" data-link>Projects</a>' : ''}
        <button class="btn btn-ghost" id="logout-button" type="button">Exit</button>
      </div>
    </header>
  `;

  const shell = new StudioShell({ projectId, guest: isGuestProject });
  container.appendChild(shell.render());

  projectStore.get(projectId).then(project => {
    const label = container.querySelector('#project-label');
    if (label) label.textContent = project?.name || projectId;
  }).catch(() => {});

  container.querySelector('#logout-button').addEventListener('click', async () => {
    await authStore.logout();
    navigate('/login');
  });

  return container;
}
