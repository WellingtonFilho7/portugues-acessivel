import { DEFAULT_SHEETS, createPiece, PIECE_COLORS, GRAIN_OPTIONS } from '../constants.js';
import { ALL_MODULES } from '../modules/catalog.js';
import { savePieces, loadPieces, saveSelectedSheet, loadSelectedSheet } from '../storage.js';
import { optimize } from './optimizer.js';
import { renderCuttingPlan, renderLegend } from './renderer.js';
import { showToast } from '../app.js';

let pieces = [];
let selectedSheet = null;
let optimizationResult = null;

// ==================== VALIDATION ====================
function validatePiece(piece, sheet) {
  const errors = [];
  const warnings = [];

  const usableW = sheet.width - 2 * sheet.trimming;
  const usableH = sheet.height - 2 * sheet.trimming;

  if (!piece.width || piece.width <= 0) {
    errors.push({ field: 'width', msg: 'Largura inválida' });
  } else if (piece.width > usableW && piece.width > usableH) {
    errors.push({ field: 'width', msg: `Largura ${piece.width}mm excede a chapa (máx ${Math.max(usableW, usableH)}mm)` });
  }

  if (!piece.height || piece.height <= 0) {
    errors.push({ field: 'height', msg: 'Altura inválida' });
  } else if (piece.height > usableH && piece.height > usableW) {
    errors.push({ field: 'height', msg: `Altura ${piece.height}mm excede a chapa (máx ${Math.max(usableW, usableH)}mm)` });
  }

  if (piece.quantity === 0) {
    warnings.push({ field: 'qty', msg: 'Qtd = 0: peça ignorada na otimização' });
  }

  if (!piece.label || piece.label.trim() === '') {
    warnings.push({ field: 'label', msg: 'Peça sem nome' });
  }

  return { errors, warnings, hasError: errors.length > 0, hasWarning: warnings.length > 0 };
}

function getValidationSummary(pieces, sheet) {
  let errorCount = 0;
  let warningCount = 0;
  for (const p of pieces) {
    const v = validatePiece(p, sheet);
    if (v.hasError) errorCount++;
    else if (v.hasWarning) warningCount++;
  }
  return { errorCount, warningCount };
}

// ==================== FURNITURE PRESETS ====================
const PRESETS = ALL_MODULES.map(m => ({
  id: m.id,
  name: m.name,
  description: m.description,
  environment: m.environment,
  icon: { 'Cozinha': '&#127859;', 'Dormitório': '&#128716;', 'Banheiro': '&#128705;', 'Lavanderia': '&#129530;' }[m.environment] || '&#128722;',
  generate: () => {
    const params = {};
    for (const [k, v] of Object.entries(m.params)) params[k] = v.value;
    return m.generatePieces(params);
  },
  module: m,
}));

// ==================== MAIN RENDER ====================
export function renderCuttingPage(container) {
  pieces = loadPieces();
  selectedSheet = loadSelectedSheet() || { ...DEFAULT_SHEETS[0] };

  container.innerHTML = `
    <div class="animate-fade-in space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-xl md:text-2xl font-bold text-gray-800">Plano de Corte</h1>
        <button id="btn-optimize" class="cc-btn cc-btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Otimizar
        </button>
      </div>

      <!-- Presets: Carregar Móvel -->
      <div class="cc-card">
        <div class="section-title">Carregar Móvel Pronto</div>
        <p class="text-xs text-gray-400 mb-3">Toque para adicionar todas as peças de um móvel. Depois ajuste as medidas.</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" id="presets-grid">
          ${PRESETS.map(p => `
            <button class="preset-card" data-preset="${p.id}">
              <span class="preset-icon">${p.icon}</span>
              <span class="text-xs font-semibold text-gray-700">${p.name}</span>
              <span class="text-[10px] text-gray-400 mt-0.5">${p.environment}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Chapa -->
      <div class="cc-card">
        <div class="section-title">Chapa</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="md:col-span-1">
            <select id="sheet-select" class="cc-select">
              ${DEFAULT_SHEETS.map(s => `<option value="${s.id}" ${s.id === selectedSheet.id ? 'selected' : ''}>${s.name}</option>`).join('')}
              <option value="custom">Personalizada...</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] text-gray-400 mb-1 font-medium">Serra (kerf)</label>
              <input type="number" id="sheet-kerf" class="cc-input" value="${selectedSheet.sawKerf}" min="0" max="10" step="0.5">
            </div>
            <div>
              <label class="block text-[10px] text-gray-400 mb-1 font-medium">Refilamento</label>
              <input type="number" id="sheet-trim" class="cc-input" value="${selectedSheet.trimming}" min="0" max="30" step="1">
            </div>
          </div>
        </div>
        <div id="custom-sheet-fields" class="hidden grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div>
            <label class="block text-[10px] text-gray-400 mb-1 font-medium">Largura mm</label>
            <input type="number" id="sheet-w" class="cc-input" value="${selectedSheet.width}" min="100">
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 mb-1 font-medium">Altura mm</label>
            <input type="number" id="sheet-h" class="cc-input" value="${selectedSheet.height}" min="100">
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 mb-1 font-medium">Espessura mm</label>
            <input type="number" id="sheet-thick" class="cc-input" value="${selectedSheet.thickness}" min="1">
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 mb-1 font-medium">Custo R$</label>
            <input type="number" id="sheet-cost" class="cc-input" value="${selectedSheet.cost}" min="0" step="0.01">
          </div>
        </div>
      </div>

      <!-- Legenda de Fita de Borda -->
      <div class="cc-card">
        <div class="section-title flex items-center justify-between">
          <span>Fita de Borda - Legenda</span>
          <button id="toggle-legend" class="text-xs text-blue-500 font-medium">mostrar</button>
        </div>
        <div id="legend-content" class="hidden">
          <div class="flex flex-wrap gap-3 items-start">
            <div class="flex items-center gap-3">
              <div class="eb-diagram eb-top"></div>
              <div class="text-xs"><strong class="text-gray-700">C</strong> = <span class="text-gray-500">Cima (topo)</span></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="eb-diagram eb-bottom"></div>
              <div class="text-xs"><strong class="text-gray-700">B</strong> = <span class="text-gray-500">Baixo (base)</span></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="eb-diagram eb-left"></div>
              <div class="text-xs"><strong class="text-gray-700">E</strong> = <span class="text-gray-500">Esquerda</span></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="eb-diagram eb-right"></div>
              <div class="text-xs"><strong class="text-gray-700">D</strong> = <span class="text-gray-500">Direita</span></div>
            </div>
          </div>
          <p class="text-[10px] text-gray-400 mt-2">A fita de borda (acabamento) é aplicada nos lados marcados em <strong class="text-amber-500">amarelo</strong>.</p>
        </div>
      </div>

      <!-- Lista de Peças -->
      <div class="cc-card">
        <div class="flex items-center justify-between mb-3">
          <div class="section-title mb-0">Peças (${pieces.length})</div>
          <div class="flex gap-2">
            ${pieces.length > 0 ? `<button id="btn-clear-all" class="cc-btn cc-btn-danger cc-btn-sm">Limpar</button>` : ''}
            <button id="btn-add-piece" class="cc-btn cc-btn-secondary cc-btn-sm">+ Peça</button>
          </div>
        </div>
        <div id="validation-summary"></div>

        ${pieces.length === 0 ? `
          <div class="empty-state py-8">
            <div class="empty-state-icon">&#128203;</div>
            <p class="text-sm">Nenhuma peça adicionada</p>
            <p class="text-xs text-gray-400 mt-1">Carregue um móvel pronto acima ou adicione peças manualmente</p>
          </div>
        ` : ''}

        <!-- Mobile: cards -->
        <div class="md:hidden space-y-3" id="pieces-cards"></div>

        <!-- Desktop: table -->
        <div class="hidden md:block overflow-x-auto" id="pieces-table-wrap">
          <table class="cc-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Largura</th>
                <th>Altura</th>
                <th>Qtd</th>
                <th>Veio</th>
                <th title="Cima">C</th>
                <th title="Baixo">B</th>
                <th title="Esquerda">E</th>
                <th title="Direita">D</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="pieces-body-desktop"></tbody>
          </table>
        </div>
      </div>

      <!-- Resultado -->
      <div id="result-section" class="hidden space-y-4">
        <div class="cc-card">
          <div class="section-title">Resultado da Otimização</div>
          <div id="result-stats" class="flex flex-wrap gap-2 mb-4"></div>
          <div id="result-sheets"></div>
        </div>
      </div>
    </div>
  `;

  renderPiecesMobile();
  renderPiecesDesktop();
  renderValidationSummary();
  bindEvents();
}

function renderValidationSummary() {
  const el = document.getElementById('validation-summary');
  if (!el || pieces.length === 0) { if (el) el.innerHTML = ''; return; }

  const { errorCount, warningCount } = getValidationSummary(pieces, selectedSheet);

  if (errorCount === 0 && warningCount === 0) {
    el.innerHTML = `<div class="validation-summary bg-green-50 text-green-700 mb-3">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      Todas as peças estão válidas
    </div>`;
    return;
  }

  const parts = [];
  if (errorCount > 0) parts.push(`<span class="text-red-600">${errorCount} peça(s) com erro</span>`);
  if (warningCount > 0) parts.push(`<span class="text-amber-600">${warningCount} aviso(s)</span>`);

  el.innerHTML = `<div class="validation-summary ${errorCount > 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'} mb-3">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 2L2 22h20L12 2z"/></svg>
    ${parts.join(' &middot; ')}
  </div>`;
}

// ==================== MOBILE CARD VIEW ====================
function renderPiecesMobile() {
  const container = document.getElementById('pieces-cards');
  if (!container) return;

  container.innerHTML = pieces.map((p, i) => {
    const v = validatePiece(p, selectedSheet);
    const cardClass = v.hasError ? 'piece-error' : v.hasWarning ? 'piece-warning' : '';
    const errMsgs = [...v.errors.map(e => `<div class="piece-error-msg">&bull; ${e.msg}</div>`), ...v.warnings.map(w => `<div class="piece-warning-msg">&bull; ${w.msg}</div>`)].join('');
    const widthErr = v.errors.some(e => e.field === 'width') ? 'input-error' : '';
    const heightErr = v.errors.some(e => e.field === 'height') ? 'input-error' : '';

    return `
    <div class="piece-card animate-slide-up ${cardClass}" style="animation-delay:${i * 30}ms" data-idx="${i}">
      <div class="flex items-start justify-between mb-2">
        <input type="text" class="font-semibold text-sm text-gray-800 bg-transparent border-none outline-none flex-1 p-0 piece-m-label"
               value="${p.label}" placeholder="Nome da peça">
        <button class="text-gray-300 hover:text-red-500 ml-2 p-1 remove-piece-m" data-idx="${i}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label class="block text-[10px] text-gray-400 font-medium">Largura</label>
          <input type="number" class="cc-input text-sm piece-m-width ${widthErr}" value="${p.width}" min="1">
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 font-medium">Altura</label>
          <input type="number" class="cc-input text-sm piece-m-height ${heightErr}" value="${p.height}" min="1">
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 font-medium">Qtd</label>
          <input type="number" class="cc-input text-sm piece-m-qty" value="${p.quantity}" min="1" max="100">
        </div>
      </div>
      ${errMsgs ? `<div class="mb-2">${errMsgs}</div>` : ''}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-[10px] text-gray-400 font-medium">Fita:</span>
          <label class="flex items-center gap-1 text-xs">
            <input type="checkbox" class="piece-m-eb-top" ${p.edgeBanding.top ? 'checked' : ''}> C
          </label>
          <label class="flex items-center gap-1 text-xs">
            <input type="checkbox" class="piece-m-eb-bottom" ${p.edgeBanding.bottom ? 'checked' : ''}> B
          </label>
          <label class="flex items-center gap-1 text-xs">
            <input type="checkbox" class="piece-m-eb-left" ${p.edgeBanding.left ? 'checked' : ''}> E
          </label>
          <label class="flex items-center gap-1 text-xs">
            <input type="checkbox" class="piece-m-eb-right" ${p.edgeBanding.right ? 'checked' : ''}> D
          </label>
        </div>
        <div style="width:8px;height:8px;border-radius:2px;background:${p.color}" class="flex-shrink-0"></div>
      </div>
    </div>`;
  }).join('');

  // Bind mobile events
  container.querySelectorAll('.piece-card').forEach(card => {
    const idx = parseInt(card.dataset.idx);
    const p = pieces[idx];

    const updateValidation = () => {
      const v = validatePiece(p, selectedSheet);
      card.classList.remove('piece-error', 'piece-warning');
      if (v.hasError) card.classList.add('piece-error');
      else if (v.hasWarning) card.classList.add('piece-warning');

      const widthInput = card.querySelector('.piece-m-width');
      const heightInput = card.querySelector('.piece-m-height');
      widthInput.classList.toggle('input-error', v.errors.some(e => e.field === 'width'));
      heightInput.classList.toggle('input-error', v.errors.some(e => e.field === 'height'));

      let msgEl = card.querySelector('.validation-msgs');
      const msgs = [...v.errors.map(e => `<div class="piece-error-msg">&bull; ${e.msg}</div>`), ...v.warnings.map(w => `<div class="piece-warning-msg">&bull; ${w.msg}</div>`)].join('');
      if (!msgEl && msgs) {
        msgEl = document.createElement('div');
        msgEl.className = 'validation-msgs mb-2';
        card.querySelector('.grid').after(msgEl);
      }
      if (msgEl) msgEl.innerHTML = msgs;
      renderValidationSummary();
    };

    card.querySelector('.piece-m-label').addEventListener('input', e => { p.label = e.target.value; save(); updateValidation(); });
    card.querySelector('.piece-m-width').addEventListener('input', e => { p.width = parseInt(e.target.value) || 0; save(); updateValidation(); });
    card.querySelector('.piece-m-height').addEventListener('input', e => { p.height = parseInt(e.target.value) || 0; save(); updateValidation(); });
    card.querySelector('.piece-m-qty').addEventListener('input', e => { p.quantity = parseInt(e.target.value) || 0; save(); updateValidation(); });
    card.querySelector('.piece-m-eb-top').addEventListener('change', e => { p.edgeBanding.top = e.target.checked; save(); });
    card.querySelector('.piece-m-eb-bottom').addEventListener('change', e => { p.edgeBanding.bottom = e.target.checked; save(); });
    card.querySelector('.piece-m-eb-left').addEventListener('change', e => { p.edgeBanding.left = e.target.checked; save(); });
    card.querySelector('.piece-m-eb-right').addEventListener('change', e => { p.edgeBanding.right = e.target.checked; save(); });
    card.querySelector('.remove-piece-m').addEventListener('click', () => {
      pieces.splice(idx, 1); save(); renderCuttingPage(document.getElementById('app'));
    });
  });
}

// ==================== DESKTOP TABLE VIEW ====================
function renderPiecesDesktop() {
  const tbody = document.getElementById('pieces-body-desktop');
  if (!tbody) return;

  tbody.innerHTML = pieces.map((p, i) => {
    const v = validatePiece(p, selectedSheet);
    const rowClass = v.hasError ? 'piece-error' : v.hasWarning ? 'piece-warning' : '';
    const widthErr = v.errors.some(e => e.field === 'width') ? 'input-error' : '';
    const heightErr = v.errors.some(e => e.field === 'height') ? 'input-error' : '';
    const errTitle = [...v.errors.map(e => e.msg), ...v.warnings.map(w => w.msg)].join(' | ');

    return `
    <tr data-idx="${i}" class="${rowClass}" ${errTitle ? `title="${errTitle}"` : ''}>
      <td><input type="text" class="cc-input piece-label" value="${p.label}" placeholder="Nome" style="min-width:130px"></td>
      <td><input type="number" class="cc-input piece-width ${widthErr}" value="${p.width}" min="1" style="width:80px"></td>
      <td><input type="number" class="cc-input piece-height ${heightErr}" value="${p.height}" min="1" style="width:80px"></td>
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
        <button class="text-gray-300 hover:text-red-500 text-lg remove-piece" data-idx="${i}">&times;</button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('tr').forEach(row => {
    const idx = parseInt(row.dataset.idx);
    const p = pieces[idx];

    const updateValidation = () => {
      const v = validatePiece(p, selectedSheet);
      row.classList.remove('piece-error', 'piece-warning');
      if (v.hasError) row.classList.add('piece-error');
      else if (v.hasWarning) row.classList.add('piece-warning');

      row.querySelector('.piece-width').classList.toggle('input-error', v.errors.some(e => e.field === 'width'));
      row.querySelector('.piece-height').classList.toggle('input-error', v.errors.some(e => e.field === 'height'));

      const title = [...v.errors.map(e => e.msg), ...v.warnings.map(w => w.msg)].join(' | ');
      row.title = title;
      renderValidationSummary();
    };

    row.querySelector('.piece-label').addEventListener('input', e => { p.label = e.target.value; save(); updateValidation(); });
    row.querySelector('.piece-width').addEventListener('input', e => { p.width = parseInt(e.target.value) || 0; save(); updateValidation(); });
    row.querySelector('.piece-height').addEventListener('input', e => { p.height = parseInt(e.target.value) || 0; save(); updateValidation(); });
    row.querySelector('.piece-qty').addEventListener('input', e => { p.quantity = parseInt(e.target.value) || 0; save(); updateValidation(); });
    row.querySelector('.piece-grain').addEventListener('change', e => { p.grainDirection = e.target.value; p.canRotate = e.target.value === 'none'; save(); });
    row.querySelector('.piece-eb-top').addEventListener('change', e => { p.edgeBanding.top = e.target.checked; save(); });
    row.querySelector('.piece-eb-bottom').addEventListener('change', e => { p.edgeBanding.bottom = e.target.checked; save(); });
    row.querySelector('.piece-eb-left').addEventListener('change', e => { p.edgeBanding.left = e.target.checked; save(); });
    row.querySelector('.piece-eb-right').addEventListener('change', e => { p.edgeBanding.right = e.target.checked; save(); });
    row.querySelector('.remove-piece').addEventListener('click', () => {
      pieces.splice(idx, 1); save(); renderCuttingPage(document.getElementById('app'));
    });
  });
}

// ==================== EVENTS ====================
function bindEvents() {
  // Add piece
  document.getElementById('btn-add-piece')?.addEventListener('click', () => {
    pieces.push(createPiece({ label: `Peça ${pieces.length + 1}`, color: PIECE_COLORS[pieces.length % PIECE_COLORS.length] }));
    save(); renderCuttingPage(document.getElementById('app'));
  });

  // Clear all
  document.getElementById('btn-clear-all')?.addEventListener('click', () => {
    if (confirm('Limpar todas as peças?')) {
      pieces = []; save(); renderCuttingPage(document.getElementById('app'));
    }
  });

  // Optimize
  document.getElementById('btn-optimize').addEventListener('click', runOptimization);

  // Legend toggle
  document.getElementById('toggle-legend')?.addEventListener('click', () => {
    const content = document.getElementById('legend-content');
    const btn = document.getElementById('toggle-legend');
    content.classList.toggle('hidden');
    btn.textContent = content.classList.contains('hidden') ? 'mostrar' : 'ocultar';
  });

  // Sheet select
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
        revalidateAll();
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
    revalidateAll();
  });

  // Presets
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS.find(p => p.id === btn.dataset.preset);
      if (!preset) return;
      const newPieces = preset.generate();
      pieces = [...pieces, ...newPieces];
      save();
      showToast(`${preset.name} adicionado!`, 'success');
      renderCuttingPage(document.getElementById('app'));
    });
  });
}

function save() {
  savePieces(pieces);
}

function revalidateAll() {
  renderPiecesMobile();
  renderPiecesDesktop();
  renderValidationSummary();
}

function runOptimization() {
  if (pieces.length === 0) {
    showToast('Adicione pelo menos uma peça', 'warning');
    return;
  }

  const { errorCount } = getValidationSummary(pieces, selectedSheet);
  if (errorCount > 0) {
    showToast(`${errorCount} peça(s) com erro. Corrija antes de otimizar.`, 'warning');
    return;
  }

  const selectVal = document.getElementById('sheet-select').value;
  if (selectVal === 'custom') {
    selectedSheet = {
      id: 'custom', name: 'Personalizada',
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
  showToast(`Otimizado: ${result.sheets.length} chapa(s)`, 'success');

  // Scroll to result
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderResult(result) {
  const section = document.getElementById('result-section');
  section.classList.remove('hidden');

  const stats = document.getElementById('result-stats');
  const totalPieces = result.sheets.reduce((s, sh) => s + sh.placements.length, 0);
  const avgWaste = result.sheets.length > 0
    ? (result.sheets.reduce((s, sh) => s + parseFloat(sh.wastePercent), 0) / result.sheets.length).toFixed(1) : 0;
  const totalCost = (result.sheets.length * selectedSheet.cost).toFixed(2);

  stats.innerHTML = `
    <span class="stat-badge bg-blue-100 text-blue-700">${result.sheets.length} chapa(s)</span>
    <span class="stat-badge bg-green-100 text-green-700">${totalPieces} peça(s)</span>
    <span class="stat-badge bg-amber-100 text-amber-700">${avgWaste}% desperdício</span>
    <span class="stat-badge bg-purple-100 text-purple-700">R$ ${totalCost}</span>
    ${result.unplacedCount > 0 ? `<span class="stat-badge bg-red-100 text-red-700">${result.unplacedCount} não couberam</span>` : ''}
  `;

  const sheetsDiv = document.getElementById('result-sheets');
  sheetsDiv.innerHTML = '';

  for (const sheet of result.sheets) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-6';

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-container p-2 mb-2';
    const canvas = document.createElement('canvas');
    canvasContainer.appendChild(canvas);
    wrapper.appendChild(canvasContainer);

    const legend = document.createElement('div');
    legend.className = 'mt-2';
    wrapper.appendChild(legend);
    sheetsDiv.appendChild(wrapper);

    requestAnimationFrame(() => {
      renderCuttingPlan(canvas, sheet, selectedSheet);
      renderLegend(legend, sheet);
    });
  }
}
