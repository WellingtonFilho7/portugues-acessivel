const STORAGE_KEY = 'cortecloud_data';

function getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { projects: [], currentProjectId: null };
  } catch {
    return { projects: [], currentProjectId: null };
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Projetos
export function listProjects() {
  return getStore().projects;
}

export function getProject(id) {
  return getStore().projects.find(p => p.id === id) || null;
}

export function saveProject(project) {
  const store = getStore();
  const idx = store.projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    store.projects[idx] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    store.projects.push({ ...project, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  saveStore(store);
}

export function deleteProject(id) {
  const store = getStore();
  store.projects = store.projects.filter(p => p.id !== id);
  if (store.currentProjectId === id) store.currentProjectId = null;
  saveStore(store);
}

export function setCurrentProject(id) {
  const store = getStore();
  store.currentProjectId = id;
  saveStore(store);
}

export function getCurrentProjectId() {
  return getStore().currentProjectId;
}

// Lista de peças temporária (para a tela de corte)
const PIECES_KEY = 'cortecloud_pieces';
const SHEET_KEY = 'cortecloud_sheet';

export function savePieces(pieces) {
  localStorage.setItem(PIECES_KEY, JSON.stringify(pieces));
}

export function loadPieces() {
  try {
    return JSON.parse(localStorage.getItem(PIECES_KEY)) || [];
  } catch { return []; }
}

export function saveSelectedSheet(sheet) {
  localStorage.setItem(SHEET_KEY, JSON.stringify(sheet));
}

export function loadSelectedSheet() {
  try {
    return JSON.parse(localStorage.getItem(SHEET_KEY)) || null;
  } catch { return null; }
}

// Export/Import JSON
export function exportAllData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    store: getStore(),
    pieces: loadPieces(),
    sheet: loadSelectedSheet(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cortecloud-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(jsonString) {
  const data = JSON.parse(jsonString);
  if (data.version !== 1) throw new Error('Versão de backup não suportada');
  if (data.store) saveStore(data.store);
  if (data.pieces) savePieces(data.pieces);
  if (data.sheet) saveSelectedSheet(data.sheet);
  return true;
}
