import { listProjects, saveProject, deleteProject, exportAllData, importData } from './storage.js';
import { generateId } from './constants.js';
import { showToast } from './app.js';

export function renderProjectsPage(container) {
  const projects = listProjects();

  container.innerHTML = `
    <div class="animate-fade-in space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl md:text-2xl font-bold text-gray-800">Projetos</h1>
        <button id="btn-new-project" class="cc-btn cc-btn-primary cc-btn-sm md:cc-btn">+ Novo</button>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button id="btn-export" class="cc-btn cc-btn-secondary cc-btn-sm flex-1 md:flex-none">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Exportar
        </button>
        <label class="cc-btn cc-btn-secondary cc-btn-sm flex-1 md:flex-none cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Importar
          <input type="file" id="btn-import" accept=".json" class="hidden">
        </label>
      </div>

      ${projects.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">&#128194;</div>
          <p class="text-base font-medium">Nenhum projeto salvo</p>
          <p class="text-xs mt-1">Crie um projeto ou importe um backup.</p>
        </div>
      ` : `
        <div class="space-y-3">
          ${projects.map(p => `
            <div class="cc-card cc-card-hover">
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-gray-800 truncate">${escapeHtml(p.name)}</h3>
                  <p class="text-xs text-gray-400 mt-0.5">${p.description || 'Sem descrição'}</p>
                  <p class="text-[10px] text-gray-300 mt-1">Atualizado: ${formatDate(p.updatedAt)}</p>
                </div>
                <button class="cc-btn cc-btn-danger cc-btn-sm ml-3 project-delete" data-id="${p.id}">Excluir</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  document.getElementById('btn-new-project').addEventListener('click', () => {
    const name = prompt('Nome do projeto:');
    if (!name) return;
    saveProject({ id: generateId(), name, description: '', pieces: [], modules: [], sheetConfig: null });
    showToast('Projeto criado!', 'success');
    renderProjectsPage(container);
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    exportAllData();
    showToast('Backup exportado!', 'success');
  });

  document.getElementById('btn-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      importData(text);
      showToast('Importado com sucesso!', 'success');
      renderProjectsPage(container);
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  });

  container.querySelectorAll('.project-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Excluir este projeto?')) {
        deleteProject(btn.dataset.id);
        showToast('Excluído', 'info');
        renderProjectsPage(container);
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}
