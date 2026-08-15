const STORAGE_KEY = 'tacview02-state';
const WINDOWS_STORAGE_KEY = 'tacview02-windows';
const INITIAL_STATE_STORAGE_KEY = 'tacview02-initial-state';
const VIEW_STORAGE_KEY = 'tacview02-view';
const MAP_VIEW_SPAN = { lat: 24, lon: 28 };
const MAP_MAX_SCALE = 32;
const MAP_ZOOM_FACTOR = 1.1;
const MAP_VERTICAL_ASPECT = 0.88;
const LCC_STANDARD_PARALLELS = [30, 60];
const LAYER_LABELS = {
  basic: '基本レイヤー',
  static: '静的レイヤー',
  dynamic: '動的レイヤー',
};

const OBJECT_TYPE_LABELS = {
  enemy: '敵',
  neutral: '中立',
  ally: '味方',
  waypoint: 'WAYPOINT',
  line: '線',
};

const defaultSettings = {
  mapCenter: { lat: 35, lon: 136 },
    bullseye: { lat: 35.6895, lon: 139.6917 },
  coordSystem: 'DDMM.MMM',
  deviationMode: 'auto',
  manualDeviation: 0,
  displayScale: 100,
};

const defaultWindowsState = {
  layers: { x: 12, y: 12, draggable: true, feature: 'layers' },
  selfinfo: { x: 12, y: 160, draggable: true, feature: 'be' },
  hook: { x: 12, y: 320, draggable: true, feature: 'hook' },
};

const WINDOW_FEATURE_LABELS = {
  layers: 'Layers',
  hook: '自機Hook',
  hook2: 'Hook',
  be: 'B/E',
  track: 'Track',
  gs: 'GS',
  tos: 'TOS',
  dynamicList: '動的オブジェクトリスト',
};

const DYNAMIC_STATUSES = ['ACTIVE', 'AWAKE', 'DESTROYED', 'ASLEEP'];

const sampleState = {
  basic: [
    {
      id: 'aip-ctr',
      type: 'airspace',
      name: 'CTR / AIP区域',
      kind: 'controlled',
      fill: 'rgba(96, 165, 250, 0.08)',
      points: [[20, 18], [38, 24], [53, 17], [68, 32], [60, 60], [34, 58], [19, 38]],
      label: 'CTR',
    },
    {
      id: 'aip-atz',
      type: 'airspace',
      name: 'ATZ / AIP区域',
      kind: 'control-zone',
      fill: 'rgba(52, 211, 153, 0.09)',
      points: [[55, 18], [82, 28], [88, 58], [74, 68], [52, 62], [46, 42]],
      label: 'ATZ',
    },
    { id: 'base-a', type: 'base', name: 'A基地', x: 22, y: 70 },
    { id: 'base-b', type: 'base', name: 'B基地', x: 78, y: 30 },
    { id: 'airway-1', type: 'route', name: '航路1', points: [[25, 25], [40, 35], [60, 42], [75, 58]] },
  ],
  static: [
    { id: 'wp-1', type: 'waypoint', name: '交戦帯', x: 45, y: 46, layer: 'static', symbol: 'diamond', geometryType: 'ring', geometryRadius: 18 },
    { id: 'wp-2', type: 'waypoint', name: '補給点', x: 60, y: 60, layer: 'static', symbol: 'square', geometryType: 'circle', geometryRadius: 14 },
    { id: 'ally-1', type: 'ally', name: '友軍A', x: 50, y: 20, layer: 'static', symbol: 'triangle', geometryType: 'circle', geometryRadius: 12 },
  ],
  dynamic: [
    { id: 'enemy-1', type: 'enemy', name: '敵機1', x: 65, y: 48, layer: 'dynamic', threat: true, symbol: 'cross', geometryType: 'ring', geometryRadius: 18 },
    { id: 'enemy-2', type: 'enemy', name: '敵機2', x: 78, y: 62, layer: 'dynamic', threat: true, symbol: 'missile', geometryType: 'circle', geometryRadius: 16 },
    { id: 'ally-2', type: 'ally', name: '友軍B', x: 35, y: 63, layer: 'dynamic', symbol: 'circle', geometryType: 'none', geometryRadius: 0 },
  ],
  self: {
    enabled: true,
    lat: 35.6895,
    lon: 139.6917,
    x: 52,
    y: 48,
    heading: 0,
    speed: 0,
  },
};

const state = loadState();
ensureInitialStateSnapshot();
let selectedId = null;
let selectedLayer = null;
let hookMode = false;
let hookTarget = null;
let hook2Targets = [];
let mapPickTarget = null;
let mapPickReturnPanel = null;
let mapPickFormValues = null;
let basicDisplayRangePoints = [];
let managedLayer = 'static';
const hookWindowTargets = new Map();
let activeHookWindowKey = 'hook';
const locatorColors = ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa', '#fb7185'];

const mapInteraction = {
  ...loadSavedView(),
  viewport: null,
  pointers: new Map(),
  lastPoint: null,
  pinchDistance: 0,
  pinchScaleStart: 1,
};

const elements = {
  svg: document.getElementById('mapSvg'),
  scaleBar: document.getElementById('scaleBar'),
  scaleBarLabel: document.getElementById('scaleBarLabel'),
  scaleBarFill: document.getElementById('scaleBarFill'),
  cursorCoordinates: document.getElementById('cursorCoordinates'),
  cursorLatitude: document.getElementById('cursorLatitude'),
  cursorLongitude: document.getElementById('cursorLongitude'),
  selectedInfo: document.getElementById('selectedInfo'),
  selfBearing: document.getElementById('selfBearing'),
  selfDistance: document.getElementById('selfDistance'),
  selfHeading: document.getElementById('selfHeading'),
  selfSpeed: document.getElementById('selfSpeed'),
  hookButton: document.getElementById('hookButton'),
  hookInfo: document.getElementById('hookInfo'),
  hookName: document.getElementById('hookName'),
  hookBearing: document.getElementById('hookBearing'),
  hookDistance: document.getElementById('hookDistance'),
  toggleBasic: document.getElementById('toggle-basic'),
  toggleStatic: document.getElementById('toggle-static'),
  toggleDynamic: document.getElementById('toggle-dynamic'),
  settingsButton: document.getElementById('settingsButton'),
  settingsModal: document.getElementById('settingsModal'),
  saveInitialStateButton: document.getElementById('saveInitialStateButton'),
  exportPresetButton: document.getElementById('exportPresetButton'),
  importPresetButton: document.getElementById('importPresetButton'),
  presetFileInput: document.getElementById('presetFileInput'),
  resetAppButton: document.getElementById('resetAppButton'),
  closeSettings: document.getElementById('closeSettings'),
  windowSettingsPanel: document.getElementById('windowSettingsPanel'),
  windowSettingsList: document.getElementById('windowSettingsList'),
  windowNameInput: document.getElementById('windowNameInput'),
  windowFeatureSelect: document.getElementById('windowFeatureSelect'),
  addWindowButton: document.getElementById('addWindowButton'),
  basicLayerPanel: document.getElementById('basicLayerPanel'),
  staticLayerPanel: document.getElementById('staticLayerPanel'),
  staticLayerVisibleToggle: document.getElementById('staticLayerVisibleToggle'),
  staticLayerFilter: document.getElementById('staticLayerFilter'),
  addStaticObject: document.getElementById('addStaticObject'),
  staticLayerList: document.getElementById('staticLayerList'),
  staticLayerForm: document.getElementById('staticLayerForm'),
  staticLayerId: document.getElementById('staticLayerId'),
  staticLayerName: document.getElementById('staticLayerName'),
  staticLayerType: document.getElementById('staticLayerType'),
  staticLayerCoordSystem: document.getElementById('staticLayerCoordSystem'),
  staticLayerLat: document.getElementById('staticLayerLat'),
  staticLayerLon: document.getElementById('staticLayerLon'),
  staticLayerSymbol: document.getElementById('staticLayerSymbol'),
  staticLayerGeometryType: document.getElementById('staticLayerGeometryType'),
  staticLayerGeometryRadius: document.getElementById('staticLayerGeometryRadius'),
  staticLayerGeometryStartBearing: document.getElementById('staticLayerGeometryStartBearing'),
  staticLayerGeometryEndBearing: document.getElementById('staticLayerGeometryEndBearing'),
  cancelStaticLayerForm: document.getElementById('cancelStaticLayerForm'),
  basicLayerVisibleToggle: document.getElementById('basicLayerVisibleToggle'),
  basicLayerFilter: document.getElementById('basicLayerFilter'),
  addBasicAirspace: document.getElementById('addBasicAirspace'),
  importBasicGeoJson: document.getElementById('importBasicGeoJson'),
  clearBasicGeoJson: document.getElementById('clearBasicGeoJson'),
  limitBasicDisplayRange: document.getElementById('limitBasicDisplayRange'),
  basicGeoJsonFile: document.getElementById('basicGeoJsonFile'),
  basicLayerList: document.getElementById('basicLayerList'),
  basicLayerForm: document.getElementById('basicLayerForm'),
  basicLayerId: document.getElementById('basicLayerId'),
  basicLayerName: document.getElementById('basicLayerName'),
  basicLayerLabel: document.getElementById('basicLayerLabel'),
  basicLayerDisplayName: document.getElementById('basicLayerDisplayName'),
  basicLayerDisplayNameVisible: document.getElementById('basicLayerDisplayNameVisible'),
  basicLayerKind: document.getElementById('basicLayerKind'),
  basicLayerVisible: document.getElementById('basicLayerVisible'),
  basicLayerPoints: document.getElementById('basicLayerPoints'),
  cancelBasicLayerForm: document.getElementById('cancelBasicLayerForm'),
  mapCenterLat: document.getElementById('mapCenterLat'),
  mapCenterLon: document.getElementById('mapCenterLon'),
    bullseyeLat: document.getElementById('bullseyeLat'),
    bullseyeLon: document.getElementById('bullseyeLon'),
    pickBullseyeOnMap: document.getElementById('pickBullseyeOnMap'),
    pickMapCenterOnMap: document.getElementById('pickMapCenterOnMap'),
    staticLayerGeoFields: document.querySelectorAll('[data-static-geo-field]'),
    staticLayerBeFields: document.querySelector('[data-static-be-fields]'),
    staticLayerBeBearing: document.getElementById('staticLayerBeBearing'),
    staticLayerBeDistance: document.getElementById('staticLayerBeDistance'),
    staticLayerLineFields: document.querySelector('[data-static-line-fields]'),
    staticLayerStartLat: document.getElementById('staticLayerStartLat'),
    staticLayerStartLon: document.getElementById('staticLayerStartLon'),
    staticLayerEndLat: document.getElementById('staticLayerEndLat'),
    staticLayerEndLon: document.getElementById('staticLayerEndLon'),
    pickStaticLineStartOnMap: document.getElementById('pickStaticLineStartOnMap'),
    pickStaticLineEndOnMap: document.getElementById('pickStaticLineEndOnMap'),
    staticLayerLineStyle: document.getElementById('staticLayerLineStyle'),
    staticLayerLineColor: document.getElementById('staticLayerLineColor'),
    staticLayerLineFields: document.querySelector('[data-static-line-fields]'),
    staticLayerStartLat: document.getElementById('staticLayerStartLat'),
    staticLayerStartLon: document.getElementById('staticLayerStartLon'),
    staticLayerEndLat: document.getElementById('staticLayerEndLat'),
    staticLayerEndLon: document.getElementById('staticLayerEndLon'),
    pickStaticPositionOnMap: document.getElementById('pickStaticPositionOnMap'),
  coordinateSystem: document.getElementById('coordinateSystem'),
  manualDeviation: document.getElementById('manualDeviation'),
  settingsStatus: document.getElementById('settingsStatus'),
  displayScale: document.getElementById('displayScale'),
  displayScaleValue: document.getElementById('displayScaleValue'),
};

initialize();

function initialize() {
  bindEvents();
  setActiveSettingsButton(document.querySelector('[data-layer-target="basic"]'));
  updateSettingsFields();
  renderLayerToggles();
  renderMap();
  updateSelfInfoDisplay();
  setupDraggableWindows();
}

function setupDraggableWindows() {
  const saved = JSON.parse(localStorage.getItem(WINDOWS_STORAGE_KEY) || '{}');

  Object.entries(saved)
    .filter(([, config]) => config.custom)
    .forEach(([key, config]) => createCustomWindow(config.title, config.feature || 'be', key));

  Object.keys(defaultWindowsState).forEach((key) => {
    const windowEl = document.querySelector(`[data-window="${key}"]`);
    if (windowEl) setupDraggableWindow(windowEl, saved);
  });
  updateFeatureWindows();
}

function setupDraggableWindow(windowEl, saved = {}) {
  const key = windowEl.dataset.window;
  const defaultConfig = defaultWindowsState[key] || { x: 24, y: 24, draggable: true, visible: true };
  const config = { ...defaultConfig, ...(saved[key] || {}) };
  const feature = config.feature || windowEl.dataset.feature || 'be';
  windowEl.dataset.feature = feature;
  const header = windowEl.querySelector('.window-header');
  const toggle = windowEl.querySelector('.drag-toggle');

  windowEl.style.left = `${config.x ?? 12}px`;
  windowEl.style.top = `${config.y ?? 12}px`;
  windowEl.style.display = config.visible === false ? 'none' : '';
  updateWindowGeometry(windowEl);
  header.dataset.draggable = String(config.draggable !== false);
  toggle.checked = config.draggable !== false;

  const saveWindowState = () => {
    const windowStates = JSON.parse(localStorage.getItem(WINDOWS_STORAGE_KEY) || '{}');
    windowStates[key] = {
      ...(windowStates[key] || {}),
      x: Number.parseFloat(windowEl.style.left || '12'),
      y: Number.parseFloat(windowEl.style.top || '12'),
      draggable: toggle.checked,
      visible: windowEl.style.display !== 'none',
    };
    localStorage.setItem(WINDOWS_STORAGE_KEY, JSON.stringify(windowStates));
  };

  header.addEventListener('pointerdown', (event) => {
    if (!toggle.checked || event.target.closest('.window-controls')) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = Number.parseFloat(windowEl.style.left || '12');
    const startTop = Number.parseFloat(windowEl.style.top || '12');

    windowEl.dataset.dragging = 'true';
    header.dataset.draggable = 'true';

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      windowEl.style.left = `${Math.max(0, startLeft + dx)}px`;
      windowEl.style.top = `${Math.max(0, startTop + dy)}px`;
      updateWindowGeometry(windowEl);
    };

    const onUp = () => {
      windowEl.removeAttribute('data-dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      saveWindowState();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  toggle.addEventListener('change', () => {
    header.dataset.draggable = String(toggle.checked);
    saveWindowState();
  });

  windowEl.querySelector('.window-close-btn').addEventListener('click', () => {
    windowEl.style.display = 'none';
    saveWindowState();
    renderWindowSettings();
  });

  bindFeatureWindow(windowEl);
}

function updateWindowGeometry(windowEl) {
  if (!windowEl || windowEl.style.display === 'none') return;
  const left = Number.parseFloat(windowEl.style.left || '12');
  const top = Number.parseFloat(windowEl.style.top || '12');
  const margin = 12;
  const availableWidth = Math.max(200, window.innerWidth - left - margin);
  const availableHeight = Math.max(80, window.innerHeight - top - margin);
  windowEl.style.width = `${Math.min(280, availableWidth)}px`;
  windowEl.style.maxHeight = `${availableHeight}px`;
  windowEl.style.setProperty('--window-available-width', `${availableWidth}px`);
  windowEl.style.setProperty('--window-available-height', `${availableHeight}px`);
}

function createCustomWindow(title, feature, key = `custom-${Date.now()}`) {
  if (document.querySelector(`[data-window="${key}"]`)) return;

  const windowEl = document.createElement('div');
  windowEl.className = 'draggable-window';
  windowEl.dataset.window = key;
  windowEl.dataset.feature = feature;
  windowEl.innerHTML = `
    <div class="window-header">
      <span class="window-title"></span>
      <div class="window-controls">
        <label class="drag-toggle-label">
          <input type="checkbox" class="drag-toggle" checked />
          <span class="drag-icon">⋮⋮</span>
        </label>
        <button class="window-close-btn" type="button" aria-label="ウィンドウを閉じる">×</button>
      </div>
    </div>
    <div class="window-content" data-feature-content="${feature}"></div>
  `;
  windowEl.querySelector('.window-title').textContent = title;
  renderFeatureContent(windowEl, feature);
  document.querySelector('.floating-windows-container').appendChild(windowEl);

  const saved = JSON.parse(localStorage.getItem(WINDOWS_STORAGE_KEY) || '{}');
  const windowIndex = document.querySelectorAll('.draggable-window').length - 3;
  const column = Math.max(0, windowIndex % 3);
  const row = Math.floor(Math.max(0, windowIndex) / 3);
  saved[key] = saved[key] || { x: 240 + column * 230, y: 24 + row * 160, draggable: true, visible: true, custom: true, title, feature };
  localStorage.setItem(WINDOWS_STORAGE_KEY, JSON.stringify(saved));
  setupDraggableWindow(windowEl, saved);
  updateFeatureWindows();
  renderWindowSettings();
  return windowEl;
}

function renderFeatureContent(windowEl, feature) {
  const content = windowEl.querySelector('[data-feature-content]');
  if (!content) return;

  if (feature === 'layers') {
    content.innerHTML = '<div class="layer-controls"><label class="compact-toggle"><input type="checkbox" data-layer-toggle="basic" checked /><span>Base</span></label><label class="compact-toggle"><input type="checkbox" data-layer-toggle="static" checked /><span>Static</span></label><label class="compact-toggle"><input type="checkbox" data-layer-toggle="dynamic" checked /><span>Dynamic</span></label></div>';
    return;
  }
  if (feature === 'hook') {
    content.innerHTML = '<button type="button" class="compact-btn" data-hook-start>フック</button><div class="feature-value"><span class="info-label">自機Hook</span> <strong data-feature-value="hook-name">--</strong></div><div class="feature-value"><strong data-feature-value="hook-bearing">---°</strong> / <strong data-feature-value="hook-distance">--nm</strong></div>';
    return;
  }
  if (feature === 'hook2') {
    content.innerHTML = '<button type="button" class="compact-btn" data-hook2-start>2点を選択</button><div class="feature-value"><span data-hook2-names>始点: -- / 終点: --</span></div><div class="feature-value"><span class="info-label">始点→終点</span> <strong data-hook2-bearing>---°</strong> / <strong data-hook2-distance>--nm</strong></div>';
    return;
  }
  if (feature === 'dynamicList') {
    content.innerHTML = '<div class="dynamic-list" data-dynamic-list></div>';
    renderDynamicListWindow(windowEl);
    return;
  }
  const labels = { be: 'B/E', track: 'Track', gs: 'GS', tos: 'TOS' };
  content.innerHTML = `<div class="feature-value"><span class="info-label">${labels[feature] || feature}</span> <strong data-feature-value="${feature}">--</strong></div>`;
}

function bindFeatureWindow(windowEl) {
  const feature = windowEl.dataset.feature;
  windowEl.querySelectorAll('[data-layer-toggle]').forEach((toggle) => {
    const layer = toggle.dataset.layerToggle;
    toggle.checked = state[`${layer}Visible`];
    toggle.addEventListener('change', () => {
      state[`${layer}Visible`] = toggle.checked;
      saveState();
      renderMap();
    });
  });
  windowEl.querySelector('[data-hook-start]')?.addEventListener('click', () => {
    const wasActive = hookMode === 'hook' && activeHookWindowKey === windowEl.dataset.window;
    activeHookWindowKey = windowEl.dataset.window;
    hookMode = wasActive ? false : 'hook';
    elements.svg.toggleAttribute('data-hook-selecting', hookMode === 'hook');
    setSettingsStatus('フック対象を選択: オブジェクトをタップしてください');
  });
  if (feature === 'hook2') {
    windowEl.querySelector('[data-hook2-start]')?.addEventListener('click', () => {
      hook2Targets = [];
      hookMode = 'hook2';
      elements.svg.setAttribute('data-hook-selecting', '');
      updateFeatureWindows();
      setSettingsStatus('2点HOOK: MAP上の地点を2点タップしてください');
    });
  }
  if (feature === 'dynamicList') {
    renderDynamicListWindow(windowEl);
  }
}

function renderDynamicListWindow(windowEl) {
  const list = windowEl.querySelector('[data-dynamic-list]');
  if (!list) return;
  list.innerHTML = '';

  state.dynamic.forEach((item) => {
    const coordinates = getItemGeoCoordinates(item);
    const position = geoToBullseyeOffset(coordinates.lat, coordinates.lon);
    const row = document.createElement('div');
    row.className = 'dynamic-list-item';
    row.innerHTML = `
      <div class="dynamic-list-heading"><strong></strong><label>状態<select data-dynamic-status>${DYNAMIC_STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('')}</select></label></div>
      <div class="dynamic-list-grid">
        <label>方位<input data-dynamic-bearing type="number" min="0" max="359.9" step="0.1" value="${position.bearing.toFixed(1)}" /></label>
        <label>距離<input data-dynamic-distance type="number" min="0" step="0.1" value="${position.distance.toFixed(1)}" /></label>
        <label>半径<span data-dynamic-radius></span></label>
        <label class="dynamic-display-toggle">表示<input data-dynamic-visible type="checkbox" /></label>
      </div>`;
    row.querySelector('strong').textContent = item.name;
    const visibleToggle = row.querySelector('[data-dynamic-visible]');
    visibleToggle.checked = item.visible !== false;
    row.querySelector('[data-dynamic-radius]').textContent = `${Number(item.geometryRadius || 0)}nm`;
    row.querySelector('[data-dynamic-status]').value = item.status || 'ASLEEP';

    const savePosition = () => {
      const bearing = clampNumber(Number(row.querySelector('[data-dynamic-bearing]').value), 0, 359.9, 0);
      const distance = Math.max(0, Number(row.querySelector('[data-dynamic-distance]').value) || 0);
      const geo = bullseyeOffsetToGeo(bearing, distance);
      const mapPosition = geoToMapPosition(geo.lat, geo.lon);
      item.lat = geo.lat;
      item.lon = geo.lon;
      item.x = mapPosition.x;
      item.y = mapPosition.y;
      saveState();
      renderMap();
    };
    row.querySelector('[data-dynamic-bearing]').addEventListener('change', savePosition);
    row.querySelector('[data-dynamic-distance]').addEventListener('change', savePosition);
    visibleToggle.addEventListener('change', (event) => {
      item.visible = event.target.checked;
      saveState();
      renderMap();
    });
    row.querySelector('[data-dynamic-status]').addEventListener('change', (event) => {
      item.status = event.target.value;
      saveState();
    });
    list.appendChild(row);
  });
}

function updateFeatureWindows() {
  document.querySelectorAll('.draggable-window').forEach((windowEl) => {
    const feature = windowEl.dataset.feature;
    if (feature === 'hook') {
      const targetData = windowEl.dataset.window === 'hook'
        ? hookTarget
        : hookWindowTargets.get(windowEl.dataset.window);
      const target = windowEl.querySelector('[data-feature-value="hook-name"]');
      if (target) target.textContent = targetData?.name || '--';
      const bearing = windowEl.querySelector('[data-feature-value="hook-bearing"]');
      const distance = windowEl.querySelector('[data-feature-value="hook-distance"]');
      if (bearing) bearing.textContent = targetData ? `${formatBearing(calculateBearing(state.self, targetData, state.settings.manualDeviation || 0))}°` : '---°';
      if (distance) distance.textContent = targetData ? `${calculateDistance(state.self, targetData)}nm` : '--nm';
    }
    if (feature === 'be') {
      const bearing = windowEl.querySelector('[data-feature-value="be"]');
      const bullseye = getBullseyeMapPosition();
      if (bearing) bearing.textContent = `${formatBearing(calculateBearing(bullseye, state.self, state.settings.manualDeviation || 0))}° / ${calculateDistance(bullseye, state.self)}nm`;
    }
    if (feature === 'track') windowEl.querySelector('[data-feature-value="track"]')?.replaceChildren(`${Math.round(state.self.heading || 0).toString().padStart(3, '0')}°M`);
    if (feature === 'gs') windowEl.querySelector('[data-feature-value="gs"]')?.replaceChildren(`${Math.round(state.self.speed || 0)}kt`);
    if (feature === 'tos') {
      const value = windowEl.querySelector('[data-feature-value="tos"]');
      if (value) value.textContent = getTimeOnStation();
    }
    if (feature === 'hook2') {
      const [first, second] = hook2Targets;
      const names = windowEl.querySelector('[data-hook2-names]');
      if (names) names.textContent = `始点: ${first?.name || '--'} / 終点: ${second?.name || '--'}`;
      const bearing = windowEl.querySelector('[data-hook2-bearing]');
      const distance = windowEl.querySelector('[data-hook2-distance]');
      if (bearing) bearing.textContent = first && second ? `${formatBearing(calculateBearing(first, second, state.settings.manualDeviation || 0))}°` : '---°';
      if (distance) distance.textContent = first && second ? `${calculateDistance(first, second)}nm` : '--nm';
    }
    if (feature === 'dynamicList') renderDynamicListWindow(windowEl);
  });
}

function getTimeOnStation() {
  if (!hookTarget || !(state.self.speed > 0)) return '--:--:--';
  const hours = calculateDistance(state.self, hookTarget) / state.self.speed;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toLocaleTimeString('ja-JP', { hour12: false });
}

function showWindowSettings() {
  hideSettingsPanels();
  elements.windowSettingsPanel.classList.remove('hidden');
  renderWindowSettings();
  setSettingsStatus('ウィンドウ設定を表示中');
}

function hideSettingsPanels() {
  elements.basicLayerPanel.classList.add('hidden');
  elements.staticLayerPanel.classList.add('hidden');
  elements.windowSettingsPanel.classList.add('hidden');
}

function setActiveSettingsButton(button) {
  document.querySelectorAll('.settings-buttons button').forEach((entry) => {
    entry.classList.toggle('active', entry === button);
  });
}

function renderWindowSettings() {
  if (!elements.windowSettingsList) return;
  elements.windowSettingsList.innerHTML = '';

  document.querySelectorAll('.draggable-window').forEach((windowEl) => {
    const row = document.createElement('div');
    row.className = 'layer-item';
    const title = windowEl.querySelector('.window-title')?.textContent || windowEl.dataset.window;
    const feature = WINDOW_FEATURE_LABELS[windowEl.dataset.feature] || windowEl.dataset.feature;
    const visible = windowEl.style.display !== 'none';
    const isCustom = windowEl.dataset.window.startsWith('custom-');
    row.innerHTML = `
      <div class="layer-item-main"><strong></strong><span>${feature} / ${visible ? '表示中' : '非表示'}</span></div>
      <label class="mini-toggle"><input type="checkbox" ${visible ? 'checked' : ''} /> 表示</label>
      ${isCustom ? '<button type="button" class="danger-btn small-btn" data-window-delete>削除</button>' : ''}
    `;
    row.querySelector('strong').textContent = title;
    row.querySelector('input').addEventListener('change', (event) => {
      windowEl.style.display = event.target.checked ? '' : 'none';
      const saved = JSON.parse(localStorage.getItem(WINDOWS_STORAGE_KEY) || '{}');
      saved[windowEl.dataset.window] = {
        ...(saved[windowEl.dataset.window] || {}),
        visible: event.target.checked,
      };
      localStorage.setItem(WINDOWS_STORAGE_KEY, JSON.stringify(saved));
      renderWindowSettings();
    });
    if (isCustom) {
      row.querySelector('[data-window-delete]').addEventListener('click', () => {
        const saved = JSON.parse(localStorage.getItem(WINDOWS_STORAGE_KEY) || '{}');
        delete saved[windowEl.dataset.window];
        localStorage.setItem(WINDOWS_STORAGE_KEY, JSON.stringify(saved));
        windowEl.remove();
        renderWindowSettings();
        setSettingsStatus(`${title} ウィンドウを削除しました`);
      });
    }
    elements.windowSettingsList.appendChild(row);
  });
}

function bindEvents() {
  elements.settingsButton.addEventListener('click', () => toggleSettings(true));
  elements.closeSettings.addEventListener('click', () => toggleSettings(false));
  elements.saveInitialStateButton.addEventListener('click', saveCurrentAsInitialState);
  elements.exportPresetButton.addEventListener('click', exportCurrentPreset);
  elements.importPresetButton.addEventListener('click', () => elements.presetFileInput.click());
  elements.presetFileInput.addEventListener('change', importPresetFile);
  elements.resetAppButton.addEventListener('click', resetAppState);
  elements.settingsModal.addEventListener('click', (event) => {
    if (event.target === elements.settingsModal) toggleSettings(false);
  });

  document.querySelector('[data-window-settings]').addEventListener('click', (event) => {
    setActiveSettingsButton(event.currentTarget);
    showWindowSettings();
  });
  elements.addWindowButton.addEventListener('click', () => {
    const title = elements.windowNameInput.value.trim() || WINDOW_FEATURE_LABELS[elements.windowFeatureSelect.value];
    createCustomWindow(title, elements.windowFeatureSelect.value);
    elements.windowNameInput.value = '';
    setSettingsStatus(`${title} ウィンドウを追加しました`);
  });

  elements.hookButton.addEventListener('click', () => {
    activeHookWindowKey = 'hook';
    hookMode = 'hook';
    if (hookMode) {
      elements.hookButton.style.background = 'rgba(167, 139, 250, 0.3)';
      setSettingsStatus('フック対象を選択: オブジェクトをタップしてください');
    } else {
      elements.hookButton.style.background = '';
      setSettingsStatus('フック設定をキャンセルしました');
    }
  });

  elements.mapCenterLat.addEventListener('change', () => {
    state.settings.mapCenter.lat = parseDdmmm(elements.mapCenterLat.value, 'lat', state.settings.mapCenter.lat);
    syncSelfToMapCenterIfNoGps();
    saveState();
    updateSettingsFields();
    renderMap();
    setSettingsStatus('初期マップ中心の緯度を更新しました');
  });

  elements.mapCenterLon.addEventListener('change', () => {
    state.settings.mapCenter.lon = parseDdmmm(elements.mapCenterLon.value, 'lon', state.settings.mapCenter.lon);
    syncSelfToMapCenterIfNoGps();
    saveState();
    updateSettingsFields();
    renderMap();
    setSettingsStatus('初期マップ中心の経度を更新しました');
  });

  elements.bullseyeLat.addEventListener('change', () => {
    state.settings.bullseye.lat = parseDdmmm(elements.bullseyeLat.value, 'lat', state.settings.bullseye.lat);
    saveState();
    updateSettingsFields();
    renderMap();
  });

  elements.bullseyeLon.addEventListener('change', () => {
    state.settings.bullseye.lon = parseDdmmm(elements.bullseyeLon.value, 'lon', state.settings.bullseye.lon);
    saveState();
    updateSettingsFields();
    renderMap();
  });

  elements.pickBullseyeOnMap.addEventListener('click', () => startMapPick('bullseye'));
  elements.pickMapCenterOnMap.addEventListener('click', () => startMapPick('mapCenter'));

  elements.coordinateSystem.addEventListener('change', () => {
    state.settings.coordSystem = elements.coordinateSystem.value;
    saveState();
    renderStaticLayerSettings();
    renderMap();
    setSettingsStatus('座標系を更新しました');
  });

  document.querySelectorAll('input[name="deviationMode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      state.settings.deviationMode = radio.value;
      updateDeviationControls();
      saveState();
      setSettingsStatus(`偏差設定を ${radio.value === 'auto' ? '自動取得' : '手動入力'} に切り替えました`);
    });
  });

  elements.manualDeviation.addEventListener('change', () => {
    state.settings.manualDeviation = Number(elements.manualDeviation.value || 0);
    saveState();
    setSettingsStatus('手動偏差値を更新しました');
  });

  elements.displayScale.addEventListener('input', () => {
    state.settings.displayScale = clampNumber(Number(elements.displayScale.value), 10, 200, 100);
    updateSettingsFields();
    saveState();
    renderMap();
  });

  document.querySelectorAll('[data-layer-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const layer = button.dataset.layerTarget;
        setActiveSettingsButton(button);
        hideSettingsPanels();
      if (layer === 'basic') {
        showBasicLayerPanel();
      } else if (layer === 'static') {
        showStaticLayerPanel();
      } else if (layer === 'dynamic') {
        showDynamicLayerPanel();
      } else {
        setSettingsStatus(`${LAYER_LABELS[layer]}設定は後続実装予定です`);
      }
    });
  });

  elements.basicLayerVisibleToggle.addEventListener('change', () => {
    state.basicVisible = elements.basicLayerVisibleToggle.checked;
    elements.toggleBasic.checked = state.basicVisible;
    saveState();
    renderMap();
  });

  elements.basicLayerFilter.addEventListener('change', renderBasicLayerSettings);
  elements.addBasicAirspace.addEventListener('click', () => openBasicLayerEditor());
  elements.importBasicGeoJson.addEventListener('click', () => elements.basicGeoJsonFile.click());
  elements.basicGeoJsonFile.addEventListener('change', handleBasicGeoJsonImport);
  elements.clearBasicGeoJson.addEventListener('click', clearBasicGeoJson);
  elements.limitBasicDisplayRange.addEventListener('click', startBasicDisplayRangeSelection);
  elements.cancelBasicLayerForm.addEventListener('click', () => hideBasicLayerEditor());
  elements.basicLayerForm.addEventListener('submit', handleBasicLayerSubmit);

  elements.staticLayerVisibleToggle.addEventListener('change', () => {
    const visible = elements.staticLayerVisibleToggle.checked;
    state[`${managedLayer}Visible`] = visible;
    elements[`toggle${managedLayer === 'static' ? 'Static' : 'Dynamic'}`].checked = visible;
    saveState();
    renderMap();
  });
  elements.staticLayerFilter.addEventListener('change', renderStaticLayerSettings);
  elements.staticLayerCoordSystem.addEventListener('change', updateStaticCoordinateFields);
  elements.staticLayerType.addEventListener('change', updateStaticCoordinateFields);
  elements.staticLayerType.addEventListener('change', updateStaticCoordinateFields);
  elements.pickStaticPositionOnMap.addEventListener('click', () => startMapPick('static'));
  elements.pickStaticLineStartOnMap.addEventListener('click', () => startMapPick('staticLineStart'));
  elements.pickStaticLineEndOnMap.addEventListener('click', () => startMapPick('staticLineEnd'));
  elements.addStaticObject.addEventListener('click', () => openStaticLayerEditor());
  elements.cancelStaticLayerForm.addEventListener('click', hideStaticLayerEditor);
  elements.staticLayerForm.addEventListener('submit', handleStaticLayerSubmit);

  elements.toggleBasic.addEventListener('change', () => {
    state.basicVisible = elements.toggleBasic.checked;
    renderMap();
    saveState();
  });

  elements.toggleStatic.addEventListener('change', () => {
    state.staticVisible = elements.toggleStatic.checked;
    elements.staticLayerVisibleToggle.checked = state.staticVisible;
    renderMap();
    saveState();
  });

  elements.toggleDynamic.addEventListener('change', () => {
    state.dynamicVisible = elements.toggleDynamic.checked;
    renderMap();
    saveState();
  });

  setupMapInteraction();
  window.addEventListener('resize', () => {
    document.querySelectorAll('.draggable-window').forEach(updateWindowGeometry);
    updateScaleBar();
  });
  updateScaleBar();
}

function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  const fallbackSettings = { ...defaultSettings };
  const loadedSettings = saved && saved.settings ? { ...fallbackSettings, ...saved.settings } : fallbackSettings;

  const savedDisplayScale = saved && saved.settings ? Number(saved.settings.displayScale) : NaN;
  const savedSymbolScaleBase = saved && saved.settings ? Number(saved.settings.symbolScaleBase) : NaN;
  const symbolScaleBase = Number.isFinite(savedSymbolScaleBase)
    ? clampNumber(savedSymbolScaleBase, 0.1, 2, 1)
    : clampNumber(savedDisplayScale / 100, 0.1, 2, 1);
  const initialState = {
    ...sampleState,
    ...saved,
    basic: saved && saved.basic ? saved.basic : sampleState.basic,
    static: saved && saved.static ? saved.static : sampleState.static,
    dynamic: saved && saved.dynamic ? saved.dynamic : sampleState.dynamic,
    self: { ...sampleState.self, ...(saved && saved.self ? saved.self : {}) },
    basicVisible: saved ? saved.basicVisible !== undefined ? saved.basicVisible : true : true,
    staticVisible: saved ? saved.staticVisible !== undefined ? saved.staticVisible : true : true,
    dynamicVisible: saved ? saved.dynamicVisible !== undefined ? saved.dynamicVisible : true : true,
    settings: {
      ...fallbackSettings,
      ...(saved && saved.settings ? saved.settings : {}),
      displayScale: 100,
      symbolScaleBase,
      mapCenter: {
        lat: Number.isFinite(saved && saved.settings && saved.settings.mapCenter && saved.settings.mapCenter.lat) ? saved.settings.mapCenter.lat : fallbackSettings.mapCenter.lat,
        lon: Number.isFinite(saved && saved.settings && saved.settings.mapCenter && saved.settings.mapCenter.lon) ? saved.settings.mapCenter.lon : fallbackSettings.mapCenter.lon,
      },
      bullseye: {
        lat: Number.isFinite(saved && saved.settings && saved.settings.bullseye && saved.settings.bullseye.lat) ? saved.settings.bullseye.lat : fallbackSettings.bullseye.lat,
        lon: Number.isFinite(saved && saved.settings && saved.settings.bullseye && saved.settings.bullseye.lon) ? saved.settings.bullseye.lon : fallbackSettings.bullseye.lon,
      },
    },
  };

  if (!Number.isFinite(initialState.self.x) || !Number.isFinite(initialState.self.y)) {
    initialState.self.x = 50;
    initialState.self.y = 50;
  }

  if (!Number.isFinite(initialState.self.heading)) {
    initialState.self.heading = 0;
  }

  if (!Number.isFinite(initialState.self.speed)) {
    initialState.self.speed = 0;
  }

  initialState.static = initialState.static.map((item) => {
    const next = { ...item };
    if (!(Number.isFinite(next.lat) && Number.isFinite(next.lon)) && Number.isFinite(next.x) && Number.isFinite(next.y)) {
      const coordinates = legacyMapPositionToGeo(initialState.settings.mapCenter, next.x, next.y);
      next.lat = coordinates.lat;
      next.lon = coordinates.lon;
    }
    ['start', 'end'].forEach((key) => {
      const point = next[key];
      if (!point || (Number.isFinite(point.lat) && Number.isFinite(point.lon))) return;
      if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
        next[key] = legacyMapPositionToGeo(initialState.settings.mapCenter, point.x, point.y);
      }
    });
    return next;
  });

  if (initialState.self.gpsAvailable !== true) {
    initialState.self.gpsAvailable = false;
    initialState.self.lat = initialState.settings.mapCenter.lat;
    initialState.self.lon = initialState.settings.mapCenter.lon;
    initialState.self.x = 50;
    initialState.self.y = 50;
  }

  return initialState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureInitialStateSnapshot() {
  if (localStorage.getItem(INITIAL_STATE_STORAGE_KEY)) return;
  localStorage.setItem(INITIAL_STATE_STORAGE_KEY, JSON.stringify({
    state: JSON.parse(JSON.stringify(state)),
    windows: JSON.parse(localStorage.getItem(WINDOWS_STORAGE_KEY) || '{}'),
    view: loadSavedView(),
  }));
}

function loadSavedView() {
  const savedView = JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) || 'null');
  const initialSnapshot = JSON.parse(localStorage.getItem(INITIAL_STATE_STORAGE_KEY) || 'null');
  const saved = savedView || initialSnapshot?.view;
  return {
    scale: clampNumber(Number(saved?.scale), 0.25, MAP_MAX_SCALE, 1),
    panX: Number.isFinite(saved?.panX) ? saved.panX : 0,
    panY: Number.isFinite(saved?.panY) ? saved.panY : 0,
  };
}

function saveCurrentAsInitialState(showStatus = true) {
  saveState();
  const view = {
    scale: mapInteraction.scale,
    panX: mapInteraction.panX,
    panY: mapInteraction.panY,
  };
  localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view));
  localStorage.setItem(INITIAL_STATE_STORAGE_KEY, JSON.stringify({
    state: JSON.parse(JSON.stringify(state)),
    windows: JSON.parse(localStorage.getItem(WINDOWS_STORAGE_KEY) || '{}'),
    view,
  }));
  if (showStatus) setSettingsStatus('現在の状態を初期値として保存しました');
}

function exportCurrentPreset() {
  const preset = {
    version: 1,
    exportedAt: new Date().toISOString(),
    state: JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(state)),
    windows: JSON.parse(localStorage.getItem(WINDOWS_STORAGE_KEY) || '{}'),
    view: {
      scale: mapInteraction.scale,
      panX: mapInteraction.panX,
      panY: mapInteraction.panY,
    },
    initialState: JSON.parse(localStorage.getItem(INITIAL_STATE_STORAGE_KEY) || 'null'),
  };
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'TacView02-current-preset.json';
  link.click();
  URL.revokeObjectURL(link.href);
  setSettingsStatus('現在状態をプリセットJSONとして保存しました');
}

async function importPresetFile(event) {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;

  try {
    const preset = JSON.parse(await file.text());
    if (!preset || typeof preset !== 'object' || !preset.state || !preset.state.settings) {
      throw new Error('TacView02のプリセット形式ではありません');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preset.state));
    localStorage.setItem(WINDOWS_STORAGE_KEY, JSON.stringify(preset.windows || {}));
    if (preset.view) localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(preset.view));
    if (preset.initialState) localStorage.setItem(INITIAL_STATE_STORAGE_KEY, JSON.stringify(preset.initialState));
    window.location.reload();
  } catch (error) {
    setSettingsStatus(`プリセットを読み込めませんでした: ${error.message}`);
  }
}

function legacyMapPositionToGeo(center, x, y) {
  return {
    lat: center.lat + ((50 - y) / 100) * MAP_VIEW_SPAN.lat,
    lon: center.lon + ((x - 50) / 100) * MAP_VIEW_SPAN.lon,
  };
}

function syncSelfToMapCenterIfNoGps() {
  if (state.self.gpsAvailable === true) return;
  state.self.lat = state.settings.mapCenter.lat;
  state.self.lon = state.settings.mapCenter.lon;
  state.self.x = 50;
  state.self.y = 50;
}

function renderLayerToggles() {
  elements.toggleBasic.checked = state.basicVisible;
  elements.toggleStatic.checked = state.staticVisible;
  elements.toggleDynamic.checked = state.dynamicVisible;
  elements.basicLayerVisibleToggle.checked = state.basicVisible;
  elements.staticLayerVisibleToggle.checked = state.staticVisible;
}

function showBasicLayerPanel() {
  elements.basicLayerPanel.classList.remove('hidden');
  renderBasicLayerSettings();
  setSettingsStatus('基本レイヤー設定を表示中');
}

function showStaticLayerPanel() {
  managedLayer = 'static';
  document.getElementById('managedLayerTitle').textContent = '静的レイヤー管理';
  elements.staticLayerPanel.classList.remove('hidden');
  renderStaticLayerSettings();
  setSettingsStatus('静的レイヤー設定を表示中');
}

function showDynamicLayerPanel() {
  managedLayer = 'dynamic';
  document.getElementById('managedLayerTitle').textContent = '動的レイヤー管理';
  elements.staticLayerPanel.classList.remove('hidden');
  elements.staticLayerVisibleToggle.checked = state.dynamicVisible;
  renderStaticLayerSettings();
  setSettingsStatus('動的レイヤー設定を表示中');
}

function hideStaticLayerEditor() {
  elements.staticLayerForm.reset();
  elements.staticLayerId.value = '';
  elements.staticLayerForm.classList.add('hidden');
}

function renderStaticLayerSettings() {
  const filter = elements.staticLayerFilter.value;
  const items = state[managedLayer].filter((item) => filter === 'all' || item.type === filter);
  elements.staticLayerList.innerHTML = '';

  if (!items.length) {
    elements.staticLayerList.innerHTML = '<div class="layer-item"><span>静的オブジェクトがありません</span></div>';
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'layer-item';
    row.innerHTML = `
      <div class="layer-item-main">
        <div><strong></strong><span>${getObjectTypeLabel(item.type)} / ${formatCoordinatePair(getStaticItemCoordinates(item).lat, getStaticItemCoordinates(item).lon, elements.coordinateSystem.value)}</span></div>
      </div>
      <input type="checkbox" data-static-visible-toggle="${item.id}" ${item.visible !== false ? 'checked' : ''} aria-label="${item.name}を表示" />
      <div class="layer-item-actions">
        <button type="button" data-static-edit="${item.id}" class="secondary-btn small-btn">編集</button>
        <button type="button" data-static-delete="${item.id}" class="danger-btn small-btn">削除</button>
      </div>`;
    row.querySelector('strong').textContent = item.name;
    elements.staticLayerList.appendChild(row);
  });

  elements.staticLayerList.querySelectorAll('[data-static-edit]').forEach((button) => {
    button.addEventListener('click', () => openStaticLayerEditor(state[managedLayer].find((item) => item.id === button.dataset.staticEdit)));
  });
  elements.staticLayerList.querySelectorAll('[data-static-visible-toggle]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const item = state[managedLayer].find((entry) => entry.id === event.target.dataset.staticVisibleToggle);
      if (!item) return;
      item.visible = event.target.checked;
      saveState();
      renderMap();
    });
  });
  elements.staticLayerList.querySelectorAll('[data-static-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = state[managedLayer].findIndex((item) => item.id === button.dataset.staticDelete);
      if (index < 0) return;
      state[managedLayer].splice(index, 1);
      saveState();
      renderStaticLayerSettings();
      renderMap();
    });
  });
}

function openStaticLayerEditor(item) {
  elements.staticLayerForm.classList.remove('hidden');
  if (!item) {
    elements.staticLayerId.value = '';
    elements.staticLayerName.value = '';
    elements.staticLayerType.value = 'waypoint';
    elements.staticLayerCoordSystem.value = 'DDMM.MMM';
    elements.staticLayerLat.value = formatDdmmm(state.settings.mapCenter.lat, 'lat');
    elements.staticLayerLon.value = formatDdmmm(state.settings.mapCenter.lon, 'lon');
    elements.staticLayerSymbol.value = 'diamond';
    elements.staticLayerGeometryType.value = 'none';
    elements.staticLayerGeometryRadius.value = '0';
    elements.staticLayerGeometryStartBearing.value = '0';
    elements.staticLayerGeometryEndBearing.value = '90';
    elements.staticLayerBeBearing.value = '0';
    elements.staticLayerBeDistance.value = '0';
    elements.staticLayerStartLat.value = formatDdmmm(state.settings.mapCenter.lat, 'lat');
    elements.staticLayerStartLon.value = formatDdmmm(state.settings.mapCenter.lon, 'lon');
    elements.staticLayerEndLat.value = formatDdmmm(state.settings.mapCenter.lat, 'lat');
    elements.staticLayerEndLon.value = formatDdmmm(state.settings.mapCenter.lon + 1, 'lon');
    elements.staticLayerLineStyle.value = 'solid';
    elements.staticLayerLineColor.value = '#60a5fa';
    updateStaticCoordinateFields();
    return;
  }
  elements.staticLayerId.value = item.id;
  elements.staticLayerName.value = item.name || '';
  elements.staticLayerType.value = item.type || 'waypoint';
  const coordinates = getStaticItemCoordinates(item);
  elements.staticLayerCoordSystem.value = item.coordinateSystem || 'DDMM.MMM';
  elements.staticLayerLat.value = formatDdmmm(coordinates.lat, 'lat');
  elements.staticLayerLon.value = formatDdmmm(coordinates.lon, 'lon');
  const relative = geoToBullseyeOffset(coordinates.lat, coordinates.lon);
  elements.staticLayerBeBearing.value = relative.bearing.toFixed(1);
  elements.staticLayerBeDistance.value = relative.distance.toFixed(1);
  const start = item.start || coordinates;
  const end = item.end || coordinates;
  elements.staticLayerStartLat.value = formatDdmmm(start.lat, 'lat');
  elements.staticLayerStartLon.value = formatDdmmm(start.lon, 'lon');
  elements.staticLayerEndLat.value = formatDdmmm(end.lat, 'lat');
  elements.staticLayerEndLon.value = formatDdmmm(end.lon, 'lon');
  elements.staticLayerLineStyle.value = item.lineStyle || 'solid';
  elements.staticLayerLineColor.value = item.lineColor || '#60a5fa';
  elements.staticLayerSymbol.value = item.symbol || 'diamond';
  elements.staticLayerGeometryType.value = item.geometryType === 'ring' ? 'sector' : (item.geometryType || 'none');
  elements.staticLayerGeometryRadius.value = item.geometryRadius || 0;
  elements.staticLayerGeometryStartBearing.value = item.geometryStartBearing ?? item.geometryBearing ?? 0;
  elements.staticLayerGeometryEndBearing.value = item.geometryEndBearing ?? ((item.geometryBearing ?? 0) + 90) % 360;
  updateStaticCoordinateFields();
}

function handleStaticLayerSubmit(event) {
  event.preventDefault();
  const id = elements.staticLayerId.value || `static-${Date.now()}`;
  const isBe = elements.staticLayerCoordSystem.value === 'BE';
  const isLine = elements.staticLayerType.value === 'line';
  const relative = {
    bearing: clampNumber(Number(elements.staticLayerBeBearing.value), 0, 359.9, 0),
    distance: Math.max(0, Number(elements.staticLayerBeDistance.value) || 0),
  };
  const relativePosition = isBe ? bullseyeOffsetToGeo(relative.bearing, relative.distance) : null;
  const lat = isBe ? relativePosition.lat : parseDdmmm(elements.staticLayerLat.value, 'lat', state.settings.mapCenter.lat);
  const lon = isBe ? relativePosition.lon : parseDdmmm(elements.staticLayerLon.value, 'lon', state.settings.mapCenter.lon);
  if (!isBe) {
    elements.staticLayerLat.value = formatDdmmm(lat, 'lat');
    elements.staticLayerLon.value = formatDdmmm(lon, 'lon');
  }
  const position = geoToMapPosition(lat, lon);
  const start = isLine ? {
    lat: parseDdmmm(elements.staticLayerStartLat.value, 'lat', lat),
    lon: parseDdmmm(elements.staticLayerStartLon.value, 'lon', lon),
  } : null;
  const end = isLine ? {
    lat: parseDdmmm(elements.staticLayerEndLat.value, 'lat', lat),
    lon: parseDdmmm(elements.staticLayerEndLon.value, 'lon', lon),
  } : null;
  const existingItem = state[managedLayer].find((entry) => entry.id === id) || {};
  const item = {
    ...existingItem,
    id,
    type: elements.staticLayerType.value,
    name: elements.staticLayerName.value.trim() || '静的オブジェクト',
    x: position.x,
    y: position.y,
    lat,
    lon,
    coordinateSystem: elements.staticLayerCoordSystem.value,
    layer: managedLayer,
    symbol: elements.staticLayerSymbol.value,
    geometryType: elements.staticLayerGeometryType.value,
    geometryRadius: Math.max(0, Number(elements.staticLayerGeometryRadius.value) || 0),
    geometryStartBearing: clampNumber(Number(elements.staticLayerGeometryStartBearing.value), 0, 359.9, 0),
    geometryEndBearing: clampNumber(Number(elements.staticLayerGeometryEndBearing.value), 0, 359.9, 359.9),
    start,
    end,
    lineStyle: elements.staticLayerLineStyle.value,
    lineColor: elements.staticLayerLineColor.value,
  };
  const index = state[managedLayer].findIndex((entry) => entry.id === id);
  if (index >= 0) state[managedLayer][index] = item;
  else state[managedLayer].push(item);
  saveState();
  hideStaticLayerEditor();
  renderStaticLayerSettings();
  renderMap();
  setSettingsStatus(`${item.name} を保存しました`);
}

function getObjectTypeLabel(type) {
  return OBJECT_TYPE_LABELS[type] || OBJECT_TYPE_LABELS.waypoint;
}

function getItemGeoCoordinates(item) {
  if (Number.isFinite(item.lat) && Number.isFinite(item.lon)) {
    return { lat: item.lat, lon: item.lon };
  }
  return getStaticItemCoordinates(item);
}

function hideBasicLayerEditor() {
  elements.basicLayerForm.reset();
  elements.basicLayerId.value = '';
  elements.basicLayerForm.classList.add('hidden');
}

function renderBasicLayerSettings() {
  const filter = elements.basicLayerFilter.value;
  const items = state.basic.filter((item) => item.type === 'airspace' && (filter === 'all' || item.kind === filter));
  elements.basicLayerList.innerHTML = '';

  if (items.length === 0) {
    elements.basicLayerList.innerHTML = '<div class="layer-item"><span>空域がありません</span></div>';
    return;
  }

  const visibleItems = items.filter((item) => item.visible !== false);
  const hiddenItems = items.filter((item) => item.visible === false);
  const createSection = (title, sectionItems) => {
    const section = document.createElement('section');
    section.className = 'basic-layer-visibility-section';
    section.innerHTML = `<h4>${title} (${sectionItems.length})</h4>`;
    sectionItems.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'layer-item';
      row.innerHTML = `
        <div class="layer-item-main">
          <input type="checkbox" data-basic-visible-toggle="${item.id}" ${item.visible !== false ? 'checked' : ''} />
          <div>
            <strong></strong>
            <span></span>
          </div>
        </div>
        <div class="layer-item-actions">
          ${title === '表示中' ? `<button type="button" data-basic-edit="${item.id}" class="secondary-btn small-btn">編集</button>` : ''}
          <button type="button" data-basic-delete="${item.id}" class="danger-btn small-btn">削除</button>
        </div>
      `;
      row.querySelector('strong').textContent = item.displayName || item.name;
      row.querySelector('span').textContent = `${item.name} / ${item.label || item.name} / ${item.kind === 'controlled' ? 'CTR' : 'ATZ'}`;
      section.appendChild(row);
    });
    elements.basicLayerList.appendChild(section);
  };

  createSection('表示中', visibleItems);
  createSection('非表示', hiddenItems);

  elements.basicLayerList.querySelectorAll('[data-basic-visible-toggle]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const targetId = event.target.dataset.basicVisibleToggle;
      const airspace = state.basic.find((item) => item.id === targetId && item.type === 'airspace');
      if (!airspace) return;
      airspace.visible = event.target.checked;
      saveState();
      renderBasicLayerSettings();
      renderMap();
    });
  });

  elements.basicLayerList.querySelectorAll('[data-basic-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.basicEdit;
      const item = state.basic.find((entry) => entry.id === targetId && entry.type === 'airspace');
      if (!item) return;
      openBasicLayerEditor(item);
    });
  });

  elements.basicLayerList.querySelectorAll('[data-basic-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.basicDelete;
      const idx = state.basic.findIndex((entry) => entry.id === targetId && entry.type === 'airspace');
      if (idx >= 0) {
        state.basic.splice(idx, 1);
        saveState();
        renderBasicLayerSettings();
        renderMap();
      }
    });
  });
}

function openBasicLayerEditor(item) {
  elements.basicLayerForm.classList.remove('hidden');
  if (!item) {
    elements.basicLayerId.value = '';
    elements.basicLayerName.value = '';
    elements.basicLayerLabel.value = '';
    elements.basicLayerDisplayName.value = '';
    elements.basicLayerDisplayNameVisible.checked = true;
    elements.basicLayerKind.value = 'controlled';
    elements.basicLayerVisible.value = 'true';
    elements.basicLayerPoints.value = '20,18; 38,24; 53,17; 68,32;';
    return;
  }

  elements.basicLayerId.value = item.id;
  elements.basicLayerName.value = item.name || '';
  elements.basicLayerLabel.value = item.label || '';
  elements.basicLayerDisplayName.value = item.displayName || item.name || '';
  elements.basicLayerDisplayNameVisible.checked = item.displayNameVisible !== false;
  elements.basicLayerKind.value = item.kind || 'controlled';
  elements.basicLayerVisible.value = item.visible === false ? 'false' : 'true';
  const normalized = (item.points || []).map(([x, y]) => `${x},${y}`).join('; ');
  elements.basicLayerPoints.value = normalized;
}

function handleBasicLayerSubmit(event) {
  event.preventDefault();

  const id = elements.basicLayerId.value || `airspace-${Date.now()}`;
  const name = elements.basicLayerName.value.trim() || 'AIP空域';
  const label = elements.basicLayerLabel.value.trim() || (elements.basicLayerKind.value === 'controlled' ? 'CTR' : 'ATZ');
  const kind = elements.basicLayerKind.value;
  const visible = elements.basicLayerVisible.value === 'true';
  const pointsText = elements.basicLayerPoints.value.trim();
  const points = pointsText ? pointsText.split(';').map((segment) => {
    const [x, y] = segment.split(',').map((value) => Number(value.trim()));
    return [x, y];
  }).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) : [[20, 18], [40, 24], [60, 20], [70, 38], [52, 58], [28, 48]];

  const existingIndex = state.basic.findIndex((item) => item.id === id && item.type === 'airspace');
  const next = {
    id,
    type: 'airspace',
    name,
    displayName: elements.basicLayerDisplayName.value.trim() || name,
    displayNameVisible: elements.basicLayerDisplayNameVisible.checked,
    kind,
    label,
    visible,
    fill: kind === 'controlled' ? 'rgba(96, 165, 250, 0.08)' : 'rgba(52, 211, 153, 0.09)',
    points,
  };

  if (existingIndex >= 0) {
    state.basic[existingIndex] = next;
  } else {
    state.basic.push(next);
  }

  hideBasicLayerEditor();
  saveState();
  renderBasicLayerSettings();
  renderMap();
}

async function handleBasicGeoJsonImport(event) {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;

  try {
    const geoJson = JSON.parse(await file.text());
    const features = geoJson.type === 'FeatureCollection'
      ? geoJson.features
      : geoJson.type === 'Feature' ? [geoJson] : [];
    const imported = features.flatMap((feature, featureIndex) => geoJsonFeatureToBasicItems(feature, featureIndex));
    if (!imported.length) throw new Error('PolygonまたはMultiPolygonが見つかりません');

    state.basic = state.basic.filter((item) => item.source !== 'geojson');
    state.basic.push(...imported);
    saveState();
    renderBasicLayerSettings();
    renderMap();
    setSettingsStatus(`${file.name} から ${imported.length}件の空域を読み込みました`);
  } catch (error) {
    setSettingsStatus(`GeoJSONを読み込めませんでした: ${error.message}`);
  }
}

function clearBasicGeoJson() {
  const geoJsonCount = state.basic.filter((item) => item.source === 'geojson').length;
  if (!geoJsonCount) {
    setSettingsStatus('削除対象のGeoJSON空域はありません');
    return;
  }

  state.basic = state.basic.filter((item) => item.source !== 'geojson');
  saveState();
  renderBasicLayerSettings();
  renderMap();
  setSettingsStatus(`GeoJSON空域を${geoJsonCount}件削除しました`);
}

function geoJsonFeatureToBasicItems(feature, featureIndex) {
  const geometry = feature && feature.geometry;
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return [];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const properties = feature.properties || {};
  const name = String(properties.name || properties.title || `GeoJSON空域 ${featureIndex + 1}`);
  const label = name.length > 12 ? name.slice(0, 12) : name;
  const kind = properties.type === 1 || properties.kind === 'control-zone' ? 'control-zone' : 'controlled';

  return polygons.map((polygon, polygonIndex) => {
    const outerRing = Array.isArray(polygon) ? polygon[0] : [];
    const geoPoints = outerRing
      .filter((coordinate) => Array.isArray(coordinate) && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]))
      .map(([lon, lat]) => [lat, lon]);
    if (geoPoints.length < 3) return null;
    const points = geoPoints.map(([lat, lon]) => {
      const position = geoToMapPosition(lat, lon);
      return [position.x, position.y];
    });
    return {
      id: `geojson-${Date.now()}-${featureIndex}-${polygonIndex}`,
      type: 'airspace',
      name: polygons.length > 1 ? `${name}-${polygonIndex + 1}` : name,
      kind,
      label,
      visible: true,
      source: 'geojson',
      geoPoints,
      fill: kind === 'controlled' ? 'rgba(96, 165, 250, 0.08)' : 'rgba(52, 211, 153, 0.09)',
      points,
    };
  }).filter(Boolean);
}

function startBasicDisplayRangeSelection() {
  basicDisplayRangePoints = [];
  mapPickTarget = 'basicDisplayRange';
  mapPickReturnPanel = 'basic';
  toggleSettings(false);
  setSettingsStatus('MAP上で表示範囲の4点を順番にタップしてください（1/4）');
}

function applyBasicDisplayRange() {
  const range = basicDisplayRangePoints;
  state.basic.forEach((item) => {
    const points = getBasicGeometryPoints(item);
    item.visible = points.length > 0 && polygonsIntersect(range, points);
  });
  const visibleCount = state.basic.filter((item) => item.visible !== false).length;
  basicDisplayRangePoints = [];
  saveState();
  renderBasicLayerSettings();
  renderMap();
  setSettingsStatus(`表示範囲を適用しました（${visibleCount}件を表示）`);
}

function getBasicGeometryPoints(item) {
  if (item.type === 'airspace' || item.type === 'route') {
    return getBasicDisplayPoints(item);
  }
  if (Number.isFinite(item.x) && Number.isFinite(item.y)) return [[item.x, item.y]];
  return [];
}

function getBasicDisplayPoints(item) {
  if (Array.isArray(item.geoPoints) && item.geoPoints.length) {
    return item.geoPoints.map(([lat, lon]) => {
      const position = geoToMapPosition(lat, lon);
      return [position.x, position.y];
    }).filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
  }
  return (item.points || []).filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

function polygonsIntersect(firstPolygon, secondPolygon) {
  if (!firstPolygon.length || !secondPolygon.length) return false;
  if (firstPolygon.some((point) => pointInPolygon(point, secondPolygon))) return true;
  if (secondPolygon.some((point) => pointInPolygon(point, firstPolygon))) return true;

  const firstEdges = polygonEdges(firstPolygon);
  const secondEdges = polygonEdges(secondPolygon);
  return firstEdges.some(([firstStart, firstEnd]) => secondEdges.some(([secondStart, secondEnd]) => segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)));
}

function polygonEdges(points) {
  if (points.length < 2) return [];
  return points.map((point, index) => [point, points[(index + 1) % points.length]]);
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [x, y] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const crosses = (y > point[1]) !== (previousY > point[1])
      && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x;
    if (crosses) inside = !inside;
  }
  return inside || polygon.some((vertex, index) => pointOnSegment(point, vertex, polygon[(index + 1) % polygon.length]));
}

function pointOnSegment(point, start, end) {
  const cross = (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > 0.000001) return false;
  return point[0] >= Math.min(start[0], end[0]) - 0.000001
    && point[0] <= Math.max(start[0], end[0]) + 0.000001
    && point[1] >= Math.min(start[1], end[1]) - 0.000001
    && point[1] <= Math.max(start[1], end[1]) + 0.000001;
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);
  if (firstOrientation !== secondOrientation && thirdOrientation !== fourthOrientation) return true;
  return (firstOrientation === 0 && pointOnSegment(secondStart, firstStart, firstEnd))
    || (secondOrientation === 0 && pointOnSegment(secondEnd, firstStart, firstEnd))
    || (thirdOrientation === 0 && pointOnSegment(firstStart, secondStart, secondEnd))
    || (fourthOrientation === 0 && pointOnSegment(firstEnd, secondStart, secondEnd));
}

function orientation(first, second, third) {
  const value = (second[1] - first[1]) * (third[0] - second[0]) - (second[0] - first[0]) * (third[1] - second[1]);
  if (Math.abs(value) < 0.000001) return 0;
  return value > 0 ? 1 : 2;
}

function updateSettingsFields() {
  elements.bullseyeLat.value = formatDdmmm(state.settings.bullseye.lat, 'lat');
  elements.bullseyeLon.value = formatDdmmm(state.settings.bullseye.lon, 'lon');
  elements.mapCenterLat.value = formatDdmmm(state.settings.mapCenter.lat, 'lat');
  elements.mapCenterLon.value = formatDdmmm(state.settings.mapCenter.lon, 'lon');
  elements.coordinateSystem.value = state.settings.coordSystem || 'DDMM.MMM';
  const deviationMode = state.settings.deviationMode || 'auto';
  document.querySelector(`input[name="deviationMode"][value="${deviationMode}"]`).checked = true;
  elements.manualDeviation.value = String(state.settings.manualDeviation || 0);
  elements.manualDeviation.disabled = deviationMode !== 'manual';
  const displayScale = clampNumber(Number(state.settings.displayScale), 10, 200, 100);
  elements.displayScale.value = String(displayScale);
  elements.displayScaleValue.textContent = `${displayScale}%`;
}

function getDisplayScale() {
  const base = clampNumber(Number(state.settings.symbolScaleBase), 0.1, 2, 1);
  const relative = clampNumber(Number(state.settings.displayScale), 10, 200, 100) / 100;
  return clampNumber(base * relative, 0.1, 2, 1);
}

function getAdaptiveStrokeWidth(width) {
  return String(Number(width) * getDisplayScale() * getAnnotationScale());
}

function getAnnotationScale() {
  return Math.max(0.45, 1 / Math.sqrt(mapInteraction.scale));
}

function updateStaticCoordinateFields() {
  const isBe = elements.staticLayerCoordSystem.value === 'BE';
  const isLine = elements.staticLayerType.value === 'line';
  elements.staticLayerGeoFields.forEach((field) => field.classList.toggle('hidden', isBe));
  elements.staticLayerBeFields.classList.toggle('hidden', !isBe);
  elements.staticLayerLineFields.classList.toggle('hidden', !isLine);
}

function updateDeviationControls() {
  const mode = state.settings.deviationMode || 'auto';
  elements.manualDeviation.disabled = mode !== 'manual';
}

function formatDdmmm(value, axis) {
  const number = Number(value);
  if (!Number.isFinite(number)) return axis === 'lat' ? '3541.234' : '13941.234';

  const sign = number < 0 ? -1 : 1;
  const abs = Math.abs(number);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const padded = `${String(degrees).padStart(axis === 'lat' ? 2 : 3, '0')}${minutes.toFixed(3).padStart(6, '0')}`;

  return sign < 0 ? `-${padded}` : padded;
}

function formatDdmmss(value, axis) {
  const number = Number(value);
  if (!Number.isFinite(number)) return axis === 'lat' ? '000000N' : '0000000E';

  const absolute = Math.abs(number);
  const degrees = Math.floor(absolute);
  const totalSeconds = Math.round((absolute - degrees) * 3600 * 10) / 10;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const degreeWidth = axis === 'lat' ? 2 : 3;
  const secondText = seconds.toFixed(1).padStart(4, '0');
  const hemisphere = axis === 'lat'
    ? (number < 0 ? 'S' : 'N')
    : (number < 0 ? 'W' : 'E');
  return `${String(degrees).padStart(degreeWidth, '0')}${String(minutes).padStart(2, '0')}${secondText}${hemisphere}`;
}

const MGRS_COLUMN_SETS = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'];
const MGRS_ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUV';
const MGRS_BANDS = 'CDEFGHJKLMNPQRSTUVWX';
const GARS_LAT_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function latLonToUtm(lat, lon) {
  const radians = Math.PI / 180;
  let zone = Math.floor((lon + 180) / 6) + 1;
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) zone = 32;
  if (lat >= 72 && lat < 84) {
    if (lon < 9) zone = 31;
    else if (lon < 21) zone = 33;
    else if (lon < 33) zone = 35;
    else if (lon < 42) zone = 37;
  }

  const a = 6378137;
  const eccentricitySquared = 0.00669438;
  const eccentricityPrimeSquared = eccentricitySquared / (1 - eccentricitySquared);
  const k0 = 0.9996;
  const latitude = lat * radians;
  const longitude = lon * radians;
  const centralMeridian = ((zone - 1) * 6 - 180 + 3) * radians;
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const tanLatitude = Math.tan(latitude);
  const n = a / Math.sqrt(1 - eccentricitySquared * sinLatitude ** 2);
  const t = tanLatitude ** 2;
  const c = eccentricityPrimeSquared * cosLatitude ** 2;
  const aa = cosLatitude * (longitude - centralMeridian);
  const m = a * ((1 - eccentricitySquared / 4 - 3 * eccentricitySquared ** 2 / 64 - 5 * eccentricitySquared ** 3 / 256) * latitude
    - (3 * eccentricitySquared / 8 + 3 * eccentricitySquared ** 2 / 32 + 45 * eccentricitySquared ** 3 / 1024) * Math.sin(2 * latitude)
    + (15 * eccentricitySquared ** 2 / 256 + 45 * eccentricitySquared ** 3 / 1024) * Math.sin(4 * latitude)
    - (35 * eccentricitySquared ** 3 / 3072) * Math.sin(6 * latitude));
  const easting = k0 * n * (aa + (1 - t + c) * aa ** 3 / 6 + (5 - 18 * t + t ** 2 + 72 * c - 58 * eccentricityPrimeSquared) * aa ** 5 / 120) + 500000;
  let northing = k0 * (m + n * tanLatitude * (aa ** 2 / 2 + (5 - t + 9 * c + 4 * c ** 2) * aa ** 4 / 24 + (61 - 58 * t + t ** 2 + 600 * c - 330 * eccentricityPrimeSquared) * aa ** 6 / 720));
  if (lat < 0) northing += 10000000;
  return { zone, easting, northing };
}

function formatMgrs(lat, lon) {
  const utm = latLonToUtm(Number(lat), Number(lon));
  const bandIndex = Math.min(19, Math.max(0, Math.floor((Number(lat) + 80) / 8)));
  const band = MGRS_BANDS[bandIndex];
  const columnSet = MGRS_COLUMN_SETS[(utm.zone - 1) % 3];
  const eastingColumn = Math.max(1, Math.min(8, Math.floor(utm.easting / 100000)));
  const eastingLetter = columnSet[eastingColumn - 1];
  const rowOffset = (utm.zone % 2 === 0 ? 5 : 0);
  const northingRow = Math.floor(utm.northing / 100000) % 20;
  const northingLetter = MGRS_ROW_LETTERS[(northingRow + rowOffset) % 20];
  const eastingRemainder = Math.floor(utm.easting % 100000).toString().padStart(5, '0');
  const northingRemainder = Math.floor(utm.northing % 100000).toString().padStart(5, '0');
  return `${String(utm.zone).padStart(2, '0')}${band}${eastingLetter}${northingLetter}${eastingRemainder}${northingRemainder}`;
}

function formatGars(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  const column = Math.min(720, Math.max(1, Math.floor((longitude + 180) / 0.5) + 1));
  const bandIndex = Math.min(359, Math.max(0, Math.floor((latitude + 90) / 0.5)));
  const bandPair = `${GARS_LAT_LETTERS[Math.floor(bandIndex / 24)]}${GARS_LAT_LETTERS[bandIndex % 24]}`;
  const latOffset = (latitude + 90) % 0.5;
  const lonOffset = (longitude + 180) % 0.5;
  const north = latOffset >= 0.25;
  const east = lonOffset >= 0.25;
  const quadrant = north ? (east ? '2' : '1') : (east ? '4' : '3');
  const keypadColumn = Math.min(2, Math.floor((lonOffset % 0.25) / (1 / 120)));
  const keypadRow = Math.min(2, Math.floor((latOffset % 0.25) / (1 / 120)));
  const keypad = String((keypadRow * 3) + keypadColumn + 1);
  return `${String(column).padStart(3, '0')}${bandPair}${quadrant}${keypad}`;
}

function formatCoordinatePair(lat, lon, system = state.settings.coordSystem) {
  if (system === 'MGRS') return formatMgrs(lat, lon);
  if (system === 'GARS') return formatGars(lat, lon);
  if (system === 'DDMMSS') return `${formatDdmmss(lat, 'lat')} ${formatDdmmss(lon, 'lon')}`;
  return `${formatDdmmm(lat, 'lat')} ${formatDdmmm(lon, 'lon')}`;
}

function parseDdmmm(value, axis, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const sign = raw.startsWith('-') ? -1 : 1;
  const normalized = raw.replace(/[^0-9.]/g, '');
  if (!normalized) return fallback;

  const parts = normalized.split('.');

  const degreeSize = axis === 'lat' ? 2 : 3;
  const degreeText = parts[0].slice(0, degreeSize);
  const minuteWhole = parts[0].slice(degreeSize);
  const minuteText = parts.length < 2
    ? `${minuteWhole}.000`
    : `${minuteWhole}.${parts.slice(1).join('') || '0'}`;

  const degrees = Number(degreeText);
  const minutes = Number(minuteText);
  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || minutes >= 60) return fallback;

  const decimal = (degrees + minutes / 60) * sign;
  return Math.min(axis === 'lat' ? 90 : 180, Math.max(axis === 'lat' ? -90 : -180, decimal));
}

function geoToMapPosition(lat, lon) {
  const center = state.settings.mapCenter;
  const origin = projectLambert(center.lat, center.lon);
  const horizontalScale = Math.abs(projectLambert(center.lat, center.lon + MAP_VIEW_SPAN.lon / 2).x - origin.x) || 1;
  const verticalScale = horizontalScale * MAP_VERTICAL_ASPECT;
  const projected = projectLambert(lat, lon);
  return {
    x: clampNumber(50 + ((projected.x - origin.x) / horizontalScale) * 50, 0, 100, 50),
    y: clampNumber(50 - ((projected.y - origin.y) / verticalScale) * 50, 0, 100, 50),
  };
}

function getLambertConstants() {
  const semiMajorAxis = 6378137;
  const flattening = 1 / 298.257223563;
  const eccentricity = Math.sqrt(flattening * (2 - flattening));
  const radians = Math.PI / 180;
  const standardParallels = LCC_STANDARD_PARALLELS.map((value) => value * radians);
  const m = (latitude) => Math.cos(latitude) / Math.sqrt(1 - eccentricity ** 2 * Math.sin(latitude) ** 2);
  const t = (latitude) => Math.tan(Math.PI / 4 - latitude / 2)
    / ((1 - eccentricity * Math.sin(latitude)) / (1 + eccentricity * Math.sin(latitude))) ** (eccentricity / 2);
  const n = Math.log(m(standardParallels[0]) / m(standardParallels[1]))
    / Math.log(t(standardParallels[0]) / t(standardParallels[1]));
  const f = m(standardParallels[0]) / (n * t(standardParallels[0]) ** n);
  return { semiMajorAxis, eccentricity, n, f, t };
}

function projectLambert(latitude, longitude) {
  const center = state.settings.mapCenter;
  const constants = getLambertConstants();
  const radians = Math.PI / 180;
  const centralMeridian = center.lon * radians;
  const latitudeRadians = latitude * radians;
  const rho = constants.semiMajorAxis * constants.f * constants.t(latitudeRadians) ** constants.n;
  const originLatitude = center.lat * radians;
  const originRho = constants.semiMajorAxis * constants.f * constants.t(originLatitude) ** constants.n;
  const angle = constants.n * (longitude * radians - centralMeridian);
  return { x: rho * Math.sin(angle), y: originRho - rho * Math.cos(angle) };
}

function bullseyeOffsetToGeo(bearing, distance) {
  const origin = state.settings.bullseye;
  const radians = (bearing * Math.PI) / 180;
  const lat = origin.lat + (distance * Math.cos(radians)) / 60;
  const lon = origin.lon + (distance * Math.sin(radians)) / (60 * Math.cos((origin.lat * Math.PI) / 180));
  return { lat, lon };
}

function geoToBullseyeOffset(lat, lon) {
  const origin = state.settings.bullseye;
  const latDelta = (lat - origin.lat) * 60;
  const lonDelta = (lon - origin.lon) * 60 * Math.cos((origin.lat * Math.PI) / 180);
  const distance = Math.hypot(latDelta, lonDelta);
  const bearing = (Math.atan2(lonDelta, latDelta) * 180) / Math.PI + 360;
  return { bearing: bearing % 360, distance };
}

function getStaticItemCoordinates(item) {
  if (Number.isFinite(item.lat) && Number.isFinite(item.lon)) {
    return { lat: item.lat, lon: item.lon };
  }

  const center = state.settings.mapCenter;
  return {
    lat: center.lat + ((50 - (item.y ?? 50)) / 100) * MAP_VIEW_SPAN.lat,
    lon: center.lon + (((item.x ?? 50) - 50) / 100) * MAP_VIEW_SPAN.lon,
  };
}

function setSettingsStatus(message) {
  elements.settingsStatus.textContent = message;
}

function toggleSettings(open) {
  elements.settingsModal.classList.toggle('hidden', !open);
  elements.settingsModal.setAttribute('aria-hidden', String(!open));
}

function getGridIntervalMinutes(latitudeSpan, longitudeSpan) {
  const span = Math.max(latitudeSpan, longitudeSpan);
  if (span >= 12) return 60;
  if (span >= 6) return 30;
  if (span >= 2) return 15;
  if (span >= 0.75) return 5;
  return 1;
}

function formatGridCoordinate(value, axis) {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutes = Math.round((absolute - degrees) * 60);
  const normalizedDegrees = minutes >= 60 ? degrees + 1 : degrees;
  const normalizedMinutes = minutes >= 60 ? 0 : minutes;
  const hemisphere = axis === 'lat'
    ? (value < 0 ? 'S' : 'N')
    : (value < 0 ? 'W' : 'E');
  return `${String(normalizedDegrees).padStart(axis === 'lat' ? 2 : 3, '0')}°${String(normalizedMinutes).padStart(2, '0')}′${hemisphere}`;
}

function drawGeographicGrid(width, height) {
  const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const rect = elements.svg.getBoundingClientRect();
  const topLeft = screenPointToMapPosition(rect.left, rect.top);
  const bottomRight = screenPointToMapPosition(rect.right, rect.bottom);
  const topLeftGeo = mapPositionToGeo(topLeft.x, topLeft.y);
  const bottomRightGeo = mapPositionToGeo(bottomRight.x, bottomRight.y);
  const minLat = Math.min(topLeftGeo.lat, bottomRightGeo.lat);
  const maxLat = Math.max(topLeftGeo.lat, bottomRightGeo.lat);
  const minLon = Math.min(topLeftGeo.lon, bottomRightGeo.lon);
  const maxLon = Math.max(topLeftGeo.lon, bottomRightGeo.lon);
  const intervalMinutes = getGridIntervalMinutes(maxLat - minLat, maxLon - minLon);
  const interval = intervalMinutes / 60;
  const firstLat = Math.ceil(minLat / interval) * interval;
  const firstLon = Math.ceil(minLon / interval) * interval;

  for (let lat = firstLat; lat <= maxLat + interval / 2; lat += interval) {
    const position = geoToMapPosition(lat, state.settings.mapCenter.lon);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('x2', String(width));
    line.setAttribute('y1', String(position.y * 7));
    line.setAttribute('y2', String(position.y * 7));
    line.setAttribute('class', 'grid-line');
    grid.appendChild(line);

  }

  for (let lon = firstLon; lon <= maxLon + interval / 2; lon += interval) {
    const position = geoToMapPosition(state.settings.mapCenter.lat, lon);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(position.x * 10));
    line.setAttribute('x2', String(position.x * 10));
    line.setAttribute('y1', '0');
    line.setAttribute('y2', String(height));
    line.setAttribute('class', 'grid-line');
    grid.appendChild(line);

  }
  return grid;
}

function updateGridEdgeLabels(width, height) {
  let labels = document.getElementById('gridEdgeLabels');
  if (!labels) {
    labels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labels.setAttribute('id', 'gridEdgeLabels');
    labels.setAttribute('pointer-events', 'none');
    elements.svg.appendChild(labels);
  }
  labels.innerHTML = '';

  const rect = elements.svg.getBoundingClientRect();
  const topLeft = screenPointToMapPosition(rect.left, rect.top);
  const bottomRight = screenPointToMapPosition(rect.right, rect.bottom);
  const topLeftGeo = mapPositionToGeo(topLeft.x, topLeft.y);
  const bottomRightGeo = mapPositionToGeo(bottomRight.x, bottomRight.y);
  const minLat = Math.min(topLeftGeo.lat, bottomRightGeo.lat);
  const maxLat = Math.max(topLeftGeo.lat, bottomRightGeo.lat);
  const minLon = Math.min(topLeftGeo.lon, bottomRightGeo.lon);
  const maxLon = Math.max(topLeftGeo.lon, bottomRightGeo.lon);
  const interval = getGridIntervalMinutes(maxLat - minLat, maxLon - minLon) / 60;
  const firstLat = Math.ceil(minLat / interval) * interval;
  const firstLon = Math.ceil(minLon / interval) * interval;
  const scale = mapInteraction.scale;
  const offsetX = mapInteraction.panX;
  const offsetY = mapInteraction.panY;

  for (let lat = firstLat; lat <= maxLat + interval / 2; lat += interval) {
    const position = geoToMapPosition(lat, state.settings.mapCenter.lon);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '8');
    label.setAttribute('y', String(offsetY + position.y * 7 * scale - 4));
    label.setAttribute('class', 'grid-label');
    label.textContent = formatGridCoordinate(lat, 'lat');
    labels.appendChild(label);
  }

  for (let lon = firstLon; lon <= maxLon + interval / 2; lon += interval) {
    const position = geoToMapPosition(state.settings.mapCenter.lat, lon);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', String(offsetX + position.x * 10 * scale + 4));
    label.setAttribute('y', String(height - 8));
    label.setAttribute('class', 'grid-label');
    label.textContent = formatGridCoordinate(lon, 'lon');
    labels.appendChild(label);
  }
}

function renderMap() {
  elements.svg.innerHTML = '';
  elements.svg.style.setProperty('--display-scale', String(getDisplayScale()));

  const viewport = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  viewport.setAttribute('id', 'mapViewport');
  mapInteraction.viewport = viewport;
  elements.svg.appendChild(viewport);

  const width = 1000;
  const height = 700;

  const grid = drawGeographicGrid(width, height);
  viewport.appendChild(grid);
  drawBullseyeMarker();

  if (state.basicVisible) {
    drawBasicLayer();
  }

  if (state.staticVisible) {
    drawLayer('static');
  }

  if (state.dynamicVisible) {
    drawLayer('dynamic');
  }

  drawSelfMarker();
  drawHookLocator();
  updateGridEdgeLabels(width, height);
  applyMapTransform();
  updateSelectedInfo();
  updateSelfInfoDisplay();
}

function setupMapInteraction() {
  elements.svg.addEventListener('click', (event) => {
    if ((hookMode !== 'hook' && hookMode !== 'hook2') || mapPickTarget) return;
    const target = getHookScreenTarget(event.clientX, event.clientY);
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (hookMode === 'hook2') {
      addHook2Target(target);
    } else {
      hookTarget = target;
      hookMode = false;
      elements.svg.removeAttribute('data-hook-selecting');
      elements.hookButton.style.background = '';
      updateHookDisplay();
      updateSelfInfoDisplay();
      renderMap();
      setSettingsStatus(`自機Hook対象を設定: ${target.name}`);
    }
  }, true);
  elements.svg.addEventListener('click', handleMapCoordinatePick);

  elements.svg.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    elements.svg.setPointerCapture(event.pointerId);
    mapInteraction.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (mapInteraction.pointers.size === 1) {
      mapInteraction.lastPoint = { x: event.clientX, y: event.clientY };
    } else if (mapInteraction.pointers.size >= 2) {
      const points = [...mapInteraction.pointers.values()];
      mapInteraction.pinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      mapInteraction.pinchScaleStart = mapInteraction.scale;
    }
  });

  elements.svg.addEventListener('pointermove', (event) => {
    updateCursorCoordinates(event.clientX, event.clientY);
    if (!mapInteraction.pointers.has(event.pointerId)) return;

    const previous = mapInteraction.pointers.get(event.pointerId);
    const next = { x: event.clientX, y: event.clientY };
    mapInteraction.pointers.set(event.pointerId, next);

    if (mapInteraction.pointers.size === 1 && mapInteraction.lastPoint) {
      const dx = next.x - mapInteraction.lastPoint.x;
      const dy = next.y - mapInteraction.lastPoint.y;
      mapInteraction.panX += dx;
      mapInteraction.panY += dy;
      mapInteraction.lastPoint = next;
      applyMapTransform();
    }

    if (mapInteraction.pointers.size >= 2) {
      const points = [...mapInteraction.pointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (mapInteraction.pinchDistance > 0) {
        const ratio = distance / mapInteraction.pinchDistance;
        mapInteraction.scale = clampNumber(mapInteraction.pinchScaleStart * ratio, 0.25, MAP_MAX_SCALE);
        applyMapTransform();
      }
    }
  });

  elements.svg.addEventListener('pointerup', (event) => {
    mapInteraction.pointers.delete(event.pointerId);
    if (mapInteraction.pointers.size < 2) {
      mapInteraction.pinchDistance = 0;
      mapInteraction.pinchScaleStart = mapInteraction.scale;
    }
    if (mapInteraction.pointers.size === 1) {
      mapInteraction.lastPoint = [...mapInteraction.pointers.values()][0];
    }
  });

  elements.svg.addEventListener('pointercancel', (event) => {
    mapInteraction.pointers.delete(event.pointerId);
    mapInteraction.lastPoint = null;
  });

  elements.svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1 / MAP_ZOOM_FACTOR : MAP_ZOOM_FACTOR;
    zoomMapAt(event.clientX, event.clientY, mapInteraction.scale * factor);
  }, { passive: false });
}

function getHookScreenTarget(clientX, clientY) {
  const mapPoint = screenPointToMapPosition(clientX, clientY);
  const selfPosition = state.self.gpsAvailable === true && Number.isFinite(state.self.lat) && Number.isFinite(state.self.lon)
    ? geoToMapPosition(state.self.lat, state.self.lon)
    : { x: 50, y: 50 };
  const bullseyePosition = getBullseyeMapPosition();
  const near = (position) => Math.hypot(position.x - mapPoint.x, position.y - mapPoint.y) <= 3;
  if (near(selfPosition)) return { id: 'self', kind: 'self', name: '自機', x: selfPosition.x, y: selfPosition.y };
  if (near(bullseyePosition)) return { id: 'bullseye', kind: 'bullseye', name: 'B/E', x: bullseyePosition.x, y: bullseyePosition.y };

  const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
  const candidates = elementsAtPoint
    .map((node) => ({ node, layer: node.dataset?.layer, id: node.dataset?.id }))
    .filter(({ layer, id }) => id && ['basic', 'static', 'dynamic'].includes(layer));
  const priority = { static: 0, basic: 1, dynamic: 2 };
  candidates.sort((first, second) => priority[first.layer] - priority[second.layer]);
  const candidate = candidates[0];
  if (!candidate) return null;
  const item = state[candidate.layer].find((entry) => entry.id === candidate.id);
  if (!item) return null;
  const position = getItemMapPosition(item);
  return { id: item.id, layer: candidate.layer, name: item.name, x: position.x, y: position.y };
}

function getItemMapPosition(item) {
  if (Number.isFinite(item.lat) && Number.isFinite(item.lon)) return geoToMapPosition(item.lat, item.lon);
  return { x: item.x ?? 50, y: item.y ?? 50 };
}

function updateCursorCoordinates(clientX, clientY) {
  const mapPoint = screenPointToMapPosition(clientX, clientY);
  const geo = mapPositionToGeo(mapPoint.x, mapPoint.y);
  const system = elements.coordinateSystem.value || state.settings.coordSystem || 'DDMM.MMM';
  if (system === 'MGRS' || system === 'GARS') {
    elements.cursorLatitude.textContent = formatCoordinatePair(geo.lat, geo.lon, system);
    elements.cursorLongitude.textContent = '';
  } else {
    elements.cursorLatitude.textContent = system === 'DDMMSS' ? formatDdmmss(geo.lat, 'lat') : formatDdmmm(geo.lat, 'lat');
    elements.cursorLongitude.textContent = system === 'DDMMSS' ? formatDdmmss(geo.lon, 'lon') : formatDdmmm(geo.lon, 'lon');
  }
}

function startMapPick(target) {
  mapPickTarget = target;
  mapPickReturnPanel = target === 'static' ? managedLayer : null;
  if (target === 'staticLineStart' || target === 'staticLineEnd') {
    mapPickReturnPanel = managedLayer;
    mapPickFormValues = {};
    document.querySelectorAll('#staticLayerForm input, #staticLayerForm select').forEach((field) => {
      mapPickFormValues[field.id] = field.value;
    });
  }
  toggleSettings(false);
  setSettingsStatus('MAP上の位置をタップしてください');
}

function handleMapCoordinatePick(event) {
  if (hookMode === 'hook2' && !mapPickTarget) {
    const mapPoint = screenPointToMapPosition(event.clientX, event.clientY);
    const geo = mapPositionToGeo(mapPoint.x, mapPoint.y);
    addHook2Target({
      id: `hook2-point-${Date.now()}`,
      name: formatCoordinatePair(geo.lat, geo.lon),
      x: mapPoint.x,
      y: mapPoint.y,
    });
    return;
  }
  if (!mapPickTarget) return;
  if (mapPickTarget !== 'basicDisplayRange' && event.target.closest('.marker, .base-icon, .hook-locator, .bullseye-marker')) return;

  const mapPoint = screenPointToMapPosition(event.clientX, event.clientY);
  const geo = mapPositionToGeo(mapPoint.x, mapPoint.y);

  if (mapPickTarget === 'basicDisplayRange') {
    basicDisplayRangePoints.push([mapPoint.x, mapPoint.y]);
    if (basicDisplayRangePoints.length < 4) {
      setSettingsStatus(`表示範囲の${basicDisplayRangePoints.length}点目を取得しました（${basicDisplayRangePoints.length + 1}/4）`);
      return;
    }
    mapPickTarget = null;
    toggleSettings(true);
    showBasicLayerPanel();
    applyBasicDisplayRange();
    return;
  }

  if (mapPickTarget === 'bullseye' || mapPickTarget === 'mapCenter') {
    const target = mapPickTarget === 'bullseye' ? state.settings.bullseye : state.settings.mapCenter;
    target.lat = geo.lat;
    target.lon = geo.lon;
    if (mapPickTarget === 'mapCenter') syncSelfToMapCenterIfNoGps();
    saveState();
    updateSettingsFields();
    renderMap();
    setSettingsStatus(`${mapPickTarget === 'bullseye' ? 'B/E位置' : 'mapセンター'}をMAPから設定しました`);
  }

  if (mapPickTarget === 'static' || mapPickTarget === 'staticLineStart' || mapPickTarget === 'staticLineEnd') {
    if (mapPickTarget === 'staticLineStart' || mapPickTarget === 'staticLineEnd') {
      const prefix = mapPickTarget === 'staticLineStart' ? 'Start' : 'End';
      const latitudeField = elements[`staticLayer${prefix}Lat`];
      const longitudeField = elements[`staticLayer${prefix}Lon`];
      latitudeField.value = formatDdmmm(geo.lat, 'lat');
      longitudeField.value = formatDdmmm(geo.lon, 'lon');
      if (mapPickFormValues) {
        mapPickFormValues[latitudeField.id] = latitudeField.value;
        mapPickFormValues[longitudeField.id] = longitudeField.value;
      }
      setSettingsStatus(`${prefix === 'Start' ? '始点' : '終点'}をMAPから入力しました`);
    } else if (elements.staticLayerCoordSystem.value === 'BE') {
      const relative = geoToBullseyeOffset(geo.lat, geo.lon);
      elements.staticLayerBeBearing.value = relative.bearing.toFixed(1);
      elements.staticLayerBeDistance.value = relative.distance.toFixed(1);
      setSettingsStatus('静的オブジェクト位置をMAPから入力しました');
    } else {
      elements.staticLayerLat.value = formatDdmmm(geo.lat, 'lat');
      elements.staticLayerLon.value = formatDdmmm(geo.lon, 'lon');
      setSettingsStatus('静的オブジェクト位置をMAPから入力しました');
    }
  }

  mapPickTarget = null;
  toggleSettings(true);
  if (mapPickReturnPanel === 'static' || mapPickReturnPanel === 'dynamic') {
    setActiveSettingsButton(document.querySelector(`[data-layer-target="${mapPickReturnPanel}"]`));
    hideSettingsPanels();
    if (mapPickReturnPanel === 'static') showStaticLayerPanel();
    else showDynamicLayerPanel();
    if (mapPickFormValues) {
      openStaticLayerEditor();
      Object.entries(mapPickFormValues).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
      });
      elements.staticLayerType.value = mapPickFormValues.staticLayerType || 'line';
      updateStaticCoordinateFields();
    }
  }
  mapPickReturnPanel = null;
  mapPickFormValues = null;
}

function screenPointToMapPosition(clientX, clientY) {
  const point = elements.svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const svgPoint = point.matrixTransform(elements.svg.getScreenCTM().inverse());
  const viewportX = (svgPoint.x - mapInteraction.panX) / mapInteraction.scale;
  const viewportY = (svgPoint.y - mapInteraction.panY) / mapInteraction.scale;
  return {
    x: clampNumber(viewportX / 10, 0, 100, 50),
    y: clampNumber(viewportY / 7, 0, 100, 50),
  };
}

function applyMapTransform() {
  if (!mapInteraction.viewport) return;
  mapInteraction.viewport.setAttribute('transform', `translate(${mapInteraction.panX} ${mapInteraction.panY}) scale(${mapInteraction.scale})`);
  updateAnnotationTransforms();
  updateGridEdgeLabels(1000, 700);
  updateScaleBar();
}

function zoomMapAt(clientX, clientY, requestedScale) {
  const nextScale = clampNumber(requestedScale, 0.25, MAP_MAX_SCALE, mapInteraction.scale);
  if (nextScale === mapInteraction.scale) return;

  const point = elements.svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const svgPoint = point.matrixTransform(elements.svg.getScreenCTM().inverse());
  const mapX = (svgPoint.x - mapInteraction.panX) / mapInteraction.scale;
  const mapY = (svgPoint.y - mapInteraction.panY) / mapInteraction.scale;
  mapInteraction.scale = nextScale;
  mapInteraction.panX = svgPoint.x - mapX * nextScale;
  mapInteraction.panY = svgPoint.y - mapY * nextScale;
  applyMapTransform();
}

function updateAnnotationTransforms() {
  const scale = getAnnotationScale();
  document.querySelectorAll('#mapViewport .marker-group, #mapViewport .self-marker').forEach((node) => {
    const x = Number(node.dataset.anchorX);
    const y = Number(node.dataset.anchorY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    node.setAttribute('transform', `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`);
  });
}

function updateScaleBar() {
  if (!elements.scaleBarFill || !elements.scaleBarLabel || !elements.svg) return;
  const rect = elements.svg.getBoundingClientRect();
  if (!rect.width) return;

  const latitude = state.settings.mapCenter.lat;
  const nauticalMilesPerMapUnit = (MAP_VIEW_SPAN.lon * 60 * Math.cos((latitude * Math.PI) / 180)) / 1000;
  const pixelsPerNm = mapInteraction.scale * (rect.width / 1000) / nauticalMilesPerMapUnit;
  const candidates = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
  const distance = candidates.reduce((best, candidate) => {
    const bestWidth = best * pixelsPerNm;
    const candidateWidth = candidate * pixelsPerNm;
    if (candidateWidth <= 180 && candidateWidth > bestWidth) return candidate;
    return best;
  }, candidates[0]);
  const width = Math.max(24, distance * pixelsPerNm);

  elements.scaleBarFill.style.width = `${width}px`;
  elements.scaleBarLabel.textContent = `${distance} nm`;
}

function mapPositionToGeo(x, y) {
  const center = state.settings.mapCenter;
  const origin = projectLambert(center.lat, center.lon);
  const horizontalScale = Math.abs(projectLambert(center.lat, center.lon + MAP_VIEW_SPAN.lon / 2).x - origin.x) || 1;
  const verticalScale = horizontalScale * MAP_VERTICAL_ASPECT;
  const projectedX = origin.x + ((x - 50) / 50) * horizontalScale;
  const projectedY = origin.y - ((y - 50) / 50) * verticalScale;
  const geo = inverseLambert(projectedX, projectedY);
  return {
    lat: geo.lat,
    lon: geo.lon,
  };
}

function inverseLambert(projectedX, projectedY) {
  const center = state.settings.mapCenter;
  const constants = getLambertConstants();
  const radians = Math.PI / 180;
  const originLatitude = center.lat * radians;
  const originRho = constants.semiMajorAxis * constants.f * constants.t(originLatitude) ** constants.n;
  const rho = Math.sign(constants.n) * Math.hypot(projectedX, originRho - projectedY);
  const angle = Math.atan2(projectedX, originRho - projectedY);
  const tValue = (rho / (constants.semiMajorAxis * constants.f)) ** (1 / constants.n);
  let latitude = Math.PI / 2 - 2 * Math.atan(tValue);
  for (let iteration = 0; iteration < 8; iteration += 1) {
    latitude = Math.PI / 2 - 2 * Math.atan(tValue * ((1 - constants.eccentricity * Math.sin(latitude)) / (1 + constants.eccentricity * Math.sin(latitude))) ** (constants.eccentricity / 2));
  }
  return {
    lat: latitude / radians,
    lon: center.lon + (angle / constants.n) / radians,
  };
}

function drawBasicLayer() {
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  layer.setAttribute('data-layer', 'basic');

  state.basic.forEach((item) => {
    if (item.visible === false) return;

    if (item.type === 'airspace') {
      const displayPoints = getBasicDisplayPoints(item);
      const safePoints = displayPoints.length
        ? displayPoints
        : [[20, 18], [40, 24], [60, 20], [70, 38], [52, 58], [28, 48]];

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const points = safePoints.map(([px, py]) => `${px * 10},${py * 7}`).join(' ');
      polygon.setAttribute('points', points);
      polygon.setAttribute('fill', item.fill || 'rgba(96,165,250,0.08)');
      polygon.setAttribute('stroke', 'rgba(96, 165, 250, 0.6)');
      polygon.setAttribute('stroke-width', getAdaptiveStrokeWidth(2));
      addBasicObjectInteraction(polygon, item, getBasicTargetPosition(item, safePoints));
      layer.appendChild(polygon);

      if (item.displayNameVisible !== false) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const labelText = item.displayName || item.name;
        const labelLayout = getBasicLabelLayout(safePoints, labelText);
        label.setAttribute('x', String(labelLayout.x));
        label.setAttribute('y', String(labelLayout.y));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.style.fontSize = `${labelLayout.fontSize}px`;
        label.textContent = labelText;
        addBasicObjectInteraction(label, item, getBasicTargetPosition(item, safePoints));
        layer.appendChild(label);
      }
    }

    if (item.type === 'base') {
      const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      wrapper.setAttribute('class', 'base-icon');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', item.x * 10);
      circle.setAttribute('cy', item.y * 7);
      circle.setAttribute('r', String(24 * getDisplayScale()));
      wrapper.appendChild(circle);
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const displayScale = getDisplayScale();
      polygon.setAttribute('points', `${item.x * 10},${item.y * 7 - 16 * displayScale} ${item.x * 10 + 18 * displayScale},${item.y * 7 + 12 * displayScale} ${item.x * 10 - 18 * displayScale},${item.y * 7 + 12 * displayScale}`);
      wrapper.appendChild(polygon);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', item.x * 10 - 22 * displayScale);
      text.setAttribute('y', item.y * 7 + 42 * displayScale);
      text.textContent = item.name;
      wrapper.appendChild(text);
      addBasicObjectInteraction(wrapper, item, { x: item.x, y: item.y });
      layer.appendChild(wrapper);
    }

    if (item.type === 'route') {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = item.points.map(([px, py], idx) => `${idx === 0 ? 'M' : 'L'} ${px * 10} ${py * 7}`).join(' ');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(96, 165, 250, 0.9)');
      path.setAttribute('stroke-width', getAdaptiveStrokeWidth(2));
      path.setAttribute('stroke-dasharray', '12 10');
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      addBasicObjectInteraction(path, item, getBasicTargetPosition(item, item.points));
      layer.appendChild(path);
    }
  });

  mapInteraction.viewport.appendChild(layer);
}

function getBasicLabelLayout(points, text) {
  const xs = points.map(([x]) => x * 10);
  const ys = points.map(([, y]) => y * 7);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const displayScale = getDisplayScale();
  const maxFontSize = 12 * displayScale;
  const widthFit = width * 0.82 / Math.max(1, String(text).length * 0.62);
  const heightFit = height * 0.24;
  return {
    x: centerX,
    y: centerY,
    fontSize: clampNumber(Math.min(maxFontSize, widthFit, heightFit), 6, maxFontSize),
  };
}

function getBasicTargetPosition(item, points = []) {
  if (Number.isFinite(item.x) && Number.isFinite(item.y)) return { x: item.x, y: item.y };
  const safePoints = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!safePoints.length) return { x: 50, y: 50 };
  const sum = safePoints.reduce((result, [x, y]) => ({ x: result.x + x, y: result.y + y }), { x: 0, y: 0 });
  return { x: sum.x / safePoints.length, y: sum.y / safePoints.length };
}

function addBasicObjectInteraction(node, item, position) {
  node.addEventListener('click', (event) => {
    event.stopPropagation();
    if (mapPickTarget === 'basicDisplayRange') {
      handleMapCoordinatePick(event);
      return;
    }
    handleMapObjectClick(item, 'basic', position);
  });
}

function addHook2Target(target) {
  if (hookMode !== 'hook2' || hook2Targets.length >= 2) return;
  hook2Targets.push(target);
  if (hook2Targets.length >= 2) hookMode = false;
  if (hookMode !== 'hook2') elements.svg.removeAttribute('data-hook-selecting');
  updateFeatureWindows();
  renderMap();
  setSettingsStatus(`Hook: ${hook2Targets.length}/2 個を選択`);
}

function drawLayer(layerName) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-layer', layerName);

  state[layerName].forEach((item) => {
    if (item.visible === false) return;
    if (item.type === 'line') {
      const line = createLineNode(item, layerName);
      if (line) group.appendChild(line);
      return;
    }
    const node = createMarkerNode(item, layerName);
    if (node) {
      group.appendChild(node);
    }
  });

  mapInteraction.viewport.appendChild(group);
}

function createLineNode(item, layerName) {
  if (!item.start || !item.end) return null;
  const start = geoToMapPosition(item.start.lat, item.start.lon);
  const end = geoToMapPosition(item.end.lat, item.end.lon);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', start.x * 10);
  line.setAttribute('y1', start.y * 7);
  line.setAttribute('x2', end.x * 10);
  line.setAttribute('y2', end.y * 7);
  line.setAttribute('class', `static-line ${item.type}`);
  line.setAttribute('data-layer', layerName);
  line.setAttribute('data-id', item.id);
  line.setAttribute('stroke', getReadableLineColor(item.lineColor || getSymbolColor(item.type)));
  line.setAttribute('stroke-width', getAdaptiveStrokeWidth(10));
  const dashPatterns = { solid: 'none', dashed: '14 8', dotted: '2 8', dashdot: '14 6 2 6' };
  line.setAttribute('stroke-dasharray', dashPatterns[item.lineStyle] || dashPatterns.solid);
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  line.setAttribute('stroke-linecap', item.lineStyle === 'dotted' ? 'round' : 'butt');
  addBasicObjectInteraction(line, item, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
  return line;
}

function getReadableLineColor(color) {
  const colors = {
    '#60a5fa': '#2563eb',
    '#22c55e': '#15803d',
    '#f97316': '#c2410c',
    '#ef4444': '#b91c1c',
    '#f8fafc': '#cbd5e1',
    '#facc15': '#a16207',
  };
  return colors[String(color).toLowerCase()] || color;
}

function createMarkerNode(item, layerName) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const absolutePosition = Number.isFinite(item.lat) && Number.isFinite(item.lon)
    ? geoToMapPosition(item.lat, item.lon)
    : { x: item.x, y: item.y };
  const x = Number.isFinite(absolutePosition.x) ? absolutePosition.x : 50;
  const y = Number.isFinite(absolutePosition.y) ? absolutePosition.y : 50;
  g.dataset.layer = layerName;
  g.dataset.id = item.id;
  g.setAttribute('class', 'marker-group');
  g.dataset.anchorX = String(x * 10);
  g.dataset.anchorY = String(y * 7);

  const geometryType = item.geometryType || 'none';
  const geometryRadius = Number(item.geometryRadius || 0);
  const displayScale = getDisplayScale();
  const geometryRadiusMapUnits = geometryRadius * 100 / (MAP_VIEW_SPAN.lat * 60);
  if (geometryType === 'circle' && geometryRadius > 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x * 10);
    circle.setAttribute('cy', y * 7);
    circle.setAttribute('r', String(geometryRadiusMapUnits * 10));
    circle.setAttribute('fill', 'rgba(148, 163, 184, 0.08)');
    circle.setAttribute('stroke', 'rgba(148, 163, 184, 0.6)');
    circle.setAttribute('stroke-width', getAdaptiveStrokeWidth(1.5));
    g.appendChild(circle);
  }
  if (geometryType === 'ring' && geometryRadius > 0) {
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', x * 10);
    ring.setAttribute('cy', y * 7);
    ring.setAttribute('r', String(geometryRadiusMapUnits * 10));
    ring.setAttribute('class', 'threat-ring');
    g.appendChild(ring);
  }
  if (geometryType === 'sector' && geometryRadius > 0) {
    const sector = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const startBearing = item.geometryStartBearing ?? item.geometryBearing ?? 0;
    const endBearing = item.geometryEndBearing ?? ((startBearing + 90) % 360);
    sector.setAttribute('d', getSectorPath(x * 10, y * 7, geometryRadiusMapUnits * 10, startBearing, endBearing));
    sector.setAttribute('fill', 'rgba(96, 165, 250, 0.12)');
    sector.setAttribute('stroke', 'rgba(96, 165, 250, 0.75)');
    sector.setAttribute('stroke-width', getAdaptiveStrokeWidth(1.5));
    g.appendChild(sector);
  }

  if (item.threat) {
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', x * 10);
    ring.setAttribute('cy', y * 7);
    ring.setAttribute('r', String(Math.max(18, geometryRadiusMapUnits * 10)));
    ring.setAttribute('class', 'threat-ring');
    g.appendChild(ring);
  }

  const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const shape = item.symbol || 'circle';
  symbol.setAttribute('d', getSymbolPath(shape, x * 10, y * 7, (item.type === 'waypoint' ? 12 : 15) * displayScale));
  symbol.setAttribute('fill', getSymbolColor(item.type));
  symbol.style.fill = getSymbolColor(item.type);
  symbol.setAttribute('stroke', '#f8fafc');
  symbol.setAttribute('stroke-width', getAdaptiveStrokeWidth(1.8));
  symbol.setAttribute('class', `marker ${item.type} ${selectedId === item.id ? 'selected' : ''}`);
  symbol.setAttribute('data-layer', layerName);
  symbol.setAttribute('data-id', item.id);
  symbol.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  symbol.addEventListener('pointerup', (event) => {
    event.stopPropagation();
  });
  symbol.addEventListener('click', (event) => {
    event.stopPropagation();
    handleMapObjectClick(item, layerName, { x, y });
  });
  g.appendChild(symbol);

  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', x * 10 + 20 * displayScale);
  label.setAttribute('y', y * 7 - 18 * displayScale);
  label.style.fontSize = `${24 * displayScale}px`;
  label.textContent = item.name;
  g.appendChild(label);

  return g;
}

function handleMapObjectClick(item, layerName, position) {
  if (hookMode === 'hook') {
    const target = { id: item.id, layer: layerName, name: item.name, x: position.x, y: position.y };
    if (activeHookWindowKey === 'hook') hookTarget = target;
    else hookWindowTargets.set(activeHookWindowKey, target);
    hookMode = false;
    elements.svg.removeAttribute('data-hook-selecting');
    elements.hookButton.style.background = '';
    updateHookDisplay();
    updateSelfInfoDisplay();
    setSettingsStatus(`${activeHookWindowKey === 'hook' ? '自機Hook' : 'Hook'}対象を設定: ${item.name}`);
  } else if (hookMode === 'hook2') {
    if (!hook2Targets.some((target) => target.id === item.id)) {
      addHook2Target({ id: item.id, layer: layerName, name: item.name, x: position.x, y: position.y });
    }
  } else {
    selectedId = item.id;
    selectedLayer = layerName;
    updateSelectedInfo();
  }
  renderMap();
}

function drawSelfMarker() {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const selfPosition = state.self.gpsAvailable === true && Number.isFinite(state.self.lat) && Number.isFinite(state.self.lon)
    ? geoToMapPosition(state.self.lat, state.self.lon)
    : { x: 50, y: 50 };
  const { x, y } = selfPosition;
  const displayScale = getDisplayScale();
  const heading = Number(state.self.heading) || 0;
  group.setAttribute('class', 'self-marker');
  group.dataset.anchorX = String(x * 10);
  group.dataset.anchorY = String(y * 7);
  const aircraft = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const aircraftSize = 1.05 * displayScale;
  aircraft.setAttribute('d', [
    `M 0 ${-25 * aircraftSize}`,
    `L ${10 * aircraftSize} ${11 * aircraftSize}`,
    `L 0 ${7 * aircraftSize}`,
    `L ${-10 * aircraftSize} ${11 * aircraftSize} Z`,
  ].join(' '));
  aircraft.setAttribute('transform', `translate(${x * 10} ${y * 7}) rotate(${heading})`);
  aircraft.setAttribute('class', 'self aircraft-symbol');
  aircraft.setAttribute('fill', '#0b2a5b');
  aircraft.setAttribute('stroke', '#f8fafc');
  aircraft.setAttribute('stroke-width', getAdaptiveStrokeWidth(1.8));
  aircraft.setAttribute('stroke-linejoin', 'round');
  group.appendChild(aircraft);

  mapInteraction.viewport.appendChild(group);
}

function drawBullseyeMarker() {
  const position = getBullseyeMapPosition();
  const displayScale = getDisplayScale();
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'bullseye-marker');
  group.setAttribute('pointer-events', 'none');
  group.setAttribute('aria-label', 'B/E位置');

  [16, 11, 6].map((radius) => radius * displayScale).forEach((radius, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', position.x * 10);
    circle.setAttribute('cy', position.y * 7);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#f97316');
    circle.setAttribute('stroke-width', getAdaptiveStrokeWidth(index === 2 ? 2.5 : 2));
    circle.setAttribute('opacity', index === 2 ? '1' : '0.9');
    group.appendChild(circle);
  });

  mapInteraction.viewport.appendChild(group);
}

function drawHookLocator() {
  const targets = [{ key: 'hook', target: hookTarget }, ...[...hookWindowTargets.entries()].map(([key, target]) => ({ key, target }))]
    .filter(({ target }) => target);

  const selfPosition = state.self.gpsAvailable === true && Number.isFinite(state.self.lat) && Number.isFinite(state.self.lon)
    ? geoToMapPosition(state.self.lat, state.self.lon)
    : { x: 50, y: 50 };

  targets.forEach(({ key, target }, index) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', selfPosition.x * 10);
    line.setAttribute('y1', selfPosition.y * 7);
    line.setAttribute('x2', target.x * 10);
    line.setAttribute('y2', target.y * 7);
    line.setAttribute('class', 'hook-locator');
    line.setAttribute('stroke', locatorColors[index % locatorColors.length]);
    line.setAttribute('stroke-width', String(3 * getDisplayScale()));
    line.setAttribute('stroke-dasharray', '10 8');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    line.setAttribute('stroke-linecap', 'butt');
    line.setAttribute('opacity', '0.9');
    line.setAttribute('pointer-events', 'none');
    line.setAttribute('aria-label', `自機から${target.name}へのロケーターライン (${key})`);
    mapInteraction.viewport.appendChild(line);
  });

  if (hook2Targets.length >= 2) {
    const [startTarget, endTarget] = hook2Targets;
    const start = getHookTargetPosition(startTarget);
    const end = getHookTargetPosition(endTarget);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', start.x * 10);
    line.setAttribute('y1', start.y * 7);
    line.setAttribute('x2', end.x * 10);
    line.setAttribute('y2', end.y * 7);
    line.setAttribute('class', 'hook2-locator');
    line.setAttribute('stroke', '#000000');
    line.style.stroke = '#000000';
    line.setAttribute('stroke-width', String(3 * getDisplayScale()));
    line.setAttribute('stroke-dasharray', '10 8');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    line.setAttribute('stroke-linecap', 'butt');
    line.setAttribute('opacity', '0.95');
    line.setAttribute('pointer-events', 'none');
    line.setAttribute('aria-label', '2点HOOKの始点から終点へのロケーターライン');
    mapInteraction.viewport.appendChild(line);
  }
}

function getHookTargetPosition(target) {
  if (target.kind === 'self') {
    return state.self.gpsAvailable === true && Number.isFinite(state.self.lat) && Number.isFinite(state.self.lon)
      ? geoToMapPosition(state.self.lat, state.self.lon)
      : { x: 50, y: 50 };
  }
  if (target.kind === 'bullseye') return getBullseyeMapPosition();
  return { x: target.x, y: target.y };
}

function handleAddMarker(event) {
  event.preventDefault();

  const layer = elements.targetLayer.value;
  const type = elements.markerType.value;
  const symbol = elements.markerSymbol.value;
  const geometryType = elements.geometryType.value;
  const geometryRadius = Math.max(0, Number(elements.geometryRadius?.value || 0) || 0);
  const name = (elements.markerName.value || `${type === 'ally' ? '味方' : type === 'enemy' ? '敵' : '地点'}${Date.now().toString().slice(-3)}`).trim();
  const x = clampNumber(Number(elements.coordX.value), 0, 100, 50);
  const y = clampNumber(Number(elements.coordY.value), 0, 100, 50);

  const item = {
    id: `marker-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    type,
    name,
    x,
    y,
    layer,
    symbol,
    geometryType,
    geometryRadius,
  };

  state[layer].push(item);
  selectedId = item.id;
  selectedLayer = layer;
  saveState();
  renderMap();
  elements.addMarkerForm.reset();
}

function deleteSelectedMarker() {
  if (!selectedId) return;

  for (const layerName of ['basic', 'static', 'dynamic']) {
    const index = state[layerName].findIndex((item) => item.id === selectedId);
    if (index >= 0) {
      state[layerName].splice(index, 1);
      selectedId = null;
      selectedLayer = null;
      saveState();
      renderMap();
      return;
    }
  }
}

function resetSampleData() {
  const fresh = JSON.parse(JSON.stringify(sampleState));
  state.basic = fresh.basic;
  state.static = fresh.static;
  state.dynamic = fresh.dynamic;
  state.self = { ...fresh.self };
  state.basicVisible = true;
  state.staticVisible = true;
  state.dynamicVisible = true;
  selectedId = null;
  selectedLayer = null;
  renderLayerToggles();
  saveState();
  renderMap();
}

function resetAppState() {
  const confirmed = window.confirm('現在登録した初期状態へ戻しますか？');
  if (!confirmed) return;
  const snapshot = JSON.parse(localStorage.getItem(INITIAL_STATE_STORAGE_KEY) || 'null');
  if (snapshot?.state) localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.state));
  if (snapshot?.windows) localStorage.setItem(WINDOWS_STORAGE_KEY, JSON.stringify(snapshot.windows));
  if (snapshot?.view) localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(snapshot.view));
  window.location.reload();
}

function calculateBearing(from, to, deviation) {
  const fromGeo = mapPositionToGeo(from.x, from.y);
  const toGeo = mapPositionToGeo(to.x, to.y);
  const fromLat = (fromGeo.lat * Math.PI) / 180;
  const deltaLon = ((toGeo.lon - fromGeo.lon) * Math.PI) / 180;
  const toLat = (toGeo.lat * Math.PI) / 180;
  let bearing = (Math.atan2(
    Math.sin(deltaLon) * Math.cos(toLat),
    Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon),
  ) * 180) / Math.PI;
  if (bearing < 0) bearing += 360;
  
  const magBearing = (bearing + (deviation || 0)) % 360;
  return Math.round(magBearing);
}

function formatBearing(value) {
  return Math.round((value + 360) % 360).toString().padStart(3, '0');
}

function calculateDistance(from, to) {
  const fromGeo = mapPositionToGeo(from.x, from.y);
  const toGeo = mapPositionToGeo(to.x, to.y);
  const lat1 = (fromGeo.lat * Math.PI) / 180;
  const lat2 = (toGeo.lat * Math.PI) / 180;
  const deltaLat = lat2 - lat1;
  const deltaLon = ((toGeo.lon - fromGeo.lon) * Math.PI) / 180;
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const nauticalMiles = 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(nauticalMiles * 10) / 10;
}

function updateSelfInfoDisplay() {
  const deviation = state.settings.manualDeviation || 0;
  const bullseye = getBullseyeMapPosition();
  const self = state.self;
  
  const bearing = calculateBearing(bullseye, self, deviation);
  const distance = calculateDistance(bullseye, self);
  
  elements.selfBearing.textContent = `${formatBearing(bearing)}°`;
  elements.selfDistance.textContent = `${distance}nm`;
  
  const heading = Math.round(state.self.heading || 0);
  const speed = Math.round(state.self.speed || 0);
  
  if (elements.selfHeading) elements.selfHeading.textContent = `${heading.toString().padStart(3, '0')}°M`;
  if (elements.selfSpeed) elements.selfSpeed.textContent = `${speed}kt`;
  
  updateHookDisplay();
  updateFeatureWindows();
}

function getBullseyeMapPosition() {
  return geoToMapPosition(state.settings.bullseye.lat, state.settings.bullseye.lon);
}

function updateHookDisplay() {
  if (!hookTarget) {
    elements.hookInfo.classList.remove('hidden');
    elements.hookName.textContent = '--';
    elements.hookBearing.textContent = '---°';
    elements.hookDistance.textContent = '--nm';
    updateFeatureWindows();
    return;
  }
  
  elements.hookInfo.classList.remove('hidden');
  elements.hookName.textContent = hookTarget.name;
  
  const deviation = state.settings.manualDeviation || 0;
  const bearing = calculateBearing(state.self, hookTarget, deviation);
  const distance = calculateDistance(state.self, hookTarget);
  
  elements.hookBearing.textContent = `${formatBearing(bearing)}°`;
  elements.hookDistance.textContent = `${distance}nm`;
  updateFeatureWindows();
}

function requestGps() {
  // GPS 取得機能は削除（フック機能に置き換え）
}

function updateSelectedInfo() {
  if (!selectedId) {
    elements.selectedInfo.textContent = '未選択';
    return;
  }

  for (const layerName of ['basic', 'static', 'dynamic']) {
    const item = state[layerName].find((entry) => entry.id === selectedId);
    if (item) {
      elements.selectedInfo.textContent = `${LAYER_LABELS[layerName]} / ${item.name}`;
      return;
    }
  }

  elements.selectedInfo.textContent = '未選択';
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function getSymbolColor(type) {
  if (type === 'enemy') return '#ef4444';
  if (type === 'neutral') return '#f8fafc';
  if (type === 'ally') return '#3b82f6';
  if (type === 'waypoint') return '#22c55e';
  if (type === 'base') return '#60a5fa';
  return '#fbbf24';
}

function getSymbolPath(shape, cx, cy, radius) {
  const s = radius;
  switch (shape) {
    case 'diamond':
      return `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`;
    case 'triangle':
      return `M ${cx} ${cy - s} L ${cx + s} ${cy + s} L ${cx - s} ${cy + s} Z`;
    case 'square':
      return `M ${cx - s} ${cy - s} L ${cx + s} ${cy - s} L ${cx + s} ${cy + s} L ${cx - s} ${cy + s} Z`;
    case 'cross':
      return `M ${cx - s} ${cy - s / 2} L ${cx + s} ${cy - s / 2} L ${cx + s} ${cy + s / 2} L ${cx - s} ${cy + s / 2} Z M ${cx - s / 2} ${cy - s} L ${cx + s / 2} ${cy - s} L ${cx + s / 2} ${cy + s} L ${cx - s / 2} ${cy + s} Z`;
    case 'missile':
      return `M ${cx} ${cy - s} L ${cx + s * 0.9} ${cy} L ${cx} ${cy + s} L ${cx - s * 0.9} ${cy} Z`;
    case 'ddg':
      return `M ${cx - s * 0.45} ${cy - s} L ${cx + s * 0.45} ${cy - s} L ${cx + s} ${cy + s * 0.55} L ${cx + s * 0.55} ${cy + s} L ${cx - s * 0.55} ${cy + s} L ${cx - s} ${cy + s * 0.55} Z`;
    case 'cv':
      return `M ${cx - s * 0.3} ${cy - s} L ${cx + s * 0.3} ${cy - s} L ${cx + s} ${cy + s} L ${cx - s} ${cy + s} Z`;
    case 'circle':
    default:
      return `M ${cx} ${cy - s} A ${s} ${s} 0 1 1 ${cx - 0.01} ${cy - s} Z`;
  }
}

function getSectorPath(cx, cy, radius, startBearing, endBearing) {
  const sweep = (endBearing - startBearing + 360) % 360;
  if (sweep === 0) return `M ${cx} ${cy} Z`;
  const toPoint = (angle) => {
    const radians = (angle * Math.PI) / 180;
    return { x: cx + Math.sin(radians) * radius, y: cy - Math.cos(radians) * radius };
  };
  const first = toPoint(startBearing);
  const second = toPoint(endBearing);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${first.x} ${first.y} A ${radius} ${radius} 0 ${largeArc} 1 ${second.x} ${second.y} Z`;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  });
}
