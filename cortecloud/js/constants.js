// Chapas padrão brasileiras (MDF/MDP)
export const DEFAULT_SHEETS = [
  { id: 'mdf-2750x1830-15', name: 'MDF 15mm Branco 2750x1830', width: 2750, height: 1830, thickness: 15, trimming: 10, sawKerf: 4, cost: 189.90 },
  { id: 'mdf-2750x1830-18', name: 'MDF 18mm Branco 2750x1830', width: 2750, height: 1830, thickness: 18, trimming: 10, sawKerf: 4, cost: 219.90 },
  { id: 'mdf-2750x1840-15', name: 'MDF 15mm Branco 2750x1840', width: 2750, height: 1840, thickness: 15, trimming: 10, sawKerf: 4, cost: 195.00 },
  { id: 'mdp-2750x1830-15', name: 'MDP 15mm Branco 2750x1830', width: 2750, height: 1830, thickness: 15, trimming: 10, sawKerf: 4, cost: 149.90 },
  { id: 'mdp-2750x1830-18', name: 'MDP 18mm Branco 2750x1830', width: 2750, height: 1830, thickness: 18, trimming: 10, sawKerf: 4, cost: 169.90 },
  { id: 'mdf-2750x1830-6', name: 'MDF 6mm Branco 2750x1830', width: 2750, height: 1830, thickness: 6, trimming: 10, sawKerf: 4, cost: 89.90 },
  { id: 'mdf-2750x1830-9', name: 'MDF 9mm Branco 2750x1830', width: 2750, height: 1830, thickness: 9, trimming: 10, sawKerf: 4, cost: 119.90 },
  { id: 'mdf-2750x1830-25', name: 'MDF 25mm Branco 2750x1830', width: 2750, height: 1830, thickness: 25, trimming: 10, sawKerf: 4, cost: 289.90 },
];

// Espessuras disponíveis (mm)
export const THICKNESSES = [6, 9, 12, 15, 18, 25];

// Fita de borda padrão (larguras em mm)
export const EDGE_BANDING_WIDTHS = [22, 35, 45];

// Espessura padrão da fita de borda (mm)
export const DEFAULT_EDGE_THICKNESS = 0.4;

// Serra padrão (kerf em mm)
export const DEFAULT_SAW_KERF = 4;

// Refilamento padrão (mm por borda)
export const DEFAULT_TRIMMING = 10;

// Cores para peças na visualização
export const PIECE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#65a30d',
];

// Direção do veio
export const GRAIN_OPTIONS = [
  { value: 'none', label: 'Sem veio' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
];

// Gera UUID simples
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Cria peça com valores padrão
export function createPiece(overrides = {}) {
  return {
    id: generateId(),
    label: '',
    width: 500,
    height: 300,
    quantity: 1,
    material: '',
    grainDirection: 'none',
    canRotate: true,
    edgeBanding: { top: false, bottom: false, left: false, right: false },
    edgeBandingThickness: DEFAULT_EDGE_THICKNESS,
    moduleId: null,
    color: PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)],
    ...overrides,
  };
}
