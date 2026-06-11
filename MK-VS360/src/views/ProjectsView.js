import { authStore } from '../core/authStore.js';
import { projectStore } from '../core/projectStore.js';

export function ProjectsView({ navigate }) {
  const session = authStore.getSession();
  const container = document.createElement('main');
  container.className = 'app-shell';
  container.innerHTML = `
    <header class="topbar">
      <a href="/projects" data-link>MK-VS360 Projects</a>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="muted">${session?.email || 'Member'}</span>
        <button class="btn btn-ghost" id="logout-button" type="button">Logout</button>
      </div>
    </header>
    <section class="content">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px;">
        <div>
          <h1 class="brand-title">Projects</h1>
          <p class="muted">Create, open, and manage your Cloudflare-backed 360 projects.</p>
        </div>
        <button class="btn btn-primary" id="new-project-button" type="button">New Project</button>
      </div>
      <div id="project-status" class="muted">Loading projects...</div>
      <div class="grid" id="projects-grid"></div>
    </section>
  `;

  const grid = container.querySelector('#projects-grid');
  const status = container.querySelector('#project-status');

  async function renderProjects() {
    try {
      const projects = await projectStore.list();
      status.textContent = projects.length ? '' : 'No projects yet.';
      grid.innerHTML = projects.map(project => `
        <article class="card">
          <h3>${project.name}</h3>
          <p class="muted">${project.scene_count || 0} scene(s) · Updated ${project.updated_at || project.updatedAt || ''}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" data-open-project="${project.id}" type="button">Open Studio</button>
            <button class="btn btn-danger" data-delete-project="${project.id}" type="button">Delete</button>
          </div>
        </article>
      `).join('');
      grid.querySelectorAll('[data-open-project]').forEach(button => {
        button.addEventListener('click', () => navigate(`/studio/${button.dataset.openProject}`));
      });
      grid.querySelectorAll('[data-delete-project]').forEach(button => {
        button.addEventListener('click', async () => {
          if (!confirm('Delete this project?')) return;
          await projectStore.remove(button.dataset.deleteProject);
          await renderProjects();
        });
      });
    } catch (err) {
      status.textContent = err.message;
    }
  }

  container.querySelector('#logout-button').addEventListener('click', async () => {
    await authStore.logout();
    navigate('/login');
  });

  container.querySelector('#new-project-button').addEventListener('click', async () => {
    const name = prompt('Project name', 'Untitled Project') || 'Untitled Project';
    const project = await projectStore.create({ name });
    navigate(`/studio/${project.id}`);
  });

  renderProjects();
  return container;
}
