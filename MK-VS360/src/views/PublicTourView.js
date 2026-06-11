import { apiClient } from '../core/apiClient.js';

export function PublicTourView({ params }) {
  const container = document.createElement('main');
  container.className = 'app-shell center-screen';
  container.innerHTML = `
    <section class="panel">
      <h1 class="brand-title">Published Tour</h1>
      <p class="muted" id="tour-status">Loading tour...</p>
      <pre class="card" id="tour-json" style="display:none;white-space:pre-wrap;"></pre>
    </section>
  `;
  apiClient.tours.get(params.shareId).then(data => {
    container.querySelector('#tour-status').textContent = data.tour.title || params.shareId;
    const pre = container.querySelector('#tour-json');
    pre.style.display = 'block';
    pre.textContent = JSON.stringify(data.tour.manifest, null, 2);
  }).catch(err => {
    container.querySelector('#tour-status').textContent = err.message;
  });
  return container;
}
