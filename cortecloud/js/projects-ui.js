import { listProjects, saveProject, deleteProject, exportAllData, importData } from './storage.js';
import { generateId } from './constants.js';
import { showToast } from './app.js';

export function renderProjectsPage(container) {
  const projects = listProjects();

  container.innerHTML = `
    <div class="animate-fade-in">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Projetos</h1>
        <div class="flex gap-2">
          <button id="btn-new-project" class="cc-btn cc-btn-primary">+ Novo Projeto</button>
          <button id="btn-export" class="cc-btn cc-btn-secondary">Exportar Backup</button>
          <label class="cc-btn cc-btn-secondary cursor-pointer">
            Importar
            <input type="file" id="btn-import" accept=".json" class="hidden">
          </label>
        </div>
      </div>

      ${projects.length === 0 ? `
        <div class="cc-card text-center py-16">
          <div class="text-5xl mb-4 text-gray-300">&#128194;</div>
          <p class="text-gray-400 text-lg">Nenhum projeto salvo ainda.</p>
          <p class="text-gray-400 text-sm mt-2">Crie um novo projeto ou importe um backup.</p>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${projects.map(p => `
            <div class="cc-card cc-card-hover transition-all">
              <h3 class="font-bold text-lg text-gray-800 mb-1">${escapeHtml(p.name)}</h3>
              <p class="text-sm text-gray-500 mb-3">${p.description || 'Sem descrição'}</p>
              <div class="text-xs text-gray-400 mb-3">
                Criado: ${formatDate(p.createdAt)} | Atualizado: ${formatDate(p.updatedAt)}
              </div>
              <div class="flex gap-2">
                <button class="cc-btn cc-btn-secondary text-xs project-edit" data-id="${p.id}">Editar</button>
                <button class="cc-btn cc-btn-danger text-xs project-delete" data-id="${p.id}">Excluir</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  // Events
  document.getElementById('btn-new-project').addEventListener('click', () => {
    const name = prompt('Nome do projeto:');
    if (!name) return;
    const project = {
      id: generateId(),
      name,
      description: '',
      pieces: [],
      modules: [],
      sheetConfig: null,
    };
    saveProject(project);
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
      showToast('Dados importados com sucesso!', 'success');
      renderProjectsPage(container);
    } catch (err) {
      showToast('Erro ao importar: ' + err.message, 'error');
    }
  });

  container.querySelectorAll('.project-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Excluir este projeto?')) {
        deleteProject(btn.dataset.id);
        showToast('Projeto excluído', 'info');
        renderProjectsPage(container);
      }
    });
  });

  container.querySelectorAll('.project-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Edição de projetos em breve!', 'info');
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
