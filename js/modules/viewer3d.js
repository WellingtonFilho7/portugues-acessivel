/**
 * Three.js 3D Furniture Viewer
 * Visualização 3D de módulos de móveis com OrbitControls
 */

let scene, camera, renderer, controls;
let currentMeshes = [];
let animationId = null;

// Cores para componentes do móvel
const COMPONENT_COLORS = {
  side: 0xdeb887,    // burlywood - laterais
  top: 0xd2b48c,     // tan - topo
  bottom: 0xd2b48c,  // tan - base
  back: 0xc0a882,    // fundo
  shelf: 0xe8d5b7,   // prateleiras
  door: 0xf5deb3,    // wheat - portas
  drawer: 0xf0c878,  // gavetas
  divider: 0xdec89b, // divisórias
};

/**
 * Inicializa a cena 3D no container
 */
export function init3DViewer(containerEl) {
  // Importar Three.js dinamicamente
  return import('three').then(async (THREE) => {
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

    // Cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x334155);

    // Camera
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight || 400;
    camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
    camera.position.set(1500, 1200, 2000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerEl.innerHTML = '';
    containerEl.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 400, 0);

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1000, 2000, 1500);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-1000, 500, -500);
    scene.add(fillLight);

    // Grid
    const gridHelper = new THREE.GridHelper(3000, 30, 0x4a5568, 0x2d3748);
    scene.add(gridHelper);

    // Eixos
    const axesHelper = new THREE.AxesHelper(200);
    scene.add(axesHelper);

    // Animate
    function animate() {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      const w = containerEl.clientWidth;
      const h = containerEl.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(containerEl);

    return { THREE, scene, camera };
  });
}

/**
 * Atualiza o modelo 3D com as peças do módulo
 */
export async function updateModel(pieces, params) {
  const THREE = await import('three');

  // Limpar meshes anteriores
  for (const mesh of currentMeshes) {
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }
  currentMeshes = [];

  if (!pieces || pieces.length === 0) return;

  // Posicionar peças como um móvel montado
  const t = params.thickness || 15;
  const w = params.width || 800;
  const h = params.height || 700;
  const d = params.depth || 350;

  // Centrar o móvel na origem
  const offsetX = -w / 2;
  const offsetZ = -d / 2;

  for (const piece of pieces) {
    const meshes = createPieceMeshes(THREE, piece, params, offsetX, offsetZ);
    for (const mesh of meshes) {
      scene.add(mesh);
      currentMeshes.push(mesh);
    }
  }

  // Ajustar câmera
  const maxDim = Math.max(w, h, d);
  camera.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.5);
  controls.target.set(0, h / 2, 0);
  controls.update();
}

function createPieceMeshes(THREE, piece, params, offsetX, offsetZ) {
  const meshes = [];
  const t = params.thickness || 15;
  const w = params.width || 800;
  const h = params.height || 700;
  const d = params.depth || 350;

  const label = piece.label.toLowerCase();
  let color, geometry, position;
  const opacity = label.includes('porta') || label.includes('frente') ? 0.6 : 0.85;

  // Determinar cor baseada no tipo de peça
  if (label.includes('lateral')) {
    color = COMPONENT_COLORS.side;
  } else if (label.includes('topo') || label.includes('travessa')) {
    color = COMPONENT_COLORS.top;
  } else if (label.includes('base')) {
    color = COMPONENT_COLORS.bottom;
  } else if (label.includes('fundo')) {
    color = COMPONENT_COLORS.back;
  } else if (label.includes('prateleira') || label.includes('divisória')) {
    color = COMPONENT_COLORS.shelf;
  } else if (label.includes('porta')) {
    color = COMPONENT_COLORS.door;
  } else if (label.includes('gaveta') || label.includes('frente')) {
    color = COMPONENT_COLORS.drawer;
  } else {
    color = COMPONENT_COLORS.side;
  }

  const material = new THREE.MeshPhongMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });

  // Criar geometria simplificada baseada no nome da peça
  for (let i = 0; i < (piece.quantity || 1); i++) {
    let geo, pos;

    if (label.includes('lateral esquerda') || (label.includes('lateral') && i === 0 && !label.includes('gaveta'))) {
      geo = new THREE.BoxGeometry(t, h, d);
      pos = [offsetX + t / 2, h / 2, 0];
    } else if (label.includes('lateral direita') || (label.includes('lateral') && i === 1 && !label.includes('gaveta'))) {
      geo = new THREE.BoxGeometry(t, h, d);
      pos = [offsetX + w - t / 2, h / 2, 0];
    } else if (label.includes('topo')) {
      geo = new THREE.BoxGeometry(w - 2 * t, t, d);
      pos = [offsetX + w / 2, h - t / 2, 0];
    } else if (label.includes('base') && !label.includes('gaveta')) {
      geo = new THREE.BoxGeometry(w - 2 * t, t, d);
      pos = [offsetX + w / 2, t / 2, 0];
    } else if (label.includes('fundo') && !label.includes('gaveta')) {
      geo = new THREE.BoxGeometry(w - 2 * t, h - 2 * t, 6);
      pos = [offsetX + w / 2, h / 2, -d / 2 + 3];
    } else if (label.includes('prateleira maleiro')) {
      geo = new THREE.BoxGeometry(w - 2 * t, t, d - 20);
      pos = [offsetX + w / 2, h - 350, 0];
    } else if (label.includes('prateleira') || label.includes('divisória horizontal')) {
      const shelfSpacing = (h - 2 * t - 350) / (piece.quantity + 1);
      geo = new THREE.BoxGeometry(piece.width, t, piece.height);
      pos = [offsetX + w / 2, t + shelfSpacing * (i + 1), 0];
    } else if (label.includes('divisória vertical') || label.includes('divisória')) {
      const sections = piece.quantity + 1;
      const sectionW = (w - 2 * t) / sections;
      geo = new THREE.BoxGeometry(t, h - 2 * t, d - 20);
      pos = [offsetX + t + sectionW * (i + 1), h / 2, 0];
    } else if (label.includes('porta')) {
      const doorW = (w - 4) / piece.quantity;
      geo = new THREE.BoxGeometry(doorW - 2, h - 4, t);
      pos = [offsetX + doorW / 2 + doorW * i + 2, h / 2, d / 2 - t / 2];
    } else if (label.includes('frente gaveta') || (label.includes('frente') && label.includes('gaveta'))) {
      const drawerH = piece.height;
      const spacing = 3;
      geo = new THREE.BoxGeometry(w - 4, drawerH, t);
      pos = [offsetX + w / 2, t + spacing + drawerH / 2 + (drawerH + spacing) * i, d / 2 - t / 2];
    } else if (label.includes('travessa')) {
      geo = new THREE.BoxGeometry(w - 2 * t, 80, t);
      pos = [offsetX + w / 2, h - t - 40, d / 2 - t];
    } else {
      // Peça genérica
      geo = new THREE.BoxGeometry(piece.width / 5, piece.height / 5, t);
      pos = [0, h / 2, 0];
    }

    const mesh = new THREE.Mesh(geo, material.clone());
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh);
  }

  return meshes;
}

/**
 * Limpa a cena
 */
export function clearScene() {
  for (const mesh of currentMeshes) {
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }
  currentMeshes = [];
}

/**
 * Destrói o viewer
 */
export function destroyViewer() {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) renderer.dispose();
  currentMeshes = [];
}
