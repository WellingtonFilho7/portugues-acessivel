import { renderCuttingPage } from './cutting/ui.js';
import { renderModulesPage } from './modules/ui.js';
import { renderProjectsPage } from './projects-ui.js';

const app = document.getElementById('app');

// Toast notifications
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const colors = {
    info: 'bg-blue-600',
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-500',
  };
  const toast = document.createElement('div');
  toast.className = `${colors[type] || colors.info} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium transform transition-all duration-300 translate-y-4 opacity-0`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });
  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Simple hash router
function getRoute() {
  const hash = window.location.hash || '#/';
  return hash.replace('#', '') || '/';
}

function updateNavActive() {
  const route = getRoute();
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href').replace('#', '');
    if (route === href || (route === '/' && href === '/corte')) {
      link.classList.add('bg-white/20');
    } else {
      link.classList.remove('bg-white/20');
    }
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
        <div class="text-center py-20">
          <h2 class="text-2xl font-bold text-gray-400">Página não encontrada</h2>
          <a href="#/corte" class="text-secondary underline mt-4 inline-block">Ir para Plano de Corte</a>
        </div>`;
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) window.location.hash = '#/corte';
  render();
});
