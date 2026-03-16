import { DEFAULT_SHEETS, createPiece, PIECE_COLORS, GRAIN_OPTIONS } from '../constants.js';
import { savePieces, loadPieces, saveSelectedSheet, loadSelectedSheet } from '../storage.js';
import { optimize } from './optimizer.js';
import { renderCuttingPlan, renderLegend } from './renderer.js';
import { showToast } from '../app.js';

let pieces = [];
let selectedSheet = null;
let optimizationResult = null;

export function renderCuttingPage(container) {
  pieces = loadPieces();
  if (pieces.length === 0) {
    pieces = [createPiece({ label: 'Lateral Esquerda', width: 2000, height: 550 })];
  }
  selectedSheet = loadSelectedSheet() || { ...DEFAULT_SHEETS[0] };

  container.innerHTML = `
    <div class="animate-fade-in">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Plano de Corte</h1>
        <div class="flex gap-2">
          <button id="btn-add-piece" class="cc-btn cc-btn-secondary">+ Peça</button>
          <button id="btn-optimize" class="cc-btn cc-btn-primary">Otimizar</button>
        </div>
      </div>

      <!-- Seleção de Chapa -->
      <div class="cc-card mb-4">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Chapa</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-500 mb-1">Chapa padrão</label>
            <select id="sheet-select" class="cc-select">
              ${DEFAULT_SHEETS.map(s => `<option value="${s.id}" ${s.id === selectedSheet.id ? 'selected' : ''}>${s.name}</option>`).join('')}
              <option value="custom">Personalizada...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Serra (kerf) mm</label>
            <input type="number" id="sheet-kerf" class="cc-input" value="${selectedSheet.sawKerf}" min="0" max="10" step="0.5">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Refilamento mm</label>
            <input type="number" id="sheet-trim" class="cc-input" value="${selectedSheet.trimming}" min="0" max="30" step="1">
          </div>
        </div>
        <div id="custom-sheet-fields" class="hidden grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Largura (mm)</label>
            <input type="number" id="sheet-w" class="cc-input" value="${selectedSheet.width}" min="100">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Altura (mm)</label>
            <input type="number" id="sheet-h" class="cc-input" value="${selectedSheet.height}" min="100">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Espessura (mm)</label>
            <input type="number" id="sheet-thick" class="cc-input" value="${selectedSheet.thickness}" min="1">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Custo (R$)</label>
            <input type="number" id="sheet-cost" class="cc-input" value="${selectedSheet.cost}" min="0" step="0.01">
          </div>
        </div>
      </div>

      <!-- Lista de Peças -->
      <div class="cc-card mb-4">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lista de Peças</h2>
        <div class="overflow-x-auto">
          <table class="cc-table" id="pieces-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Largura</th>
                <th>Altura</th>
                <th>Qtd</th>
                <th>Veio</th>
                <th class="text-center" title="Fita de borda: Cima">C</th>
                <th class="text-center" title="Fita de borda: Baixo">B</th>
                <th class="text-center" title="Fita de borda: Esq">E</th>
                <th class="text-center" title="Fita de borda: Dir">D</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="pieces-body"></tbody>
          </table>
        </div>
      </div>

      <!-- Resultado da Otimização -->
      <div id="result-section" class="hidden">
        <div class="cc-card mb-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Resultado da Otimização</h2>
            <div id="result-stats" class="flex gap-2"></div>
          </div>
          <div id="result-sheets"></div>
        </div>
      </div>
    </div>
  `;

  renderPiecesTable();
  bindEvents();
}

function renderPiecesTable() {
  const tbody = document.getElementById('pieces-body');
  if (!tbody) return;

  tbody.innerHTML = pieces.map((p, i) => `
    <tr data-idx="${i}">
      <td><input type="text" class="cc-input piece-label" value="${p.label}" placeholder="Nome da peça" style="min-width:140px"></td>
      <td><input type="number" class="cc-input piece-width" value="${p.width}" min="1" style="width:80px"></td>
      <td><input type="number" class="cc-input piece-height" value="${p.height}" min="1" style="width:80px"></td>
      <td><input type="number" class="cc-input piece-qty" value="${p.quantity}" min="1" max="100" style="width:55px"></td>
      <td>
        <select class="cc-select piece-grain" style="width:100px">
          ${GRAIN_OPTIONS.map(g => `<option value="${g.value}" ${g.value === p.grainDirection ? 'selected' : ''}>${g.label}</option>`).join('')}
        </select>
      </td>
      <td class="text-center"><input type="checkbox" class="piece-eb-top" ${p.edgeBanding.top ? 'checked' : ''}></td>
      <td class="text-center"><input type="checkbox" class="piece-eb-bottom" ${p.edgeBanding.bottom ? 'checked' : ''}></td>
      <td class="text-center"><input type="checkbox" class="piece-eb-left" ${p.edgeBanding.left ? 'checked' : ''}></td>
      <td class="text-center"><input type="checkbox" class="piece-eb-right" ${p.edgeBanding.right ? 'checked' : ''}></td>
      <td>
        <button class="text-red-400 hover:text-red-600 font-bold text-lg remove-piece" data-idx="${i}" title="Remover">&times;</button>
      </td>
    </tr>
  `).join('');

  // Bind inline events
  tbody.querySelectorAll('tr').forEach(row => {
    const idx = parseInt(row.dataset.idx);
    const p = pieces[idx];

    row.querySelector('.piece-label').addEventListener('change', e => { p.label = e.target.value; save(); });
    row.querySelector('.piece-width').addEventListener('change', e => { p.width = parseInt(e.target.value) || 1; save(); });
    row.querySelector('.piece-height').addEventListener('change', e => { p.height = parseInt(e.target.value) || 1; save(); });
    row.querySelector('.piece-qty').addEventListener('change', e => { p.quantity = parseInt(e.target.value) || 1; save(); });
    row.querySelector('.piece-grain').addEventListener('change', e => {
      p.grainDirection = e.target.value;
      p.canRotate = e.target.value === 'none';
      save();
    });
    row.querySelector('.piece-eb-top').addEventListener('change', e => { p.edgeBanding.top = e.target.checked; save(); });
    row.querySelector('.piece-eb-bottom').addEventListener('change', e => { p.edgeBanding.bottom = e.target.checked; save(); });
    row.querySelector('.piece-eb-left').addEventListener('change', e => { p.edgeBanding.left = e.target.checked; save(); });
    row.querySelector('.piece-eb-right').addEventListener('change', e => { p.edgeBanding.right = e.target.checked; save(); });
    row.querySelector('.remove-piece').addEventListener('click', () => {
      pieces.splice(idx, 1);
      save();
      renderPiecesTable();
    });
  });
}

function bindEvents() {
  document.getElementById('btn-add-piece').addEventListener('click', () => {
    pieces.push(createPiece({
      label: `Peça ${pieces.length + 1}`,
      color: PIECE_COLORS[pieces.length % PIECE_COLORS.length],
    }));
    save();
    renderPiecesTable();
  });

  document.getElementById('btn-optimize').addEventListener('click', runOptimization);

  document.getElementById('sheet-select').addEventListener('change', e => {
    if (e.target.value === 'custom') {
      document.getElementById('custom-sheet-fields').classList.remove('hidden');
    } else {
      document.getElementById('custom-sheet-fields').classList.add('hidden');
      const sheet = DEFAULT_SHEETS.find(s => s.id === e.target.value);
      if (sheet) {
        selectedSheet = { ...sheet };
        document.getElementById('sheet-kerf').value = sheet.sawKerf;
        document.getElementById('sheet-trim').value = sheet.trimming;
        saveSelectedSheet(selectedSheet);
      }
    }
  });

  document.getElementById('sheet-kerf').addEventListener('change', e => {
    selectedSheet.sawKerf = parseFloat(e.target.value) || 4;
    saveSelectedSheet(selectedSheet);
  });

  document.getElementById('sheet-trim').addEventListener('change', e => {
    selectedSheet.trimming = parseInt(e.target.value) || 10;
    saveSelectedSheet(selectedSheet);
  });
}

function save() {
  savePieces(pieces);
}

function runOptimization() {
  if (pieces.length === 0) {
    showToast('Adicione pelo menos uma peça', 'warning');
    return;
  }

  // Atualizar chapa customizada se necessário
  const selectVal = document.getElementById('sheet-select').value;
  if (selectVal === 'custom') {
    selectedSheet = {
      id: 'custom',
      name: 'Personalizada',
      width: parseInt(document.getElementById('sheet-w').value) || 2750,
      height: parseInt(document.getElementById('sheet-h').value) || 1830,
      thickness: parseInt(document.getElementById('sheet-thick').value) || 15,
      trimming: parseInt(document.getElementById('sheet-trim').value) || 10,
      sawKerf: parseFloat(document.getElementById('sheet-kerf').value) || 4,
      cost: parseFloat(document.getElementById('sheet-cost').value) || 0,
    };
  }

  selectedSheet.sawKerf = parseFloat(document.getElementById('sheet-kerf').value) || 4;
  selectedSheet.trimming = parseInt(document.getElementById('sheet-trim').value) || 10;
  saveSelectedSheet(selectedSheet);

  const result = optimize(pieces, selectedSheet);
  optimizationResult = result;

  renderResult(result);
  showToast(`Otimização concluída: ${result.sheets.length} chapa(s)`, 'success');
}

function renderResult(result) {
  const section = document.getElementById('result-section');
  section.classList.remove('hidden');

  // Stats
  const stats = document.getElementById('result-stats');
  const totalPieces = result.sheets.reduce((s, sh) => s + sh.placements.length, 0);
  const avgWaste = result.sheets.length > 0
    ? (result.sheets.reduce((s, sh) => s + parseFloat(sh.wastePercent), 0) / result.sheets.length).toFixed(1)
    : 0;
  const totalCost = (result.sheets.length * selectedSheet.cost).toFixed(2);

  stats.innerHTML = `
    <span class="stat-badge bg-blue-100 text-blue-700">${result.sheets.length} chapa(s)</span>
    <span class="stat-badge bg-green-100 text-green-700">${totalPieces} peça(s)</span>
    <span class="stat-badge bg-amber-100 text-amber-700">${avgWaste}% desperdício médio</span>
    <span class="stat-badge bg-purple-100 text-purple-700">R$ ${totalCost}</span>
    ${result.unplacedCount > 0 ? `<span class="stat-badge bg-red-100 text-red-700">${result.unplacedCount} peça(s) não couberam!</span>` : ''}
  `;

  // Render each sheet
  const sheetsDiv = document.getElementById('result-sheets');
  sheetsDiv.innerHTML = '';

  for (const sheet of result.sheets) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-6';

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-container mb-2 p-2';
    const canvas = document.createElement('canvas');
    canvasContainer.appendChild(canvas);
    wrapper.appendChild(canvasContainer);

    const legend = document.createElement('div');
    legend.className = 'mt-2';
    wrapper.appendChild(legend);

    sheetsDiv.appendChild(wrapper);

    // Render after DOM insertion
    requestAnimationFrame(() => {
      renderCuttingPlan(canvas, sheet, selectedSheet);
      renderLegend(legend, sheet);
    });
  }
}
