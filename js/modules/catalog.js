/**
 * Catálogo de Módulos de Móveis Pré-modelados
 * Cada módulo define parâmetros ajustáveis e uma função generatePieces()
 */

import { createPiece, PIECE_COLORS } from '../constants.js';

// ==================== COZINHA ====================

export const armarioAereo = {
  id: 'armario-aereo',
  type: 'kitchen_wall',
  name: 'Armário Aéreo',
  description: 'Armário aéreo de cozinha com portas de abrir',
  environment: 'Cozinha',
  params: {
    width:  { value: 800, min: 300, max: 2400, step: 50, label: 'Largura (mm)' },
    height: { value: 700, min: 400, max: 1000, step: 50, label: 'Altura (mm)' },
    depth:  { value: 350, min: 250, max: 450, step: 50, label: 'Profundidade (mm)' },
    doors:  { value: 2, min: 1, max: 3, step: 1, label: 'Portas' },
    shelves: { value: 1, min: 0, max: 4, step: 1, label: 'Prateleiras' },
    thickness: { value: 15, min: 15, max: 18, step: 3, label: 'Espessura (mm)' },
  },
  generatePieces(p) {
    const t = p.thickness;
    const internalW = p.width - 2 * t;
    const internalH = p.height - 2 * t;
    const doorW = Math.floor((p.width - 4) / p.doors); // 2mm folga cada lado
    const pieces = [];
    let ci = 0;

    // Laterais (2x)
    pieces.push(createPiece({ label: 'Lateral Esquerda', width: p.depth, height: p.height, quantity: 1,
      edgeBanding: { top: true, bottom: true, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Lateral Direita', width: p.depth, height: p.height, quantity: 1,
      edgeBanding: { top: true, bottom: true, left: true, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Topo e Base
    pieces.push(createPiece({ label: 'Topo', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Base', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Fundo (3mm MDF geralmente, mas para simplificar usamos mesma espessura)
    pieces.push(createPiece({ label: 'Fundo', width: internalW, height: internalH, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Prateleiras
    if (p.shelves > 0) {
      pieces.push(createPiece({ label: 'Prateleira', width: internalW - 2, height: p.depth - 20, quantity: p.shelves,
        edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    }

    // Portas
    pieces.push(createPiece({ label: 'Porta', width: doorW, height: p.height - 4, quantity: p.doors,
      edgeBanding: { top: true, bottom: true, left: true, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    return pieces;
  }
};

export const balcaoPia = {
  id: 'balcao-pia',
  type: 'kitchen_base',
  name: 'Balcão de Pia',
  description: 'Balcão inferior de cozinha para pia',
  environment: 'Cozinha',
  params: {
    width:  { value: 1200, min: 600, max: 3000, step: 50, label: 'Largura (mm)' },
    height: { value: 820, min: 700, max: 900, step: 50, label: 'Altura (mm)' },
    depth:  { value: 550, min: 450, max: 650, step: 50, label: 'Profundidade (mm)' },
    doors:  { value: 2, min: 1, max: 4, step: 1, label: 'Portas' },
    thickness: { value: 15, min: 15, max: 18, step: 3, label: 'Espessura (mm)' },
  },
  generatePieces(p) {
    const t = p.thickness;
    const internalW = p.width - 2 * t;
    const internalH = p.height - t; // sem topo (tampo é separado)
    const doorW = Math.floor((p.width - 4) / p.doors);
    const pieces = [];
    let ci = 0;

    pieces.push(createPiece({ label: 'Lateral Esquerda', width: p.depth, height: p.height, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Lateral Direita', width: p.depth, height: p.height, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: true, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Base', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Travessa Superior', width: internalW, height: 80, quantity: 1,
      edgeBanding: { top: false, bottom: true, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Fundo', width: internalW, height: internalH - 80, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Porta', width: doorW, height: p.height - t - 80 - 6, quantity: p.doors,
      edgeBanding: { top: true, bottom: true, left: true, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    return pieces;
  }
};

export const gaveteiro = {
  id: 'gaveteiro',
  type: 'kitchen_drawer',
  name: 'Gaveteiro',
  description: 'Gaveteiro de cozinha com gavetas',
  environment: 'Cozinha',
  params: {
    width:  { value: 600, min: 300, max: 900, step: 50, label: 'Largura (mm)' },
    height: { value: 820, min: 700, max: 900, step: 50, label: 'Altura (mm)' },
    depth:  { value: 550, min: 450, max: 650, step: 50, label: 'Profundidade (mm)' },
    drawers: { value: 4, min: 2, max: 6, step: 1, label: 'Gavetas' },
    thickness: { value: 15, min: 15, max: 18, step: 3, label: 'Espessura (mm)' },
  },
  generatePieces(p) {
    const t = p.thickness;
    const internalW = p.width - 2 * t;
    const drawerFrontH = Math.floor((p.height - t - (p.drawers + 1) * 3) / p.drawers);
    const drawerBoxH = drawerFrontH - 30;
    const drawerBoxDepth = p.depth - 80;
    const pieces = [];
    let ci = 0;

    pieces.push(createPiece({ label: 'Lateral', width: p.depth, height: p.height, quantity: 2,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Base', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Travessa Superior', width: internalW, height: 80, quantity: 1,
      edgeBanding: { top: false, bottom: true, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Fundo', width: internalW, height: p.height - t - 80, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Frentes das gavetas
    pieces.push(createPiece({ label: 'Frente Gaveta', width: p.width - 4, height: drawerFrontH, quantity: p.drawers,
      edgeBanding: { top: true, bottom: true, left: true, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Laterais das gavetas (caixas)
    pieces.push(createPiece({ label: 'Lateral Gaveta', width: drawerBoxDepth, height: drawerBoxH, quantity: p.drawers * 2,
      edgeBanding: { top: true, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    // Frente/Traseira gaveta interna
    pieces.push(createPiece({ label: 'Frente/Tras Gaveta Int.', width: internalW - 2 * t - 26, height: drawerBoxH, quantity: p.drawers * 2,
      edgeBanding: { top: true, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    // Fundo gaveta
    pieces.push(createPiece({ label: 'Fundo Gaveta', width: internalW - 2 * t - 25, height: drawerBoxDepth - 2, quantity: p.drawers,
      edgeBanding: { top: false, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    return pieces;
  }
};

// ==================== DORMITÓRIO ====================

export const guardaRoupa = {
  id: 'guarda-roupa',
  type: 'wardrobe',
  name: 'Guarda-Roupa',
  description: 'Guarda-roupa com portas de abrir e maleiro',
  environment: 'Dormitório',
  params: {
    width:  { value: 1800, min: 800, max: 3000, step: 50, label: 'Largura (mm)' },
    height: { value: 2200, min: 1800, max: 2700, step: 50, label: 'Altura (mm)' },
    depth:  { value: 550, min: 400, max: 650, step: 50, label: 'Profundidade (mm)' },
    doors:  { value: 3, min: 2, max: 6, step: 1, label: 'Portas' },
    shelves: { value: 4, min: 2, max: 8, step: 1, label: 'Prateleiras' },
    hasRod: { value: 1, min: 0, max: 1, step: 1, label: 'Cabideiro (0=não, 1=sim)' },
    thickness: { value: 18, min: 15, max: 18, step: 3, label: 'Espessura (mm)' },
  },
  generatePieces(p) {
    const t = p.thickness;
    const internalW = p.width - 2 * t;
    const internalH = p.height - 2 * t;
    const doorW = Math.floor((p.width - (p.doors + 1) * 2) / p.doors);
    const malH = 350; // altura do maleiro
    const dividerCount = Math.max(0, p.doors - 1);
    const sectionW = Math.floor(internalW / (dividerCount + 1));
    const pieces = [];
    let ci = 0;

    // Laterais externas
    pieces.push(createPiece({ label: 'Lateral', width: p.depth, height: p.height, quantity: 2,
      edgeBanding: { top: true, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Topo e Base
    pieces.push(createPiece({ label: 'Topo', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Base', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Fundo
    pieces.push(createPiece({ label: 'Fundo', width: internalW, height: internalH, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Divisórias verticais
    if (dividerCount > 0) {
      pieces.push(createPiece({ label: 'Divisória Vertical', width: p.depth - 20, height: internalH, quantity: dividerCount,
        edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    }

    // Prateleira do maleiro
    pieces.push(createPiece({ label: 'Prateleira Maleiro', width: internalW, height: p.depth - 20, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Prateleiras
    pieces.push(createPiece({ label: 'Prateleira', width: sectionW - 2, height: p.depth - 20, quantity: p.shelves,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    // Portas
    pieces.push(createPiece({ label: 'Porta', width: doorW, height: p.height - 4, quantity: p.doors,
      edgeBanding: { top: true, bottom: true, left: true, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    return pieces;
  }
};

export const comoda = {
  id: 'comoda',
  type: 'dresser',
  name: 'Cômoda',
  description: 'Cômoda com gavetas para dormitório',
  environment: 'Dormitório',
  params: {
    width:  { value: 1200, min: 600, max: 1800, step: 50, label: 'Largura (mm)' },
    height: { value: 900, min: 600, max: 1200, step: 50, label: 'Altura (mm)' },
    depth:  { value: 450, min: 350, max: 550, step: 50, label: 'Profundidade (mm)' },
    drawers: { value: 4, min: 2, max: 6, step: 1, label: 'Gavetas' },
    thickness: { value: 15, min: 15, max: 18, step: 3, label: 'Espessura (mm)' },
  },
  generatePieces(p) {
    const t = p.thickness;
    const internalW = p.width - 2 * t;
    const drawerFrontH = Math.floor((p.height - t - (p.drawers + 1) * 3) / p.drawers);
    const pieces = [];
    let ci = 0;

    pieces.push(createPiece({ label: 'Lateral', width: p.depth, height: p.height, quantity: 2,
      edgeBanding: { top: true, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Topo', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Base', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Fundo', width: internalW, height: p.height - 2 * t, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Frente Gaveta', width: p.width - 4, height: drawerFrontH, quantity: p.drawers,
      edgeBanding: { top: true, bottom: true, left: true, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    return pieces;
  }
};

export const criadoMudo = {
  id: 'criado-mudo',
  type: 'nightstand',
  name: 'Criado-Mudo',
  description: 'Criado-mudo com gaveta e nicho',
  environment: 'Dormitório',
  params: {
    width:  { value: 450, min: 350, max: 600, step: 50, label: 'Largura (mm)' },
    height: { value: 550, min: 400, max: 700, step: 50, label: 'Altura (mm)' },
    depth:  { value: 400, min: 300, max: 500, step: 50, label: 'Profundidade (mm)' },
    drawers: { value: 1, min: 1, max: 2, step: 1, label: 'Gavetas' },
    thickness: { value: 15, min: 15, max: 18, step: 3, label: 'Espessura (mm)' },
  },
  generatePieces(p) {
    const t = p.thickness;
    const internalW = p.width - 2 * t;
    const drawerH = Math.floor((p.height / 2 - t - 6) / p.drawers);
    const pieces = [];
    let ci = 0;

    pieces.push(createPiece({ label: 'Lateral', width: p.depth, height: p.height, quantity: 2,
      edgeBanding: { top: true, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Topo', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Base', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Prateleira Divisória', width: internalW, height: p.depth - 20, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Fundo', width: internalW, height: p.height - 2 * t, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Frente Gaveta', width: p.width - 4, height: drawerH, quantity: p.drawers,
      edgeBanding: { top: true, bottom: true, left: true, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    return pieces;
  }
};

// ==================== BANHEIRO/LAVANDERIA ====================

export const gabineteBanheiro = {
  id: 'gabinete-banheiro',
  type: 'bathroom_vanity',
  name: 'Gabinete de Banheiro',
  description: 'Gabinete inferior para banheiro com portas',
  environment: 'Banheiro',
  params: {
    width:  { value: 800, min: 400, max: 1500, step: 50, label: 'Largura (mm)' },
    height: { value: 600, min: 500, max: 800, step: 50, label: 'Altura (mm)' },
    depth:  { value: 400, min: 300, max: 500, step: 50, label: 'Profundidade (mm)' },
    doors:  { value: 2, min: 1, max: 3, step: 1, label: 'Portas' },
    thickness: { value: 15, min: 15, max: 18, step: 3, label: 'Espessura (mm)' },
  },
  generatePieces(p) {
    const t = p.thickness;
    const internalW = p.width - 2 * t;
    const doorW = Math.floor((p.width - 4) / p.doors);
    const pieces = [];
    let ci = 0;

    pieces.push(createPiece({ label: 'Lateral', width: p.depth, height: p.height, quantity: 2,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Base', width: internalW, height: p.depth, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Travessa Superior', width: internalW, height: 80, quantity: 1,
      edgeBanding: { top: false, bottom: true, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Fundo', width: internalW, height: p.height - t - 80, quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: false }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));
    pieces.push(createPiece({ label: 'Porta', width: doorW, height: p.height - t - 80 - 6, quantity: p.doors,
      edgeBanding: { top: true, bottom: true, left: true, right: true }, color: PIECE_COLORS[ci++ % PIECE_COLORS.length] }));

    return pieces;
  }
};

export const armarioLavanderia = {
  id: 'armario-lavanderia',
  type: 'laundry_wall',
  name: 'Armário Aéreo Lavanderia',
  description: 'Armário aéreo para lavanderia',
  environment: 'Lavanderia',
  params: {
    width:  { value: 1000, min: 500, max: 2000, step: 50, label: 'Largura (mm)' },
    height: { value: 600, min: 400, max: 900, step: 50, label: 'Altura (mm)' },
    depth:  { value: 350, min: 250, max: 450, step: 50, label: 'Profundidade (mm)' },
    doors:  { value: 2, min: 1, max: 3, step: 1, label: 'Portas' },
    shelves: { value: 2, min: 0, max: 4, step: 1, label: 'Prateleiras' },
    thickness: { value: 15, min: 15, max: 18, step: 3, label: 'Espessura (mm)' },
  },
  generatePieces(p) {
    // Reutiliza a mesma lógica do armário aéreo
    return armarioAereo.generatePieces(p);
  }
};

// ==================== TODOS OS MÓDULOS ====================

export const ALL_MODULES = [
  armarioAereo,
  balcaoPia,
  gaveteiro,
  guardaRoupa,
  comoda,
  criadoMudo,
  gabineteBanheiro,
  armarioLavanderia,
];

export function getModuleById(id) {
  return ALL_MODULES.find(m => m.id === id) || null;
}
