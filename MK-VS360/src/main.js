import { createRouter } from './core/router.js';
import { authStore } from './core/authStore.js';
import { LoginView } from './views/LoginView.js';
import { ProjectsView } from './views/ProjectsView.js';
import { StudioView } from './views/StudioView.js';
import { PublicTourView } from './views/PublicTourView.js';
import './styles.css';

const routes = [
  { path: '/', redirect: () => (authStore.isMember() ? '/projects' : '/login') },
  { path: '/login', view: LoginView },
  { path: '/projects', view: ProjectsView, guard: () => authStore.isMember() },
  { path: '/studio/:projectId', view: StudioView, guard: () => authStore.isAuthenticated() },
  { path: '/view/:shareId', view: PublicTourView }
];

const router = createRouter({
  root: document.getElementById('app'),
  routes,
  fallback: '/login'
});

authStore.subscribe(() => router.render());
authStore.init().finally(() => router.start());
