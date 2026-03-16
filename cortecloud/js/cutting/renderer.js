/**
 * Canvas Renderer for Cutting Plans
 * Renderiza o plano de corte em um canvas HTML5 com:
 * - Chapa em escala
 * - Peças coloridas com labels
 * - Indicadores de fita de borda
 * - Linhas de corte guilhotina
 * - Legenda com % aproveitamento
 */

const PADDING = 40;
const LABEL_FONT_SIZE = 11;
const EDGE_BAND_COLOR = '#f59e0b';
const EDGE_BAND_WIDTH = 3;
const WASTE_COLOR = '#f1f5f9';
const GRID_COLOR = '#e2e8f0';

/**
 * Renderiza um plano de corte em um canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} sheetResult - resultado do otimizador
 * @param {Object} sheetDef - definição da chapa (width, height, trimming)
 */
export function renderCuttingPlan(canvas, sheetResult, sheetDef) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const maxCanvasW = canvas.parentElement.clientWidth - 20;
  const usableW = sheetResult.usableWidth;
  const usableH = sheetResult.usableHeight;

  // Calcular escala para caber no canvas
  const availW = maxCanvasW - PADDING * 2;
  const availH = 600 - PADDING * 2;
  const scale = Math.min(availW / usableW, availH / usableH);

  const canvasW = usableW * scale + PADDING * 2;
  const canvasH = usableH * scale + PADDING * 2;

  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  ctx.scale(dpr, dpr);

  // Fundo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Área da chapa (fundo de desperdício)
  ctx.fillStyle = WASTE_COLOR;
  ctx.fillRect(PADDING, PADDING, usableW * scale, usableH * scale);

  // Borda da chapa
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(PADDING, PADDING, usableW * scale, usableH * scale);

  // Desenhar peças
  for (const p of sheetResult.placements) {
    const x = PADDING + p.x * scale;
    const y = PADDING + p.y * scale;
    const w = p.w * scale;
    const h = p.h * scale;

    // Preenchimento da peça
    ctx.fillStyle = p.color || '#3b82f6';
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;

    // Borda da peça
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Fita de borda
    if (p.edgeBanding) {
      ctx.strokeStyle = EDGE_BAND_COLOR;
      ctx.lineWidth = EDGE_BAND_WIDTH;

      const eb = p.rotated ? {
        top: p.edgeBanding.left,
        bottom: p.edgeBanding.right,
        left: p.edgeBanding.bottom,
        right: p.edgeBanding.top,
      } : p.edgeBanding;

      if (eb.top) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
      if (eb.bottom) { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke(); }
      if (eb.left) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke(); }
      if (eb.right) { ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.stroke(); }
    }

    // Label da peça
    const label = p.label || '';
    const dimText = `${p.rotated ? p.h : p.w}x${p.rotated ? p.w : p.h}`;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${LABEL_FONT_SIZE}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = x + w / 2;
    const centerY = y + h / 2;

    // Sombra no texto para legibilidade
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;

    if (w > 60 && h > 30) {
      ctx.fillText(truncate(label, Math.floor(w / 7)), centerX, centerY - 7);
      ctx.font = `${LABEL_FONT_SIZE - 1}px Inter, system-ui, sans-serif`;
      ctx.fillText(dimText, centerX, centerY + 8);
    } else if (w > 30 && h > 15) {
      ctx.font = `${LABEL_FONT_SIZE - 2}px Inter, system-ui, sans-serif`;
      ctx.fillText(dimText, centerX, centerY);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Dimensões externas
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${sheetDef.width} mm`, PADDING + usableW * scale / 2, PADDING - 12);
  ctx.save();
  ctx.translate(PADDING - 15, PADDING + usableH * scale / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${sheetDef.height} mm`, 0, 0);
  ctx.restore();

  // Informações de aproveitamento
  const usedPct = (100 - parseFloat(sheetResult.wastePercent)).toFixed(1);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Chapa ${sheetResult.sheetIndex + 1}: ${usedPct}% aproveitamento | ${sheetResult.wastePercent}% desperdício | ${sheetResult.placements.length} peça(s)`,
    PADDING, canvasH - 10
  );
}

function truncate(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/**
 * Renderiza legenda com lista de peças
 */
export function renderLegend(container, sheetResult) {
  container.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'cc-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Cor</th>
        <th>Peça</th>
        <th>Dimensões</th>
        <th>Posição</th>
        <th>Rotação</th>
      </tr>
    </thead>
    <tbody>
      ${sheetResult.placements.map(p => `
        <tr>
          <td><div style="width:16px;height:16px;border-radius:4px;background:${p.color}"></div></td>
          <td>${p.label}</td>
          <td>${p.w} x ${p.h} mm</td>
          <td>(${p.x}, ${p.y})</td>
          <td>${p.rotated ? 'Sim' : 'Não'}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  container.appendChild(table);
}
