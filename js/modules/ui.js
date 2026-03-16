/**
 * UI de Módulos - Foco na lista de peças, 3D como complemento
 */

import { ALL_MODULES, getModuleById } from './catalog.js';
import { init3DViewer, updateModel, destroyViewer } from './viewer3d.js';
import { savePieces, loadPieces } from '../storage.js';
import { showToast } from '../app.js';

let selectedModule = null;
let currentParams = {};
let generatedPieces = [];
let viewerInitialized = false;
let show3D = false;

const ENV_ICONS = {
  'Cozinha': '&#127859;',
  'Dormitório': '&#128716;',
  'Banheiro': '&#128705;',
  'Lavanderia': '&#129530;',
};

export function renderModulesPage(container) {
  destroyViewer();
  viewerInitialized = false;
  selectedModule = null;
  show3D = false;

  container.innerHTML = `
    <div class="animate-fade-in space-y-4">
      <h1 class="text-xl md:text-2xl font-bold text-gray-800">Módulos de Móveis</h1>
      <p class="text-sm text-gray-400 -mt-2">Escolha um módulo, ajuste as dimensões e envie as peças para o Plano de Corte.</p>

      <!-- Module selection grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" id="module-grid">
        ${renderModuleGrid()}
      </div>

      <!-- Selected module: params + pieces -->
      <div id="module-detail" class="hidden space-y-4">

        <!-- Module header -->
        <div class="cc-card">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-lg font-bold text-gray-800" id="mod-title"></h2>
              <p class="text-xs text-gray-400" id="mod-desc"></p>
            </div>
            <button id="btn-back-modules" class="cc-btn cc-btn-ghost cc-btn-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              Voltar
            </button>
          </div>

          <!-- Params -->
          <div class="section-title">Dimensões</div>
          <div id="params-form" class="grid grid-cols-2 md:grid-cols-3 gap-3"></div>
        </div>

        <!-- 3D viewer (optional toggle) -->
        <div class="cc-card">
          <div class="flex items-center justify-between mb-2">
            <div class="section-title mb-0">Visualização 3D</div>
            <button id="btn-toggle-3d" class="cc-btn cc-btn-secondary cc-btn-sm">Ativar 3D</button>
          </div>
          <div id="viewer3d-wrap" class="hidden">
            <div id="viewer3d" class="viewer3d-container" style="height:300px;">
              <div class="flex items-center justify-center h-full text-gray-400 text-sm">
                Carregando...
              </div>
            </div>
            <p class="text-[10px] text-gray-400 mt-2 text-center">Arraste para girar. Pinça para zoom.</p>
          </div>
          <div id="viewer3d-off" class="py-6 text-center text-gray-300 text-sm">
            A visualização 3D é um complemento. As peças abaixo são o que importa para o corte.
          </div>
        </div>

        <!-- Generated pieces list -->
        <div class="cc-card">
          <div class="flex items-center justify-between mb-3">
            <div class="section-title mb-0">Peças Geradas (<span id="pieces-count">0</span> itens)</div>
          </div>

          <!-- Mobile cards -->
          <div class="md:hidden space-y-2" id="mod-pieces-cards"></div>

          <!-- Desktop table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="cc-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Nome</th>
                  <th>Largura</th>
                  <th>Altura</th>
                  <th>Qtd</th>
                  <th>Fita de Borda</th>
                </tr>
              </thead>
              <tbody id="mod-pieces-desktop"></tbody>
            </table>
          </div>

          <button id="btn-send-to-cut" class="cc-btn cc-btn-accent cc-btn-full mt-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
            Enviar para Plano de Corte
          </button>
        </div>
      </div>
    </div>
  `;

  bindGridEvents(container);
}

function renderModuleGrid() {
  const grouped = {};
  for (const m of ALL_MODULES) {
    if (!grouped[m.environment]) grouped[m.environment] = [];
    grouped[m.environment].push(m);
  }

  let html = '';
  for (const [env, modules] of Object.entries(grouped)) {
    for (const m of modules) {
      html += `
        <button class="module-btn cc-card-hover" data-module-id="${m.id}">
          <div class="text-2xl mb-1">${ENV_ICONS[env] || ''}</div>
          <div class="font-semibold text-sm text-gray-700">${m.name}</div>
          <div class="text-[10px] text-gray-400 mt-0.5">${env}</div>
        </button>
      `;
    }
  }
  return html;
}

function bindGridEvents(container) {
  container.querySelectorAll('[data-module-id]').forEach(btn => {
    btn.addEventListener('click', () => selectModule(btn.dataset.moduleId));
  });
}

function selectModule(moduleId) {
  const mod = getModuleById(moduleId);
  if (!mod) return;

  selectedModule = mod;
  currentParams = {};
  for (const [k, v] of Object.entries(mod.params)) currentParams[k] = v.value;

  // Show detail, hide grid
  document.getElementById('module-grid').classList.add('hidden');
  document.getElementById('module-detail').classList.remove('hidden');
  document.getElementById('mod-title').textContent = mod.name;
  document.getElementById('mod-desc').textContent = mod.description;

  renderParams();
  generateAndRender();

  // Back button
  document.getElementById('btn-back-modules').addEventListener('click', () => {
    document.getElementById('module-grid').classList.remove('hidden');
    document.getElementById('module-detail').classList.add('hidden');
    destroyViewer();
    viewerInitialized = false;
    show3D = false;
  });

  // 3D toggle
  document.getElementById('btn-toggle-3d').addEventListener('click', toggle3D);

  // Send to cut
  document.getElementById('btn-send-to-cut').addEventListener('click', () => {
    const existing = loadPieces();
    const totalPcs = generatedPieces.reduce((s, p) => s + (p.quantity || 1), 0);
    const newPieces = generatedPieces.map(p => ({ ...p, moduleId: selectedModule.id }));
    savePieces([...existing, ...newPieces]);
    showToast(`${totalPcs} peça(s) enviadas!`, 'success');
  });
}

async function toggle3D() {
  show3D = !show3D;
  const wrap = document.getElementById('viewer3d-wrap');
  const off = document.getElementById('viewer3d-off');
  const btn = document.getElementById('btn-toggle-3d');

  if (show3D) {
    wrap.classList.remove('hidden');
    off.classList.add('hidden');
    btn.textContent = 'Desativar 3D';

    if (!viewerInitialized) {
      try {
        await init3DViewer(document.getElementById('viewer3d'));
        viewerInitialized = true;
        updateModel(generatedPieces, currentParams);
      } catch (err) {
        document.getElementById('viewer3d').innerHTML = `<div class="flex items-center justify-center h-full text-red-400 text-sm p-4">
          Não foi possível carregar o 3D: ${err.message}
        </div>`;
      }
    } else {
      updateModel(generatedPieces, currentParams);
    }
  } else {
    wrap.classList.add('hidden');
    off.classList.remove('hidden');
    btn.textContent = 'Ativar 3D';
  }
}

function renderParams() {
  const form = document.getElementById('params-form');
  form.innerHTML = '';

  for (const [key, def] of Object.entries(selectedModule.params)) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label class="block text-[10px] text-gray-400 mb-1 font-medium">${def.label}</label>
      <div class="flex items-center gap-2">
        <input type="range" class="flex-1 param-slider" data-key="${key}"
               min="${def.min}" max="${def.max}" step="${def.step}" value="${currentParams[key]}"
               style="accent-color: var(--primary)">
        <input type="number" class="cc-input param-number" data-key="${key}"
               min="${def.min}" max="${def.max}" step="${def.step}" value="${currentParams[key]}"
               style="width:72px">
      </div>
    `;
    form.appendChild(div);
  }

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
      if (slider) slider.value = input.value;
      generateAndRender();
    });
  });
}

function generateAndRender() {
  if (!selectedModule) return;

  generatedPieces = selectedModule.generatePieces(currentParams);
  const totalPcs = generatedPieces.reduce((s, p) => s + (p.quantity || 1), 0);
  document.getElementById('pieces-count').textContent = totalPcs;

  // Mobile cards
  const cardsEl = document.getElementById('mod-pieces-cards');
  cardsEl.innerHTML = generatedPieces.map(p => {
    const eb = formatEdgeBanding(p.edgeBanding);
    return `
      <div class="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
        <div style="width:10px;height:10px;border-radius:2px;background:${p.color}" class="flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-700 truncate">${p.label}</div>
          <div class="text-xs text-gray-400">${p.width} x ${p.height} mm</div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="text-sm font-semibold text-gray-600">x${p.quantity}</div>
          ${eb ? `<div class="text-[10px] text-amber-600 font-medium">${eb}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Desktop table
  const tbody = document.getElementById('mod-pieces-desktop');
  tbody.innerHTML = generatedPieces.map(p => {
    const eb = formatEdgeBanding(p.edgeBanding);
    return `
      <tr>
        <td><div style="width:12px;height:12px;border-radius:3px;background:${p.color}"></div></td>
        <td class="font-medium">${p.label}</td>
        <td>${p.width} mm</td>
        <td>${p.height} mm</td>
        <td>${p.quantity}</td>
        <td>${eb ? `<span class="text-amber-600 font-medium">${eb}</span>` : '-'}</td>
      </tr>
    `;
  }).join('');

  // Update 3D if active
  if (show3D && viewerInitialized) {
    updateModel(generatedPieces, currentParams);
  }
}

function formatEdgeBanding(eb) {
  const parts = [];
  if (eb.top) parts.push('C');
  if (eb.bottom) parts.push('B');
  if (eb.left) parts.push('E');
  if (eb.right) parts.push('D');
  return parts.join(', ');
}
