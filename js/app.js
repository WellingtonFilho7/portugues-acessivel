import { renderCuttingPage } from './cutting/ui.js';
import { renderModulesPage } from './modules/ui.js';
import { renderProjectsPage } from './projects-ui.js';

const app = document.getElementById('app');

// Toast
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const colors = { info: 'bg-blue-600', success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-amber-500' };
  const toast = document.createElement('div');
  toast.className = `${colors[type] || colors.info} text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium transform transition-all duration-300 translate-y-4 opacity-0 max-w-[90vw] text-center`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove('translate-y-4', 'opacity-0'));
  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function getRoute() {
  return (window.location.hash || '#/').replace('#', '') || '/';
}

function updateNavActive() {
  const route = getRoute();
  const active = route === '/' ? '/corte' : route;

  // Desktop nav
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href').replace('#', '');
    link.classList.toggle('active', href === active);
  });

  // Mobile bottom nav
  document.querySelectorAll('.bottom-nav-link').forEach(link => {
    const r = link.dataset.route;
    link.classList.toggle('active', r === active);
  });
}

function render() {
  const route = getRoute();
  app.innerHTML = '';
  updateNavActive();

  switch (route) {
    case '/':
    case '/corte':
      renderCuttingPage(app);
      break;
    case '/modulos':
      renderModulesPage(app);
      break;
    case '/projetos':
      renderProjectsPage(app);
      break;
    default:
      app.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128270;</div>
          <p class="text-lg font-medium">Página não encontrada</p>
          <a href="#/corte" class="cc-btn cc-btn-primary mt-4">Ir para Plano de Corte</a>
        </div>`;
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) window.location.hash = '#/corte';
  render();
});
