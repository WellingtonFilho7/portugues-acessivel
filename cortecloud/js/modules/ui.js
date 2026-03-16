/**
 * UI da página de Módulos 3D
 */

import { ALL_MODULES, getModuleById } from './catalog.js';
import { init3DViewer, updateModel, destroyViewer } from './viewer3d.js';
import { savePieces, loadPieces } from '../storage.js';
import { showToast } from '../app.js';

let selectedModule = null;
let currentParams = {};
let generatedPieces = [];
let viewerInitialized = false;

const ENV_ICONS = {
  'Cozinha': '&#127858;',
  'Dormitório': '&#128716;',
  'Banheiro': '&#128704;',
  'Lavanderia': '&#129530;',
};

export function renderModulesPage(container) {
  destroyViewer();
  viewerInitialized = false;
  selectedModule = null;

  container.innerHTML = `
    <div class="animate-fade-in">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Módulos 3D de Móveis</h1>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Catálogo de módulos -->
        <div class="lg:col-span-1">
          <div class="cc-card">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Catálogo</h2>
            <div id="module-catalog" class="space-y-2">
              ${renderCatalog()}
            </div>
          </div>
        </div>

        <!-- Área principal: 3D + Parâmetros + Peças -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Viewer 3D -->
          <div class="cc-card">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3" id="viewer-title">
              Selecione um módulo
            </h2>
            <div id="viewer3d" class="viewer3d-container" style="height: 420px;">
              <div class="flex items-center justify-center h-full text-gray-400 text-lg">
                Selecione um módulo para visualizar em 3D
              </div>
            </div>
          </div>

          <!-- Parâmetros -->
          <div id="params-section" class="cc-card hidden">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Parâmetros</h2>
            <div id="params-form" class="grid grid-cols-2 md:grid-cols-3 gap-3"></div>
          </div>

          <!-- Lista de peças geradas -->
          <div id="pieces-section" class="cc-card hidden">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Peças Geradas (<span id="pieces-count">0</span>)
              </h2>
              <button id="btn-send-to-cut" class="cc-btn cc-btn-accent">
                Enviar para Plano de Corte
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="cc-table" id="generated-pieces-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Largura</th>
                    <th>Altura</th>
                    <th>Qtd</th>
                    <th>Fita de Borda</th>
                  </tr>
                </thead>
                <tbody id="generated-pieces-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindCatalogEvents(container);
}

function renderCatalog() {
  const grouped = {};
  for (const m of ALL_MODULES) {
    if (!grouped[m.environment]) grouped[m.environment] = [];
    grouped[m.environment].push(m);
  }

  let html = '';
  for (const [env, modules] of Object.entries(grouped)) {
    html += `<div class="mb-3">
      <div class="text-xs font-bold text-gray-400 uppercase mb-1">${ENV_ICONS[env] || ''} ${env}</div>
      ${modules.map(m => `
        <button class="module-select w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition text-sm flex items-center justify-between group"
                data-module-id="${m.id}">
          <div>
            <div class="font-medium text-gray-700 group-hover:text-blue-700">${m.name}</div>
            <div class="text-xs text-gray-400">${m.description}</div>
          </div>
          <svg class="w-4 h-4 text-gray-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      `).join('')}
    </div>`;
  }
  return html;
}

function bindCatalogEvents(container) {
  container.querySelectorAll('.module-select').forEach(btn => {
    btn.addEventListener('click', () => {
      const moduleId = btn.dataset.moduleId;
      selectModule(moduleId);

      // Highlight selected
      container.querySelectorAll('.module-select').forEach(b => b.classList.remove('bg-blue-100'));
      btn.classList.add('bg-blue-100');
    });
  });
}

async function selectModule(moduleId) {
  const mod = getModuleById(moduleId);
  if (!mod) return;

  selectedModule = mod;
  currentParams = {};
  for (const [key, def] of Object.entries(mod.params)) {
    currentParams[key] = def.value;
  }

  // Título
  document.getElementById('viewer-title').textContent = mod.name;

  // Inicializar viewer 3D se necessário
  if (!viewerInitialized) {
    const viewerEl = document.getElementById('viewer3d');
    try {
      await init3DViewer(viewerEl);
      viewerInitialized = true;
    } catch (err) {
      viewerEl.innerHTML = `<div class="flex items-center justify-center h-full text-red-400">
        Erro ao carregar Three.js: ${err.message}
      </div>`;
      console.error(err);
    }
  }

  // Mostrar parâmetros
  renderParams();

  // Gerar peças e atualizar 3D
  generateAndRender();
}

function renderParams() {
  const form = document.getElementById('params-form');
  const section = document.getElementById('params-section');
  section.classList.remove('hidden');

  form.innerHTML = '';
  for (const [key, def] of Object.entries(selectedModule.params)) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label class="block text-xs text-gray-500 mb-1">${def.label}</label>
      <div class="flex items-center gap-2">
        <input type="range" class="flex-1 param-slider" data-key="${key}"
               min="${def.min}" max="${def.max}" step="${def.step}" value="${currentParams[key]}">
        <input type="number" class="cc-input param-number" data-key="${key}"
               min="${def.min}" max="${def.max}" step="${def.step}" value="${currentParams[key]}"
               style="width: 70px">
      </div>
    `;
    form.appendChild(div);
  }

  // Bind slider events
  form.querySelectorAll('.param-slider').forEach(slider => {
    const numInput = form.querySelector(`.param-number[data-key="${slider.dataset.key}"]`);
    slider.addEventListener('input', () => {
      currentParams[slider.dataset.key] = parseFloat(slider.value);
      numInput.value = slider.value;
      generateAndRender();
    });
  });

  form.querySelectorAll('.param-number').forEach(input => {
    const slider = form.querySelector(`.param-slider[data-key="${input.dataset.key}"]`);
    input.addEventListener('change', () => {
      currentParams[input.dataset.key] = parseFloat(input.value);
      slider.value = input.value;
      generateAndRender();
    });
  });
}

function generateAndRender() {
  if (!selectedModule) return;

  generatedPieces = selectedModule.generatePieces(currentParams);

  // Atualizar tabela de peças
  const piecesSection = document.getElementById('pieces-section');
  piecesSection.classList.remove('hidden');

  const totalPieces = generatedPieces.reduce((s, p) => s + (p.quantity || 1), 0);
  document.getElementById('pieces-count').textContent = totalPieces;

  const tbody = document.getElementById('generated-pieces-body');
  tbody.innerHTML = generatedPieces.map(p => {
    const eb = [];
    if (p.edgeBanding.top) eb.push('C');
    if (p.edgeBanding.bottom) eb.push('B');
    if (p.edgeBanding.left) eb.push('E');
    if (p.edgeBanding.right) eb.push('D');
    return `
      <tr>
        <td><div class="flex items-center gap-2">
          <div style="width:12px;height:12px;border-radius:3px;background:${p.color}"></div>
          ${p.label}
        </div></td>
        <td>${p.width} mm</td>
        <td>${p.height} mm</td>
        <td>${p.quantity}</td>
        <td>${eb.length > 0 ? `<span class="text-amber-600 font-medium">${eb.join(', ')}</span>` : '-'}</td>
      </tr>
    `;
  }).join('');

  // Bind enviar para corte
  document.getElementById('btn-send-to-cut').onclick = () => {
    const existing = loadPieces();
    const newPieces = generatedPieces.map(p => ({
      ...p,
      moduleId: selectedModule.id,
    }));
    savePieces([...existing, ...newPieces]);
    showToast(`${totalPieces} peça(s) enviadas para o Plano de Corte!`, 'success');
  };

  // Atualizar modelo 3D
  if (viewerInitialized) {
    updateModel(generatedPieces, currentParams);
  }
}
