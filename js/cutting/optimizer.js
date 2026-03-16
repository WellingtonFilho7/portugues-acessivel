/**
 * Guillotine Bin-Packing Optimizer
 *
 * Algoritmo: Best-Area-Fit Decreasing com cortes guilhotina.
 * - Ordena peças por área (maior primeiro)
 * - Para cada chapa, mantém lista de retângulos livres
 * - Coloca peça no menor retângulo livre que cabe
 * - Divide espaço restante com corte guilhotina (horizontal ou vertical)
 * - Considera saw kerf e trimming
 * - Respeita direção do veio quando aplicável
 */

/**
 * @typedef {Object} Placement
 * @property {string} pieceId
 * @property {string} label
 * @property {number} x - posição x (mm)
 * @property {number} y - posição y (mm)
 * @property {number} w - largura colocada (mm)
 * @property {number} h - altura colocada (mm)
 * @property {boolean} rotated
 * @property {string} color
 * @property {Object} edgeBanding
 */

/**
 * @typedef {Object} SheetResult
 * @property {number} sheetIndex
 * @property {number} usableWidth
 * @property {number} usableHeight
 * @property {Placement[]} placements
 * @property {number} usedArea
 * @property {number} totalArea
 * @property {number} wastePercent
 */

class FreeRect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  get area() { return this.w * this.h; }
}

/**
 * Verifica se a peça cabe no retângulo livre, considerando veio
 */
function fitOptions(piece, rect, sheetGrain) {
  const fits = [];
  const kerf = 0; // kerf é aplicado na divisão, não no encaixe

  // Normal orientation
  if (piece.width <= rect.w && piece.height <= rect.h) {
    // Verificar veio
    if (isGrainCompatible(piece.grainDirection, sheetGrain, false)) {
      fits.push({ w: piece.width, h: piece.height, rotated: false });
    }
  }

  // Rotated 90°
  if (piece.canRotate && piece.height <= rect.w && piece.width <= rect.h) {
    if (isGrainCompatible(piece.grainDirection, sheetGrain, true)) {
      fits.push({ w: piece.height, h: piece.width, rotated: true });
    }
  }

  return fits;
}

function isGrainCompatible(pieceGrain, sheetGrain, rotated) {
  if (pieceGrain === 'none' || sheetGrain === 'none') return true;
  if (rotated) {
    // Ao rotacionar, o veio da peça inverte
    return (pieceGrain === 'horizontal' && sheetGrain === 'vertical') ||
           (pieceGrain === 'vertical' && sheetGrain === 'horizontal');
  }
  return pieceGrain === sheetGrain;
}

/**
 * Divide retângulo livre após colocar uma peça.
 * Corte guilhotina: divide em 2 retângulos.
 * Estratégia: Shorter Leftover Axis (SLA) - divide pelo eixo que deixa menor sobra.
 */
function splitRect(rect, placedW, placedH, sawKerf) {
  const results = [];
  const rightW = rect.w - placedW - sawKerf;
  const bottomH = rect.h - placedH - sawKerf;

  // Decisão: corte horizontal ou vertical primeiro
  // Usamos "Shorter Leftover Axis" - divide pelo eixo menor
  if (rightW * rect.h > rect.w * bottomH) {
    // Retângulo à direita (toda altura)
    if (rightW > 0) {
      results.push(new FreeRect(rect.x + placedW + sawKerf, rect.y, rightW, rect.h));
    }
    // Retângulo abaixo (apenas largura da peça)
    if (bottomH > 0) {
      results.push(new FreeRect(rect.x, rect.y + placedH + sawKerf, placedW, bottomH));
    }
  } else {
    // Retângulo abaixo (toda largura)
    if (bottomH > 0) {
      results.push(new FreeRect(rect.x, rect.y + placedH + sawKerf, rect.w, bottomH));
    }
    // Retângulo à direita (apenas altura da peça)
    if (rightW > 0) {
      results.push(new FreeRect(rect.x + placedW + sawKerf, rect.y, rightW, placedH));
    }
  }

  return results;
}

/**
 * Otimiza o plano de corte.
 * @param {Array} pieces - lista de peças (cada peça expandida por quantity)
 * @param {Object} sheet - chapa selecionada
 * @returns {SheetResult[]} - resultado por chapa
 */
export function optimize(pieces, sheet) {
  // Expandir peças por quantidade
  const expanded = [];
  for (const p of pieces) {
    for (let i = 0; i < (p.quantity || 1); i++) {
      expanded.push({ ...p, _idx: i });
    }
  }

  // Ordenar por área decrescente
  expanded.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const usableW = sheet.width - 2 * sheet.trimming;
  const usableH = sheet.height - 2 * sheet.trimming;
  const sheetGrain = sheet.grainDirection || 'none';

  const sheets = [];
  const unplaced = [...expanded];

  while (unplaced.length > 0) {
    const currentSheet = {
      sheetIndex: sheets.length,
      usableWidth: usableW,
      usableHeight: usableH,
      placements: [],
      usedArea: 0,
      totalArea: usableW * usableH,
      wastePercent: 100,
    };

    const freeRects = [new FreeRect(0, 0, usableW, usableH)];
    const placed = [];

    for (let pi = 0; pi < unplaced.length; pi++) {
      const piece = unplaced[pi];
      let bestRect = null;
      let bestRectIdx = -1;
      let bestFit = null;
      let bestAreaDiff = Infinity;

      // Encontrar melhor retângulo livre (Best Area Fit)
      for (let ri = 0; ri < freeRects.length; ri++) {
        const rect = freeRects[ri];
        const options = fitOptions(piece, rect, sheetGrain);

        for (const opt of options) {
          const areaDiff = rect.area - (opt.w * opt.h);
          if (areaDiff < bestAreaDiff) {
            bestAreaDiff = areaDiff;
            bestRect = rect;
            bestRectIdx = ri;
            bestFit = opt;
          }
        }
      }

      if (bestFit) {
        // Colocar peça
        currentSheet.placements.push({
          pieceId: piece.id,
          label: piece.label + (piece.quantity > 1 ? ` (${piece._idx + 1})` : ''),
          x: bestRect.x,
          y: bestRect.y,
          w: bestFit.w,
          h: bestFit.h,
          rotated: bestFit.rotated,
          color: piece.color,
          edgeBanding: piece.edgeBanding,
        });

        currentSheet.usedArea += bestFit.w * bestFit.h;

        // Dividir retângulo livre
        const newRects = splitRect(bestRect, bestFit.w, bestFit.h, sheet.sawKerf);
        freeRects.splice(bestRectIdx, 1, ...newRects);

        placed.push(pi);
      }
    }

    // Remover peças colocadas (de trás para frente)
    placed.sort((a, b) => b - a);
    for (const idx of placed) {
      unplaced.splice(idx, 1);
    }

    currentSheet.wastePercent = currentSheet.totalArea > 0
      ? ((1 - currentSheet.usedArea / currentSheet.totalArea) * 100).toFixed(1)
      : 100;

    sheets.push(currentSheet);

    // Se nenhuma peça foi colocada, as restantes não cabem
    if (placed.length === 0) {
      console.warn('Peças não couberam em nenhuma chapa:', unplaced);
      break;
    }
  }

  return { sheets, unplacedCount: unplaced.length };
}
