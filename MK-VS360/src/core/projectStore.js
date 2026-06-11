import { apiClient } from './apiClient.js';

function localProjects() {
  try {
    return JSON.parse(sessionStorage.getItem('mk-vs360-local-projects') || '[]');
  } catch {
    return [];
  }
}

function saveLocalProjects(projects) {
  sessionStorage.setItem('mk-vs360-local-projects', JSON.stringify(projects));
}

export const projectStore = {
  async list() {
    if (import.meta.env.VITE_AUTH_BACKEND === 'mock') return localProjects();
    const data = await apiClient.projects.list();
    return data.projects || [];
  },
  async create({ name }) {
    if (import.meta.env.VITE_AUTH_BACKEND === 'mock') {
      const now = new Date().toISOString();
      const project = { id: `project-${Date.now()}`, name: name || 'Untitled Project', updated_at: now, scene_count: 0 };
      const projects = [project, ...localProjects()];
      saveLocalProjects(projects);
      return project;
    }
    const data = await apiClient.projects.create({ name });
    return data.project;
  },
  async remove(projectId) {
    if (import.meta.env.VITE_AUTH_BACKEND === 'mock') {
      saveLocalProjects(localProjects().filter(project => project.id !== projectId));
      return true;
    }
    await apiClient.projects.delete(projectId);
    return true;
  },
  async get(projectId) {
    if (projectId.startsWith('guest-')) return { id: projectId, name: 'Guest Studio', guest: true };
    if (import.meta.env.VITE_AUTH_BACKEND === 'mock') return localProjects().find(project => project.id === projectId) || { id: projectId, name: 'Local Project' };
    const data = await apiClient.projects.get(projectId);
    return data.project;
  }
};
