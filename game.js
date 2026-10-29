"use strict";
const AUDIO_SETTINGS_KEY = "wilderness-survival-audio-settings-v1";
const DEFAULT_AUDIO_SETTINGS = { master: 70, ambient: 12, sfx: 45, mute: false };
// ================================
// 1. 游戏基础数据
// ================================
const characters = [
  {
    id: "scout",
    name: "林野",
    job: "荒野侦察员",
    icon: "images/characters/scout.png",
    ability: "探索更高效",
    description: "更容易发现隐藏物资，探索时体力消耗较低。",
    bonus: "探索优势"
  },
  {
    id: "medic",
    name: "苏棠",
    job: "野外医疗员",
    icon: "images/characters/medic.png",
    ability: "医疗更高效",
    description: "使用医疗物品效果更好，后续可解锁特殊药品配方。",
    bonus: "医疗优势"
  },
  {
    id: "mechanic",
    name: "陈砾",
    job: "设备维修员",
    icon: "images/characters/mechanic.png",
    ability: "制作更高效",
    description: "维修设备更熟练，后续修理部分设备需要的材料更少。",
    bonus: "维修优势"
  },
  {
    id: "hunter",
    name: "叶岚",
    job: "野外猎手",
    icon: "images/characters/hunter.png",
    ability: "采集更高效",
    description: "更擅长辨认可食用资源，后续狩猎和采集效率更高。",
    bonus: "采集优势"
  }
];
const openingStory = [
  "凌晨 05:17。暴雨已经持续了六个小时。",
  "一声沉闷的巨响穿过山谷，随后，世界陷入了短暂的寂静。",
  "你从冰冷的泥水中醒来。破碎的通讯设备散落在身旁，远处的森林被浓雾吞没。",
  "你试着呼叫救援，却只听见一阵刺耳的电流声。",
  "几秒钟后，无线电里传来一个模糊的声音。",
  "“如果有人还活着……不要沿着河流向北走。”",
  "信号中断了。",
  "你不知道自己身在何处，也不知道说话的人是谁。",
  "你唯一确定的是——天黑之前，你必须找到一个能够过夜的地方。"
].join("\n\n");
// ================================
// 2. 获取页面元素
// ================================
const screens = document.querySelectorAll(".screen");
const startButton = document.querySelector("#start-btn");
const continueButton = document.querySelector("#continue-btn");
const saveSlotModal = document.querySelector("#save-slot-modal");
const saveSlotList = document.querySelector("#save-slot-list");
const saveSlotTitle = document.querySelector("#save-slot-title");
const saveSlotClose = document.querySelector("#save-slot-close-btn");
const sleepModal = document.querySelector("#sleep-modal");
const profilesButton = document.querySelector("#profiles-btn");
const settingsButton = document.querySelector("#settings-btn");
const storyText = document.querySelector("#story-text");
const skipStoryButton = document.querySelector("#skip-story-btn");
const nextStoryButton = document.querySelector("#next-story-btn");
const characterList = document.querySelector("#character-list");
const confirmCharacterButton = document.querySelector("#confirm-character-btn");
const backMenuButton = document.querySelector("#back-menu-btn");
const profilesList = document.querySelector("#profiles-list");
const profilesBackButton = document.querySelector("#profiles-back-btn");
const settingsBackButton = document.querySelector("#settings-back-btn");
const settingsResetButton = document.querySelector("#settings-reset-btn");
const audioSettingInputs = {
  master: document.querySelector("#master-volume"),
  ambient: document.querySelector("#ambient-volume"),
  sfx: document.querySelector("#sfx-volume"),
  mute: document.querySelector("#mute-audio")
};
const audioSettings = loadAudioSettings();
let audioContext = null;
let ambientGainNode = null;
let ambientStarted = false;

const exitGameButton = document.querySelector("#exit-game-btn");
const canvas = document.querySelector("#game-canvas");
let ctx = canvas.getContext("2d");
const minimapCanvas = document.querySelector("#minimap-canvas");
const minimapCtx = minimapCanvas.getContext("2d");
const expandedMapCanvas = document.querySelector("#expanded-map-canvas");
const expandedMapCtx = expandedMapCanvas.getContext("2d");
// v32 Image-Driven Asset Manager: images are replaceable by keeping the same filenames.
const AssetManager = (() => {
  const definitions = {
    tileGrass:"images/tiles/grass.png", tileForest:"images/tiles/forest.png", tileMeadow:"images/tiles/meadow.png", tileDirt:"images/tiles/dirt.png", tileSand:"images/tiles/sand.png", tileRocky:"images/tiles/rocky.png", tileWater:"images/tiles/water.png", tileShallowWater:"images/tiles/shallow_water.png",
    tree:"images/environment/tree.png", treeStump:"images/environment/tree_stump.png", rock:"images/environment/rock.png", highGrass:"images/environment/high_grass.png", berryBush:"images/environment/berry_bush.png", branch:"images/environment/branch.png", stonePile:"images/environment/stone_pile.png", campfire:"images/environment/campfire.png", plant:"images/environment/plant.png",
    scout:"images/characters/scout.png", medic:"images/characters/medic.png", mechanic:"images/characters/mechanic.png", hunter:"images/characters/hunter.png",
    stoneAxe:"images/items/stone_axe.png", sword:"images/items/sword.png", berry:"images/items/berry.png", wood:"images/items/wood.png", aircraftWreck:"images/landmarks/aircraft_wreck.png"
  };
  const images = Object.create(null), warned = new Set();
  const groundedAssets = new Set(["tree", "treeStump", "rock", "highGrass", "berryBush", "branch", "stonePile", "campfire", "plant", "wood", "berry"]);
  for (const [key, src] of Object.entries(definitions)) {
    const img = new Image(); images[key] = img;
    img.onload = () => { img.assetReady = true; };
    img.onerror = () => { if (!warned.has(key)) { warned.add(key); console.warn(`[AssetManager] 图片加载失败：${src}，继续使用兜底绘制。`); } };
    img.src = src;
  }
  function draw(key, targetCtx, x, y, w, h) {
    const img = images[key]; if (!img || !img.complete || !img.naturalWidth) return false;
    targetCtx.save(); targetCtx.imageSmoothingEnabled = false;
    // 环境物件先落一层贴地阴影，避免透明 PNG 像贴纸一样浮在地表上。
    if (groundedAssets.has(key)) {
      targetCtx.fillStyle = "rgba(18, 24, 16, 0.24)";
      targetCtx.beginPath(); targetCtx.ellipse(Math.round(x + w * 0.5), Math.round(y + h * 0.88), Math.max(5, w * 0.31), Math.max(2, h * 0.075), 0, 0, Math.PI * 2); targetCtx.fill();
    }
    targetCtx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    targetCtx.restore(); return true;
  }
  function get(key) {
    if (!images[key] && key.startsWith("item_")) {
      const id = key.slice(5); const img = new Image(); images[key] = img;
      img.onerror = () => { if (!warned.has(key)) { warned.add(key); console.warn(`[AssetManager] 物品图标缺失：images/items/icons/${id}.png`); } };
      img.src = `images/items/icons/${id}.png`;
    }
    const img = images[key]; return img && img.complete && img.naturalWidth ? img : null;
  }
  return Object.freeze({ draw, get, definitions });
})();

// v33：可选角色精灵表。约定文件为 images/characters/{角色ID}_walk.png，
// 4列×4行：每行依次为 down、left、right、up；每行4帧。缺失时静默回退静态PNG。
const CharacterAnimationAssets = (() => {
  const sheets = Object.create(null);
  function get(characterId, mode = "walk") {
    const key = `${characterId}_${mode}`;
    if (!(key in sheets)) {
      const img = new Image();
      img.onload = () => { img.assetReady = true; };
      // 动画表属于可选资产：缺失不报错、不刷屏，使用角色静态图兜底。
      img.onerror = () => { sheets[key] = null; };
      img.src = `images/characters/${key}.png`;
      sheets[key] = img;
    }
    const img = sheets[key];
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  }
  return Object.freeze({ get });
})();

const hotbarElement = document.querySelector("#hotbar");
const inventoryModal = document.querySelector("#inventory-modal");
const inventoryGrid = document.querySelector("#inventory-grid");
const craftingModal = document.querySelector("#crafting-modal");
const craftingList = document.querySelector("#crafting-list");
const compendiumList = document.querySelector("#compendium-list");
const compendiumModal = document.querySelector("#compendium-modal");
const creatureCompendiumList = document.querySelector("#creature-compendium-list");
const craftCategoryNav = document.querySelector("#craft-category-nav");
const craftCategorySummary = document.querySelector("#craft-category-summary");
let activeRecipeCategory = "all";
let activeCompendiumTab = "items";
const craftTabButton = document.querySelector("#craft-tab-btn");
const compendiumTabButton = document.querySelector("#compendium-tab-btn");
const craftTabPanel = document.querySelector("#craft-tab-panel");
const compendiumTabPanel = document.querySelector("#compendium-tab-panel");
const mapModal = document.querySelector("#map-modal");
const questModal = document.querySelector("#quest-modal");
const questLogButton = document.querySelector("#quest-log-open-btn");
const questCloseButton = document.querySelector("#quest-close-btn");
const questCurrentTitle = document.querySelector("#quest-current-title");
const questCurrentSummary = document.querySelector("#quest-current-summary");
const questCurrentObjective = document.querySelector("#quest-current-objective");
const questCurrentHint = document.querySelector("#quest-current-hint");
const questProgressLabel = document.querySelector("#quest-progress-label");
const questChapterList = document.querySelector("#quest-chapter-list");
const questHudLabel = document.querySelector("#quest-hud-label");
const questHudButton = document.querySelector("#quest-hud-open-btn");
const mapMainTab = document.querySelector("#map-main-tab");
const mapSideTab = document.querySelector("#map-side-tab");
const mapQuestList = document.querySelector("#map-quest-list");
const mapQuestCaption = document.querySelector("#map-quest-caption");
const questCompleteBanner = document.querySelector("#quest-complete-banner");
const questCompleteTitle = document.querySelector("#quest-complete-title");
const questNextTitle = document.querySelector("#quest-next-title");
let mapQuestMode = "main";
let questBannerTimer = null;
function resizeGameCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => {
  resizeGameCanvas();
  if (gameState.running) {
    drawWorld();
  }
});
// ================================
// 3. 游戏状态
// ================================
const gameState = {
  selectedCharacter: null,
  player: {
    x: 1600,
    y: 1600,
    speed: 180,
    size: 22,
    facing: "down",
    moving: false,
    walkTime: 0,
    actionUntil: 0,
    actionType: ""
  },
  keys: new Set(),
  lastTime: 0,
  running: false,
  animationFrameId: null,
  location: "world",
  aircraftFloor: "lower",
  aircraftReturnPosition: null,
  aircraftSearch: null,
  campReturnPosition: null,
  cabinReturnPosition: null,
  campLevel: 1,
  camps: [],
  selectedCampId: null,
  nextCampId: 1,
  placedCampfires: [],
  regionId: null,
  regionReturnPosition: null,
  unlockedRegions: { riverValley: false, ridgeHighlands: false, cave: false, researchStation: false },
  visitedRegions: { riverValley: false, ridgeHighlands: false },
  hasFurnace: false,
  searchedContainers: []
};
// 第一卷主线任务进度：只保存游戏实际推进过的目标，不会因为重新进入区域而重置。
const mainQuestState = { chapter: 1, completed: [], flags: {}, gathered: { wood: 0, berries: 0, stone: 0, branch: 0, fiber: 0 }, crafted: {} };
const mainQuests = [
  { chapter: 1, title: "第一夜：先活下来", region: "翠影森林", summary: "暴雨后的森林并不安全。先收集足够的材料，确认附近还有其他幸存者。", objective: "收集树枝 ×4、石块 ×2、植物纤维 ×2。", hint: "先从林间地面收集树枝和小石块，再采集高草丛获得植物纤维。按 E 与遇到的幸存者交谈。", check: () => mainQuestState.gathered.branch >= 4 && mainQuestState.gathered.stone >= 2 && mainQuestState.gathered.fiber >= 2 },
  { chapter: 2, title: "一间能熬过夜晚的屋子", region: "翠影森林·营地", summary: "林野提醒你：在继续调查异常之前，必须先有能休息、存放物资和加工工具的落脚点。", objective: "建造一座自建营地，并在室内放置工作台。", hint: "制作营地套件，在安全空地按 F 放置；进入营地后制作并摆放工作台。营地在本章视为第一处简易木屋。", check: () => gameState.camps.length > 0 && gameState.camps.some(c => c.furniture?.some(f => f.type === "workbench")) },
  { chapter: 3, title: "把失散的人带回灯下", region: "翠影森林", summary: "三位伙伴掌握着不同的生存技能。与他们谈清楚条件，再把他们带回营地。", objective: "与其余三名幸存者完成对话并招募。", hint: "靠近林野、苏棠、陈砾或叶岚按 E 交谈。先建立营地，才能说服他们加入；已选择的角色由玩家本人承担专精。", check: () => Object.keys(COMPANION_DEFS).filter(id => id !== gameState.selectedCharacter?.id && mainQuestState.flags[`companion_${id}`]).length >= 3 },
  { chapter: 4, title: "森林里的三处异象", region: "翠影森林·飞机残骸、废弃木屋、林地裂隙", summary: "伙伴们分别发现了异常金属、污染植物与兽类足迹。调查三处地点，拼出污染扩散的方向。", objective: "调查飞机残骸、废弃木屋和林地裂隙的异常线索。", hint: "沿主地图金色标记调查三处异常地点。白天更适合探索；夜晚怪物更活跃。", check: () => ["anomaly_aircraft","anomaly_cabin","anomaly_clearing"].every(k=>mainQuestState.flags[k]) },
  { chapter: 5, title: "清理污染源", region: "翠影森林·污染源区域", summary: "污染源正在吸引野兽。先切断三处次级污染源，再准备进入中央巢穴。", objective: "清理三处次级污染源。", hint: "再次调查三处已标记的污染源完成清理。靠近污染区域前先补充武器、绷带和食物。", check: () => ["purged_aircraft","purged_cabin","purged_clearing"].every(k=>mainQuestState.flags[k]) },
  { chapter: 6, title: "巢穴核心：不再后退", region: "翠影森林中央·污染巢穴", summary: "污染源被切断后，森林中央的巢穴核心暴露出来。伙伴能提供准备与情报，但最后一战由你亲自完成。", objective: "前往中央巢穴，击败污染巢穴首领。", hint: "调查中央巢穴核心触发首领战。建议带足医疗物资，利用走位躲避攻击。", check: () => Boolean(mainQuestState.flags.nestBossDefeated) },
  { chapter: 7, title: "边境的第一盏灯", region: "翠影森林·营地", summary: "首领倒下后，营地终于获得喘息。伙伴们开始分工，第一章在这片森林内暂告段落。", objective: "回到营地与伙伴交谈，完成第一章。", hint: "回到自建营地，和任意已招募伙伴交谈。第一章不会要求离开主地图。", check: () => Boolean(mainQuestState.flags.chapterOneDebrief) }
];
const questGuidance = {
  1:{location:"翠影森林·林间资源点",person:"失散的幸存者",map:"world",col:56,row:52},
  2:{location:"翠影森林·玩家营地",person:"林野、陈砾",map:"world",col:50,row:50},
  3:{location:"主地图各处幸存者位置",person:"苏棠、陈砾、林野、叶岚",map:"world",col:56,row:52},
  4:{location:"飞机残骸、废弃木屋、林地裂隙",person:"全体伙伴",map:"world",col:56,row:52},
  5:{location:"翠影森林·三处次级污染源",person:"叶岚负责侦察，玩家负责清理",map:"world",col:56,row:52},
  6:{location:"翠影森林中央·污染巢穴",person:"玩家主战；伙伴提供后勤",map:"world",col:51,row:40},
  7:{location:"玩家营地",person:"已招募伙伴",map:"world",col:50,row:50}
};
const CAMERA_SETTINGS_KEY = "wilderness-survival-camera-settings-v1";
let reduceCameraMotion = true;
try {
  const savedCameraSettings = JSON.parse(localStorage.getItem(CAMERA_SETTINGS_KEY) || "null");
  if (typeof savedCameraSettings?.reduceMotion === "boolean") reduceCameraMotion = savedCameraSettings.reduceMotion;
} catch (error) {}
const reduceCameraMotionInput = document.querySelector("#reduce-camera-motion");
if (reduceCameraMotionInput) {
  reduceCameraMotionInput.checked = reduceCameraMotion;
  reduceCameraMotionInput.addEventListener("change", () => {
    reduceCameraMotion = reduceCameraMotionInput.checked;
    try { localStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify({ reduceMotion: reduceCameraMotion })); } catch (error) {}
    cameraState.x = null;
    cameraState.y = null;
    if (gameState.running) drawWorld();
  });
}
const cameraState = { x: null, y: null };
const survivalState = { health: 100, hunger: 100, thirst: 100 };
const itemCatalog = {
  bread: { id: "bread", name: "面包", icon: "🍞", description: "恢复饱腹值", effect: "hunger", amount: 25, category: "食物" },
  water: { id: "water", name: "饮用水", icon: "🧴", description: "安全饮水，补充水分", effect: "thirst", amount: 35, category: "水源" },
  dirtyWater: { id: "dirtyWater", name: "生水", icon: "💧", description: "未经处理的河水。饮用可补水，但有患病风险。", effect: "thirst", amount: 22, riskDamage: 10, category: "水源" },
  medkit: { id: "medkit", name: "医疗包", icon: "🩹", description: "恢复生命值", effect: "health", amount: 40, category: "医疗" },
  berries: { id: "berries", name: "野果", icon: "🫐", description: "恢复少量饱腹与口渴", effect: "hunger", amount: 15, bonusThirst: 4, category: "食物" },
  mushroom: { id: "mushroom", name: "可食菌菇", icon: "🍄", description: "野外辨识后的可食菌菇", effect: "hunger", amount: 10, category: "食物" },
  unknownMushroom: { id: "unknownMushroom", name: "未知蘑菇", icon: "🍄‍🟫", description: "未经辨识的野生蘑菇，暂不可直接食用。", material: true, category: "食物原材" },
  flower: { id: "flower", name: "野花", icon: "🌼", description: "可进一步辨识或研磨的植物资源", material: true, category: "植物" },
  herb: { id: "herb", name: "止血草", icon: "🌿", description: "翠影森林与草原的药用植物", material: true, category: "医药" },
  seed: { id: "seed", name: "野生种子", icon: "🌱", description: "可用于后续营地种植区", material: true, category: "植物" },
  wood: { id: "wood", name: "木材 / 原木", icon: "🪵", description: "用石斧或更高级斧具砍伐树木获得", material: true, category: "林木" },
  branch: { id: "branch", name: "树枝", icon: "🌿", description: "常见地面资源；森林边缘、草地与倒木周围更常见", material: true, category: "林木" },
  resin: { id: "resin", name: "树脂", icon: "🟠", description: "砍伐翠影森林树木时概率伴生，可引火、粘合", material: true, category: "林木" },
  bark: { id: "bark", name: "树皮", icon: "🪵", description: "从树木伴生获得，可用于绳索与药剂", material: true, category: "林木" },
  plank: { id: "plank", name: "木板", icon: "🪚", description: "在营地工作台将木材加工而成", material: true, category: "半成品" },
  charcoal: { id: "charcoal", name: "木炭", icon: "⚫", description: "木材或树枝在火堆中炭化的产物，用于净水与冶炼", material: true, category: "半成品" },
  stick: { id: "stick", name: "木棍", icon: "🪵", description: "由树枝削制，可用于工具与武器", material: true, category: "半成品" },
  longPole: { id: "longPole", name: "长木杆", icon: "🎋", description: "帐篷支架、鱼竿和长柄武器的基础材料", material: true, category: "半成品" },
  stone: { id: "stone", name: "石块", icon: "🪨", description: "可捡拾零碎石块，也可用石镐开采岩块", material: true, category: "石材" },
  pebble: { id: "pebble", name: "碎石 / 鹅卵石", icon: "⚪", description: "河谷与岩块周围常见，可用于打制石片和过滤净水", material: true, category: "石材" },
  stoneShard: { id: "stoneShard", name: "石片 / 石刃", icon: "🔪", description: "由石块与碎石打制的锋利石器", material: true, category: "半成品" },
  stoneBrick: { id: "stoneBrick", name: "石砖 / 石材", icon: "🧱", description: "石块在工作台切割加工，可用于坚固建筑与熔炉", material: true, category: "半成品" },
  ironOre: { id: "ironOre", name: "铁矿石", icon: "⛏️", description: "断脊高地与洞穴矿脉资源，需要石镐开采", material: true, category: "矿物" },
  copperOre: { id: "copperOre", name: "铜矿石", icon: "🟤", description: "断脊高地浅层矿脉，需要石镐开采", material: true, category: "矿物" },
  silverOre: { id: "silverOre", name: "银矿石", icon: "🥈", description: "断脊高地深层矿脉，需要铜镐或更高级矿镐开采", material: true, category: "矿物" },
  goldOre: { id: "goldOre", name: "金矿石", icon: "🥇", description: "断脊高地北坡稀有矿脉，需要银镐或金镐开采", material: true, category: "矿物" },
  ironIngot: { id: "ironIngot", name: "铁锭", icon: "🔩", description: "铁矿石与木炭在熔炉中冶炼", material: true, category: "金属" },
  copperIngot: { id: "copperIngot", name: "铜锭", icon: "🟠", description: "铜矿石与木炭在熔炉中冶炼", material: true, category: "金属" },
  silverIngot: { id: "silverIngot", name: "银锭", icon: "🥈", description: "银矿石与木炭在熔炉中冶炼", material: true, category: "金属" },
  goldIngot: { id: "goldIngot", name: "金锭", icon: "🟡", description: "金矿石与木炭在熔炉中冶炼", material: true, category: "金属" },
  fiber: { id: "fiber", name: "植物纤维", icon: "🧵", description: "从高草、灌木与河谷芦苇采集", material: true, category: "纤维" },
  reeds: { id: "reeds", name: "芦苇", icon: "🎍", description: "碎石河谷专属植物，可替代纤维或编席", material: true, category: "纤维" },
  rope: { id: "rope", name: "简易绳索", icon: "➰", description: "由植物纤维搓制，是工具与建筑的核心连接材料", material: true, category: "半成品" },
  cloth: { id: "cloth", name: "粗布", icon: "🧶", description: "由植物纤维或芦苇在工作台编织", material: true, category: "半成品" },
  herbPowder: { id: "herbPowder", name: "草药粉", icon: "🌿", description: "研磨止血草后获得的医药原料", material: true, category: "医药" },
  bandage: { id: "bandage", name: "绷带", icon: "🩹", description: "用于恢复轻伤；医疗员苏棠使用效果更好", effect: "health", amount: 18, category: "医疗" },
  poultice: { id: "poultice", name: "草药敷剂", icon: "🧴", description: "草药粉、药用蘑菇与净水制成的基础药剂", effect: "health", amount: 28, category: "医疗" },
  torch: { id: "torch", name: "火把", icon: "🔥", description: "树枝、纤维与树脂制成的照明工具", material: true, category: "工具" },
  spear: { id: "spear", name: "木矛", icon: "🗡️", description: "简易防卫与狩猎工具，后续用于动物系统", material: true, category: "武器" },
  sword: { id: "sword", name: "简易短剑", icon: "⚔️", description: "有护手、剑脊与双刃的短剑；握柄固定在手掌，近战挥砍使用。", material: true, category: "武器", durabilityMax: 65 },
  bow: { id: "bow", name: "简易弓", icon: "🏹", description: "猎手叶岚初始持有；其他角色可在工作台制作", material: true, category: "武器" },
  arrow: { id: "arrow", name: "箭矢", icon: "➶", description: "树枝、石片与羽毛制成的远程消耗品", material: true, category: "弹药" },
  fishingRod: { id: "fishingRod", name: "钓鱼竿", icon: "🎣", description: "需要长木杆、绳索与金属废件或骨钩", material: true, category: "工具" },
  campfireKit: { id: "campfireKit", name: "篝火套件", icon: "🔥", description: "在野外合适空地放置一处篝火，可烹饪、添柴", material: true, category: "建造" },
  campKit: { id: "campKit", name: "简易营地套件", icon: "🏕️", description: "在合适地面建造属于自己的营地；可以建造多个", material: true, category: "建造" },
  workbench: { id: "workbench", name: "简易工作台", icon: "🛠️", description: "只能放置在自建营地内部；营地等级 I 可使用", material: true, category: "家具·I级", furniture: true, furnitureLevel: 1, furnitureType: "workbench" },
  workbench2: { id: "workbench2", name: "精制工作台", icon: "⚒️", description: "II级家具，可替换简易工作台，支持高级加工", material: true, category: "家具·II级", furniture: true, furnitureLevel: 2, furnitureType: "workbench" },
  workbench3: { id: "workbench3", name: "大师工作台", icon: "🛠️", description: "III级家具，可替换低级工作台", material: true, category: "家具·III级", furniture: true, furnitureLevel: 3, furnitureType: "workbench" },
  bed1: { id: "bed1", name: "简易睡铺", icon: "🛏️", description: "I级营地家具。靠近后按 E 可休息 3 小时或睡到次日 06:00", material: true, category: "家具·I级", furniture: true, furnitureLevel: 1, furnitureType: "bed" },
  chest1: { id: "chest1", name: "木制储物柜", icon: "🧰", description: "I级家具；储物功能后续完善", material: true, category: "家具·I级", furniture: true, furnitureLevel: 1, furnitureType: "chest" },
  chest2: { id: "chest2", name: "加固储物柜", icon: "🗄️", description: "II级家具；储物功能后续完善", material: true, category: "家具·II级", furniture: true, furnitureLevel: 2, furnitureType: "chest" },
  furnaceFurniture: { id: "furnaceFurniture", name: "石质熔炉家具", icon: "♨️", description: "只能放置在营地内部；放置后解锁冶炼", material: true, category: "家具·II级", furniture: true, furnitureLevel: 2, furnitureType: "furnace" },
  orbCore: { id: "orbCore", name: "营地魔法球", icon: "🔮", description: "营地自带的升级核心，不可拆除", material: false, category: "营地核心" },
  cookedMushroom: { id: "cookedMushroom", name: "烤菌菇", icon: "🍄‍🟫", description: "恢复 24 点饱腹", effect: "hunger", amount: 24, category: "食物" },
  roastedBerries: { id: "roastedBerries", name: "烤浆果 / 热浆果餐", icon: "🥣", description: "恢复饱腹，并恢复少量生命", effect: "hunger", amount: 28, bonusHealth: 4, category: "食物" },
  safeWater: { id: "safeWater", name: "煮沸净水", icon: "💧", description: "煮沸生水后获得的安全饮用水", effect: "thirst", amount: 40, category: "水源" },
  driedBerries: { id: "driedBerries", name: "果干 / 干粮", icon: "🍇", description: "轻便耐储存的远征食物", effect: "hunger", amount: 24, category: "食物" },
  rawMeat: { id: "rawMeat", name: "生肉", icon: "🥩", description: "狩猎系统资源，需烹饪后食用", material: true, category: "肉类" },
  cookedMeat: { id: "cookedMeat", name: "熟肉", icon: "🍖", description: "篝火烤制的高饱腹食物", effect: "hunger", amount: 38, category: "食物" },
  feather: { id: "feather", name: "羽毛", icon: "🪶", description: "探索痕迹与鸟类资源，可制作箭矢", material: true, category: "狩猎" },
  hide: { id: "hide", name: "动物毛皮", icon: "🐾", description: "用于保暖衣物、背包与皮革加工", material: true, category: "狩猎" },
  bone: { id: "bone", name: "兽骨", icon: "🦴", description: "可加工成骨钩、骨针等工具", material: true, category: "狩猎" },
  sinew: { id: "sinew", name: "兽筋", icon: "〰️", description: "可制作强力弓弦", material: true, category: "狩猎" },
  leather: { id: "leather", name: "皮革", icon: "🟫", description: "动物毛皮在工作台鞣制的材料", material: true, category: "半成品" },
  boneHook: { id: "boneHook", name: "骨钩", icon: "🪝", description: "由兽骨加工而成，可替代鱼竿金属废件", material: true, category: "工具材料" },
  emptyContainer: { id: "emptyContainer", name: "空容器", icon: "🧴", description: "坠机点与废弃驻地搜刮物，用于装水与过滤装置", material: true, category: "工业零件" },
  tape: { id: "tape", name: "胶带", icon: "🩹", description: "机械维修师陈砾擅长利用胶带快速修补", material: true, category: "工业零件" },
  scrapMetal: { id: "scrapMetal", name: "废旧零件", icon: "⚙️", description: "废弃驻地与坠机点搜刮物", material: true, category: "工业零件" },
  wire: { id: "wire", name: "电线", icon: "〰️", description: "废弃驻地与旧观测站搜刮物", material: true, category: "工业零件" },
  radioRepairKit: { id: "radioRepairKit", name: "无线电修理包", icon: "📻", description: "修复损坏无线电的接收模块，用于追踪旧巡护站信号", material: true, category: "任务工具" },
  battery: { id: "battery", name: "废旧电池", icon: "🔋", description: "旧观测站搜刮物", material: true, category: "工业零件" },
  basicParts: { id: "basicParts", name: "基础零件", icon: "⚙️", description: "由废旧零件整理或拆解获得", material: true, category: "工业零件" },
  electronics: { id: "electronics", name: "电子元件", icon: "💾", description: "迷雾研究站专属搜刮物", material: true, category: "工业零件" },
  industrialFuel: { id: "industrialFuel", name: "工业燃料", icon: "🛢️", description: "第四章废弃驻地与研究站深处资源", material: true, category: "工业零件" },
  raft: { id: "raft", name: "简易木筏", icon: "🛶", description: "制作后解锁碎石河谷入口", material: true, category: "探索工具" },
  storageChest: { id: "storageChest", name: "储物箱组件", icon: "🧰", description: "可放置在营地内部的储物家具组件", material: true, category: "营地设施" },
  waterFilter: { id: "waterFilter", name: "净水装置", icon: "🚰", description: "空容器、木炭、鹅卵石与木材组成的营地设施", material: true, category: "营地设施" },
  stoneFurnace: { id: "stoneFurnace", name: "石质熔炉组件", icon: "♨️", description: "营地 II 级后可放置，用于冶炼金属锭", material: true, category: "营地设施", furniture: true, furnitureLevel: 2, furnitureType: "furnace" },
  axe: { id: "axe", name: "石斧", icon: "🪓", description: "基础伐木工具；耐久耗尽后会损坏", material: true, category: "工具", durabilityMax: 40 },
  pickaxe: { id: "pickaxe", name: "石镐", icon: "⛏️", description: "初级矿镐；开采石林与矿脉，耐久耗尽后会损坏", material: true, category: "工具", durabilityMax: 36 },
  ironAxe: { id: "ironAxe", name: "铁斧", icon: "🪓", description: "高耐久伐木工具", material: true, category: "工具", durabilityMax: 100 },
  ironPickaxe: { id: "ironPickaxe", name: "铁镐（旧版工具）", icon: "⛏️", description: "旧存档兼容工具", material: true, category: "工具", durabilityMax: 90 },
  copperAxe: { id: "copperAxe", name: "铜斧", icon: "🪓", description: "II级伐木工具，耐久 100", material: true, category: "工具·II级", durabilityMax: 100 },
  silverAxe: { id: "silverAxe", name: "银斧", icon: "🪓", description: "III级伐木工具，耐久 160", material: true, category: "工具·III级", durabilityMax: 160 },
  goldAxe: { id: "goldAxe", name: "金斧", icon: "🪓", description: "IV级伐木工具，耐久 240", material: true, category: "工具·IV级", durabilityMax: 240 },
  copperPickaxe: { id: "copperPickaxe", name: "铜镐", icon: "⛏️", description: "II级采矿工具，耐久 90", material: true, category: "工具·II级", durabilityMax: 90 },
  silverPickaxe: { id: "silverPickaxe", name: "银镐", icon: "⛏️", description: "III级采矿工具，耐久 140", material: true, category: "工具·III级", durabilityMax: 140 },
  goldPickaxe: { id: "goldPickaxe", name: "金镐", icon: "⛏️", description: "IV级采矿工具，耐久 210", material: true, category: "工具·IV级", durabilityMax: 210 },
  crossbow: { id: "crossbow", name: "十字弩", icon: "🏹", description: "木板、金属锭与基础零件制作的进阶远程武器", material: true, category: "武器", durabilityMax: 80 }
};
const inventoryState = {
  backpackLevel: 1,
  slots: [
    { ...itemCatalog.bread, count: 3 },
    { ...itemCatalog.water, count: 3 },
    { ...itemCatalog.medkit, count: 2 },
    null, null, null, null, null, null, null, null, null
  ],
  hotbar: [null, null, null, null, null],
  activeHotbarIndex: 0,
  selectedContainer: null
};
let worldTimeMinutes = 8 * 60 + 30;
const weatherTypes = [
  { id: "clear", label: "晴朗", icon: "☀", weight: 38 },
  { id: "cloudy", label: "多云", icon: "☁", weight: 27 },
  { id: "rain", label: "小雨", icon: "🌧", weight: 20 },
  { id: "fog", label: "浓雾", icon: "🌫", weight: 10 },
  { id: "storm", label: "雷暴", icon: "⛈", weight: 5 }
];
let weatherState = { id: "clear", nextChangeAt: worldTimeMinutes + 90 + Math.random() * 100 };
let weatherParticleTick = 0;

// v30：统一的室内外环境状态。当前项目的飞机残骸和营地是独立场景，
// 因此先按 location 切换；同一张世界地图的屋顶/窗洞可继续接入局部遮罩。
const roomEnvironment = {
  roomId: "outdoor",
  targetWeatherAlpha: 1,
  weatherAlpha: 1,
  targetOutdoorTintAlpha: 1,
  outdoorTintAlpha: 1,
  targetWindExposure: 1,
  windExposure: 1,
  transitionSpeed: 5.5
};

function getRoomEnvironmentTarget() {
  if (gameState.location === "aircraft") {
    return { roomId: `aircraft-${gameState.aircraftFloor || "lower"}`, weatherAlpha: 0, tintAlpha: 0, windExposure: 0 };
  }
  if (gameState.location === "camp") {
    return { roomId: "camp-interior", weatherAlpha: 0, tintAlpha: 0, windExposure: 0 };
  }
  if (gameState.location === "cabin") {
    return { roomId: "abandoned-cabin-interior", weatherAlpha: 0, tintAlpha: 0, windExposure: 0 };
  }
  if (gameState.location === "region") {
    // 区域地图是导航界面，不直接显示世界天气粒子。
    return { roomId: "region-map", weatherAlpha: 0, tintAlpha: 0, windExposure: 0 };
  }
  return { roomId: "outdoor", weatherAlpha: 1, tintAlpha: 1, windExposure: 1 };
}

// 同一张世界地图内的室内区域遮罩。登记的矩形使用世界坐标，随摄像机移动。
// 当前飞机/营地是独立场景，暂不需要登记；未来建筑开口/屋顶可按实际地图坐标接入。
const weatherOcclusionAreas = [];
function registerWeatherOcclusionArea(area) {
  if (!area || !Number.isFinite(area.x) || !Number.isFinite(area.y) || !(area.width > 0) || !(area.height > 0)) return false;
  const id = area.id || `weather-mask-${weatherOcclusionAreas.length + 1}`;
  const normalized = { id, x: area.x, y: area.y, width: area.width, height: area.height };
  const index = weatherOcclusionAreas.findIndex(item => item.id === id);
  if (index >= 0) weatherOcclusionAreas[index] = normalized;
  else weatherOcclusionAreas.push(normalized);
  return true;
}
function clipToOutdoorRegions(targetCtx) {
  if (gameState.location !== "world" || weatherOcclusionAreas.length === 0 || typeof Path2D === "undefined") return;
  const cameraX = cameraState.x || 0;
  const cameraY = cameraState.y || 0;
  const path = new Path2D();
  path.rect(0, 0, canvas.width, canvas.height);
  for (const area of weatherOcclusionAreas) {
    path.rect(area.x - cameraX, area.y - cameraY, area.width, area.height);
  }
  // evenodd 将每个室内矩形从室外天气/滤镜裁剪区域中挖空。
  targetCtx.clip(path, "evenodd");
}

function updateRoomEnvironment(deltaTime) {
  const target = getRoomEnvironmentTarget();
  roomEnvironment.roomId = target.roomId;
  roomEnvironment.targetWeatherAlpha = target.weatherAlpha;
  roomEnvironment.targetOutdoorTintAlpha = target.tintAlpha;
  roomEnvironment.targetWindExposure = target.windExposure;
  const blend = 1 - Math.exp(-roomEnvironment.transitionSpeed * Math.max(0, deltaTime));
  roomEnvironment.weatherAlpha += (roomEnvironment.targetWeatherAlpha - roomEnvironment.weatherAlpha) * blend;
  roomEnvironment.outdoorTintAlpha += (roomEnvironment.targetOutdoorTintAlpha - roomEnvironment.outdoorTintAlpha) * blend;
  roomEnvironment.windExposure += (roomEnvironment.targetWindExposure - roomEnvironment.windExposure) * blend;
  if (Math.abs(roomEnvironment.weatherAlpha - roomEnvironment.targetWeatherAlpha) < 0.005) roomEnvironment.weatherAlpha = roomEnvironment.targetWeatherAlpha;
  if (Math.abs(roomEnvironment.outdoorTintAlpha - roomEnvironment.targetOutdoorTintAlpha) < 0.005) roomEnvironment.outdoorTintAlpha = roomEnvironment.targetOutdoorTintAlpha;
  if (Math.abs(roomEnvironment.windExposure - roomEnvironment.targetWindExposure) < 0.005) roomEnvironment.windExposure = roomEnvironment.targetWindExposure;
}
let hudRefreshElapsed = 0;
let saveElapsed = 0;
let stepSoundElapsed = 0;

function triggerPlayerDeath() {
  if (!gameState.running) return;
  gameState.running = false;
  gameState.keys.clear();
  if (gameState.animationFrameId !== null) cancelAnimationFrame(gameState.animationFrameId);
  gameState.animationFrameId = null;
  saveGame(false);
  const overlay = document.querySelector("#death-overlay");
  if (overlay) overlay.classList.remove("hidden");
}
// 饱腹每 30 游戏分钟下降 1 点，水分每 20 游戏分钟下降 1 点。
// 饥饿或口渴任一归零后，每个游戏小时损失 15 点生命值；生命归零立即进入死亡界面。
function updateSurvival(deltaTime) {
  const gameMinutesElapsed = deltaTime * 2;
  survivalState.hunger = Math.max(0, survivalState.hunger - gameMinutesElapsed / 30);
  survivalState.thirst = Math.max(0, survivalState.thirst - gameMinutesElapsed / 20);
  if (survivalState.hunger <= 0 || survivalState.thirst <= 0) {
    survivalState.health = Math.max(0, survivalState.health - gameMinutesElapsed * 15 / 60);
  }
  if (survivalState.health <= 0 && gameState.running) triggerPlayerDeath();
}
// ================================
// 3.5 音量设置与轻量程序化环境音
// ================================
function loadAudioSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("wilderness-survival-audio-settings-v1") || "null");
    if (!saved || typeof saved !== "object") return { ...DEFAULT_AUDIO_SETTINGS };
    return {
      master: clampSetting(saved.master, 0, 100, 70),
      ambient: clampSetting(saved.ambient, 0, 100, 12),
      sfx: clampSetting(saved.sfx, 0, 100, 45),
      mute: Boolean(saved.mute)
    };
  } catch (error) {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}
function clampSetting(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
function persistAudioSettings() {
  try { localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(audioSettings)); } catch (error) {}
}
function ensureAudioStarted() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext) {
      audioContext = new AudioContextClass();
      const length = audioContext.sampleRate * 2;
      const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
      const channel = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i++) {
        // 低频滤过的随机噪声，作为非常轻的风声环境音。
        last = last * 0.96 + (Math.random() * 2 - 1) * 0.04;
        channel[i] = last * 3.5;
      }
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;
      ambientGainNode = audioContext.createGain();
      source.connect(filter);
      filter.connect(ambientGainNode);
      ambientGainNode.connect(audioContext.destination);
      source.start();
      ambientStarted = true;
    }
    if (audioContext.state === "suspended") audioContext.resume();
    applyAudioSettings();
  } catch (error) {
    // 浏览器不支持 Web Audio 时，游戏的其它功能仍可正常使用。
  }
}
function applyAudioSettings() {
  const muted = audioSettings.mute;
  if (ambientGainNode && audioContext) {
    const target = muted ? 0 : (audioSettings.master / 100) * (audioSettings.ambient / 100) * 0.12;
    ambientGainNode.gain.setTargetAtTime(target, audioContext.currentTime, 0.12);
  }
}
function playSoundEffect(kind = "tap") {
  if (audioSettings.mute || audioSettings.master <= 0 || audioSettings.sfx <= 0) return;
  ensureAudioStarted();
  if (!audioContext) return;
  try {
    const patterns = {
      tap: { wave: "sine", notes: [[430, 0, .07]], volume: .045 },
      pickup: { wave: "sine", notes: [[520, 0, .09], [760, .055, .11]], volume: .075 },
      harvest: { wave: "triangle", notes: [[190, 0, .08], [320, .045, .07], [240, .095, .09]], volume: .065 },
      craft: { wave: "triangle", notes: [[420, 0, .08], [560, .07, .08], [720, .14, .13]], volume: .075 },
      upgrade: { wave: "sine", notes: [[330, 0, .12], [495, .09, .12], [660, .18, .12], [990, .27, .22]], volume: .08 },
      drop: { wave: "triangle", notes: [[260, 0, .07], [170, .04, .12]], volume: .055 },
      use: { wave: "sine", notes: [[640, 0, .08], [520, .07, .12]], volume: .06 },
      save: { wave: "sine", notes: [[500, 0, .08], [820, .08, .16]], volume: .06 },
      enter: { wave: "sine", notes: [[360, 0, .13], [540, .10, .18]], volume: .055 },
      damage: { wave: "sawtooth", notes: [[150, 0, .16], [100, .07, .18]], volume: .05 },
      swing: { wave: "sawtooth", notes: [[470, 0, .045], [330, .025, .055], [220, .055, .08]], volume: .085 },
      toolHit: { wave: "triangle", notes: [[180, 0, .045], [95, .025, .09], [62, .055, .10]], volume: .12 },
      woodHit: { wave: "triangle", notes: [[155, 0, .04], [105, .025, .07]], volume: .105 },
      stoneHit: { wave: "square", notes: [[620, 0, .025], [340, .018, .07], [125, .045, .08]], volume: .10 },
      bow: { wave: "triangle", notes: [[520, 0, .045], [330, .035, .075], [760, .06, .055]], volume: .09 },
      hit: { wave: "square", notes: [[115, 0, .075], [72, .035, .11]], volume: .12 },
      metalHit: { wave: "sine", notes: [[880, 0, .035], [620, .025, .08], [310, .07, .10]], volume: .10 },
      beastDeath: { wave: "sawtooth", notes: [[180, 0, .09], [120, .07, .13], [80, .16, .16]], volume: .085 },
      sleep: { wave: "sine", notes: [[260, 0, .15], [330, .14, .18], [440, .31, .24]], volume: .065 },
      step: { wave: "triangle", notes: [[105, 0, .035]], volume: .018 }
    };
    const pattern = patterns[kind] || patterns.tap;
    const now = audioContext.currentTime;
    pattern.notes.forEach(([frequency, delay, duration]) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = pattern.wave;
      oscillator.frequency.setValueAtTime(frequency, now + delay);
      if (kind === "harvest" || kind === "drop") oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * .72), now + delay + duration);
      const level = (audioSettings.master / 100) * (audioSettings.sfx / 100) * pattern.volume;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), now + delay + .012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now + delay); oscillator.stop(now + delay + duration + .01);
    });
  } catch (error) {}
}
function syncAudioSettingsUI() {
  for (const key of ["master", "ambient", "sfx"]) {
    const input = audioSettingInputs[key];
    const output = document.querySelector(`#${key === "master" ? "master" : key === "ambient" ? "ambient" : "sfx"}-volume-value`);
    if (input) input.value = audioSettings[key];
    if (output) output.textContent = `${audioSettings[key]}%`;
  }
  if (audioSettingInputs.mute) audioSettingInputs.mute.checked = audioSettings.mute;
}
function setupAudioSettings() {
  syncAudioSettingsUI();
  ["master", "ambient", "sfx"].forEach(key => {
    audioSettingInputs[key].addEventListener("input", () => {
      audioSettings[key] = Number(audioSettingInputs[key].value);
      syncAudioSettingsUI();
      persistAudioSettings();
      ensureAudioStarted();
      applyAudioSettings();
      if (key === "sfx") playSoundEffect("tap");
    });
  });
  audioSettingInputs.mute.addEventListener("change", () => {
    audioSettings.mute = audioSettingInputs.mute.checked;
    persistAudioSettings();
    ensureAudioStarted();
    applyAudioSettings();
    if (!audioSettings.mute) playSoundEffect("tap");
  });
  settingsResetButton.addEventListener("click", () => {
    Object.assign(audioSettings, DEFAULT_AUDIO_SETTINGS);
    syncAudioSettingsUI();
    persistAudioSettings();
    reduceCameraMotion = true;
    if (reduceCameraMotionInput) reduceCameraMotionInput.checked = true;
    try { localStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify({ reduceMotion: true })); } catch (error) {}
    cameraState.x = null;
    cameraState.y = null;
    ensureAudioStarted();
    applyAudioSettings();
    playSoundEffect("tap");
  });
  document.addEventListener("pointerdown", ensureAudioStarted, { once: true });
}
// ================================
// 4. 切换界面
// ================================
function showScreen(screenId) {
  screens.forEach((screen) => {
    const isTargetScreen = screen.id === screenId;
    // 控制当前显示哪个界面
    screen.classList.toggle("active", isTargetScreen);
    // 当前界面移除 hidden，其他界面添加 hidden
    screen.classList.toggle("hidden", !isTargetScreen);
  });
}
// ================================
// 5. 开场剧情
// ================================
let storyTimer = null;
let storyFinished = false;
let storyIndex = 0;
function startStory() {
  showScreen("story-screen");
  storyFinished = false;
  storyIndex = 0;
  storyText.textContent = "";
  nextStoryButton.hidden = true;
  skipStoryButton.hidden = false;
  clearTimeout(storyTimer);
  showNextStoryLine();
}
function showNextStoryLine() {
  if (storyIndex >= openingStory.split("\n\n").length) {
    finishStory();
    return;
  }
  const paragraphs = openingStory.split("\n\n");
  storyText.textContent +=
    (storyText.textContent ? "\n\n" : "") + paragraphs[storyIndex];
  storyIndex++;
  storyTimer = setTimeout(showNextStoryLine, 1500);
}
function finishStory() {
  clearTimeout(storyTimer);
  storyFinished = true;
  storyText.textContent = openingStory;
  skipStoryButton.hidden = true;
  nextStoryButton.hidden = false;
}
function skipStory() {
  if (storyFinished) {
    showCharacterSelection();
    return;
  }
  finishStory();
}
skipStoryButton.addEventListener("click", skipStory);
nextStoryButton.addEventListener("click", showCharacterSelection);
// ================================
// 6. 角色选择
// ================================
function renderCharacters() {
  characterList.innerHTML = "";
  characters.forEach((character) => {
    const card = document.createElement("article");
    card.className = "character-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", "false");
    card.innerHTML = `
      <div class="character-icon"><img src="${character.icon}" alt="${character.name}" loading="eager"></div>
      <h3>${character.name}</h3>
      <p>${character.job}</p>
      <p class="ability">${character.ability}</p>
      <p>${character.description}</p>
    `;
    function selectThisCharacter() {
      gameState.selectedCharacter = character;
      updateCharacterSelection();
    }
    card.addEventListener("click", selectThisCharacter);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectThisCharacter();
      }
    });
    characterList.appendChild(card);
  });
  updateCharacterSelection();
}
function updateCharacterSelection() {
  const cards = characterList.querySelectorAll(".character-card");
  cards.forEach((card, index) => {
    const selected =
      characters[index].id === gameState.selectedCharacter?.id;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
  confirmCharacterButton.disabled = !gameState.selectedCharacter;
}
function showCharacterSelection() {
  showScreen("character-screen");
  renderCharacters();
}
confirmCharacterButton.addEventListener("click", () => {
  if (!gameState.selectedCharacter) {
    return;
  }
  document.querySelector("#player-name").textContent = gameState.selectedCharacter.name;
  placeAvailableCompanions();
  openSaveSlotPicker("new");
});
backMenuButton.addEventListener("click", () => {
  showScreen("menu-screen");
});
// ================================
// 7. 主菜单按钮
// ================================
startButton.addEventListener("click", startStory);
continueButton.addEventListener("click", () => openSaveSlotPicker("continue"));
saveSlotClose?.addEventListener("click", () => saveSlotModal.classList.add("hidden"));
saveSlotList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-slot-action]");
  if (!button) return;
  const slot = Number(button.dataset.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > 4) return;
  const data = readSaveSlot(slot);
  if (saveSlotPickerMode === "new") {
    if (data && !window.confirm(`存档位 ${slot} 已有进度。确定覆盖并开始新游戏吗？`)) return;
    currentSaveSlot = slot;
    saveSlotModal.classList.add("hidden");
    startGame();
    showToast(`已选择存档位 ${slot}。之后自动保存会写入当前档位。`);
    return;
  }
  if (saveSlotPickerMode === "save") {
    if (data && slot !== currentSaveSlot && !window.confirm(`存档位 ${slot} 已有进度。确定覆盖吗？`)) return;
    if (data && slot === currentSaveSlot && !window.confirm(`覆盖当前存档位 ${slot}？`)) return;
    currentSaveSlot = slot;
    saveSlotModal.classList.add("hidden");
    saveGame(true);
    return;
  }
  if (!data) { showToast(`存档位 ${slot} 为空。开始新游戏即可选择这个档位。`); return; }
  currentSaveSlot = slot;
  if (loadGame(slot)) {
    saveSlotModal.classList.add("hidden");
    showScreen("game-screen");
    launchGameLoop();
    showToast(`已读取存档位 ${slot}，继续你的求生旅程。`);
  }
});
profilesButton.addEventListener("click", () => {
  renderProfiles();
  showScreen("profiles-screen");
});
let settingsReturnScreen = "menu-screen";
function openSettings(returnTo = "menu-screen") {
  settingsReturnScreen = returnTo;
  gameState.keys.clear();
  // 打开设置时暂停游戏循环，避免后台仍持续重绘地图造成卡顿。
  if (returnTo === "game-screen" && gameState.animationFrameId !== null) {
    cancelAnimationFrame(gameState.animationFrameId);
    gameState.animationFrameId = null;
  }
  settingsBackButton.textContent = returnTo === "game-screen" ? "返回游戏" : "返回主菜单";
  showScreen("settings-screen");
}
settingsButton.addEventListener("click", () => openSettings("menu-screen"));
document.querySelector("#in-game-settings-btn").addEventListener("click", () => openSettings("game-screen"));
const settingsExitButton = document.querySelector("#settings-exit-btn");
settingsExitButton.addEventListener("click", () => {
  if (settingsReturnScreen === "game-screen") stopGame();
  gameState.keys.clear();
  showScreen("menu-screen");
  playSoundEffect("tap");
});
profilesBackButton.addEventListener("click", () => {
  showScreen("menu-screen");
});
settingsBackButton.addEventListener("click", () => {
  const returnTo = settingsReturnScreen;
  showScreen(returnTo);
  if (returnTo === "game-screen") {
    // 重新进入游戏循环，不重置角色、时间或背包。
    launchGameLoop();
  }
  playSoundEffect("tap");
});
exitGameButton.addEventListener("click", () => {
  stopGame();
  showScreen("menu-screen");
});
document.querySelector("#death-menu-btn")?.addEventListener("click", () => {
  document.querySelector("#death-overlay")?.classList.add("hidden");
  showScreen("menu-screen");
  updateContinueButton();
});
document.querySelector("#death-restart-btn")?.addEventListener("click", () => {
  document.querySelector("#death-overlay")?.classList.add("hidden");
  startGame();
});
function renderProfiles() {
  profilesList.innerHTML = "";
  characters.forEach((character) => {
    const item = document.createElement("div");
    item.className = "profile-item";
    const title = document.createElement("strong");
    const portrait = document.createElement("img");
    portrait.className = "profile-portrait";
    portrait.src = character.icon;
    portrait.alt = `${character.name}头像`;
    portrait.onerror = () => { portrait.style.display = "none"; };
    title.textContent = `${character.name} · ${character.job}`;
    const description = document.createElement("p");
    description.textContent =
      `${character.ability}：${character.description}`;
    item.append(portrait, title, description);
    profilesList.appendChild(item);
  });
}
// ================================
// 8. 创建第一张测试地图
  /* 地图系统 1.0
   地图大小：100 × 100
   每格大小：32 × 32 像素
========================================= */
const TILE_SIZE = 32;
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
// 地形类型
const TERRAIN = {
  GRASS: "grass",
  FOREST: "forest",
  RIVER: "river",
  SHALLOW_WATER: "shallow_water",
  ROCKY: "rocky",
  SAND: "sand",
  DIRT: "dirt",
  MEADOW: "meadow"
};
// 固定随机数：相同坐标始终得到相同结果
function getTileRandom(col, row) {
  const value = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
  return value - Math.floor(value);
}
// 根据地图坐标决定地形
function getTerrain(col, row) {
  // 出生点周围生成一小片安全草地，避免角色开局落在河道里。
  if (col >= 47 && col <= 53 && row >= 47 && row <= 53) return TERRAIN.GRASS;
  // 蜿蜒河流：河道中心随纵向坐标变化
  const riverCenter = 51 + Math.sin(row * 0.09) * 9;
  const riverDistance = Math.abs(col - riverCenter);
  // 三处浅滩形成自然过河点，避免蜿蜒河流把地图切成无法穿越的区域。
  const riverCrossing = [27, 52, 77].some(crossRow => Math.abs(row - crossRow) <= 1);
  if (riverDistance < 2.3 && !riverCrossing) {
    return TERRAIN.RIVER;
  }
  if (riverDistance < 3.5 || (riverDistance < 2.3 && riverCrossing)) {
    return TERRAIN.SHALLOW_WATER;
  }
  // 河谷外侧加入沙地、草甸和蜿蜒土路，打破大面积重复地块。
  if (col > 72 && row > 58 && row < 91 && getTileRandom(col + 33, row + 22) > 0.3) {
    return TERRAIN.SAND;
  }
  const trailCenter = 73 + Math.sin(col * 0.055) * 10 + Math.sin(col * 0.13) * 2;
  if (Math.abs(row - trailCenter) < 1.15) return TERRAIN.DIRT;
  if (col > 22 && col < 43 && row > 20 && row < 42 && getTileRandom(col + 91, row + 18) > 0.35) {
    return TERRAIN.MEADOW;
  }
  // 西侧：草原
  if (col < 20 && row > 15 && row < 83) {
    return TERRAIN.GRASS;
  }
  // 东北侧石林不再用一条直线切换地貌：外围先出现碎石草坡、裸土和低矮灌丛，再逐渐过渡到石柱核心区。
  if (col >= 63 && col <= 76 && row >= 4 && row <= 32) {
    const edge = Math.min(col - 63, 76 - col, row - 4, 32 - row);
    const blend = getTileRandom(col + 301, row + 817);
    if (edge <= 2) return blend > 0.56 ? TERRAIN.DIRT : blend > 0.25 ? TERRAIN.MEADOW : TERRAIN.ROCKY;
    if (edge <= 5) return blend > 0.70 ? TERRAIN.ROCKY : blend > 0.42 ? TERRAIN.DIRT : blend > 0.20 ? TERRAIN.MEADOW : TERRAIN.GRASS;
    if (col > 68 && row < 27) return blend > 0.16 ? TERRAIN.ROCKY : TERRAIN.DIRT;
  }
  if (col > 72 && row < 24) return getTileRandom(col + 89, row + 177) > 0.12 ? TERRAIN.ROCKY : TERRAIN.DIRT;
  // 其余区域以森林为主
  if (getTileRandom(col, row) > 0.22) {
    return TERRAIN.FOREST;
  }
  return TERRAIN.GRASS;
}

// 主线地标注册表：新增任务时必须登记实体类型、固定坐标、入口/交互点和对应章节。
// v23 先将第一章飞机残骸落地；既有章节的建筑/结构仍由原有 storyPoint 绘制逻辑负责。
const QUEST_LANDMARKS = {
  aircraftWreck: { id: "landmark-aircraft-wreck", type: "aircraftWreck", col: 53, row: 48, entrance: { x: 56 * TILE_SIZE, y: 52 * TILE_SIZE }, label: "坠毁客机·残骸入口", chapters: [1] }
};
// 世界资源按坐标固定生成，存档只需记录哪些资源已被采集。
const worldObjects = [];
const regionObjects = [];
const worldObjectByTile = new Map();
const harvestedObjects = new Set();
// v31：树木多段采集状态与短暂打击反馈。状态挂在世界对象上，避免单击即消失。
const resourceHitEffects = [];
const harvestedAtMinutes = new Map();
const noRespawnObjects = new Set();
const RESOURCE_RESPAWN_MINUTES = 3 * 24 * 60; // 游戏内 3 天
const exploredTiles = new Set();
const SAVE_SLOT_PREFIX = "wilderness-survival-save-v21-slot-";
const LEGACY_SAVE_KEYS = ["wilderness-survival-save-v19-slot-1", "wilderness-survival-save-v18", "wilderness-survival-save-v17", "wilderness-survival-save-v16", "wilderness-survival-save-v15", "wilderness-survival-save-v13", "wilderness-survival-save-v1"];
let currentSaveSlot = 1;
let saveSlotPickerMode = "continue";
let enemies = [];
let projectiles = [];
let meleeEffects = [];
let enemySpawnElapsed = 0;
let attackCooldown = 0;
let meleeAttackState = null;
let hitstopRemaining = 0;
let mouseAim = { x: canvas.width * 0.7, y: canvas.height * 0.5, inside: false };
let toastTimer = null;
let interactionHintElapsed = 0;
const interactionNames = {
  tree: "树木", treeStump: "树桩", fruitTree: "野果树", log: "倒木", driftwood: "漂流木", aircraftWreck: "坠毁飞机残骸", playerCamp: "自建营地",
  rock: "石林岩块", stonePile: "零碎石块", branch: "树枝", reeds: "芦苇", mushroom: "菌菇",
  bush: "浆果灌木", flower: "野花", berries: "浆果灌木", campEntrance: "自建营地入口", cabinEntrance: "废弃木屋入口", waterSource: "河水取水点", riverGate: "碎石河谷入口", ridgeGate: "断脊高地入口", regionExit: "返回初始地图", regionCrate: "巡护员补给箱", storyPoint: "剧情线索", medicinalHerb: "止血草", ore: "铁矿脉", copperOre: "铜矿脉", silverOre: "银矿脉", goldOre: "金矿脉", pebbleNode: "河谷鹅卵石", highGrass: "高草丛"
};
const interactionPrompt = document.querySelector("#interaction-prompt");
function worldObjectId(col, row) { return `${col},${row}`; }
function createWorldObjects() {
  worldObjects.length = 0;
  worldObjectByTile.clear();
  for (let row = 1; row < MAP_HEIGHT - 1; row++) {
    for (let col = 1; col < MAP_WIDTH - 1; col++) {
      const terrain = getTerrain(col, row);
      const a = getTileRandom(col + 500, row + 700);
      const b = getTileRandom(col + 901, row + 1171);
      let type = null;
      if (terrain === TERRAIN.FOREST && a > 0.905) type = "treeSmall";
      else if (terrain === TERRAIN.FOREST && a > 0.73 && a <= 0.77 && b > 0.66) type = "log";
      else if ((terrain === TERRAIN.FOREST || terrain === TERRAIN.MEADOW) && b > 0.925 && a < 0.35) type = "mushroom";
      else if ((terrain === TERRAIN.FOREST || terrain === TERRAIN.GRASS || terrain === TERRAIN.MEADOW) && b > 0.83 && a < 0.31) type = "bush";
      else if (terrain === TERRAIN.FOREST && b > 0.80 && b < 0.84 && a > 0.5) type = "fern";
      else if (terrain === TERRAIN.ROCKY && a > 0.68) type = "rock";
      else if ((terrain === TERRAIN.GRASS || terrain === TERRAIN.MEADOW || terrain === TERRAIN.FOREST) && b > 0.865 && b < 0.92 && a > 0.35) type = "branch";
      else if ((terrain === TERRAIN.GRASS || terrain === TERRAIN.MEADOW || terrain === TERRAIN.FOREST || terrain === TERRAIN.SAND) && b > 0.92 && a > 0.38) type = "stonePile";
      else if ((terrain === TERRAIN.GRASS || terrain === TERRAIN.MEADOW) && b > 0.72 && b < 0.865 && a > 0.24) type = "highGrass";
      else if (terrain === TERRAIN.FOREST && b > 0.78 && b < 0.85 && a > 0.48) type = "highGrass";
      else if ((terrain === TERRAIN.FOREST || terrain === TERRAIN.MEADOW) && b > 0.75 && b < 0.78 && a > 0.35) type = "medicinalHerb";
      else if ((terrain === TERRAIN.GRASS || terrain === TERRAIN.MEADOW) && b > 0.82 && a > 0.58) type = "flower";
      else if (terrain === TERRAIN.FOREST && b > 0.78 && b < 0.80 && a > 0.35) type = "fruitTree";
      else if (terrain === TERRAIN.SHALLOW_WATER && b > 0.83) type = "reeds";
      else if (terrain === TERRAIN.SAND && b > 0.94) type = "driftwood";
      if (type) {
        const obj = { id: worldObjectId(col, row), col, row, type, ...(type === "treeSmall" ? { stageAt: worldTimeMinutes } : {}) };
        worldObjects.push(obj);
        worldObjectByTile.set(`${col},${row}`, obj);
      }
    }
  }
  // 保证树、巨石和枯木之间留出可通行的缝隙，避免密集障碍形成小型死胡同。
  const solidTypes = new Set(["tree", "treeMedium", "treeSmall", "treeStump", "rock", "log", "driftwood"]);
  const blockedTiles = new Set();
  const filtered = worldObjects.filter(obj => {
    if (!solidTypes.has(obj.type)) return true;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (blockedTiles.has(`${obj.col + dx},${obj.row + dy}`)) return false;
      }
    }
    blockedTiles.add(`${obj.col},${obj.row}`);
    return true;
  });
  worldObjects.length = 0;
  worldObjectByTile.clear();
  for (const obj of filtered) {
    // v39：为飞机残骸和南侧入口留出宽阔的步行缓冲区，避免树干碰撞箱卡住玩家。
    // 机身范围加上入口周围 3 格均不生成阻挡型物件；非阻挡小资源仍可保留在外圈。
    const inWreckFootprint = obj.col >= 52 && obj.col <= 60 && obj.row >= 47 && obj.row <= 52;
    const nearWreckEntrance = Math.abs(obj.col - 56) <= 3 && obj.row >= 50 && obj.row <= 56;
    if (inWreckFootprint && ["tree", "treeMedium", "treeSmall", "treeStump", "rock", "log", "driftwood"].includes(obj.type)) continue;
    if (nearWreckEntrance && ["tree", "treeMedium", "treeSmall", "treeStump", "rock", "log", "driftwood"].includes(obj.type)) continue;
    // 保留原有机身区域清理规则，确保不会有资源贴图覆盖机身。
    if (obj.col >= 53 && obj.col <= 59 && obj.row >= 48 && obj.row <= 51) continue;
    worldObjects.push(obj);
    worldObjectByTile.set(`${obj.col},${obj.row}`, obj);
  }
  // v23 地标注册：实体坐标与主线目标统一从此处读取，不再只放空坐标/图标。
  QUEST_LANDMARKS.aircraftWreck = { id: "landmark-aircraft-wreck", type: "aircraftWreck", col: 53, row: 48, entrance: { x: 56 * TILE_SIZE, y: 52 * TILE_SIZE }, label: "坠毁客机·残骸入口", chapters: [1] };
  const wreck = { id: QUEST_LANDMARKS.aircraftWreck.id, type: "aircraftWreck", col: QUEST_LANDMARKS.aircraftWreck.col, row: QUEST_LANDMARKS.aircraftWreck.row, landmarkId: "aircraftWreck" };
  worldObjects.push(wreck);
  worldObjectByTile.set(`${wreck.col},${wreck.row}`, wreck);
}
// ================================
// v23：飞机残骸实体与独立双层内部地图
// ================================
function drawAircraftWreck(x, y) {
  if (AssetManager.draw("aircraftWreck", ctx, x - 8, y - 2, 256, 128)) { ctx.save(); ctx.fillStyle="#f5d36f"; ctx.font="bold 12px sans-serif"; ctx.textAlign="center"; ctx.fillText("E 进入残骸",x+112,y+117); ctx.restore(); return; }

  // x/y 为残骸左上角。机身横向延伸约 7 格，南侧保留可进入的破损舱门。
  ctx.save();
  ctx.fillStyle = "rgba(20,22,17,.42)"; ctx.beginPath(); ctx.ellipse(x + 112, y + 67, 126, 47, -.05, 0, Math.PI * 2); ctx.fill();
  // 烧焦地面与散落金属碎片
  ctx.fillStyle = "#332f27"; ctx.fillRect(x + 18, y + 40, 70, 44); ctx.fillRect(x + 128, y + 48, 77, 37);
  ctx.fillStyle = "#554238"; ctx.fillRect(x + 24, y + 45, 52, 8); ctx.fillRect(x + 144, y + 62, 40, 6);
  ctx.fillStyle = "#a9a99a"; ctx.fillRect(x - 4, y + 29, 22, 7); ctx.fillRect(x + 198, y + 76, 26, 6); ctx.fillRect(x + 58, y + 83, 19, 5);
  // 断裂机翼
  ctx.fillStyle = "#858c88"; ctx.beginPath(); ctx.moveTo(x + 70, y + 42); ctx.lineTo(x + 14, y + 6); ctx.lineTo(x + 4, y + 13); ctx.lineTo(x + 42, y + 51); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#4c5858"; ctx.beginPath(); ctx.moveTo(x + 147, y + 45); ctx.lineTo(x + 220, y + 20); ctx.lineTo(x + 233, y + 27); ctx.lineTo(x + 173, y + 58); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#c0c4ba"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 14, y + 9); ctx.lineTo(x + 27, y + 22); ctx.moveTo(x + 215, y + 24); ctx.lineTo(x + 202, y + 37); ctx.stroke();
  // 主机身：金属外壳分段绘制，机头与尾部破损
  ctx.fillStyle = "#9aa29d"; ctx.fillRect(x + 35, y + 29, 151, 35);
  ctx.fillStyle = "#687574"; ctx.fillRect(x + 43, y + 34, 139, 25);
  ctx.fillStyle = "#c0c4ba"; ctx.fillRect(x + 48, y + 31, 126, 4); ctx.fillRect(x + 48, y + 60, 123, 3);
  // 机头残缺与尾部撕裂
  ctx.fillStyle = "#505b5b"; ctx.beginPath(); ctx.moveTo(x + 35, y + 29); ctx.lineTo(x + 21, y + 37); ctx.lineTo(x + 35, y + 51); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5d6763"; ctx.beginPath(); ctx.moveTo(x + 186, y + 29); ctx.lineTo(x + 203, y + 22); ctx.lineTo(x + 197, y + 43); ctx.lineTo(x + 207, y + 56); ctx.lineTo(x + 185, y + 63); ctx.closePath(); ctx.fill();
  // 客舱窗户
  for (let i = 0; i < 7; i++) { ctx.fillStyle = i === 5 ? "#1c292b" : "#9fc2c5"; ctx.fillRect(x + 58 + i * 15, y + 39, 9, 7); ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(x + 59 + i * 15, y + 40, 3, 2); }
  // 破口、铆钉、焦黑痕迹
  ctx.fillStyle = "#2c302b"; ctx.beginPath(); ctx.moveTo(x + 93, y + 30); ctx.lineTo(x + 103, y + 27); ctx.lineTo(x + 111, y + 35); ctx.lineTo(x + 105, y + 46); ctx.lineTo(x + 97, y + 42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d3b77a"; for (let i = 0; i < 8; i++) ctx.fillRect(x + 50 + i * 17, y + 54, 2, 2);
  // 明确的入口标记与交互范围提示
  ctx.fillStyle = "#443a2c"; ctx.fillRect(x + 103, y + 58, 21, 16); ctx.fillStyle = "#d4b879"; ctx.fillRect(x + 107, y + 59, 13, 3);
  ctx.fillStyle = "#f5d36f"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("E 进入残骸", x + 113, y + 103);
  ctx.restore();
}
function enterAircraft() {
  gameState.aircraftReturnPosition = { x: gameState.player.x, y: gameState.player.y };
  mainQuestState.flags.aircraftWreckVisited = true;
  gameState.location = "aircraft"; gameState.aircraftFloor = "lower"; gameState.aircraftSearch = null;
  gameState.player.x = canvas.width * .5; gameState.player.y = canvas.height * .72;
  gameState.keys.clear(); cameraState.x = null; cameraState.y = null;
  showToast("进入飞机残骸下层：客舱与货舱。靠近中央破损舱梯按 E 切换楼层，Q / Esc 返回森林。");
  drawWorld(); saveGame(false);
}
function leaveAircraft() {
  gameState.aircraftSearch = null;
  enemies = enemies.filter(enemy => enemy.location !== "aircraft");
  projectiles = projectiles.filter(projectile => projectile.location !== "aircraft");
  gameState.location = "world"; gameState.aircraftFloor = "lower";
  const pos = gameState.aircraftReturnPosition || { x: QUEST_LANDMARKS.aircraftWreck.entrance.x, y: QUEST_LANDMARKS.aircraftWreck.entrance.y + 45 };
  gameState.player.x = pos.x; gameState.player.y = pos.y + 48;
  gameState.keys.clear(); cameraState.x = null; cameraState.y = null;
  showToast("你离开了飞机残骸，回到翠影森林。"); drawWorld(); saveGame(false);
}
function toggleAircraftFloor() {
  gameState.aircraftSearch = null;
  gameState.aircraftFloor = gameState.aircraftFloor === "lower" ? "upper" : "lower";
  gameState.player.x = canvas.width * .5;
  gameState.player.y = canvas.height * .68;
  gameState.keys.clear();
  showToast(gameState.aircraftFloor === "upper" ? "进入上层：驾驶舱与断裂机翼区域。" : "返回下层：客舱与货舱。");
  drawWorld(); saveGame(false);
}
const AIRCRAFT_CONTAINERS = [
  { id: "aircraft:lower:rear-locker", floor: "lower", x: .29, y: .64, name: "尾舱应急储物箱", loot: [["cloth",1],["emptyContainer",1],["scrapMetal",2]] },
  { id: "aircraft:lower:cargo-crate", floor: "lower", x: .70, y: .67, name: "货舱运输箱", loot: [["tape",1],["basicParts",1],["scrapMetal",2]] },
  { id: "aircraft:lower:seat-bag", floor: "lower", x: .36, y: .36, name: "乘客行李包", loot: [["berries",1],["cloth",1],["medkit",1]] },
  { id: "aircraft:upper:cockpit-case", floor: "upper", x: .57, y: .48, name: "驾驶舱黑色设备箱", loot: [["basicParts",2],["tape",1],["scrapMetal",2]] },
  { id: "aircraft:upper:wing-kit", floor: "upper", x: .27, y: .62, name: "机翼维修工具箱", loot: [["scrapMetal",2],["cloth",1],["medkit",1]] }
];
function aircraftContainerPosition(container) { return { x: canvas.width * container.x, y: canvas.height * container.y }; }
function getNearestAircraftContainer(maxDistance = 78) {
  if (gameState.location !== "aircraft") return null;
  let nearest = null, best = maxDistance;
  for (const container of AIRCRAFT_CONTAINERS) {
    if (container.floor !== gameState.aircraftFloor) continue;
    const pos = aircraftContainerPosition(container);
    const d = Math.hypot(gameState.player.x - pos.x, gameState.player.y - pos.y);
    if (d < best) { nearest = container; best = d; }
  }
  return nearest;
}
function beginAircraftSearch(container) {
  if (!container) return;
  if (gameState.searchedContainers.includes(container.id)) { showToast(`${container.name}已经搜刮完毕。`); return; }
  const nextIndex = container.loot.findIndex((_, i) => !gameState.searchedContainers.includes(`${container.id}:item:${i}`));
  if (nextIndex < 0) { gameState.searchedContainers.push(container.id); showToast(`${container.name}已经没有剩余物资。`); return; }
  gameState.aircraftSearch = { id: container.id, index: nextIndex, nextAt: performance.now() + 1100, startedAt: performance.now() };
  gameState.player.actionType = "investigate"; gameState.player.actionStartedAt = performance.now(); gameState.player.actionUntil = performance.now() + 900;
  showToast(`开始搜索：${container.name}。物资正在逐件翻找，请稍候……`);
}
function updateAircraftSearch() {
  const search = gameState.aircraftSearch;
  if (!search || gameState.location !== "aircraft" || performance.now() < search.nextAt) return;
  const container = AIRCRAFT_CONTAINERS.find(c => c.id === search.id);
  if (!container) { gameState.aircraftSearch = null; return; }
  while (search.index < container.loot.length && gameState.searchedContainers.includes(`${container.id}:item:${search.index}`)) search.index++;
  if (search.index >= container.loot.length) {
    if (!gameState.searchedContainers.includes(container.id)) gameState.searchedContainers.push(container.id);
    gameState.aircraftSearch = null; showToast(`${container.name}搜索完成，箱内已清空。`); saveGame(false); return;
  }
  const [itemId, count] = container.loot[search.index];
  if (!addItemToInventory(itemId, count)) {
    showToast("背包空间不足，搜索暂停；整理背包后再次靠近储物箱继续。"); gameState.aircraftSearch = null; return;
  }
  gameState.searchedContainers.push(`${container.id}:item:${search.index}`);
  showToast(`搜索发现：${itemCatalog[itemId]?.name || itemId} ×${count}`);
  renderInventory(); renderHotbar(); playSoundEffect("pickup");
  search.index++;
  if (search.index >= container.loot.length) {
    gameState.searchedContainers.push(container.id); gameState.aircraftSearch = null;
    showToast(`${container.name}已搜索完毕，物资全部整理完成。`);
  } else {
    search.nextAt = performance.now() + 1350;
    gameState.player.actionType = "investigate"; gameState.player.actionStartedAt = performance.now(); gameState.player.actionUntil = performance.now() + 1050;
  }
  saveGame(false);
}
function drawAircraftContainer(container) {
  const pos = aircraftContainerPosition(container), x = Math.round(pos.x), y = Math.round(pos.y);
  const done = gameState.searchedContainers.includes(container.id);
  const opened = done || container.loot.every((_, i) => gameState.searchedContainers.includes(`${container.id}:item:${i}`));
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.32)"; ctx.beginPath(); ctx.ellipse(x+2,y+13,25,9,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = opened ? "#514d43" : "#6e5637"; ctx.fillRect(x-22,y-12,44,27);
  ctx.fillStyle = opened ? "#69665a" : "#b08a51"; ctx.fillRect(x-22,y-16,44,9);
  ctx.fillStyle = "#3a3328"; ctx.fillRect(x-17,y-8,34,17);
  ctx.fillStyle = "#c7a86a"; ctx.fillRect(x-3,y-14,6,8); ctx.fillRect(x-20,y-13,3,5); ctx.fillRect(x+17,y-13,3,5);
  ctx.strokeStyle = "#d5c39a"; ctx.lineWidth=1.5; ctx.strokeRect(x-22,y-16,44,31);
  if (opened) { ctx.fillStyle="#292a25"; ctx.fillRect(x-19,y-7,38,12); ctx.fillStyle="#9b8b6a"; ctx.fillRect(x-13,y-4,9,3); ctx.fillRect(x+3,y-2,11,3); }
  if (gameState.aircraftSearch?.id === container.id) {
    const remaining = Math.max(0, 1 - (performance.now() - (gameState.aircraftSearch.nextAt - 1100)) / 1100);
    ctx.fillStyle="rgba(0,0,0,.7)";ctx.fillRect(x-31,y-34,62,7);ctx.fillStyle="#d8b96c";ctx.fillRect(x-29,y-32,58*(1-remaining),3);
  } else if (!done) {
    ctx.fillStyle="#f1d28a";ctx.font="bold 11px sans-serif";ctx.textAlign="center";ctx.fillText("E 搜索",x,y-25);
  } else {
    ctx.fillStyle="#a9b7a0";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText("已搜空",x,y-25);
  }
  ctx.restore();
}
function drawAircraftInterior() {
  const w = canvas.width, h = canvas.height, upper = gameState.aircraftFloor === "upper";
  ctx.clearRect(0, 0, w, h);
  // 内部地图采用与野外地图一致的固定像素格、地面贴花、实体投影和清晰边界。
  ctx.fillStyle = "#171f1d"; ctx.fillRect(0,0,w,h);
  const left=Math.round(w*.12), top=Math.round(h*.12), width=Math.round(w*.76), height=Math.round(h*.75);
  ctx.fillStyle="#5a625d";ctx.fillRect(left,top,width,height);
  ctx.fillStyle="#9ba49a";ctx.fillRect(left+5,top+5,width-10,6);ctx.fillRect(left+5,top+height-11,width-10,6);
  ctx.fillStyle="#303936";ctx.fillRect(left+12,top+14,width-24,height-28);
  const tile=32;
  for(let y=top+18;y<top+height-18;y+=tile){for(let x=left+16;x<left+width-16;x+=tile){
    const variation=((Math.floor(x/tile)*17+Math.floor(y/tile)*31)%7);
    ctx.fillStyle=variation===0?"#515b55":variation===1?"#454f4a":"#3e4843";ctx.fillRect(x,y,tile-1,tile-1);
    ctx.fillStyle="rgba(185,190,173,.12)";ctx.fillRect(x+3,y+3,tile-7,2);
    ctx.strokeStyle="rgba(14,22,19,.35)";ctx.strokeRect(x+.5,y+.5,tile-1,tile-1);
  }}
  // 机身框架和弯曲侧壁
  ctx.fillStyle="#747d75";ctx.fillRect(left+7,top+12,9,height-24);ctx.fillRect(left+width-16,top+12,9,height-24);
  ctx.fillStyle="#bbc0b1";for(let y=top+26;y<top+height-20;y+=46){ctx.fillRect(left+8,y,7,3);ctx.fillRect(left+width-15,y,7,3);}
  // 侧壁窗框和外部冷光
  for(let i=0;i<7;i++){const x=left+32+i*(width-64)/7;ctx.fillStyle="#263633";ctx.fillRect(x,top+21,22,11);ctx.fillStyle="#75999a";ctx.fillRect(x+3,top+23,16,6);ctx.fillStyle="rgba(181,215,204,.35)";ctx.fillRect(x+4,top+23,4,2);}
  // 每层都有明显的中央通道和断裂金属片
  ctx.fillStyle="#777d70";ctx.fillRect(w*.465,top+25,w*.07,height-50);
  ctx.fillStyle="#9c9c88";ctx.fillRect(w*.49,top+25,3,height-50);ctx.fillRect(w*.52,top+25,2,height-50);
  ctx.fillStyle="#222a27";ctx.beginPath();ctx.moveTo(w*.57,h*.53);ctx.lineTo(w*.65,h*.49);ctx.lineTo(w*.72,h*.63);ctx.lineTo(w*.64,h*.71);ctx.lineTo(w*.59,h*.65);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#9ba49a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w*.58,h*.55);ctx.lineTo(w*.65,h*.51);ctx.lineTo(w*.70,h*.64);ctx.stroke();
  if(!upper){
    // 下层客舱：真实客机的 2+2 座椅排布，中间留出连续过道；每把椅子独立建模。
    for(let r=0;r<4;r++) for(const sx of [.235,.292,.651,.708]) {
      const x=w*sx, y=h*(.245+r*.112), sw=w*.043, sh=h*.070;
      ctx.fillStyle="rgba(0,0,0,.32)";ctx.beginPath();ctx.ellipse(x+sw*.5,y+sh*.92,sw*.62,sh*.18,0,0,Math.PI*2);ctx.fill();
      // 金属椅脚与底座
      ctx.fillStyle="#202925";ctx.fillRect(x+sw*.17,y+sh*.62,3,sh*.34);ctx.fillRect(x+sw*.72,y+sh*.62,3,sh*.34);
      ctx.fillStyle="#899087";ctx.fillRect(x+sw*.08,y+sh*.83,sw*.84,3);
      // 椅背：深色外壳、布面、侧翼与头枕
      ctx.fillStyle="#1c2925";ctx.fillRect(x,y,sw,sh*.66);
      ctx.fillStyle=r%2?"#52685d":"#455e54";ctx.fillRect(x+3,y+3,sw-6,sh*.46);
      ctx.fillStyle="#819183";ctx.fillRect(x+5,y+4,Math.max(2,sw*.13),sh*.34);
      ctx.fillStyle="#263b33";ctx.fillRect(x+sw*.28,y+sh*.08,sw*.47,sh*.14);
      ctx.fillStyle="#b2a98c";ctx.fillRect(x+sw*.16,y+sh*.51,sw*.68,sh*.13);
      ctx.fillStyle="#303b34";ctx.fillRect(x+sw*.1,y+sh*.65,sw*.8,sh*.13);
      ctx.fillStyle="#b8b5a0";ctx.fillRect(x+sw*.82,y+sh*.48,3,sh*.19);
      ctx.strokeStyle="#a5ad9d";ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,sw-1,sh*.68);
    }
    // 货舱隔板、绑带和散落行李
    ctx.fillStyle="#6c756b";ctx.fillRect(w*.19,h*.69,w*.62,5);ctx.fillStyle="#c3ad7e";ctx.fillRect(w*.19,h*.70,w*.62,2);
    for(let i=0;i<4;i++){const x=w*(.20+i*.105),y=h*(.72+(i%2)*.035);ctx.fillStyle="#282e29";ctx.fillRect(x+3,y+4,w*.075,h*.05);ctx.fillStyle=i%2?"#806344":"#9b8057";ctx.fillRect(x,y,w*.075,h*.05);ctx.strokeStyle="#c5a974";ctx.strokeRect(x,y,w*.075,h*.05);ctx.fillStyle="#44382b";ctx.fillRect(x+w*.035,y,4,h*.05);}
    ctx.fillStyle="#d7c8a5";ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.fillText("下层 · 客舱与货舱",w*.5,top-8);
  }else{
    // 上层驾驶舱：仪表台、断裂机翼梁和破碎风挡。
    ctx.fillStyle="#172b2b";ctx.fillRect(w*.36,h*.19,w*.28,h*.13);ctx.fillStyle="#83aeb0";ctx.fillRect(w*.375,h*.205,w*.25,h*.095);
    ctx.strokeStyle="#d0d0b8";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w*.36,h*.33);ctx.lineTo(w*.64,h*.33);ctx.stroke();
    ctx.fillStyle="#252e2b";ctx.fillRect(w*.30,h*.38,w*.40,h*.14);ctx.fillStyle="#66766b";ctx.fillRect(w*.32,h*.40,w*.36,h*.085);
    for(let i=0;i<8;i++){const x=w*(.345+i*.044);ctx.fillStyle=["#c47d50","#a9c2a0","#c7b86c"][i%3];ctx.beginPath();ctx.arc(x,h*.44,4,0,Math.PI*2);ctx.fill();ctx.fillStyle="#1d2926";ctx.fillRect(x-3,h*.455,6,5);}
    ctx.fillStyle="#717e75";ctx.beginPath();ctx.moveTo(w*.17,h*.57);ctx.lineTo(w*.43,h*.50);ctx.lineTo(w*.40,h*.63);ctx.lineTo(w*.20,h*.68);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#c1c8b7";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w*.19,h*.59);ctx.lineTo(w*.39,h*.55);ctx.moveTo(w*.25,h*.57);ctx.lineTo(w*.29,h*.65);ctx.moveTo(w*.34,h*.54);ctx.lineTo(w*.36,h*.62);ctx.stroke();
    ctx.fillStyle="#d7c8a5";ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.fillText("上层 · 驾驶舱与断裂机翼",w*.5,top-8);
  }
  // 结构性舱梯与入口：地面标识、金属梯级，和场景边界统一。
  ctx.fillStyle="#1d2824";ctx.fillRect(w*.455,h*.785,w*.09,h*.07);ctx.fillStyle="#b2b4a1";ctx.fillRect(w*.46,h*.79,w*.08,4);
  for(let i=0;i<4;i++){ctx.fillStyle=i%2?"#7e887e":"#aab1a2";ctx.fillRect(w*.465,h*(.802+i*.012),w*.07,3);}
  for(const container of AIRCRAFT_CONTAINERS){if(container.floor===gameState.aircraftFloor)drawAircraftContainer(container);}
  // 搜索时显示明确进度和当前容器，不会瞬间把整箱物资塞进背包。
  if(gameState.aircraftSearch){const c=AIRCRAFT_CONTAINERS.find(item=>item.id===gameState.aircraftSearch.id);if(c){ctx.fillStyle="rgba(9,14,12,.78)";ctx.fillRect(w*.30,h*.91,w*.40,28);ctx.fillStyle="#ead8a9";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText(`正在搜索：${c.name} · 翻找物资中…`,w*.5,h*.93+6);}}
  ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(16,16,245,38);ctx.fillStyle="#f2e6c8";ctx.font="bold 14px sans-serif";ctx.textAlign="left";ctx.fillText(upper?"飞机残骸 / 上层驾驶舱":"飞机残骸 / 下层客舱",28,40);
  ctx.fillStyle="rgba(0,0,0,.58)";ctx.fillRect(w-258,16,242,50);ctx.fillStyle="#f0d17a";ctx.font="12px sans-serif";ctx.fillText("WASD / 方向键：移动",w-244,37);ctx.fillText("E：搜刮 / 切换楼层　Q：离开",w-244,55);
  drawCharacterSprite(ctx,gameState.player.x,gameState.player.y,gameState.selectedCharacter?.id||"scout",gameState.player.facing||"down",gameState.player.moving,gameState.player.walkTime||0,gameState.player.actionUntil>performance.now()?gameState.player.actionType:"");
}
function showToast(message) {
  let toast = document.querySelector("#game-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "game-toast";
    toast.className = "game-toast";
    document.querySelector("#game-screen").appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}
function revealAroundPlayer() {
  const col = Math.floor(gameState.player.x / TILE_SIZE);
  const row = Math.floor(gameState.player.y / TILE_SIZE);
  const radius = 8;
  for (let y = Math.max(0, row - radius); y <= Math.min(MAP_HEIGHT - 1, row + radius); y++) {
    for (let x = Math.max(0, col - radius); x <= Math.min(MAP_WIDTH - 1, col + radius); x++) {
      if ((x - col) ** 2 + (y - row) ** 2 <= radius ** 2) exploredTiles.add(y * MAP_WIDTH + x);
    }
  }
}
function backpackCapacity(level = inventoryState.backpackLevel) {
  return ({ 1: 12, 2: 16, 3: 20, 4: 25, 5: 36 })[Math.max(1, Math.min(5, Number(level) || 1))] || 12;
}
function backpackDimensions(level = inventoryState.backpackLevel) {
  return ({ 1: [4, 3], 2: [4, 4], 3: [5, 4], 4: [5, 5], 5: [6, 6] })[Math.max(1, Math.min(5, Number(level) || 1))] || [4, 3];
}
function resizeBackpack(level) {
  const nextLevel = Math.max(1, Math.min(5, Number(level) || 1));
  const capacity = backpackCapacity(nextLevel);
  inventoryState.backpackLevel = nextLevel;
  if (inventoryState.slots.length < capacity) inventoryState.slots.push(...Array(capacity - inventoryState.slots.length).fill(null));
  else if (inventoryState.slots.length > capacity) {
    // 降级或旧存档异常时，不丢失物品；超出容量的格子保留到新空位整理后再处理。
    inventoryState.slots.length = capacity;
  }
  inventoryGrid.style.gridTemplateColumns = `repeat(${backpackDimensions(nextLevel)[0]}, minmax(0, 1fr))`;
  const label = document.querySelector("#backpack-level-label");
  if (label) label.textContent = `背包等级 ${["", "I", "II", "III", "IV", "V"][nextLevel]} · ${backpackDimensions(nextLevel).join("×")} · ${capacity} 格`;
}
function addItemToInventory(itemId, amount) {
  const item = itemCatalog[itemId];
  if (!item) return false;
  const isDurableTool = Boolean(item.durabilityMax);
  const existing = [...inventoryState.slots, ...inventoryState.hotbar].find(slot => slot && slot.id === itemId);
  if (existing && !isDurableTool) { existing.count += amount; return true; }
  if (existing && isDurableTool) return false; // 工具独立计算耐久，不与其他工具堆叠。
  const emptyIndex = inventoryState.slots.findIndex(slot => !slot);
  if (emptyIndex < 0) return false;
  inventoryState.slots[emptyIndex] = { ...item, count: isDurableTool ? 1 : amount, durability: item.durabilityMax || undefined };
  return true;
}
function findTool(id) { return [...inventoryState.slots, ...inventoryState.hotbar].find(slot => slot && slot.id === id && slot.count > 0); }
function hasWorkingTool(id) { const tool = findTool(id); return Boolean(tool && (tool.durability === undefined || tool.durability > 0)); }
const AXE_TOOL_IDS = ["goldAxe", "silverAxe", "copperAxe", "ironAxe", "axe"];
const PICKAXE_TOOL_IDS = ["goldPickaxe", "silverPickaxe", "copperPickaxe", "ironPickaxe", "pickaxe"];
function bestWorkingTool(ids) { return ids.find(id => hasWorkingTool(id)) || null; }
function hasAnyWorkingTool(ids) { return Boolean(bestWorkingTool(ids)); }
function toolForOre(type) {
  if (type === "goldOre") return bestWorkingTool(["goldPickaxe", "silverPickaxe"]); // 金矿需银镐或金镐
  if (type === "silverOre") return bestWorkingTool(["goldPickaxe", "silverPickaxe", "copperPickaxe"]); // 银矿需铜镐以上
  return bestWorkingTool(PICKAXE_TOOL_IDS);
}
function wearTool(id, amount) {
  const tool = findTool(id); if (!tool || !Number.isFinite(tool.durability)) return;
  tool.durability = Math.max(0, tool.durability - amount);
  if (tool.durability <= 0) {
    for (const list of [inventoryState.slots, inventoryState.hotbar]) {
      const index = list.findIndex(item => item === tool);
      if (index >= 0) list[index] = null;
    }
    showToast(`${itemCatalog[id].name}耐久耗尽，工具损坏了。可重新制作，后续可用胶带修理。`);
    renderInventory(); renderHotbar();
    return true;
  } else {
    showToast(`${itemCatalog[id].name}耐久：${tool.durability}/${tool.durabilityMax || itemCatalog[id].durabilityMax}`);
  }
  renderInventory(); renderHotbar();
  return false;
}
function getLootForObject(obj) {
  if (obj?.type === "droppedItem") return [obj.itemId, obj.count, `捡起${itemCatalog[obj.itemId]?.name || "物品"} ×${obj.count}`];
  return ({
    tree: ["wood", 3, "砍下木材 ×3"], treeStump: ["branch", 1, "清理树桩获得树枝 ×1"], fruitTree: ["berries", 2, "从野果树上采到野果 ×2"],
    log: ["wood", 2, "从倒木上收集木材 ×2"], driftwood: ["wood", 1, "捡到漂流木 ×1"],
    rock: ["stone", 3, "开采岩块，获得石块 ×3"], stonePile: ["stone", 1, "捡到零碎石块 ×1"],
    branch: ["branch", 1, "捡到树枝 ×1"], reeds: ["reeds", 1, "采集芦苇 ×1"],
    mushroom: ["unknownMushroom", 1, "采到未知蘑菇 ×1；需要角色辨识或加工后食用"],
    bush: ["berries", 2, "从灌木上采到野果 ×2"], berries: ["berries", 2, "采到野果 ×2"],
    flower: ["flower", 1, "采下野花 ×1"], highGrass: ["fiber", 2, "从高草丛收集植物纤维 ×2"],
    medicinalHerb: ["herb", 1, "采到止血草 ×1"], waterSource: ["dirtyWater", 1, "装取生水 ×1"],
    ore: ["ironOre", 2, "采到铁矿石 ×2"], copperOre: ["copperOre", 2, "采到铜矿石 ×2"], silverOre: ["silverOre", 2, "采到银矿石 ×2"], goldOre: ["goldOre", 2, "采到金矿石 ×2"], pebbleNode: ["pebble", 2, "捡到河谷鹅卵石 ×2"]
  })[obj.type] || null;
}
function activeObjectList() { return gameState.location === "region" ? regionObjects : worldObjects; }
// 区域图采用响应式画布布局，避免高分辨率屏幕上角色和资源挤在左上角。
function getRegionMapLayout() {
  const tile = Math.max(22, Math.min(TILE_SIZE, (canvas.width - 48) / 30, (canvas.height - 86) / 16));
  const width = tile * 30, height = tile * 16;
  return { tile, x: (canvas.width - width) / 2, y: Math.max(42, (canvas.height - height) / 2 + 8), width, height };
}
function getObjectWorldPosition(obj) {
  if (obj.type === "aircraftWreck") return { x: QUEST_LANDMARKS.aircraftWreck.entrance.x, y: QUEST_LANDMARKS.aircraftWreck.entrance.y };
  if (gameState.location === "region") { const l = getRegionMapLayout(); return { x: l.x + (obj.col + .5) * l.tile, y: l.y + (obj.row + .5) * l.tile }; }
  return { x: (obj.col + .5) * TILE_SIZE, y: (obj.row + .5) * TILE_SIZE };
}
function nearestWorldObject(maxDistance = 108) {
  let nearest = null;
  let nearestDistance = maxDistance;
  for (const obj of activeObjectList()) {
    if (obj.hidden || harvestedObjects.has(obj.id) || (obj.type === "regionCrate" && gameState.location === "region" && gameState.searchedContainers.includes(`${gameState.regionId}:main-crate`)) || (!getLootForObject(obj) && !["campEntrance","cabinEntrance","riverGate","ridgeGate","regionExit","regionCrate","waterSource","storyPoint","aircraftWreck","companionNpc"].includes(obj.type))) continue;
    const { x: ox, y: oy } = getObjectWorldPosition(obj);
    const distance = Math.hypot(gameState.player.x - ox, gameState.player.y - oy);
    if (distance < nearestDistance) { nearest = obj; nearestDistance = distance; }
  }
  if(gameState.location==="world") for(const camp of gameState.camps){
    const distance=Math.hypot(gameState.player.x-camp.x,gameState.player.y-camp.y);
    if(distance<nearestDistance){nearest={id:camp.id,col:camp.col,row:camp.row,type:"playerCamp",campId:camp.id};nearestDistance=distance;}
  }
  return nearest;
}
function activeCorpseMatchesLocation(enemy) {
  return enemy && !enemy.alive && Number.isFinite(enemy.corpseExpiresAt) &&
    worldTimeMinutes < enemy.corpseExpiresAt &&
    enemy.location === gameState.location &&
    (gameState.location !== "region" || enemy.regionId === gameState.regionId);
}
function nearestCorpse(maxDistance = 58) {
  let nearest = null, best = maxDistance;
  for (const enemy of enemies) {
    if (!activeCorpseMatchesLocation(enemy) || !Array.isArray(enemy.loot) || enemy.loot.length === 0) continue;
    const d = Math.hypot(gameState.player.x - enemy.x, gameState.player.y - enemy.y);
    if (d < best) { nearest = enemy; best = d; }
  }
  return nearest;
}
function nearestCampBed(maxDistance = 76) {
  if (gameState.location !== "camp") return null;
  const camp = selectedCamp();
  if (!camp) return null;
  let nearest = null, best = maxDistance;
  for (const furniture of camp.furniture || []) {
    if (furniture.type !== "bed") continue;
    const d = Math.hypot(gameState.player.x - furniture.x, gameState.player.y - furniture.y);
    if (d < best) { nearest = furniture; best = d; }
  }
  return nearest;
}
function openSleepMenu() {
  if (gameState.location !== "camp" || !selectedCamp()) {
    showToast("需要回到自己的营地休息。");
    return;
  }
  const bed = nearestCampBed(100);
  if (!bed) {
    showToast("先制作并在营地内放置「简易睡铺」，靠近睡铺后按 E 才能休息。");
    return;
  }
  if (enemies.some(e => e.alive && e.location === gameState.location && Math.hypot(e.x-gameState.player.x,e.y-gameState.player.y)<220)) {
    showToast("附近有危险，暂时无法安心入睡。");
    return;
  }
  sleepModal?.classList.remove("hidden");
}
function sleepForHours(hours, untilNextDay = false) {
  if (!gameState.running || gameState.location !== "camp" || !nearestCampBed(100)) {
    sleepModal?.classList.add("hidden");
    showToast("请靠近营地睡铺后再休息。");
    return;
  }
  const currentDayMinute = ((Math.floor(worldTimeMinutes) % 1440) + 1440) % 1440;
  let minutesToSleep = hours * 60;
  if (untilNextDay) minutesToSleep = 1440 - currentDayMinute + 360;
  const hoursSlept = minutesToSleep / 60;
  survivalState.hunger = Math.max(5, survivalState.hunger - 5 * hoursSlept);
  survivalState.thirst = Math.max(5, survivalState.thirst - 5 * hoursSlept);
  survivalState.health = Math.min(100, survivalState.health + 5 * hoursSlept);
  worldTimeMinutes += minutesToSleep;
  weatherState.nextChangeAt = Math.max(worldTimeMinutes + 25, weatherState.nextChangeAt);
  // 尸体按游戏时间保留一小时；睡眠跨过这段时间后立即清理。
  enemies = enemies.filter(e => e.alive || (Number.isFinite(e.corpseExpiresAt) && worldTimeMinutes < e.corpseExpiresAt));
  projectiles = [];
  sleepModal?.classList.add("hidden");
  renderHUD(); renderHotbar(); renderInventory(); drawWorld();
  playSoundEffect("sleep");
  showToast(untilNextDay
    ? `睡到次日 06:00。经过 ${hoursSlept.toFixed(1)} 小时，生命 +${Math.round(5*hoursSlept)}，饥饿和水分各减少 ${Math.round(5*hoursSlept)}（最低保留 5）。`
    : `休息了 3 小时。生命 +15，饥饿和水分各减少 15（最低保留 5）。`);
  saveGame(false);
}
function updateInteractionPrompt(deltaTime = 0) {
  if (!interactionPrompt) return;
  interactionHintElapsed += deltaTime;
  if (interactionHintElapsed < 0.12) return;
  interactionHintElapsed = 0;
  if (gameState.running && gameState.location === "aircraft") {
    const box = getNearestAircraftContainer(82);
    if (box) {
      const done = gameState.searchedContainers.includes(box.id);
      interactionPrompt.innerHTML = `<kbd>E</kbd><span>${box.name} · ${done ? "已搜刮" : "逐步搜索物资"}　<span style="opacity:.75">Q / Esc 离开</span></span>`;
    } else {
      interactionPrompt.innerHTML = `<kbd>E</kbd><span>${gameState.aircraftFloor === "lower" ? "破损舱梯 · 前往上层驾驶舱" : "货舱通道 · 前往下层客舱"}　<span style="opacity:.75">Q / Esc 离开</span></span>`;
    }
    interactionPrompt.classList.remove("hidden");
    return;
  }
  const obj = gameState.running && (gameState.location === "world" || gameState.location === "region") ? nearestWorldObject(108) : null;
  const fire = gameState.running && gameState.location === "world" ? nearestCampfire(76) : null;
  const corpse = gameState.running ? nearestCorpse(58) : null;
  const bed = gameState.running ? nearestCampBed(76) : null;
  if (corpse && inventoryModal.classList.contains("hidden") && mapModal.classList.contains("hidden") && craftingModal.classList.contains("hidden") && questModal.classList.contains("hidden") && (!sleepModal || sleepModal.classList.contains("hidden"))) {
    interactionPrompt.innerHTML = `<kbd>E</kbd><span>${ENEMY_TYPES[corpse.type]?.name || "野兽"}尸体 · 搜索战利品</span>`;
    interactionPrompt.classList.remove("hidden");
    return;
  }
  if (bed && (!sleepModal || sleepModal.classList.contains("hidden")) && inventoryModal.classList.contains("hidden") && mapModal.classList.contains("hidden") && craftingModal.classList.contains("hidden") && questModal.classList.contains("hidden")) {
    interactionPrompt.innerHTML = `<kbd>E</kbd><span>简易睡铺 · 休息 / 睡到次日 06:00</span>`;
    interactionPrompt.classList.remove("hidden");
    return;
  }
  if ((!obj && !fire) || !inventoryModal.classList.contains("hidden") || !mapModal.classList.contains("hidden") || !craftingModal.classList.contains("hidden") || !questModal.classList.contains("hidden") || (sleepModal && !sleepModal.classList.contains("hidden"))) {
    interactionPrompt.classList.add("hidden");
    interactionPrompt.textContent = "";
    return;
  }
  if (fire && (!obj || Math.hypot(gameState.player.x-fire.x, gameState.player.y-fire.y) < Math.hypot(gameState.player.x-getObjectWorldPosition(obj).x, gameState.player.y-getObjectWorldPosition(obj).y))) {
    interactionPrompt.innerHTML = `<kbd>E</kbd><span>篝火 · 烹饪食物 / 补充燃料</span>`;
    interactionPrompt.classList.remove("hidden");
    return;
  }
  const name = obj.type === "storyPoint" ? (obj.label || "剧情线索") : (interactionNames[obj.type] || "资源");
  let action = obj.type === "aircraftWreck" ? "进入飞机残骸（双层内部地图）" : obj.type === "cabinEntrance" ? "进入废弃木屋（独立室内）" : obj.type === "playerCamp" ? "进入自建营地" : obj.type === "campEntrance" ? "进入营地" : obj.type === "riverGate" ? (gameState.unlockedRegions.riverValley ? "进入碎石河谷" : "需要简易木筏") : obj.type === "ridgeGate" ? (gameState.unlockedRegions.ridgeHighlands ? "进入断脊高地" : "需要完成第 8 章“断桥工程点”主线") : obj.type === "regionExit" ? "返回初始地图" : obj.type === "regionCrate" ? "搜寻补给" : obj.type === "storyPoint" ? "调查线索" : obj.type === "waterSource" ? "装取生水" : "采集资源";
  if (["treeSmall", "treeMedium", "tree"].includes(obj.type)) { const hits = obj.type === "treeSmall" ? 2 : obj.type === "treeMedium" ? 4 : 6; action = hasAnyWorkingTool(AXE_TOOL_IDS) ? `砍伐 ${obj.chopHits || 0}/${hits} · ${obj.type === "treeSmall" ? "小树" : obj.type === "treeMedium" ? "中树" : "大树"}` : "需要石斧或更高级斧具"; }
  if (obj.type === "treeStump") action = hasAnyWorkingTool(AXE_TOOL_IDS) ? `清理树桩 ${obj.chopHits || 0}/2` : "需要石斧或更高级斧具";
  if (obj.type === "log") action = hasAnyWorkingTool(AXE_TOOL_IDS) ? "拆解倒木（消耗耐久）" : "需要石斧或更高级斧具";
  if (["rock","ore","copperOre","silverOre","goldOre"].includes(obj.type)) action = toolForOre(obj.type) ? "开采（消耗耐久）" : (obj.type === "goldOre" ? "需要银镐或金镐" : obj.type === "silverOre" ? "需要铜镐或更高级矿镐" : "需要石镐或更高级矿镐");
  if (obj.type === "stonePile") action = "捡取石块";
  if (obj.type === "droppedItem") action = "捡起丢弃物品";
  if (obj.type === "fruitTree" || obj.type === "bush") action = "采摘野果 · 食物来源";
  if (obj.type === "highGrass") action = "采集植物纤维 ×2 · 可制作绳索";
  if (obj.type === "branch") action = "捡取树枝 · 工具材料";
  if (obj.type === "stonePile") action = "捡取小石块 · 初期优先收集";
  interactionPrompt.innerHTML = `<kbd>E</kbd><span>${name} · ${action}</span>`;
  interactionPrompt.classList.remove("hidden");
}
function searchAnimalCorpse(enemy) {
  if (!activeCorpseMatchesLocation(enemy) || !Array.isArray(enemy.loot) || !enemy.loot.length) return;
  let picked = [];
  for (const drop of enemy.loot) {
    const count = Math.max(0, Number(drop.count) || 0);
    if (!count) continue;
    if (addItemToInventory(drop.id, count)) {
      picked.push(`${itemCatalog[drop.id]?.name || drop.id} ×${count}`);
      drop.count = 0;
    } else {
      // 背包空间不足时，保留未捡取的战利品，玩家整理背包后可再次搜索。
      showToast("背包空间不足，剩余战利品还留在尸体上。");
    }
  }
  enemy.loot = enemy.loot.filter(item => item.count > 0);
  renderInventory(); renderHotbar();
  if (!enemy.loot.length) {
    enemy.looted = true;
    showToast(picked.length ? `搜索完成：${picked.join("、")}` : "尸体上已经没有可拾取的物品。");
  } else if (picked.length) {
    showToast(`已拾取：${picked.join("、")}。其余物品仍留在尸体上。`);
  }
  playSoundEffect("pickup");
  saveGame(false);
}
function interactWithWorld() {
  gameState.player.actionType = "interact";
  gameState.player.actionStartedAt = performance.now();
  gameState.player.actionUntil = performance.now() + 420;
  if (!gameState.running || !inventoryModal.classList.contains("hidden") || !mapModal.classList.contains("hidden") || !craftingModal.classList.contains("hidden") || !questModal.classList.contains("hidden")) return;
  if (gameState.location === "cabin") {
    const exitNear = Math.abs(gameState.player.x-canvas.width/2)<90 && gameState.player.y>canvas.height-115;
    if(exitNear){leaveAbandonedCabin();return;}
    const deskX=canvas.width*.34, deskY=canvas.height*.39;
    if(Math.hypot(gameState.player.x-deskX,gameState.player.y-deskY)<105){
      if(mainQuestState.chapter>=4 && !mainQuestState.flags.anomaly_cabin){mainQuestState.flags.anomaly_cabin=true;openStoryDialog("废弃木屋 · 异常记录","桌板下压着一页被菌丝侵蚀的巡护记录：最早的兽类异变发生在飞机坠毁后的第二天。木墙深处有黑色结晶，正沿着地基向森林扩散。","记录线索",()=>{checkMainQuestProgress();saveGame(false);});}
      else if(!mainQuestState.flags.cabinSearched){mainQuestState.flags.cabinSearched=true;addItemToInventory("wire",2);addItemToInventory("basicParts",1);addItemToInventory("bandage",1);renderInventory();renderHotbar();openStoryDialog("废弃木屋","抽屉里找到一些电线、零件和一卷干净绷带。桌上的巡护记录提到森林里的异常，但需要等伙伴一起判断。","收好物资",()=>saveGame(false));}
      else showToast("桌上的巡护记录已经收好。黑色菌丝仍在墙缝中缓慢生长。");
      return;
    }
    showToast("破损床铺和倒塌的柜子堵住了两侧；靠近桌子按 E 调查，走到南侧出口按 E 离开。");return;
  }
  if (gameState.location === "aircraft") {
    const container = getNearestAircraftContainer(82);
    if (container) { if (gameState.aircraftSearch?.id === container.id) { showToast("正在翻找物资，请稍候。物资会逐件出现。"); return; } beginAircraftSearch(container); return; }
    gameState.aircraftSearch = null; toggleAircraftFloor(); return;
  }
  const corpse = nearestCorpse(58);
  if (corpse) { searchAnimalCorpse(corpse); return; }
  if (gameState.location === "camp") {
    if (mainQuestState.flags.companion_medic && Math.hypot(gameState.player.x-(Math.min(54,canvas.width*.07)+72),gameState.player.y-(54+(canvas.height-110)*.58))<92) {
      openStoryDialog("苏棠 · 医疗者", "我在整理草药和绷带。白天我会配制基础医疗用品，晚上留在屋里休息。需要医疗物资的话，我可以把制作清单打开给你。", "查看医疗制作", () => openCrafting("recipes")); return;
    }
    if (nearestCampBed(76)) { openSleepMenu(); return; }
    if (gameState.player.y > canvas.height - 105 && Math.abs(gameState.player.x - canvas.width / 2) < 115) { leaveCamp(); return; }
    const orbX=canvas.width/2, orbY=canvas.height*.35;
    if(Math.hypot(gameState.player.x-orbX,gameState.player.y-orbY)<115){upgradeCamp(true);return;}
    const fire = nearestCampfire(72);
    if (fire) { openCrafting("recipes"); showToast("篝火旁可以烹饪食物。"); }
    else showToast("靠近中央魔法球按 E 升级；在营地内按 F 摆放家具；走到下方出口按 E 离开。");
    return;
  }
  if (gameState.location === "region") { interactWithRegion(); return; }
  const fire = nearestCampfire(70);
  const obj = nearestWorldObject();
  if (fire && (!obj || Math.hypot(gameState.player.x-fire.x, gameState.player.y-fire.y) < Math.hypot(gameState.player.x-getObjectWorldPosition(obj).x, gameState.player.y-getObjectWorldPosition(obj).y))) {
    openCrafting("recipes"); showToast("篝火已点燃：可制作熟食。烹饪会消耗树枝作为燃料。"); return;
  }
  if (!obj) {
    showToast("附近没有可交互目标。靠近资源、营地入口或篝火后按 E。");
    return;
  }
  if (obj.type === "aircraftWreck") { enterAircraft(); return; }
  if (obj.type === "cabinEntrance") { enterAbandonedCabin(); return; }
  if (obj.type === "playerCamp") { const camp=gameState.camps.find(c=>c.id===obj.campId); enterCamp(camp); return; }
  if (obj.type === "campEntrance") { showToast("自建营地已移除。请制作简易营地套件并在野外建造。"); return; }
  if (obj.type === "companionNpc") {
    const companion = companionForObject(obj);
    if (!companion) return;
    if (mainQuestState.flags[`companion_${obj.characterId}`] && mainQuestState.chapter !== 7) {
      if (obj.characterId === "hunter") {
        const following=!mainQuestState.flags.hunterFollowing; mainQuestState.flags.hunterFollowing=following; placeAvailableCompanions();
        openStoryDialog(companion.name, following ? "我跟着你走。遇到普通野兽我会帮忙牵制，但巢穴首领还是得你来打。再和我交谈可以让我回营地。" : "我先回到营地附近休整。需要出门时再来找我。", following?"一起出发":"回营地", ()=>{placeAvailableCompanions();saveGame(false);}); return;
      }
      if(obj.characterId === "mechanic") { openStoryDialog(companion.name, companionHomeLine(obj.characterId), "打开工作台", () => openCrafting("recipes")); return; }
      if(obj.characterId === "scout" && mainQuestState.flags.scoutIntel) { const intel=mainQuestState.flags.scoutIntel; openStoryDialog(companion.name, `${companionHomeLine(obj.characterId)} 我最新标记的资源点在地图坐标 ${intel.col}, ${intel.row}。地图上的金色脉冲就是位置。`, "收到情报", null); return; }
      openStoryDialog(companion.name, companionHomeLine(obj.characterId), "知道了", null); return;
    }
    if (mainQuestState.chapter === 7 && mainQuestState.flags[`companion_${obj.characterId}`]) {
      openStoryDialog(companion.name, "巢穴的脉动停下来了。我们会把这里当成新的据点，但森林外面还有很多问题。今晚先休息，明天再决定下一步。", "结束第一章", () => { mainQuestState.flags.chapterOneDebrief = true; checkMainQuestProgress(); saveGame(false); }); return;
    }
    recruitCompanion(obj.characterId); return;
  }
  if (obj.type === "storyPoint") { interactWithStoryPoint(obj); return; }
  if (obj.type === "riverGate") { showToast("当前版本第一章只开放翠影森林主地图，后续区域暂不开放。"); return; }
  if (obj.type === "ridgeGate") { showToast("当前版本第一章只开放翠影森林主地图，后续区域暂不开放。"); return; }
  if (obj.type === "waterSource") { if (!addItemToInventory("dirtyWater",1)) { showToast("背包已满，无法装水。"); return; } renderInventory(); renderHotbar(); showToast("装取生水 ×1。未经处理直接饮用有患病风险。"); saveGame(false); return; }
  if (obj.type === "regionCrate") { searchRegionCrate(obj); return; }
  if ((["treeSmall", "treeMedium", "tree"].includes(obj.type) || obj.type === "treeStump" || obj.type === "log") && !hasAnyWorkingTool(AXE_TOOL_IDS)) {
    showToast("徒手无法砍伐木材。先收集地面树枝、石块和高草丛纤维，搓制绳索后制作石斧。"); return;
  }
  // v31：成熟树需要多次挥斧；每次都有抖动、木屑、音效与耐久消耗，最后倒下并留下树桩。
  if (["treeSmall", "treeMedium", "tree"].includes(obj.type)) {
    const treeType = obj.type;
    const hitsNeeded = treeType === "treeSmall" ? 2 : treeType === "treeMedium" ? 4 : 6;
    const woodYield = treeType === "treeSmall" ? 1 : treeType === "treeMedium" ? 2 : 3;
    obj.chopHits = (obj.chopHits || 0) + 1;
    obj.hitAt = performance.now();
    resourceHitEffects.push({ x: (obj.col + .5) * TILE_SIZE, y: (obj.row + .15) * TILE_SIZE, kind: "wood", born: performance.now(), seed: Math.random() });
    const axeId = bestWorkingTool(AXE_TOOL_IDS);
    const toolBroke = wearTool(axeId, 1);
    playSoundEffect("woodHit");
    if (obj.chopHits < hitsNeeded) {
      showToast(`${treeType === "treeSmall" ? "小树" : treeType === "treeMedium" ? "中树" : "大树"}砍伐进度：${obj.chopHits}/${hitsNeeded}。木屑飞落。${toolBroke ? "工具已损坏。" : ""}`);
    } else {
      addItemToInventory("wood", woodYield);
      addItemToInventory("branch", treeType === "tree" ? 2 : 1);
      if (Math.random() < (treeType === "tree" ? .45 : .18)) addItemToInventory("bark", 1);
      if (treeType === "tree" && Math.random() < .28) addItemToInventory("resin", 1);
      obj.type = "treeStump"; obj.chopHits = 0; obj.felledAt = performance.now();
      showToast(`${treeType === "treeSmall" ? "小树" : treeType === "treeMedium" ? "中树" : "大树"}被砍倒！获得木材 ×${woodYield}、树枝 ×${treeType === "tree" ? 2 : 1}${toolBroke ? "；工具损坏" : ""}。树桩之后可以自然再生。`);
      checkMainQuestProgress(); renderInventory(); renderHotbar(); saveGame(false);
    }
    renderInventory(); renderHotbar(); saveGame(false); return;
  }
  if (obj.type === "treeStump") {
    obj.chopHits = (obj.chopHits || 0) + 1; obj.hitAt = performance.now();
    resourceHitEffects.push({ x: (obj.col + .5) * TILE_SIZE, y: (obj.row + .7) * TILE_SIZE, kind: "wood", born: performance.now(), seed: Math.random() });
    const toolBroke = wearTool(bestWorkingTool(AXE_TOOL_IDS), 1); playSoundEffect("woodHit");
    if (obj.chopHits < 2) showToast(`正在劈开树桩：${obj.chopHits}/2。`);
    else {
      addItemToInventory("branch", 2);
      if (Math.random() < .45) addItemToInventory("seed", 1);
      harvestedObjects.add(obj.id); harvestedAtMinutes.set(obj.id, worldTimeMinutes);
      showToast(`树桩清理完成，获得树枝 ×2${toolBroke ? "；工具损坏" : ""}。有时还能找到树种。`);
    }
    renderInventory(); renderHotbar(); saveGame(false); return;
  }
  if ((obj.type === "rock" || obj.type === "ore" || obj.type === "copperOre") && !hasWorkingTool("pickaxe") && !hasWorkingTool("ironPickaxe")) {
    showToast("这是一整块石林岩壁，需要石镐开采。先收集地面零碎石块制作石镐。"); return;
  }
  // v32：岩石采集有三段打击反馈；每击抖动并飞溅碎石，第三击才结算资源。
  if (obj.type === "rock") {
    obj.mineHits = (obj.mineHits || 0) + 1; obj.hitAt = performance.now();
    resourceHitEffects.push({ x:(obj.col+.5)*TILE_SIZE, y:(obj.row+.55)*TILE_SIZE, kind:"stone", born:performance.now(), seed:Math.random() });
    playSoundEffect("woodHit");
    if (obj.mineHits < 3) { showToast(`石镐敲击岩石：${obj.mineHits}/3，碎石飞溅。`); return; }
  }
  const loot = getLootForObject(obj);
  if (!loot) return;
  if (!addItemToInventory(loot[0], loot[1])) {
    showToast("背包已满！先整理背包再采集。");
    return;
  }
  recordQuestGather(obj.type, loot[0], loot[1]);
  harvestedObjects.add(obj.id);
  harvestedAtMinutes.set(obj.id, worldTimeMinutes);
  if (obj.type === "droppedItem") {
    noRespawnObjects.add(obj.id);
    if (gameState.location === "world") { worldObjectByTile.delete(`${obj.col},${obj.row}`); const i=worldObjects.indexOf(obj); if(i>=0) worldObjects.splice(i,1); const underlying=worldObjects.find(o=>o.col===obj.col&&o.row===obj.row); if(underlying) worldObjectByTile.set(`${obj.col},${obj.row}`,underlying); }
    else { const i=regionObjects.indexOf(obj); if(i>=0) regionObjects.splice(i,1); }
  }
  let toolBroke = false;
  if (["tree", "treeMedium", "treeSmall", "fruitTree", "log"].includes(obj.type)) {
    if (["tree", "treeMedium", "treeSmall"].includes(obj.type)) addItemToInventory("branch", 1);
    if (["tree", "treeMedium", "treeSmall"].includes(obj.type) && Math.random() < 0.32) addItemToInventory("resin", 1);
    if (["tree", "treeMedium", "treeSmall"].includes(obj.type) && Math.random() < 0.42) addItemToInventory("bark", 1);
    if (["tree", "treeMedium", "treeSmall", "log"].includes(obj.type)) { const axeId = bestWorkingTool(AXE_TOOL_IDS); toolBroke = wearTool(axeId, ["tree", "treeMedium", "treeSmall"].includes(obj.type) ? (axeId === "goldAxe" ? 1 : axeId === "silverAxe" ? 2 : axeId === "copperAxe" ? 3 : 4) : 2); }
  }
  if (["rock","ore","copperOre","silverOre","goldOre"].includes(obj.type)) { const pickId = toolForOre(obj.type); if (pickId) toolBroke = wearTool(pickId, obj.type.endsWith("Ore") ? (pickId === "goldPickaxe" ? 1 : pickId === "silverPickaxe" ? 2 : pickId === "copperPickaxe" ? 3 : 5) : 3); }
  if (obj.type === "highGrass" || obj.type === "bush" || obj.type === "reeds" || obj.type === "medicinalHerb") {
    if (Math.random() < 0.22) addItemToInventory("seed", 1);
  }
  document.querySelector("#current-task").textContent = "先收集木材、树枝、纤维和绳索，制作简易营地套件，再在野外选择空地建造营地。";
  showToast(toolBroke ? `${loot[2]}（工具耐久耗尽，已经损坏）` : loot[2]);
  // 采集命中与空挥使用不同音色：木材是闷实的木击，石头/矿物是清脆的敲击。
  if (["tree", "treeMedium", "treeSmall", "fruitTree", "log", "bush", "highGrass"].includes(obj.type)) playSoundEffect("woodHit");
  else if (["rock","ore","copperOre","silverOre","goldOre"].includes(obj.type)) playSoundEffect("stoneHit");
  else playSoundEffect("toolHit");
  checkMainQuestProgress();
  renderInventory(); renderHotbar(); saveGame(false);
}
// ================================
// v12：扩展资源衍生链、工具耐久、主线区域入口与营地成长门槛
// ================================
const recipes = [
  { id: "identifyMushroom", outputId: "mushroom", name: "辨识未知蘑菇", icon: "🍄", desc: "辨识一份未知蘑菇；当前以基础野外辨识配方表示。", ingredients: { unknownMushroom: 1 }, station: "hand", output: 1 },
  { id: "stoneShard", name: "打制石片", icon: "🔪", desc: "敲击石块，制作锋利石刃。", ingredients: { stone: 1 }, station: "hand", output: 1 },
  { id: "stoneBrick", name: "切割石砖", icon: "🧱", desc: "在营地内已放置的工作台将石块切割为石砖。", ingredients: { stone: 3 }, station: "workbench", output: 1 },
  { id: "fiber", name: "整理芦苇纤维", icon: "🧵", desc: "将芦苇加工成植物纤维。", ingredients: { reeds: 2 }, station: "hand", output: 2 },
  { id: "rope", name: "简易绳索", icon: "➰", desc: "搓制植物纤维；是工具、武器和营地工程的核心材料。", ingredients: { fiber: 3 }, station: "hand", output: 1 },
  { id: "ropeFromReeds", outputId: "rope", name: "芦苇编绳（替代配方）", icon: "🌾", desc: "找不到足够植物纤维时，可用河边芦苇直接编成简易绳索。", ingredients: { reeds: 4 }, station: "hand", output: 1 },
  { id: "axe", name: "石斧", icon: "🪓", desc: "需要树枝 ×2、石块 ×2、绳索 ×1。先捡地面枝条与小石块；高草丛可采植物纤维，再用纤维搓绳。成熟树需 6 次挥斧，倒下后留下可清理树桩。耐久 40。", ingredients: { branch: 2, stone: 2, rope: 1 }, station: "hand", output: 1 },
  { id: "pickaxe", name: "石镐", icon: "⛏️", desc: "开采石林岩块与矿脉。耐久 36，开采会消耗耐久。", ingredients: { branch: 2, stone: 3, rope: 1 }, station: "hand", output: 1 },
  { id: "stick", name: "木棍", icon: "🪵", desc: "削制工具柄与简易武器材料。", ingredients: { branch: 2 }, station: "hand", output: 1 },
  { id: "longPole", name: "长木杆", icon: "🎋", desc: "由木材削制成长杆。", ingredients: { wood: 1 }, station: "hand", output: 2 },
  { id: "torch", name: "火把", icon: "🔥", desc: "树枝、植物纤维与树脂制成。", ingredients: { branch: 1, fiber: 1, resin: 1 }, station: "hand", output: 1 },
  { id: "spear", name: "木矛", icon: "🗡️", desc: "简易防卫与狩猎工具。", ingredients: { longPole: 1, stoneShard: 1, rope: 1 }, station: "hand", output: 1 },
  { id: "sword", name: "简易短剑", icon: "⚔️", desc: "在工作台装配短剑：金属剑身、木质握柄与绳缠护手。", ingredients: { ironIngot: 2, wood: 1, rope: 1 }, station: "workbench", output: 1 },
  { id: "arrow", name: "箭矢 ×3", icon: "➶", desc: "远程消耗品；需要羽毛。", ingredients: { branch: 1, stoneShard: 1, feather: 1 }, station: "workbench", output: 3 },
  { id: "bow", name: "简易弓", icon: "🏹", desc: "猎手叶岚的初始专长；其他角色可在工作台制作。", ingredients: { longPole: 1, rope: 2 }, station: "workbench", output: 1 },
  { id: "fishingRod", name: "钓鱼竿", icon: "🎣", desc: "需长木杆、绳索与金属废件或骨钩。", ingredients: { longPole: 1, rope: 1, scrapMetal: 1 }, station: "workbench", output: 1, requiresRegion: "riverValley" },
  { id: "plank", name: "木板 ×2", icon: "🪚", desc: "在自建营地内已放置的工作台加工木材。", ingredients: { wood: 2 }, station: "workbench", output: 2 },
  { id: "cloth", name: "粗布", icon: "🧶", desc: "编织植物纤维或芦苇。", ingredients: { fiber: 3 }, station: "workbench", output: 1 },
  { id: "herbPowder", name: "草药粉", icon: "🌿", desc: "研磨止血草。", ingredients: { herb: 2 }, station: "workbench", output: 1 },
  { id: "bandage", name: "绷带", icon: "🩹", desc: "恢复生命值。", ingredients: { cloth: 1, herbPowder: 1 }, station: "workbench", output: 1 },
  { id: "poultice", name: "草药敷剂", icon: "🧴", desc: "恢复更多生命，需要净水与药用材料。", ingredients: { herbPowder: 1, mushroom: 1, safeWater: 1 }, station: "workbench", output: 1 },
  { id: "campfireKit", name: "篝火套件", icon: "🔥", desc: "在野外空地放置篝火，用于烹饪与夜间保暖。", ingredients: { branch: 4, stone: 2, fiber: 2 }, station: "hand", output: 1 },
  { id: "campKit", name: "简易营地套件", icon: "🏕️", desc: "在合适的野外地面建造一座独立营地。营地数量不限，受材料和空间限制。", ingredients: { wood: 8, branch: 6, fiber: 4, rope: 2 }, station: "hand", output: 1 },
  { id: "workbench", name: "简易工作台（I级）", icon: "🛠️", desc: "制作后在营地内部按 F 放置；只有已放置的工作台才可加工。", ingredients: { wood: 8, branch: 4, rope: 2 }, station: "hand", output: 1 },
  { id: "bed1", name: "简易睡铺（I级家具）", icon: "🛏️", desc: "制作后在营地内部按 F 放置；靠近后按 E 可休息或睡到次日 06:00。", ingredients: { branch: 4, fiber: 3, cloth: 1 }, station: "hand", output: 1 },
  { id: "chest1", name: "木制储物柜（I级家具）", icon: "🧰", desc: "制作后在营地内部按 F 放置；独立存取界面后续扩展。", ingredients: { plank: 4, rope: 1 }, station: "hand", output: 1 },
  { id: "workbench2", name: "精制工作台（II级家具）", icon: "⚒️", desc: "营地 II 级解锁；放置后替换营地内较低级工作台。", ingredients: { plank: 6, ironIngot: 1, rope: 2 }, station: "hand", output: 1, minCampLevel: 2 },
  { id: "chest2", name: "加固储物柜（II级家具）", icon: "🗄️", desc: "营地 II 级解锁；更精致的外观家具。", ingredients: { plank: 6, ironIngot: 1, basicParts: 1 }, station: "hand", output: 1, minCampLevel: 2 },
  { id: "furnaceFurniture", name: "石质熔炉家具（II级）", icon: "♨️", desc: "制作后在营地内部放置，解锁金属冶炼。", ingredients: { stoneBrick: 4, plank: 4, charcoal: 2 }, station: "hand", output: 1, minCampLevel: 2 },
  { id: "workbench3", name: "大师工作台（III级家具）", icon: "🛠️", desc: "营地 III 级解锁的顶级工作台外观。", ingredients: { plank: 10, ironIngot: 4, copperIngot: 2, basicParts: 2 }, station: "hand", output: 1, minCampLevel: 3 },
  { id: "cookedMushroom", name: "烤菌菇", icon: "🍄‍🟫", desc: "恢复 24 点饱腹。需靠近有燃料的篝火。", ingredients: { mushroom: 1 }, station: "fire", output: 1 },
  { id: "roastedBerries", name: "热浆果餐", icon: "🥣", desc: "恢复饱腹并恢复少量生命。", ingredients: { berries: 2 }, station: "fire", output: 1 },
  { id: "cookedMeat", name: "熟肉", icon: "🍖", desc: "狩猎系统开放后可烹饪。", ingredients: { rawMeat: 1 }, station: "fire", output: 1, requiresRegion: "riverValley" },
  { id: "charcoal", name: "木炭", icon: "⚫", desc: "在篝火中炭化木材，供净水与冶炼使用。", ingredients: { wood: 1 }, station: "fire", output: 1 },
  { id: "charcoalFromBranches", outputId: "charcoal", name: "树枝炭化为木炭", icon: "⚫", desc: "用树枝在篝火中制取少量木炭。", ingredients: { branch: 3 }, station: "fire", output: 1 },
  { id: "safeWater", name: "煮沸净水", icon: "💧", desc: "将生水煮沸，避免直接饮用的风险。", ingredients: { dirtyWater: 1 }, station: "fire", output: 1 },
  { id: "driedBerries", name: "果干 / 干粮", icon: "🍇", desc: "轻便耐储存的远征食物。", ingredients: { berries: 3 }, station: "workbench", output: 1 },

  { id: "waterFilter", name: "净水装置", icon: "🚰", desc: "空容器、木炭、鹅卵石与木材组成。", ingredients: { emptyContainer: 1, wood: 2, charcoal: 2, pebble: 3 }, station: "workbench", output: 1, requiresRegion: "riverValley" },
  { id: "radioRepairKit", name: "无线电修理包", icon: "📻", desc: "用电线、基础零件和胶带修复无线电接收模块。", ingredients: { wire: 2, basicParts: 1, tape: 1 }, station: "workbench", output: 1 },
  { id: "raft", name: "简易木筏", icon: "🛶", desc: "制作后解锁碎石河谷入口与第二章探索。", ingredients: { plank: 6, rope: 4 }, station: "workbench", output: 1, unlockRegion: "riverValley" },

  { id: "ironIngot", name: "铁锭", icon: "🔩", desc: "铁矿石与木炭在石质熔炉中冶炼。", ingredients: { ironOre: 2, charcoal: 2 }, station: "forge", output: 1, minCampLevel: 2, requiresRegion: "ridgeHighlands" },
  { id: "copperIngot", name: "铜锭", icon: "🟠", desc: "铜矿石与木炭在石质熔炉中冶炼。", ingredients: { copperOre: 2, charcoal: 2 }, station: "forge", output: 1, minCampLevel: 2, requiresRegion: "ridgeHighlands" },
  { id: "silverIngot", name: "银锭", icon: "🥈", desc: "银矿石与木炭在石质熔炉中冶炼。", ingredients: { silverOre: 2, charcoal: 3 }, station: "forge", output: 1, minCampLevel: 3, requiresRegion: "ridgeHighlands" },
  { id: "goldIngot", name: "金锭", icon: "🟡", desc: "金矿石与木炭在石质熔炉中冶炼。", ingredients: { goldOre: 2, charcoal: 4 }, station: "forge", output: 1, minCampLevel: 3, requiresRegion: "ridgeHighlands" },
  { id: "copperAxe", name: "铜斧（II级）", icon: "🪓", desc: "比石斧耐用，砍伐消耗更少耐久。", ingredients: { copperIngot: 2, wood: 2, leather: 1 }, station: "forge", output: 1, minCampLevel: 2, requiresRegion: "ridgeHighlands" },
  { id: "silverAxe", name: "银斧（III级）", icon: "🪓", desc: "高级伐木工具，耐久 160。", ingredients: { silverIngot: 2, copperIngot: 1, wood: 2, leather: 2 }, station: "forge", output: 1, minCampLevel: 3, requiresRegion: "ridgeHighlands" },
  { id: "goldAxe", name: "金斧（IV级）", icon: "🪓", desc: "顶级伐木工具，耐久 240。", ingredients: { goldIngot: 2, silverIngot: 1, wood: 2, leather: 2 }, station: "forge", output: 1, minCampLevel: 3, requiresRegion: "ridgeHighlands" },
  { id: "copperPickaxe", name: "铜镐（II级）", icon: "⛏️", desc: "开采银矿脉的基础工具。", ingredients: { copperIngot: 2, wood: 2, leather: 1 }, station: "forge", output: 1, minCampLevel: 2, requiresRegion: "ridgeHighlands" },
  { id: "silverPickaxe", name: "银镐（III级）", icon: "⛏️", desc: "可开采金矿脉。", ingredients: { silverIngot: 2, copperIngot: 1, wood: 2, leather: 2 }, station: "forge", output: 1, minCampLevel: 3, requiresRegion: "ridgeHighlands" },
  { id: "goldPickaxe", name: "金镐（IV级）", icon: "⛏️", desc: "顶级采矿工具，耐久 210。", ingredients: { goldIngot: 2, silverIngot: 1, wood: 2, leather: 2 }, station: "forge", output: 1, minCampLevel: 3, requiresRegion: "ridgeHighlands" },
  { id: "crossbow", name: "十字弩", icon: "🏹", desc: "进阶远程武器，需金属锭与基础零件。", ingredients: { plank: 3, ironIngot: 2, basicParts: 2, rope: 2 }, station: "forge", output: 1, minCampLevel: 3, requiresRegion: "ridgeHighlands" },
  { id: "backpackUpgrade2", name: "背包扩容 · II级（4×4）", icon: "🎒", desc: "扩展背包空间至 16 格。", ingredients: { branch: 4, fiber: 6, rope: 2 }, station: "hand", output: 1, backpackUpgrade: 2 },
  { id: "backpackUpgrade3", name: "背包扩容 · III级（5×4）", icon: "🎒", desc: "扩展背包空间至 20 格，需要营地工作台。", ingredients: { cloth: 4, rope: 4, leather: 2 }, station: "workbench", output: 1, backpackUpgrade: 3 },
  { id: "backpackUpgrade4", name: "背包扩容 · IV级（5×5）", icon: "🎒", desc: "扩展背包空间至 25 格，需要营地工作台。", ingredients: { leather: 4, cloth: 6, ironIngot: 2 }, station: "workbench", output: 1, backpackUpgrade: 4 },
  { id: "backpackUpgrade5", name: "背包扩容 · V级（6×6）", icon: "🎒", desc: "扩展背包空间至 36 格，需要营地工作台。", ingredients: { leather: 6, cloth: 8, basicParts: 4, copperIngot: 2 }, station: "workbench", output: 1, backpackUpgrade: 5 },
  { id: "repairAxe", name: "修理石斧", icon: "🩹", desc: "消耗树枝与胶带，恢复石斧 20 点耐久。", ingredients: { branch: 2, tape: 1 }, station: "hand", output: 1, repairTool: "axe", repairAmount: 20 },
  { id: "repairPickaxe", name: "修理石镐", icon: "🩹", desc: "消耗碎石与胶带，恢复石镐 18 点耐久。", ingredients: { pebble: 2, tape: 1 }, station: "hand", output: 1, repairTool: "pickaxe", repairAmount: 18 }
];
const compendiumEntries = [
  ["🌿 树枝", "常见地面资源，树木砍伐也会伴生。v12 提高了草地、林缘与森林的刷新比例，避免制作石斧时树枝反而难找。"],
  ["🪵 木材 / 原木", "只能使用石斧或铁斧砍伐树木、处理倒木获得。徒手不能砍树。"],
  ["🟠 树脂 / 🪵 树皮", "砍伐翠影森林树木时概率伴生，用于火把、粘合和后续药剂。"],
  ["🪚 木板", "木材 ×2 在营地工作台加工为木板 ×2。"], ["⚫ 木炭", "木材在篝火中炭化，可用于净水过滤与高阶冶炼。"],
  ["🎋 木棍 / 长木杆", "树枝削制木棍；木材加工成长木杆，用于木矛、鱼竿和营地工程。"],
  ["🪨 石块 / ⚪ 碎石", "零碎石块可直接捡取；石林大岩块需要石镐。碎石可打制石片，也可用于净水过滤。"],
  ["🔪 石片", "用石块或碎石打制，作为木矛、箭矢等锋利部件。"], ["🧱 石砖", "石块 ×3 在自建营地内已放置的工作台加工为石砖，可用于石质熔炉。"], ["⛏️ 铁矿 / 铜矿", "仅在解锁断脊高地后开采，需要石镐或铁镐。"],
  ["🧵 植物纤维 / 🎍 芦苇", "高草、灌木、河谷芦苇提供纤维；芦苇是碎石河谷区域资源。"],
  ["➰ 简易绳索 / 🧶 粗布", "纤维 ×3 制绳；工作台可编织粗布，用于医疗、背包与装备。"],
  ["🌿 止血草 / 草药粉", "翠影森林与草原可采止血草，工作台研磨为草药粉。"],
  ["💧 生水 / 净水", "河边按 E 装取生水；直接饮用会有生命损失风险。靠篝火煮沸可制成净水。后续可建净水装置。"],
  ["🍄 未知蘑菇", "采集后暂为未知状态，后续由猎手叶岚辨识；烹饪配方只接受可食菌菇。"],
  ["🩹 绷带 / 草药敷剂", "粗布 + 草药粉制作绷带；草药粉、菌菇与净水制作敷剂。"],
  ["🪓 石斧 / ⛏️ 石镐", "石斧耐久 40，每次伐木消耗 8；石镐耐久 36，每次采石消耗 7、采矿消耗 10。耐久耗尽会损坏。"],
  ["🩹 工具维修", "石斧可用树枝 ×2 + 胶带 ×1 修理；石镐可用碎石 ×2 + 胶带 ×1 修理。胶带目前通过河谷补给箱获得。"],
  ["🔥 篝火", "篝火套件可在野外合适空地放置；每次烹饪消耗燃料，树枝 ×2 可添柴。住宿不是可随处放置的物品。"],
  ["🏕️ 自建营地", "制作简易营地套件，在野外空地建造营地；每座营地独立保存等级与家具。靠近后按 E 进入。"],
  ["🏡 营地等级 II", "需要木材、石块、木板、绳索，并且必须先制作木筏解锁碎石河谷；不再只靠容易获得的基础材料。"],
  ["🏘️ 营地等级 III", "需要解锁断脊高地并获得铁锭、粗布与基础零件，体现主线地图和高级资源门槛。"],
  ["🛶 碎石河谷", "在固定入口处使用简易木筏进入。区域内可找到芦苇、碎石、药草和巡护员补给箱。"],
  ["⛰️ 断脊高地", "在河谷补给箱事件后解锁。包含铁矿与铜矿，需矿镐采集。"],
  ["🦌 狩猎资源", "羽毛、肉、毛皮、兽骨和兽筋已纳入图鉴与配方体系；当前动物实体与完整狩猎玩法将在后续版本开放。"],
  ["⚙️ 工业零件", "空容器、胶带、废旧零件、电线、电池与电子元件来自坠机点、废弃驻地、观测站和研究站，不会在初始森林无限采集。"],
  ["📻 主线科技", "无线电修理包、发电机修复组件与通信信标修复包预留给后续章节任务，不会通过普通采集直接获得。"]
];
let activeCraftTab = "recipes";
function getItemCount(id) {
  return [...inventoryState.slots, ...inventoryState.hotbar].reduce((sum, item) => sum + (item && item.id === id ? item.count : 0), 0);
}
function hasItem(id) { return getItemCount(id) > 0; }
function canStoreItem(id) {
  const catalog = itemCatalog[id];
  const exists = [...inventoryState.slots, ...inventoryState.hotbar].some(item => item && item.id === id);
  if (catalog?.durabilityMax) return !exists && inventoryState.slots.some(item => !item);
  return exists || inventoryState.slots.some(item => !item);
}
function removeItems(id, amount) {
  let remaining = amount;
  for (const list of [inventoryState.slots, inventoryState.hotbar]) {
    for (let i = 0; i < list.length && remaining > 0; i++) {
      const item = list[i];
      if (!item || item.id !== id) continue;
      const take = Math.min(item.count, remaining); item.count -= take; remaining -= take;
      if (item.count <= 0) list[i] = null;
    }
  }
  return remaining === 0;
}
function nearestCampfire(maxDistance=70) {
  if (gameState.location !== "world") return null;
  let best=null, bestD=maxDistance;
  for (const fire of gameState.placedCampfires) {
    const d=Math.hypot(gameState.player.x-fire.x, gameState.player.y-fire.y);
    if (d<bestD) {best=fire;bestD=d;}
  }
  return best;
}
function isNearCampfire() { return Boolean(nearestCampfire(110)); }
function refuelCampfire() {
  const fire=nearestCampfire(110);
  if(!fire){showToast("请靠近野外篝火后再添柴；营地 II 级室内炉台无需添柴。");return;}
  if(getItemCount("branch")<2){showToast("添柴需要树枝 ×2。");return;}
  if(fire.fuel>=8){showToast("篝火燃料充足，无需添柴。");return;}
  removeItems("branch",2);fire.fuel=Math.min(8,fire.fuel+4);renderInventory();renderHotbar();renderCrafting();saveGame(false);showToast(`已添柴，篝火燃料：${fire.fuel}/8。`);
}
function openCrafting(tab="recipes") {
  playSoundEffect("tap");
  activeCraftTab=tab;
  craftingModal.classList.remove("hidden");
  renderCrafting();
}
function closeCrafting() { craftingModal.classList.add("hidden"); renderHotbar(); playSoundEffect("tap"); }
function setCraftTab(tab) {
  activeCraftTab = "recipes";
  craftTabPanel?.classList.remove("hidden");
  craftTabButton?.classList.add("active");
}

function itemIconPath(id) {
  return `images/items/icons/${id}.png`;
}
function createItemIcon(id, className = "inline-item-icon", alt = "") {
  const image = document.createElement("img");
  image.className = className;
  image.alt = alt || itemCatalog[id]?.name || id;
  image.loading = "lazy";
  image.src = itemIconPath(id);
  image.onerror = () => {
    const fallback = document.createElement("img");
    fallback.className = `${className} ${className}-fallback`;
    fallback.src = "images/ui/item_fallback.png";
    fallback.alt = image.alt;
    image.replaceWith(fallback);
  };
  return image;
}
function renderIngredients(ingredients) {
  const wrap = document.createElement("div");
  wrap.className = "recipe-materials";
  const label = document.createElement("span");
  label.className = "recipe-materials-label";
  label.textContent = "材料：";
  wrap.append(label);
  for (const [id, count] of Object.entries(ingredients)) {
    const item = document.createElement("span");
    item.className = "recipe-material";
    item.append(createItemIcon(id, "recipe-material-icon"));
    const name = document.createElement("span");
    const owned = getItemCount(id);
    name.textContent = `${itemCatalog[id]?.name || id} ${owned}/${count}`;
    if (owned < count) item.classList.add("recipe-material-missing"); else item.classList.add("recipe-material-ready");
    item.title = `拥有 ${owned} / 需要 ${count}`;
    item.append(name);
    wrap.append(item);
  }
  return wrap;
}
function recipeStationReady(recipe) {
  if (recipe.station === "hand") return true;
  if (recipe.station === "fire") return isNearCampfire();
  if (recipe.station === "workbench") return gameState.location === "camp" && campHasFurniture("workbench");
  if (recipe.station === "forge") return gameState.location === "camp" && selectedCamp() && selectedCamp().level >= 2 && campHasFurniture("furnace");
  return false;
}
function recipeLockReason(recipe) {
  if (recipe.backpackUpgrade) {
    if (recipe.backpackUpgrade <= inventoryState.backpackLevel) return "已拥有该等级或更高背包";
    if (recipe.backpackUpgrade > inventoryState.backpackLevel + 1) return `请先升级至 ${["", "I", "II", "III", "IV", "V"][recipe.backpackUpgrade - 1]} 级背包`;
  }
  if (recipe.requiresRegion && !gameState.unlockedRegions[recipe.requiresRegion]) return recipe.requiresRegion === "riverValley" ? "需要解锁碎石河谷" : recipe.requiresRegion === "ridgeHighlands" ? "需要解锁断脊高地" : "需要解锁后续区域";
  if (recipe.minCampLevel && (selectedCamp()?.level || 0) < recipe.minCampLevel) return `需要当前营地等级 ${recipe.minCampLevel}`;
  if (recipe.station === "workbench" && gameState.location !== "camp") return "只能在自建营地内部使用工作台";
  if (recipe.station === "workbench" && !campHasFurniture("workbench")) return "请先制作工作台，并在营地内部按 F 放置";
  if (recipe.station === "forge" && !campHasFurniture("furnace")) return "请制作石质熔炉家具并在营地内部放置";
  if (recipe.station === "fire" && !isNearCampfire()) return "需要靠近有燃料的篝火 / II 级营地炉台";
  return "";
}
function effectiveRecipeIngredients(recipe) {
  const mechanicActive = gameState.camps.length > 0 && (gameState.selectedCharacter?.id === "mechanic" || mainQuestState.flags.companion_mechanic);
  const result = {};
  for (const [id,count] of Object.entries(recipe.ingredients || {})) {
    // 工匠只降低建造/加工配方成本，不降低食物、药品与角色成长类消耗。
    const isBuild = ["campKit","campfireKit","workbench","workbench2","workbench3","bed","chest1","furnaceFurniture","plank","woodenWall","woodenFence","simpleShelter"].includes(recipe.outputId || recipe.id) || recipe.station === "workbench";
    result[id] = mechanicActive && isBuild ? Math.max(1, Math.ceil(count * .8)) : count;
  }
  return result;
}
function craftRecipe(recipeId) {
  const recipe=recipes.find(r=>r.id===recipeId); if(!recipe)return;
  const lockReason = recipeLockReason(recipe);
  if (lockReason) { showToast(lockReason); return; }
  if (recipe.repairTool) {
    const tool = findTool(recipe.repairTool);
    if (!tool) { showToast(`背包中没有${itemCatalog[recipe.repairTool].name}，无法维修。`); return; }
    if (tool.durability >= itemCatalog[recipe.repairTool].durabilityMax) { showToast("工具耐久已满，不需要维修。"); return; }
  }
  const cookingFire = recipe.station === "fire" ? nearestCampfire(110) : null;
  if(recipe.station==="fire" && gameState.location === "world" && (!cookingFire || cookingFire.fuel <= 0)) {showToast("篝火燃料耗尽，请用树枝给篝火添柴。");return;}
  const effectiveIngredients=effectiveRecipeIngredients(recipe);
  const missing=Object.entries(effectiveIngredients).filter(([id,n])=>getItemCount(id)<n);
  if(missing.length) {showToast("材料不足："+missing.map(([id,n])=>`${itemCatalog[id]?.name||id}还需要 ${n-getItemCount(id)}`).join("、"));return;}
  if (recipe.backpackUpgrade) {
    if (recipe.backpackUpgrade !== inventoryState.backpackLevel + 1) { showToast("请按顺序升级背包。"); return; }
    for (const [id,n] of Object.entries(effectiveIngredients)) removeItems(id,n);
    resizeBackpack(recipe.backpackUpgrade);
    inventoryState.selectedContainer = null;
    renderInventory(); renderHotbar(); renderCrafting(); playSoundEffect("upgrade"); saveGame(false);
    showToast(`背包升级成功！现在是 ${["", "I", "II", "III", "IV", "V"][inventoryState.backpackLevel]} 级，容量 ${backpackCapacity()} 格。`);
    return;
  }
  const outputId = recipe.outputId || recipe.id;
  if (!recipe.repairTool && itemCatalog[outputId] && !canStoreItem(outputId)) {showToast("背包已满，或已持有同类耐久工具，请先整理物品栏。");return;}
  for(const [id,n] of Object.entries(effectiveIngredients)) removeItems(id,n);
  if (recipe.repairTool) {
    const tool = findTool(recipe.repairTool);
    tool.durability = Math.min(itemCatalog[recipe.repairTool].durabilityMax, tool.durability + recipe.repairAmount);
    showToast(`${tool.name}维修完成，当前耐久 ${tool.durability}/${itemCatalog[recipe.repairTool].durabilityMax}。`);
  } else if (!addItemToInventory(outputId,recipe.output)) {
    for(const [id,n] of Object.entries(effectiveIngredients)) addItemToInventory(id,n);
    showToast("没有空位存放制作结果，材料已退回。");return;
  } else {
    if (recipe.unlockRegion) {
      gameState.unlockedRegions[recipe.unlockRegion] = true;
      document.querySelector("#current-task").textContent = "已制作简易木筏：碎石河谷入口已解锁。前往初始地图东侧入口，按 E 进入第二章。";
      showToast(`制作成功：${itemCatalog[outputId].name}。主线区域已解锁：${recipe.unlockRegion === "riverValley" ? "碎石河谷" : recipe.unlockRegion}！`);
    } else {
      showToast(`制作成功：${itemCatalog[outputId]?.name || recipe.name} ×${recipe.output}`);
    }
  }
  if (!recipe.repairTool && !recipe.backpackUpgrade) mainQuestState.crafted[outputId] = true;
  checkMainQuestProgress();
  if(recipe.station==="fire" && cookingFire) cookingFire.fuel = Math.max(0, cookingFire.fuel - 1);
  renderInventory();renderHotbar();renderCrafting();playSoundEffect("craft");saveGame(false);
}
function selectedCamp() { return gameState.camps.find(c => c.id === gameState.selectedCampId) || null; }
function campHasFurniture(type) { const c=selectedCamp(); return Boolean(c && c.furniture.some(f => f.type===type)); }
function upgradeCamp(fromOrb=false) {
  const camp=selectedCamp();
  if(gameState.location!=="camp" || !camp){showToast("请先进入自己建造的营地，再靠近魔法球升级。");return;}
  if(!fromOrb && Math.hypot(gameState.player.x-canvas.width/2,gameState.player.y-(54+(canvas.height-110)*.28))>115){showToast("请走到营地中央的魔法球旁，再提交升级材料。");return;}
  if(camp.level>=3){showToast("当前版本营地已达到最高等级 III。");return;}
  const costs = camp.level===1 ? {wood:12,stone:8,plank:4,rope:3} : {ironIngot:4,plank:10,cloth:4,basicParts:2};
  const missing=Object.entries(costs).filter(([id,n])=>getItemCount(id)<n);
  if(missing.length){showToast("魔法球需要提交："+Object.entries(costs).map(([id,n])=>`${itemCatalog[id]?.name||id} ×${n}`).join("、"));return;}
  for(const [id,n] of Object.entries(costs)) removeItems(id,n);
  camp.level++; gameState.campLevel=camp.level;
  renderInventory();renderHotbar();renderCrafting();drawWorld();playSoundEffect("upgrade");saveGame(false);
  showToast(`魔法球吸收材料成功！这座营地升级至 ${["","I","II","III"][camp.level]} 级。外观已升级，家具需要自己制作和摆放。`);
}
function enterCamp(camp) {
  if(!camp) return;
  gameState.campReturnPosition={x:gameState.player.x,y:gameState.player.y};
  gameState.selectedCampId=camp.id;gameState.campLevel=camp.level;gameState.location="camp";
  gameState.player.x=canvas.width/2;gameState.player.y=canvas.height*.72;gameState.keys.clear();cameraState.x=null;cameraState.y=null;
  document.querySelector("#current-task").textContent="自建营地内部：靠近魔法球按 E 提交材料升级；家具需要自己制作并在营地内按 F 摆放。";
  drawWorld();showToast(`进入自建营地 · 等级 ${["","I","II","III"][camp.level]}`);playSoundEffect("enter");saveGame(false);
}
function leaveCamp() {
  gameState.location="world";gameState.selectedCampId=null;
  const pos=gameState.campReturnPosition||{x:gameState.player.x,y:gameState.player.y};
  gameState.player.x=pos.x;gameState.player.y=pos.y;gameState.keys.clear();cameraState.x=null;cameraState.y=null;
  document.querySelector("#current-task").textContent="继续探索：收集材料，制作营地套件，在喜欢的位置建造基地。";
  drawWorld();showToast("已离开营地，回到野外地图。");playSoundEffect("enter");saveGame(false);
}
function isInsideCampNoSpawn(col, row) {
  if (gameState.camps.some(camp => Math.abs(camp.col-col) <= 3 && Math.abs(camp.row-row) <= 3)) return true;
  return gameState.placedCampfires.some(fire => Math.abs(Math.floor(fire.x/TILE_SIZE)-col) <= 1 && Math.abs(Math.floor(fire.y/TILE_SIZE)-row) <= 1);
}
function updateResourceRespawns() {
  // v31：被清理的树桩进入自然再生周期：约 3 天长成树苗，随后逐步长成幼树与成熟树。
  for (const obj of worldObjects) {
    const age = worldTimeMinutes - (obj.stageAt ?? worldTimeMinutes);
    if (obj.type === "treeSapling" && age >= 24 * 60) { obj.type = "treeYoung"; obj.stageAt = worldTimeMinutes; }
    else if (obj.type === "treeYoung" && age >= 48 * 60) { obj.type = "treeSmall"; obj.stageAt = worldTimeMinutes; obj.chopHits = 0; }
    else if (obj.type === "treeSmall" && age >= 3 * 24 * 60) { obj.type = "treeMedium"; obj.stageAt = worldTimeMinutes; obj.chopHits = 0; }
    else if (obj.type === "treeMedium" && age >= 5 * 24 * 60) { obj.type = "tree"; obj.stageAt = worldTimeMinutes; obj.chopHits = 0; }
    else if (obj.type === "tree" && obj.stageAt != null && age >= 5 * 24 * 60) delete obj.stageAt;
  }
  for (const obj of worldObjects) {
    if (!harvestedObjects.has(obj.id) || noRespawnObjects.has(obj.id)) continue;
    if (isInsideCampNoSpawn(obj.col, obj.row)) continue;
    const harvestedAt = harvestedAtMinutes.get(obj.id);
    if (Number.isFinite(harvestedAt) && worldTimeMinutes - harvestedAt >= RESOURCE_RESPAWN_MINUTES) {
      if (obj.type === "treeStump") { obj.type = "treeSapling"; obj.stageAt = worldTimeMinutes; }
      harvestedObjects.delete(obj.id);
      harvestedAtMinutes.delete(obj.id);
    }
  }
  // 特殊区域资源同样按游戏内 3 天刷新；营地建设区只存在于初始地图。
  for (const obj of regionObjects) {
    if (!harvestedObjects.has(obj.id) || noRespawnObjects.has(obj.id)) continue;
    const harvestedAt = harvestedAtMinutes.get(obj.id);
    if (Number.isFinite(harvestedAt) && worldTimeMinutes - harvestedAt >= RESOURCE_RESPAWN_MINUTES) {
      harvestedObjects.delete(obj.id);
      harvestedAtMinutes.delete(obj.id);
    }
  }
}
function reserveConstructionGround(col, row, radius) {
  for (const obj of worldObjects) {
    if (Math.abs(obj.col-col) <= radius && Math.abs(obj.row-row) <= radius) {
      harvestedObjects.add(obj.id);
      noRespawnObjects.add(obj.id);
      harvestedAtMinutes.delete(obj.id);
    }
  }
}
function reserveCampGround(camp) {
  // 营地周围 7×7 地块作为建设区：清除已有自然资源，且以后不再刷新。
  reserveConstructionGround(camp.col, camp.row, 3);
}
function buildCamp() {
  if(gameState.location!=="world"){showToast("营地只能建造在野外地图，不能在营地内部或特殊区域建造。");return false;}
  const candidates=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[0,2],[-2,0],[0,-2]];
  let spot=null;
  for(const [dx,dy] of candidates){
    const col=Math.floor(gameState.player.x/TILE_SIZE)+dx,row=Math.floor(gameState.player.y/TILE_SIZE)+dy;
    if(col<2||row<2||col>=MAP_WIDTH-2||row>=MAP_HEIGHT-2)continue;
    const terrain=getTerrain(col,row);
    if([TERRAIN.RIVER,TERRAIN.DEEP_WATER,TERRAIN.SHALLOW_WATER].includes(terrain)||isSolidTile(col,row))continue;
    const x=(col+.5)*TILE_SIZE,y=(row+.5)*TILE_SIZE;
    if(gameState.camps.some(c=>Math.hypot(c.x-x,c.y-y)<TILE_SIZE*4))continue;
    spot={x,y,col,row};break;
  }
  if(!spot){showToast("附近没有合适的空地，走到草地或林间空地再建造。");return false;}
  const camp={id:`camp-${gameState.nextCampId++}`,x:spot.x,y:spot.y,col:spot.col,row:spot.row,level:1,furniture:[],createdAt:Date.now()};
  gameState.camps.push(camp);reserveCampGround(camp);showToast(`营地建造成功！当前拥有 ${gameState.camps.length} 座营地。靠近营地按 E 进入。营地周围建设区不会再长出自然资源。`);playSoundEffect("upgrade");saveGame(false);drawWorld();return true;
}
function placeFurniture(itemId) {
  const camp=selectedCamp(), item=itemCatalog[itemId];
  if(gameState.location!=="camp"||!camp||!item?.furniture){showToast("作业台和家具只能在自己营地的内部摆放。");return false;}
  if(item.furnitureLevel>camp.level){showToast(`这件家具需要营地等级 ${item.furnitureLevel}，请先升级营地。`);return false;}
  const existing=camp.furniture.findIndex(f=>f.type===item.furnitureType);
  const furniture={id:`${camp.id}-${item.id}-${Date.now()}`,itemId:item.id,type:item.furnitureType,level:item.furnitureLevel,x:Math.round(gameState.player.x/40)*40,y:Math.round(gameState.player.y/40)*40};
  if(item.furnitureType==="workbench"||item.furnitureType==="furnace"||item.furnitureType==="chest"||item.furnitureType==="bed"){
    if(existing>=0){camp.furniture.splice(existing,1);showToast(`已用${item.name}替换原有同类家具。`);}else showToast(`${item.name}已放置在营地内部。`);
  }
  camp.furniture.push(furniture);gameState.campLevel=camp.level;gameState.hasFurnace=camp.furniture.some(f=>f.type==="furnace");
  return true;
}

function activeMainQuest() { return mainQuests.find(q => q.chapter === mainQuestState.chapter) || null; }
// 新增主线地点时的统一约定：在 QUEST_LANDMARKS 登记固定实体，任务指引引用同一坐标；
// 实体绘制、碰撞和交互均使用同一个 landmarkId，避免任务 pin 与实体分离。
function getQuestLandmark(landmarkId) { return QUEST_LANDMARKS[landmarkId] || null; }
function recordQuestGather(objectType, itemId, count) {
  if (itemId === "wood" || objectType === "tree" || objectType === "log" || objectType === "driftwood") mainQuestState.gathered.wood += itemId === "wood" ? count : 0;
  if (itemId === "berries") mainQuestState.gathered.berries += count;
  if (itemId === "stone") mainQuestState.gathered.stone += count;
  if (itemId === "branch") mainQuestState.gathered.branch += count;
  if (itemId === "fiber") mainQuestState.gathered.fiber += count;
  // 计数只在实际采集成功后增加；木材/浆果/石块累计值供第七章补给任务使用。
}
function interactWithStoryPoint(obj) {
  gameState.player.actionType = "investigate";
  gameState.player.actionUntil = performance.now() + 650;
  const quest = activeMainQuest();
  if (obj.storyKey && obj.storyKey.startsWith("anomaly_")) {
    if (mainQuestState.chapter < 4) { showToast("这里的异常还无法判断。先安顿营地并找到失散伙伴。"); return; }
    const key = obj.storyKey;
    if (!mainQuestState.flags[key]) {
      mainQuestState.flags[key] = true;
      const lines = { anomaly_aircraft:"机舱金属上附着着紫黑色结晶，像是从内部生长出来的。", anomaly_cabin:"木屋墙缝里长出不自然的黑色菌丝，旧日记提到野兽先于人类出现异变。", anomaly_clearing:"林地裂隙不断冒出冷雾，附近的足迹在这里突然变得密集。" };
      openStoryDialog("异常调查记录", lines[key] || "你记录下了异常。", "记录线索", () => { checkMainQuestProgress(); saveGame(false); });
    } else if (mainQuestState.chapter >= 5 && !mainQuestState.flags[key.replace("anomaly_","purged_")]) {
      const purge = key.replace("anomaly_","purged_"); mainQuestState.flags[purge] = true;
      openStoryDialog("污染源已清理", "你破坏了结晶核心。雾气暂时减弱，但森林中央仍有更强烈的脉动。", "完成清理", () => { checkMainQuestProgress(); saveGame(false); });
    } else showToast("这里的异常记录已经更新。");
    return;
  }
  if (obj.storyKey === "nest_boss") {
    if (mainQuestState.chapter < 6) { showToast("巢穴外层仍被污染雾封锁。先调查并清理三处次级污染源。"); return; }
    if (mainQuestState.flags.nestBossDefeated) { showToast("巢穴核心已经沉寂。回营地向伙伴报告。"); return; }
    if (!enemies.some(e=>e.type==="nestBoss" && e.alive && e.location==="world")) {
      const bx=(obj.col+.5)*TILE_SIZE, by=(obj.row+.5)*TILE_SIZE;
      enemies.push(makeEnemy("nestBoss",bx,by));
      openStoryDialog("污染巢穴核心", "结晶外壳裂开，一只被污染晶体包裹的巨兽从巢穴中挣脱。伙伴们的准备为你争取了时间，但这一战只能由你完成。", "迎战", () => { saveGame(false); });
    } else showToast("污染巢穴首领正在附近活动，准备战斗！");
    return;
  }
  if (!quest) { showToast("第一章主线已完成。你可以继续探索、建造和收集资源。"); return; }
  if (obj.questId !== quest.chapter) {
    showToast(obj.questId > quest.chapter ? `这条线索暂时还无法解读。当前主线：第 ${quest.chapter} 章「${quest.title}」。` : "这条线索已经调查过了，继续追踪当前任务。");
    return;
  }
  if (quest.chapter === 7 && (mainQuestState.gathered.wood < 60 || mainQuestState.gathered.berries < 40 || mainQuestState.gathered.stone < 40)) {
    showToast(`补给还不齐：木材 ${mainQuestState.gathered.wood}/60 · 浆果 ${mainQuestState.gathered.berries}/40 · 石块 ${mainQuestState.gathered.stone}/40。`);
    return;
  }
  mainQuestState.flags[obj.storyKey] = true;
  if (obj.storyKey === "cabin") {
    addItemToInventory("wire", 2); addItemToInventory("basicParts", 2); addItemToInventory("tape", 2);
    renderInventory(); renderHotbar();
  }
  const narratives = {
    cabin: "你在废弃木屋里找到未寄出的信、旧日记和照片。信件把路线指向碎石河谷的旧巡护站。",
    rescue: "芦苇丛里传来微弱呻吟。周明（小周）获救了，但暴雨和上涨的河水逼得你们必须尽快撤回高台。",
    patrolLog: "巡护员日志证实主桥并非意外损毁。有人在事故发生前就开始撤离，并刻意封锁了北上的通道。",
    shelter: "你们把小周带回三号旧巡护站，苏棠在炉火旁继续处理他的伤势。暂时安全下来后，小周告诉你们：必须先修复前哨站并凑齐补给，才能取得造桥图纸与后续通行权限。",
    supplyList: "小周交出补给清单。木材、浆果和石材是修复前哨站、继续追查的关键。",
    bridge: "桥梁工程线索被确认。你们终于有了前往废弃驻地与断脊高地的路线。",
    beast: "浓雾里留下巨兽撞碎围栏的痕迹。它身上的麻醉镖说明它来自北方更危险的区域。",
    radioTower: "通信塔磁带反复播放警告：不要回应北方的信号。老张留下了坐标与通往断脊高地的钥匙线索。",
    cave: "洞穴里的录音提到异常磁场、狂暴动物，以及通往高地上层平台的隐秘石阶。",
    walkway: "你们利用高低差逼退山林巨怪，并修复悬崖栈道。前方旧观测站保存着有关北坡与深井通道的异常记录。",
    observatory: "旧观测站黑匣子记录揭示：研究站地下仍有设备运行，北坡存在一条废弃深井通道。",
    researchStation: "研究站外围的高压铁网仍在放电。事故并未随着人员撤离而结束。",
    bunker: "应急地堡里找到备用电源控制台和失踪人员档案，所有线索都指向地下深井。",
    deepWell: "你抵达地下科研大厅，电磁谐振发生器仍在运转。第一卷结束：真正的终局之战即将开始。"
  };
  if (quest.chapter === 8) gameState.unlockedRegions.ridgeHighlands = true;
  showToast(narratives[obj.storyKey] || `已调查：${obj.label || "剧情线索"}`);
  checkMainQuestProgress();
  drawWorld(); saveGame(false);
}
function showQuestCompleteBanner(completedQuest, nextQuest) {
  if (!questCompleteBanner || !completedQuest) return;
  questCompleteTitle.textContent = `第 ${completedQuest.chapter} 章 · ${completedQuest.title}`;
  questNextTitle.textContent = nextQuest ? `下一目标：${nextQuest.title}｜${nextQuest.objective}` : "第一章完成 · 翠影森林据点已稳固";
  questCompleteBanner.classList.remove("show");
  // 触发一次重排，让连续完成的任务也能重新播放出现动画。
  void questCompleteBanner.offsetWidth;
  questCompleteBanner.classList.add("show");
  if (questBannerTimer) clearTimeout(questBannerTimer);
  questBannerTimer = setTimeout(() => questCompleteBanner.classList.remove("show"), 4300);
}
function checkMainQuestProgress() {
  let advanced = false;
  let lastCompletedQuest = null;
  while (true) {
    const quest = activeMainQuest();
    if (!quest || !quest.check()) break;
    if (!mainQuestState.completed.includes(quest.chapter)) mainQuestState.completed.push(quest.chapter);
    lastCompletedQuest = quest;
    if (quest.chapter === 8) gameState.unlockedRegions.ridgeHighlands = true;
    mainQuestState.chapter = Math.min(8, quest.chapter + 1);
    advanced = true;
    if (mainQuestState.chapter === 8) break;
  }
  updateMainQuestUI();
  if (advanced && lastCompletedQuest) {
    const next = activeMainQuest();
    showQuestCompleteBanner(lastCompletedQuest, next);
    if (mainQuestState.chapter === 8) showToast("第一章《无人回应的边境》完成！主地图仍可继续探索。");
    else if (next) showToast(`主线推进：第 ${next.chapter} 章「${next.title}」`);
    renderMapQuestPanel();
  }
  return advanced;
}
function updateMainQuestUI() {
  const quest = activeMainQuest();
  const currentTask = document.querySelector("#current-task");
  if (quest) {
    currentTask.textContent = `第 ${quest.chapter} 章 · ${quest.title}：${quest.objective}`;
    if (questHudLabel) questHudLabel.textContent = `第一章 ${quest.chapter}/7 · ${quest.title}`;
    if (questCurrentTitle) questCurrentTitle.textContent = `第 ${quest.chapter} 章 · ${quest.title}`;
    if (questCurrentSummary) questCurrentSummary.textContent = quest.summary;
    if (questCurrentObjective) questCurrentObjective.textContent = quest.objective;
    if (questCurrentHint) { const guide = questGuidance[quest.chapter] || {}; questCurrentHint.textContent = `${quest.hint}\n\n📍 任务地点：${guide.location || quest.region}\n👤 相关人物：${guide.person || "剧情人物"}`; }
  } else {
    currentTask.textContent = "第一章主线已完成。你可以继续探索、建造营地、升级背包与收集资源。";
    if (questHudLabel) questHudLabel.textContent = "第一章主线已完成";
    if (questCurrentTitle) questCurrentTitle.textContent = "第一章《无人回应的边境》已完成";
    if (questCurrentSummary) questCurrentSummary.textContent = "你已清除翠影森林中央巢穴，第一章故事暂告一段落。";
    if (questCurrentObjective) questCurrentObjective.textContent = "主线完成。可继续自由探索。";
    if (questCurrentHint) questCurrentHint.textContent = "已完成章节会保留在任务记录中。";
  }
  if (questProgressLabel) questProgressLabel.textContent = `已完成 ${Math.min(7,mainQuestState.completed.length)}/7 个阶段`;
  if (questChapterList && questModal && !questModal.classList.contains("hidden")) {
    questChapterList.innerHTML = "";
    for (const item of mainQuests) {
      const row = document.createElement("article");
      const done = mainQuestState.completed.includes(item.chapter);
      const current = quest?.chapter === item.chapter;
      const next = !done && !current && item.chapter === (quest?.chapter || 17) + 1;
      const guide = questGuidance[item.chapter] || {};
      row.className = `quest-chapter-row${done ? " completed" : ""}${current ? " current" : ""}${next ? " next-up" : ""}`;
      const number = document.createElement("span"); number.className = "quest-chapter-number"; number.textContent = done ? "✓" : current ? "◆" : next ? "→" : String(item.chapter).padStart(2,"0");
      const body = document.createElement("div"); body.className = "quest-chapter-body";
      const title = document.createElement("strong"); title.textContent = `${current ? "当前任务 · " : next ? "下一任务 · " : ""}${item.title}`;
      const desc = document.createElement("p"); desc.textContent = item.objective;
      const region = document.createElement("small"); region.textContent = `📍 ${guide.location || item.region} · 👤 ${guide.person || "剧情人物"}`;
      body.append(title, desc, region); row.append(number, body); questChapterList.append(row);
    }
  }
}
const sideQuests = [
  { title: "建立第一个营地", desc: "制作营地套件，在合适的空地建造自己的营地。", check: () => gameState.camps.length > 0, reward: "解锁稳定的建设据点" },
  { title: "点燃荒野之火", desc: "制作并放置一处篝火，为夜间探索准备照明。", check: () => gameState.placedCampfires.length > 0, reward: "夜间更容易辨认营地位置" },
  { title: "储备应急口粮", desc: "累计采集木材 10、浆果 5，准备一次短途探索。", check: () => mainQuestState.gathered.wood >= 10 && mainQuestState.gathered.berries >= 5, reward: "熟悉基础采集循环" },
  { title: "踏入碎石河谷", desc: "制作简易木筏并首次进入碎石河谷。", check: () => Boolean(gameState.visitedRegions.riverValley), reward: "发现新的区域资源" }
];
function setMapQuestMode(mode) {
  mapQuestMode = mode;
  if (mapMainTab) { mapMainTab.classList.toggle("active", mode === "main"); mapMainTab.setAttribute("aria-selected", String(mode === "main")); }
  if (mapSideTab) { mapSideTab.classList.toggle("active", mode === "side"); mapSideTab.setAttribute("aria-selected", String(mode === "side")); }
  renderMapQuestPanel();
}
function renderMapQuestPanel() {
  if (!mapQuestList || mapModal.classList.contains("hidden")) return;
  mapQuestList.innerHTML = "";
  if (mapQuestMode === "main") {
    if (mapQuestCaption) mapQuestCaption.textContent = `第一章：无人回应的边境 · ${Math.min(7,mainQuestState.completed.length)}/7`;
    for (const quest of mainQuests) {
      const done = mainQuestState.completed.includes(quest.chapter);
      const active = activeMainQuest()?.chapter === quest.chapter;
      const button = document.createElement("button");
      button.type = "button";
      const next = !done && !active && quest.chapter === (activeMainQuest()?.chapter || 17) + 1;
      button.className = `map-quest-item${done ? " completed" : ""}${active ? " current" : ""}${next ? " next-up" : ""}`;
      const marker = document.createElement("span"); marker.className = "map-quest-marker"; marker.textContent = done ? "✓" : active ? "◆" : next ? "→" : String(quest.chapter).padStart(2, "0");
      const text = document.createElement("span"); text.className = "map-quest-item-copy";
      const title = document.createElement("strong"); title.textContent = `${active ? "当前 · " : next ? "下一任务 · " : ""}${quest.title}`;
      const guide = questGuidance[quest.chapter] || {location:quest.region,person:"剧情人物"};
      const desc = document.createElement("small"); desc.textContent = `${done ? "✓ 已完成" : active ? "当前目标" : next ? "接下来解锁" : "后续主线"} · ${guide.location}`;
      text.append(title, desc); button.append(marker, text);
      button.addEventListener("click", () => {
        const detail = `${quest.title}\n目标：${quest.objective}\n地点：${guide.location}\n相关人物：${guide.person}\n提示：${quest.hint}`;
        document.querySelector("#expanded-current-task").textContent = detail;
      });
      mapQuestList.append(button);
    }
  } else {
    const completedCount = sideQuests.filter(quest => quest.check()).length;
    if (mapQuestCaption) mapQuestCaption.textContent = `探索支线 · ${completedCount}/${sideQuests.length} 已完成`;
    for (const quest of sideQuests) {
      const done = quest.check();
      const button = document.createElement("button");
      button.type = "button";
      button.className = `map-quest-item side-quest-item${done ? " completed" : ""}`;
      const marker = document.createElement("span"); marker.className = "map-quest-marker"; marker.textContent = done ? "✓" : "◇";
      const text = document.createElement("span"); text.className = "map-quest-item-copy";
      const title = document.createElement("strong"); title.textContent = quest.title;
      const desc = document.createElement("small"); desc.textContent = done ? `已完成 · ${quest.reward}` : quest.desc;
      text.append(title, desc); button.append(marker, text);
      button.addEventListener("click", () => { document.querySelector("#expanded-current-task").textContent = `${quest.title}：${done ? quest.reward : quest.desc}`; });
      mapQuestList.append(button);
    }
  }
}
function openQuestLog() { questModal.classList.remove("hidden"); updateMainQuestUI(); playSoundEffect("tap"); }
function closeQuestLog() { questModal.classList.add("hidden"); playSoundEffect("tap"); }

function enterRegion(regionId) {
  if (!gameState.unlockedRegions[regionId]) { showToast("这片区域尚未解锁。请推进主线任务。"); return; }
  gameState.regionReturnPosition = { x: gameState.player.x, y: gameState.player.y };
  gameState.location = "region"; gameState.regionId = regionId;
  gameState.visitedRegions[regionId] = true;
  const layout = getRegionMapLayout();
  gameState.player.x = layout.x + layout.width * .5; gameState.player.y = layout.y + layout.height * .78;
  gameState.keys.clear(); createRegionObjects(regionId); cameraState.x = null; cameraState.y = null;
  spawnInitialEnemies();
  checkMainQuestProgress();
  drawWorld(); showToast(`进入新区域：${regionId === "riverValley" ? "碎石河谷" : "断脊高地"}`); saveGame(false);
}
function leaveRegion() {
  gameState.location = "world"; gameState.regionId = null;
  const pos = gameState.regionReturnPosition || { x: 67.5*TILE_SIZE, y: 51.5*TILE_SIZE };
  gameState.player.x = pos.x; gameState.player.y = pos.y; gameState.keys.clear();
  cameraState.x = null; cameraState.y = null;
  spawnInitialEnemies();
  updateMainQuestUI();
  drawWorld(); showToast("已返回翠影森林初始地图。"); saveGame(false);
}
function searchRegionCrate(obj) {
  const crateKey = `${gameState.regionId}:main-crate`;
  if (gameState.searchedContainers.includes(crateKey)) { showToast("补给箱已经搜过了，里面没有剩余物资。"); return; }
  const loot = [["scrapMetal",2],["tape",2],["emptyContainer",2],["basicParts",2],["feather",2],["cloth",1],["pebble",3]];
  const allLoot = gameState.regionId === "ridgeHighlands" ? [...loot,["ironOre",2],["copperOre",1]] : loot;
  const uniqueNewItems = [...new Set(allLoot.map(([id])=>id))].filter(id=>![...inventoryState.slots,...inventoryState.hotbar].some(item=>item&&item.id===id));
  const emptySlots = inventoryState.slots.filter(item=>!item).length;
  if (uniqueNewItems.length > emptySlots) { showToast(`补给箱物资较多，请先整理背包，至少腾出 ${uniqueNewItems.length-emptySlots} 个额外空位。箱子不会消失。`); return; }
  gameState.searchedContainers.push(crateKey); harvestedObjects.add(obj.id);
  for (const [id,count] of loot) addItemToInventory(id,count);
  if (gameState.regionId === "riverValley") {
    gameState.unlockedRegions.cave = true;
    showToast("搜到巡护员补给箱！获得胶带、废旧零件、空容器等物资；继续完成补给清单与断桥调查。");
  } else {
    addItemToInventory("ironOre",2); addItemToInventory("copperOre",1);
    gameState.unlockedRegions.researchStation = true;
    showToast("找到高地勘察物资：获得矿石与研究站线索。更远区域将在后续章节开放。");
  }
  renderInventory();renderHotbar();renderCrafting();saveGame(false);
}
function interactWithRegion() {
  gameState.player.actionType = "interact";
  gameState.player.actionStartedAt = performance.now();
  gameState.player.actionUntil = performance.now() + 420;
  const obj = nearestWorldObject();
  if (!obj) { showToast("附近没有可交互目标。"); return; }
  if (obj.type === "regionExit") { leaveRegion(); return; }
  if (obj.type === "regionCrate") { searchRegionCrate(obj); return; }
  if (obj.type === "companionNpc") {
    const companion = companionForObject(obj);
    if (!companion) return;
    if (mainQuestState.flags[`companion_${obj.characterId}`] && mainQuestState.chapter !== 7) {
      if (obj.characterId === "hunter") {
        const following=!mainQuestState.flags.hunterFollowing; mainQuestState.flags.hunterFollowing=following; placeAvailableCompanions();
        openStoryDialog(companion.name, following ? "我跟着你走。遇到普通野兽我会帮忙牵制，但巢穴首领还是得你来打。再和我交谈可以让我回营地。" : "我先回到营地附近休整。需要出门时再来找我。", following?"一起出发":"回营地", ()=>{placeAvailableCompanions();saveGame(false);}); return;
      }
      if(obj.characterId === "mechanic") { openStoryDialog(companion.name, companionHomeLine(obj.characterId), "打开工作台", () => openCrafting("recipes")); return; }
      if(obj.characterId === "scout" && mainQuestState.flags.scoutIntel) { const intel=mainQuestState.flags.scoutIntel; openStoryDialog(companion.name, `${companionHomeLine(obj.characterId)} 我最新标记的资源点在地图坐标 ${intel.col}, ${intel.row}。地图上的金色脉冲就是位置。`, "收到情报", null); return; }
      openStoryDialog(companion.name, companionHomeLine(obj.characterId), "知道了", null); return;
    }
    if (mainQuestState.chapter === 7 && mainQuestState.flags[`companion_${obj.characterId}`]) {
      openStoryDialog(companion.name, "巢穴的脉动停下来了。我们会把这里当成新的据点，但森林外面还有很多问题。今晚先休息，明天再决定下一步。", "结束第一章", () => { mainQuestState.flags.chapterOneDebrief = true; checkMainQuestProgress(); saveGame(false); }); return;
    }
    recruitCompanion(obj.characterId); return;
  }
  if (obj.type === "storyPoint") { interactWithStoryPoint(obj); return; }
  if (["rock","ore","copperOre","silverOre","goldOre","pebbleNode"].includes(obj.type) && !toolForOre(obj.type)) { showToast(obj.type === "goldOre" ? "金矿需要银镐或金镐。" : obj.type === "silverOre" ? "银矿需要铜镐或更高级矿镐。" : "开采需要石镐或更高级矿镐。先制作石镐。"); return; }
  const loot = getLootForObject(obj);
  if (!loot) return;
  if (!addItemToInventory(loot[0],loot[1])) { showToast("背包已满，请先整理物品栏。"); return; }
  recordQuestGather(obj.type, loot[0], loot[1]);
  harvestedObjects.add(obj.id);
  harvestedAtMinutes.set(obj.id, worldTimeMinutes);
  if (obj.type === "droppedItem") noRespawnObjects.add(obj.id);
  if (["ore","copperOre","silverOre","goldOre","rock","pebbleNode"].includes(obj.type)) { const pickId=toolForOre(obj.type); if(pickId) wearTool(pickId, obj.type.endsWith("Ore") ? (pickId==="goldPickaxe"?1:pickId==="silverPickaxe"?2:pickId==="copperPickaxe"?3:5) : 3); }
  if (["highGrass","reeds","medicinalHerb"].includes(obj.type) && Math.random()<.22) addItemToInventory("seed",1);
  showToast(loot[2]);checkMainQuestProgress();renderInventory();renderHotbar();renderCrafting();saveGame(false);
}
function createRegionObjects(regionId) {
  regionObjects.length = 0;
  const isRiver = regionId === "riverValley";
  const push = (col,row,type,extra={}) => regionObjects.push({id:`${regionId}-${type}-${col}-${row}`,col,row,type,...extra});
  // 每次进入都用固定坐标重建地图物件，已搜容器/已完成线索通过存档状态保持。
  push(14,15,"regionExit");
  push(25,4,"regionCrate");
  if (isRiver) {
    for (let row=2; row<14; row++) for (let col=1; col<29; col++) {
      if ((col*7+row*11)%13===0) push(col,row,"reeds");
      else if ((col*5+row*3)%17===0) push(col,row,"bush");
      else if ((col*3+row*7)%19===0) push(col,row,"stonePile");
      else if ((col*11+row*5)%23===0) push(col,row,"branch");
      else if ((col*13+row*2)%29===0) push(col,row,"medicinalHerb");
    }
    [
      [5,7,5,"rescue","芦苇丛中的小周"], [22,11,4,"patrolLog","三号旧巡护站日志"], [22,13,6,"shelter","炉火与临时安置点"],
      [14,3,7,"supplyList","巡护员补给清单"], [27,8,8,"bridge","断桥工程点"],
      [15,8,9,"beast","浓雾巨影"], [5,3,10,"radioTower","西侧通信塔机房"]
    ].forEach(([col,row,questId,storyKey,label])=>push(col,row,"storyPoint",{questId,storyKey,label,icon:"📜"}));
  } else {
    for (let row=2; row<14; row++) for (let col=1; col<29; col++) {
      if ((col*7+row*11)%13===0) push(col,row,"rock");
      else if ((col*5+row*3)%17===0) push(col,row,"ore");
      else if ((col*3+row*7)%19===0) push(col,row,"copperOre");
      else if ((col*11+row*5)%23===0) push(col,row,"stonePile");
      else if ((col*13+row*2)%29===0) push(col,row,"branch");
    }
    // 高地矿脉分层：铜矿较常见，银矿在北坡，金矿位于深处；均有明确图标可见。
    [[10,4,"copperOre"],[12,6,"copperOre"],[20,8,"copperOre"],[9,9,"silverOre"],[27,6,"silverOre"],[27,13,"goldOre"]].forEach(([col,row,type],i)=>{const old=regionObjects.find(o=>o.col===col&&o.row===row);if(old)old.hidden=true;push(col,row,type,{id:`${regionId}-tierore-${i}`});});
    [
      [5,5,11,"cave","石壁后的幽暗洞穴"], [23,5,13,"observatory","旧观测站"], [7,11,12,"walkway","悬崖栈道与山林巨怪"],
      [15,8,14,"researchStation","迷雾研究站外围"], [24,11,15,"bunker","应急地堡控制室"],
      [15,3,16,"deepWell","深井通道主控点"]
    ].forEach(([col,row,questId,storyKey,label])=>push(col,row,"storyPoint",{questId,storyKey,label,icon:"📜"}));
  }
  // 入口与出口附近留出空地，避免生成资源堵住通道。
  for (const obj of regionObjects) {
    if (obj.type === "regionExit" || obj.type === "regionCrate" || obj.type === "storyPoint") continue;
    const storyCollision = regionObjects.some(point => point.type === "storyPoint" && Math.abs(point.col-obj.col)<=1 && Math.abs(point.row-obj.row)<=1);
    if ((Math.abs(obj.col-14)<=1 && obj.row>=13) || (Math.abs(obj.col-25)<=1 && obj.row<=5) || storyCollision) obj.hidden = true;
  }
}
function drawRegionMap() {
  const isRiver = gameState.regionId === "riverValley";
  const l = getRegionMapLayout(), tile = l.tile;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, isRiver ? "#293e31" : "#2e3735"); bg.addColorStop(1, isRiver ? "#1b3029" : "#222b2b");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 地图边缘做暗角和岩壁阴影，地图本身是一块完整可探索区域，而不是铺满屏幕的重复色块。
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(l.x - 7, l.y - 7, l.width + 14, l.height + 14);
  for (let row = 0; row < 16; row++) for (let col = 0; col < 30; col++) {
    const x = l.x + col * tile, y = l.y + row * tile;
    const r = getTileRandom(col + (isRiver ? 701 : 991), row + 31);
    if (isRiver) {
      const riverCenter = 5.1 + Math.sin(col * .25) * 1.7 + Math.sin(col * .61) * .5;
      const riverDist = Math.abs(row - riverCenter);
      const northShelf = row < 4 && col > 17 && col < 28;
      let color = r > .66 ? "#6e8957" : r > .32 ? "#5d794b" : "#4d6b43";
      if (row > 11) color = r > .5 ? "#8c8a65" : "#797b59"; // 南岸砂砾滩
      if (riverDist < 1.05) color = "#36778b";
      else if (riverDist < 1.8) color = "#6c9b91";
      else if (riverDist < 2.35) color = r > .45 ? "#a7a17a" : "#817f5c";
      if (northShelf) color = r > .5 ? "#6b6f62" : "#555e52";
      if (col > 20 && row < 5) color = r > .5 ? "#77796d" : "#62685e";
      ctx.fillStyle = color; ctx.fillRect(x, y, tile + 1, tile + 1);
      // 草丛、鹅卵石、冲刷痕迹，使用坐标固定的细节避免地图每帧闪动。
      if (riverDist > 2.4 && r > .48) {
        ctx.fillStyle = r > .8 ? "#a0a76e" : "#3f6040";
        ctx.fillRect(x + getTileRandom(col + 8, row + 4) * tile * .7, y + getTileRandom(col + 5, row + 12) * tile * .7, Math.max(2, tile * .08), Math.max(3, tile * .22));
      }
      if (riverDist > 1.6 && r < .16) {
        ctx.fillStyle = "rgba(42,48,39,.36)"; ctx.beginPath(); ctx.ellipse(x + tile * .52, y + tile * .58, tile * .25, tile * .11, .4, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      const ridge = Math.abs(col - (15 + Math.sin(row * .43) * 4));
      let color = r > .68 ? "#777b70" : r > .35 ? "#626c62" : "#4a5850";
      if (ridge < 4) color = r > .5 ? "#8a8b80" : "#70766e";
      if (col < 5 || col > 25) color = r > .5 ? "#565e57" : "#3f4b45";
      ctx.fillStyle = color; ctx.fillRect(x, y, tile + 1, tile + 1);
      // 断脊高地：石柱、崩落碎石、海拔层次和狭窄山径。
      if (getTileRandom(col + 51, row + 21) > .76 && ridge > 3) {
        ctx.fillStyle = "rgba(20,27,25,.32)"; ctx.beginPath(); ctx.ellipse(x + tile * .53, y + tile * .72, tile * .42, tile * .17, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = r > .5 ? "#9b9c91" : "#777e77"; ctx.beginPath(); ctx.moveTo(x + tile * .12, y + tile * .78); ctx.lineTo(x + tile * .24, y + tile * .2); ctx.lineTo(x + tile * .48, y + tile * .05); ctx.lineTo(x + tile * .72, y + tile * .29); ctx.lineTo(x + tile * .88, y + tile * .82); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(220,221,203,.35)"; ctx.beginPath(); ctx.moveTo(x + tile * .24, y + tile * .2); ctx.lineTo(x + tile * .48, y + tile * .05); ctx.lineTo(x + tile * .53, y + tile * .38); ctx.closePath(); ctx.fill();
      } else if (r > .58) {
        ctx.fillStyle = "#3c4d41"; ctx.fillRect(x + tile * .25, y + tile * .63, tile * .1, tile * .18); ctx.fillRect(x + tile * .58, y + tile * .52, tile * .08, tile * .2);
      }
    }
    // 地块细微边缘纹理让草地/岩地不再像纯色方格。
    if (r > .83) { ctx.fillStyle = "rgba(224,220,177,.10)"; ctx.fillRect(x + tile * .18, y + tile * .18, tile * .22, 1); }
  }
  if (isRiver) {
    // 河面泡沫和被冲断的木桥：任务点附近可见崩塌桥墩，强调“破碎河谷”。
    ctx.save(); ctx.strokeStyle = "rgba(196,225,218,.62)"; ctx.lineWidth = Math.max(1, tile * .055);
    for (let i = 0; i < 22; i++) { const col = (i * 7 + 3) % 30, row = 4 + Math.floor(getTileRandom(i + 33, 91) * 5); const y = l.y + (row + .5) * tile; ctx.beginPath(); ctx.moveTo(l.x + col * tile, y); ctx.lineTo(l.x + col * tile + tile * (.25 + getTileRandom(i, 22) * .4), y - tile * .03); ctx.stroke(); }
    ctx.restore();
    const bx = l.x + 26.5 * tile, by = l.y + 8.1 * tile;
    ctx.fillStyle = "#4d4030"; ctx.fillRect(bx - tile * .95, by - tile * .08, tile * .8, tile * .16); ctx.fillRect(bx + tile * .18, by + tile * .14, tile * .78, tile * .16);
    ctx.strokeStyle = "#b39469"; ctx.lineWidth = Math.max(2, tile * .09); ctx.beginPath(); ctx.moveTo(bx - tile * .8, by - tile * .35); ctx.lineTo(bx - tile * .2, by + tile * .25); ctx.moveTo(bx + tile * .25, by - tile * .25); ctx.lineTo(bx + tile * .85, by + tile * .32); ctx.stroke();
    // 河谷北侧巡护站平台与木栈道
    const sx = l.x + 22 * tile, sy = l.y + 11 * tile;
    ctx.fillStyle = "#514b3c"; ctx.fillRect(sx - tile * .75, sy - tile * .52, tile * 2.5, tile * 1.4);
    ctx.fillStyle = "#7d6a4b"; ctx.fillRect(sx - tile * .63, sy - tile * .42, tile * 2.26, tile * 1.1);
    ctx.fillStyle = "#b4a17b"; ctx.fillRect(sx - tile * .45, sy - tile * .28, tile * 1.9, tile * .07);
    ctx.strokeStyle = "#40372b"; ctx.lineWidth = Math.max(2, tile * .07); ctx.beginPath(); ctx.moveTo(sx - tile * .2, sy + tile * .65); ctx.lineTo(sx + tile * 1.25, sy + tile * .65); ctx.stroke();
  }
  for (const obj of regionObjects) {
    if (obj.hidden || harvestedObjects.has(obj.id)) continue;
    const x = l.x + obj.col * tile, y = l.y + obj.row * tile;
    if (obj.type === "regionExit") { drawCampEntrance(x, y, obj.col, obj.row); }
    else if (obj.type === "regionCrate" && gameState.searchedContainers.includes(`${gameState.regionId}:main-crate`)) continue;
    else if (obj.type === "regionCrate") { ctx.fillStyle="#443324";ctx.fillRect(x+tile*.1,y+tile*.28,tile*.8,tile*.58);ctx.fillStyle="#a77b43";ctx.fillRect(x+tile*.17,y+tile*.34,tile*.66,tile*.43);ctx.fillStyle="#dfc17c";ctx.fillRect(x+tile*.47,y+tile*.34,tile*.1,tile*.43); }
    else if (obj.type === "storyPoint") drawStoryPoint(x, y, obj);
    else if (obj.type === "stonePile" || obj.type === "pebbleNode") drawStonePile(x, y, obj.col, obj.row);
    else if (["ore","copperOre","silverOre","goldOre"].includes(obj.type)) drawOreNode(x, y, obj);
    else if (obj.type === "branch" || obj.type === "driftwood") drawLog(x, y, obj.col, obj.row, false);
    else drawPlant(x, y, obj.type, obj.col, obj.row);
  }
  drawCharacterSprite(ctx, gameState.player.x, gameState.player.y, gameState.selectedCharacter?.id || "scout", gameState.player.facing || "down", gameState.player.moving, gameState.player.walkTime || 0, gameState.player.actionUntil > performance.now() ? gameState.player.actionType : "");
  drawCombatEntities(0, 0);
  ctx.fillStyle="#f4e3b2";ctx.font="bold 16px sans-serif";ctx.textAlign="center";ctx.fillText(isRiver?"碎石河谷 · 断桥与巡护站":"断脊高地 · 石柱脊线",canvas.width/2,25);
  const activeQuest = activeMainQuest(); ctx.fillStyle="#e2dfc8";ctx.font="12px sans-serif";ctx.fillText(activeQuest?`主线第 ${activeQuest.chapter} 章 · ${activeQuest.title}`:"第一章主线已完成",canvas.width/2,44);
  ctx.font="12px sans-serif";ctx.fillStyle="#e1e2d0";ctx.fillText("区域出口位于地图南侧 · 靠近后按 E 返回",canvas.width/2,canvas.height-15);
  const targetInfo=questTargetInfo();document.querySelector("#world-position").textContent=`位置：${isRiver?"碎石河谷":"断脊高地"}${targetInfo&&targetInfo.map===gameState.regionId?` · 任务目标：${targetInfo.label}`:""}`;
}
function placeCampfire() {
  if(gameState.location!=="world") {showToast("只能在野外放置篝火。");return false;}
  const candidates=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1]];
  let spot=null;
  for(const [dx,dy] of candidates){
    const x=gameState.player.x+dx*TILE_SIZE*1.25,y=gameState.player.y+dy*TILE_SIZE*1.25;
    const col=Math.floor(x/TILE_SIZE),row=Math.floor(y/TILE_SIZE);
    if(getTerrain(col,row)===TERRAIN.RIVER||isSolidTile(col,row))continue;
    if(gameState.placedCampfires.some(f=>Math.hypot(f.x-x,f.y-y)<90))continue;
    spot={x:(col+.5)*TILE_SIZE,y:(row+.5)*TILE_SIZE};break;
  }
  if(!spot){showToast("附近没有合适空地放置篝火，请换个位置。");return false;}
  gameState.placedCampfires.push({...spot,fuel:3});
  reserveConstructionGround(Math.floor(spot.x/TILE_SIZE), Math.floor(spot.y/TILE_SIZE), 1);
  showToast("篝火已放置。周围建设区不会刷新自然资源；靠近后按 E 烹饪，树枝可作燃料。");playSoundEffect("enter");saveGame(false);return true;
}
function drawRegionGate(x,y,type) {
  const river = type === "riverGate";
  const active = river ? activeMainQuest()?.chapter===4 && !gameState.visitedRegions.riverValley : activeMainQuest()?.chapter===11 && gameState.unlockedRegions.ridgeHighlands;
  if(active){ctx.strokeStyle="#ffe39b";ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+16,y+13,24,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle="rgba(0,0,0,.25)";ctx.fillRect(x-3,y+23,38,7);
  drawOutlinePath([[x-4,y+8],[x+16,y-12],[x+36,y+8],[x+31,y+13],[x+16,y-3],[x+1,y+13]],river?"#6c5034":"#62685f","#2b332c",2);
  ctx.fillStyle=river?"#8e7047":"#7a8075";ctx.fillRect(x+2,y+8,28,19);
  ctx.fillStyle="#2d3c36";ctx.fillRect(x+11,y+11,10,16);
  ctx.fillStyle=river?"#a5c9bd":"#c3c4b5";ctx.fillRect(x+13,y+13,6,2);
  ctx.fillStyle="#f2d58b";ctx.fillRect(x+25,y+2,4,4);
  ctx.fillStyle=active?"#fff0b7":"#e3e0c8";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(river?"碎石河谷入口":"断脊高地入口",x+16,y+39);
}
function drawOreNode(x,y,obj) {
  const color=obj.type==="goldOre"?"#e5bd45":obj.type==="silverOre"?"#d5dfe3":obj.type==="copperOre"?"#c67b49":"#a6a7a0";
  drawRock(x,y,obj.col,obj.row);
  ctx.fillStyle=color;ctx.fillRect(x+8,y+11,6,5);ctx.fillRect(x+18,y+17,7,5);ctx.fillRect(x+14,y+23,4,3);
  ctx.fillStyle="#20251f";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.fillText(obj.type==="goldOre"?"金":obj.type==="silverOre"?"银":obj.type==="copperOre"?"铜":"铁",x+16,y+9);
}
function drawRuinedHouse(x,y,variant="cabin") {
  // 可辨认的废弃木屋剪影：塌陷屋顶、外露椽木、木板墙、碎石地基与破门。
  const roof=variant==="station"?"#59645e":"#554737", wall=variant==="station"?"#76684f":"#76563a";
  ctx.save();
  ctx.fillStyle="rgba(7,12,8,.34)";ctx.beginPath();ctx.ellipse(x+17,y+29,31,9,0,0,Math.PI*2);ctx.fill();
  // 屋身后侧与墙体
  ctx.fillStyle="#332f27";ctx.fillRect(x-8,y+3,52,27);
  ctx.fillStyle=wall;ctx.fillRect(x-5,y+5,46,22);
  for(let i=0;i<7;i++){ctx.fillStyle=i%2?"#4e412f":"#9b7850";ctx.fillRect(x-3+i*6,y+6,2,19);}
  ctx.fillStyle="#4a3a2a";ctx.fillRect(x-7,y+25,51,6);
  ctx.fillStyle="#888678";for(let i=0;i<8;i++){ctx.fillRect(x-6+i*6,y+27+(i%2),5,3);}
  // 塌陷且不对称的屋顶，破口处能看见椽木
  drawOutlinePath([[x-12,y+7],[x+5,y-10],[x+19,y-5],[x+43,y+3],[x+39,y+9],[x+18,y+1],[x+3,y+0],[x-7,y+12]],roof,"#292c25",2.5);
  ctx.strokeStyle="#b18b5e";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-4,y+5);ctx.lineTo(x+7,y-5);ctx.lineTo(x+18,y+1);ctx.lineTo(x+34,y+6);ctx.stroke();
  ctx.strokeStyle="#302c24";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+8,y-4);ctx.lineTo(x+13,y+8);ctx.moveTo(x+21,y+0);ctx.lineTo(x+28,y+12);ctx.stroke();
  // 封死的破窗与歪斜门框
  ctx.fillStyle="#222922";ctx.fillRect(x+1,y+10,10,9);ctx.fillStyle="#62746b";ctx.fillRect(x+3,y+12,6,5);
  ctx.fillStyle="#493629";ctx.fillRect(x+4,y+12,2,7);ctx.fillRect(x+7,y+12,2,7);ctx.fillStyle="#b28a5a";ctx.fillRect(x+2,y+14,8,2);
  ctx.fillStyle="#29251f";ctx.fillRect(x+22,y+10,12,18);ctx.fillStyle="#5b422c";ctx.fillRect(x+24,y+12,9,16);
  ctx.save();ctx.translate(x+25,y+13);ctx.rotate(-.10);ctx.fillStyle="#896343";ctx.fillRect(0,0,8,14);ctx.fillStyle="#3e3023";ctx.fillRect(2,0,1,14);ctx.fillStyle="#c0a06c";ctx.fillRect(6,7,2,2);ctx.restore();
  // 墙角裂缝、脱落木板、散落瓦片和杂草
  ctx.strokeStyle="#322b22";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+15,y+7);ctx.lineTo(x+12,y+13);ctx.lineTo(x+16,y+17);ctx.lineTo(x+14,y+23);ctx.stroke();
  ctx.fillStyle="#594531";ctx.fillRect(x-11,y+22,12,3);ctx.fillRect(x+33,y+20,9,2);ctx.fillStyle="#77796d";ctx.fillRect(x+36,y+28,7,3);ctx.fillStyle="#b0a58a";ctx.fillRect(x+38,y+27,4,1);
  ctx.fillStyle="#40583a";ctx.fillRect(x-12,y+26,2,5);ctx.fillRect(x-9,y+24,2,6);ctx.fillStyle="#819257";ctx.fillRect(x-11,y+24,2,2);
  ctx.restore();
}

function drawStoryPoint(x, y, obj) {
  const active = activeMainQuest()?.chapter === obj.questId;
  const cx=x+TILE_SIZE/2, cy=y+TILE_SIZE/2;
  // 任务点不再只画一张卷轴：关键地点有明确的建筑/人物剪影。
  if (obj.storyKey === "cabin") {
    drawRuinedHouse(x-10,y-3,"cabin");
  } else if (obj.storyKey === "patrolLog") {
    drawRuinedHouse(x-9,y-2,"station");
    // 巡护站日志桌板与纸页放在门前，提示这里是可调查的建筑地标。
    ctx.fillStyle="#4b3827";ctx.fillRect(x+3,y+20,24,4);ctx.fillStyle="#c9b88e";ctx.fillRect(x+7,y+18,12,5);ctx.fillStyle="#76684f";ctx.fillRect(x+9,y+19,8,1);ctx.fillRect(x+9,y+21,6,1);
  } else if (obj.storyKey === "rescue") {
    ctx.fillStyle="#22372d";ctx.fillRect(x+11,y+15,10,12);ctx.fillStyle="#426a46";ctx.fillRect(x+8,y+16,4,9);ctx.fillRect(x+20,y+16,4,9);ctx.fillStyle="#d2a47c";ctx.beginPath();ctx.arc(cx,y+10,6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#6a4a37";ctx.fillRect(x+10,y+4,12,4);
    ctx.fillStyle="#e8d8b2";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.fillText("小周",cx,y+34);
  } else if (obj.storyKey === "shelter") {
    ctx.fillStyle="#755338";ctx.fillRect(x+5,y+13,22,13);ctx.fillStyle="#b59b70";ctx.fillRect(x+8,y+16,16,8);ctx.fillStyle="#ef9e43";ctx.beginPath();ctx.moveTo(cx,y+11);ctx.lineTo(cx-5,y+22);ctx.lineTo(cx+5,y+22);ctx.closePath();ctx.fill();ctx.fillStyle="#ffe39b";ctx.beginPath();ctx.arc(cx,y+19,3,0,Math.PI*2);ctx.fill();ctx.fillStyle="#e4d4b4";ctx.font="9px sans-serif";ctx.textAlign="center";ctx.fillText("小周",cx,y+35);
  } else if (obj.storyKey === "radioTower") {
    ctx.strokeStyle="#a9b7a5";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,y+27);ctx.lineTo(cx,y+1);ctx.moveTo(cx-9,y+27);ctx.lineTo(cx,y+1);ctx.lineTo(cx+9,y+27);ctx.moveTo(cx-7,y+18);ctx.lineTo(cx+7,y+18);ctx.moveTo(cx-4,y+10);ctx.lineTo(cx+4,y+10);ctx.stroke();
    ctx.fillStyle="#d9c47c";ctx.beginPath();ctx.arc(cx,y+2,3,0,Math.PI*2);ctx.fill();
  } else if (obj.storyKey === "cave") {
    ctx.fillStyle="#6c7069";ctx.beginPath();ctx.moveTo(x+1,y+25);ctx.lineTo(x+3,y+7);ctx.lineTo(x+10,y+1);ctx.lineTo(x+18,y+6);ctx.lineTo(x+29,y+3);ctx.lineTo(x+31,y+27);ctx.closePath();ctx.fill();ctx.fillStyle="#171e1b";ctx.beginPath();ctx.ellipse(cx,y+19,8,9,0,Math.PI,Math.PI*2);ctx.lineTo(cx+8,y+25);ctx.lineTo(cx-8,y+25);ctx.closePath();ctx.fill();
  } else if (obj.storyKey === "observatory" || obj.storyKey === "researchStation" || obj.storyKey === "bunker" || obj.storyKey === "deepWell") {
    ctx.fillStyle=obj.storyKey==="researchStation"?"#6c7776":"#77796c";ctx.fillRect(x+4,y+7,24,19);ctx.fillStyle="#343e3a";ctx.fillRect(x+8,y+11,6,7);ctx.fillRect(x+18,y+11,6,7);ctx.fillStyle="#c8b56f";ctx.fillRect(x+14,y+18,5,8);
    ctx.fillStyle="#b5b9a4";ctx.beginPath();ctx.moveTo(x+1,y+7);ctx.lineTo(x+16,y-2);ctx.lineTo(x+31,y+7);ctx.closePath();ctx.fill();
  } else if (obj.storyKey === "walkway" || obj.storyKey === "bridge") {
    ctx.strokeStyle="#8e7857";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+1,y+23);ctx.lineTo(x+31,y+8);ctx.stroke();ctx.strokeStyle="#c7b18a";ctx.lineWidth=1.5;for(let i=0;i<5;i++){let px=x+3+i*6,py=y+22-i*3;ctx.beginPath();ctx.moveTo(px,py-4);ctx.lineTo(px,py+4);ctx.stroke();}
  } else {
    ctx.fillStyle="#8c8265";ctx.fillRect(x+6,y+8,20,17);ctx.fillStyle="#e2d6b1";ctx.fillRect(x+10,y+11,12,2);ctx.fillRect(x+10,y+16,9,2);
  }
  if (active) { ctx.strokeStyle="#ffe39b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,active?21:16,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#fff0b7";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(obj.label || "主线目标",cx,y+40); }
  else { ctx.fillStyle="#e5e0c8";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText(obj.label||"线索",cx,y+39); }
}
function drawContaminationAura(x,y,obj){
  const boss=obj.storyKey==="nest_boss";ctx.save();const pulse=.5+Math.sin(performance.now()/(boss?260:430))*.12;
  const radius=boss?42:27;const glow=ctx.createRadialGradient(x+16,y+18,2,x+16,y+18,radius);
  glow.addColorStop(0,`rgba(130,48,156,${pulse*.48})`);glow.addColorStop(.55,`rgba(91,42,119,${pulse*.24})`);glow.addColorStop(1,"rgba(68,35,91,0)");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x+16,y+18,radius,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=boss?"rgba(222,142,255,.8)":"rgba(183,112,208,.68)";ctx.lineWidth=boss?2.5:1.5;ctx.beginPath();ctx.arc(x+16,y+18,radius*.62+Math.sin(performance.now()/180)*2,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<(boss?7:4);i++){const a=performance.now()/700+i*Math.PI*2/(boss?7:4),r=radius*(.45+(i%3)*.13);ctx.fillStyle="rgba(218,150,241,.8)";ctx.fillRect(x+16+Math.cos(a)*r,y+18+Math.sin(a)*r,3,3);}ctx.restore();
}
function drawWaterSource(x,y) {
  ctx.fillStyle="rgba(29,86,111,.8)";ctx.beginPath();ctx.ellipse(x+16,y+19,13,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#c0e3d9";ctx.fillRect(x+8,y+17,9,2);ctx.fillRect(x+18,y+21,7,2);
  ctx.fillStyle="#f0e5bf";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText("💧",x+16,y+13);
}
function drawHeldWeaponAtSocket(targetCtx, heldItem, facing, moving, walkTime, action, attackPhase, c) {
  if (!heldItem) return;

    targetCtx.save();
    // Hand Socket：人物脚底坐标为原点；不同朝向使用不同掌心锚点。
    // 武器模型的握柄原点位于局部 (0,0)，刀刃/工具头朝局部 -Y 延伸。
    // Socket 坐标相对角色脚底锚点；grip 是武器局部握持点，pivot 是旋转中心。
    // 当前程序化武器以握把中心 (0,0) 绘制，后续换贴图时只需更新 grip/pivot。
    const sockets = {
      up:    { x: -6, y: -31, angle: 0, layer: "back" },
      down:  { x:  8, y: -27, angle: Math.PI, layer: "front" },
      left:  { x: -11, y: -29, angle: -Math.PI / 2, layer: "front" },
      right: { x:  11, y: -29, angle: Math.PI / 2, layer: "front" }
    };
    const socket = sockets[facing] || sockets.down;
    const weaponGrip = {
      axe: { x: 0, y: 0 }, ironAxe: { x: 0, y: 0 }, copperAxe: { x: 0, y: 0 }, silverAxe: { x: 0, y: 0 }, goldAxe: { x: 0, y: 0 },
      sword: { x: 0, y: 0 }, spear: { x: 0, y: 0 }, fishingRod: { x: 0, y: 0 }, pickaxe: { x: 0, y: 0 }, ironPickaxe: { x: 0, y: 0 },
      copperPickaxe: { x: 0, y: 0 }, silverPickaxe: { x: 0, y: 0 }, goldPickaxe: { x: 0, y: 0 }, bow: { x: 0, y: 0 }, crossbow: { x: 0, y: 0 }, torch: { x: 0, y: 0 }
    };
    const grip = weaponGrip[heldItem.id] || { x: 0, y: 0 };
    let swing = 0;
    if (action === "attack") {
      // 蓄力—快速挥出—收招，攻击进度由战斗状态机驱动，命中顿帧时保持姿势。
      if (attackPhase < .24) {
        const p = attackPhase / .24; swing = -.52 * p * p;
      } else if (attackPhase < .56) {
        const p = (attackPhase - .24) / .32; swing = -.52 + 1.82 * (p * p * (3 - 2 * p));
      } else {
        const p = (attackPhase - .56) / .44; swing = 1.30 * (1 - p) * (1 - p);
      }
    } else if (moving) swing = Math.sin(walkTime * 1.2) * .10;
    // 先定位到手掌，再旋转武器；这样旋转中心永远是握柄而不是人物中心。
    targetCtx.translate(socket.x, socket.y + (moving ? Math.sin(walkTime * 2) * 0.8 : 0));
    targetCtx.rotate(socket.angle + swing);
    targetCtx.translate(-grip.x, -grip.y);
    // 手掌在握柄上方再覆盖一次，形成明确的“握住”关系。
    const isLong = heldItem.id === "spear" || heldItem.id === "fishingRod";
    if (heldItem.id === "bow" || heldItem.id === "crossbow") {
      targetCtx.strokeStyle=heldItem.id==="bow"?"#8b6339":"#596a6d"; targetCtx.lineWidth=4;
      targetCtx.beginPath(); targetCtx.moveTo(0,-17); targetCtx.quadraticCurveTo(13,0,0,17); targetCtx.stroke();
      targetCtx.strokeStyle="#d6c69e"; targetCtx.lineWidth=1.2; targetCtx.beginPath(); targetCtx.moveTo(0,-17); targetCtx.lineTo(0,17); targetCtx.stroke();
      if(heldItem.id==="crossbow") { targetCtx.strokeStyle="#3d4543";targetCtx.lineWidth=5;targetCtx.beginPath();targetCtx.moveTo(-7,0);targetCtx.lineTo(8,0);targetCtx.stroke();targetCtx.fillStyle="#8b9691";targetCtx.fillRect(-2,-4,7,8); }
    } else if (heldItem.id === "spear" || heldItem.id === "fishingRod") {
      const shaft = heldItem.id === "spear" ? "#6d5032" : "#745a39";
      targetCtx.fillStyle="#30281f";targetCtx.fillRect(-2,-18,6,48);
      targetCtx.fillStyle=shaft;targetCtx.fillRect(-1,-19,4,45);
      targetCtx.fillStyle="#9c8053";targetCtx.fillRect(0,-2,2,13);
      if(heldItem.id === "spear") {
        targetCtx.fillStyle="#353c3b";targetCtx.beginPath();targetCtx.moveTo(1,-42);targetCtx.lineTo(-5,-24);targetCtx.lineTo(-2,-19);targetCtx.lineTo(5,-19);targetCtx.lineTo(8,-24);targetCtx.closePath();targetCtx.fill();
        targetCtx.fillStyle="#d7ddd2";targetCtx.beginPath();targetCtx.moveTo(1,-41);targetCtx.lineTo(1,-23);targetCtx.lineTo(4,-24);targetCtx.lineTo(5,-27);targetCtx.closePath();targetCtx.fill();
        targetCtx.fillStyle="#a38a60";targetCtx.fillRect(-2,-23,7,2);
      } else { targetCtx.strokeStyle="#cbb78a";targetCtx.lineWidth=1;targetCtx.beginPath();targetCtx.moveTo(1,-18);targetCtx.lineTo(9,-36);targetCtx.stroke(); }
    } else if (heldItem.id === "sword") {
      // 明确的短剑轮廓：剑柄在手掌下方，横向护手、长剑脊、双刃尖端与刃口高光。
      targetCtx.fillStyle="#26221e";targetCtx.fillRect(-3,-1,8,14);
      targetCtx.fillStyle="#68472e";targetCtx.fillRect(-1,0,4,11);targetCtx.fillStyle="#c0a06a";targetCtx.fillRect(-1,2,4,2);targetCtx.fillRect(-1,7,4,2);
      targetCtx.fillStyle="#252d30";targetCtx.fillRect(-7,-5,16,4);targetCtx.fillStyle="#b89a5c";targetCtx.fillRect(-6,-4,14,2);
      targetCtx.fillStyle="#303a3d";targetCtx.beginPath();targetCtx.moveTo(-2,-5);targetCtx.lineTo(-5,-17);targetCtx.lineTo(-3,-32);targetCtx.lineTo(1,-41);targetCtx.lineTo(5,-32);targetCtx.lineTo(7,-17);targetCtx.lineTo(4,-5);targetCtx.closePath();targetCtx.fill();
      targetCtx.fillStyle="#b8c6c7";targetCtx.beginPath();targetCtx.moveTo(0,-6);targetCtx.lineTo(-3,-18);targetCtx.lineTo(-2,-31);targetCtx.lineTo(1,-38);targetCtx.lineTo(3,-30);targetCtx.lineTo(3,-17);targetCtx.lineTo(2,-6);targetCtx.closePath();targetCtx.fill();
      targetCtx.fillStyle="#eef2e4";targetCtx.beginPath();targetCtx.moveTo(1,-35);targetCtx.lineTo(3,-28);targetCtx.lineTo(3,-12);targetCtx.lineTo(2,-5);targetCtx.lineTo(2,-28);targetCtx.closePath();targetCtx.fill();
      targetCtx.fillStyle="rgba(255,255,255,.38)";targetCtx.fillRect(-2,-26,1,10);
    } else if (["axe","ironAxe","copperAxe","silverAxe","goldAxe"].includes(heldItem.id)) {
      const metal = heldItem.id==="copperAxe"?"#bd754c":heldItem.id==="goldAxe"?"#dfbd54":heldItem.id==="silverAxe"?"#c4d0d1":"#9daeb1";
      targetCtx.fillStyle="#30251d";targetCtx.fillRect(-2,-4,7,35);targetCtx.fillStyle="#765537";targetCtx.fillRect(0,-3,4,31);targetCtx.fillStyle="#a17b4c";targetCtx.fillRect(1,2,2,18);
      targetCtx.fillStyle="#303a3b";targetCtx.beginPath();targetCtx.moveTo(2,-18);targetCtx.lineTo(13,-22);targetCtx.lineTo(19,-15);targetCtx.lineTo(16,-5);targetCtx.lineTo(7,-3);targetCtx.lineTo(3,-7);targetCtx.closePath();targetCtx.fill();
      targetCtx.fillStyle=metal;targetCtx.beginPath();targetCtx.moveTo(4,-17);targetCtx.lineTo(13,-20);targetCtx.lineTo(17,-14);targetCtx.lineTo(14,-7);targetCtx.lineTo(6,-6);targetCtx.closePath();targetCtx.fill();
      targetCtx.fillStyle="#eef0dc";targetCtx.fillRect(13,-18,2,8);targetCtx.fillStyle="rgba(255,255,255,.35)";targetCtx.fillRect(8,-17,2,7);
    } else if (["pickaxe","ironPickaxe","copperPickaxe","silverPickaxe","goldPickaxe"].includes(heldItem.id)) {
      targetCtx.fillStyle="#30251d";targetCtx.fillRect(-2,-3,7,35);targetCtx.fillStyle="#805c3b";targetCtx.fillRect(0,-2,4,31);
      const metal=heldItem.id==="goldPickaxe"?"#e1c25d":heldItem.id==="copperPickaxe"?"#bd805b":heldItem.id==="silverPickaxe"?"#c8d2d0":"#a7b4b3";
      targetCtx.fillStyle="#343d3d";targetCtx.beginPath();targetCtx.moveTo(-8,-14);targetCtx.lineTo(0,-20);targetCtx.lineTo(12,-19);targetCtx.lineTo(18,-14);targetCtx.lineTo(15,-10);targetCtx.lineTo(3,-13);targetCtx.lineTo(-5,-8);targetCtx.closePath();targetCtx.fill();
      targetCtx.fillStyle=metal;targetCtx.beginPath();targetCtx.moveTo(-5,-14);targetCtx.lineTo(1,-18);targetCtx.lineTo(12,-17);targetCtx.lineTo(15,-14);targetCtx.lineTo(3,-15);targetCtx.closePath();targetCtx.fill();
    } else if (heldItem.id === "torch") {
      targetCtx.fillStyle="#30251d";targetCtx.fillRect(-2,-2,7,27);targetCtx.fillStyle="#805332";targetCtx.fillRect(0,0,4,23);targetCtx.fillStyle="#c7a66b";targetCtx.fillRect(-1,-3,6,5);
      const flicker=Math.sin(performance.now()/65)*2;targetCtx.fillStyle="#d94f27";targetCtx.beginPath();targetCtx.moveTo(1,-4);targetCtx.lineTo(-5,-13-flicker);targetCtx.lineTo(1,-22-flicker);targetCtx.lineTo(7,-13-flicker);targetCtx.lineTo(4,-4);targetCtx.closePath();targetCtx.fill();targetCtx.fillStyle="#ffd56d";targetCtx.beginPath();targetCtx.moveTo(2,-5);targetCtx.lineTo(0,-13-flicker);targetCtx.lineTo(4,-10);targetCtx.lineTo(4,-5);targetCtx.closePath();targetCtx.fill();
    } else {
      // 石刃是短柄石刀，不再绘制成一把无辨识度的长剑/长矛。
      targetCtx.fillStyle="#29231d";targetCtx.fillRect(-2,0,7,16);targetCtx.fillStyle="#77563a";targetCtx.fillRect(0,1,4,12);targetCtx.fillStyle="#bba06d";targetCtx.fillRect(-3,10,10,3);
      targetCtx.fillStyle="#343c3d";targetCtx.beginPath();targetCtx.moveTo(-1,9);targetCtx.lineTo(-5,-2);targetCtx.lineTo(-1,-17);targetCtx.lineTo(6,-22);targetCtx.lineTo(8,-13);targetCtx.lineTo(5,2);targetCtx.closePath();targetCtx.fill();
      targetCtx.fillStyle="#aebcbd";targetCtx.beginPath();targetCtx.moveTo(2,3);targetCtx.lineTo(0,-3);targetCtx.lineTo(2,-15);targetCtx.lineTo(6,-19);targetCtx.lineTo(5,-9);targetCtx.lineTo(4,1);targetCtx.closePath();targetCtx.fill();targetCtx.fillStyle="#e1e5d8";targetCtx.fillRect(3,-15,2,6);
    }
    // 皮革握带与掌心压在握柄上，避免武器像浮在人物旁边。
    targetCtx.fillStyle="#3b2a20";targetCtx.fillRect(-2,1,7,4);targetCtx.fillStyle="#9c784c";targetCtx.fillRect(-1,2,5,1);
    targetCtx.fillStyle=c.skin;targetCtx.fillRect(-3,-2,8,6);targetCtx.fillStyle="rgba(255,224,187,.55)";targetCtx.fillRect(-2,-2,4,2);targetCtx.fillStyle="#9b6b4d";targetCtx.fillRect(3,0,2,4);
    targetCtx.restore();
  
}

function drawCharacterSprite(targetCtx, x, y, characterId, facing="down", moving=false, walkTime=0, action="", sizeScale=1) {
  characterId = characterId || "scout";
  const spriteAsset = AssetManager.get(characterId);
  const walkSheet = CharacterAnimationAssets.get(characterId, "walk");
  const bobAsset = moving && !walkSheet ? Math.sin((walkTime || performance.now()/130) * 2) * 1.5 : 0;
  if (spriteAsset || walkSheet) {
    targetCtx.save(); targetCtx.imageSmoothingEnabled = false;
    targetCtx.fillStyle = "rgba(15,22,15,.34)"; targetCtx.beginPath(); targetCtx.ellipse(x+1,y+2,17*sizeScale,5*sizeScale,0,0,Math.PI*2); targetCtx.fill();
    const dirRow = ({down:0,left:1,right:2,up:3})[facing] ?? 0;
    if (walkSheet) {
      const cols = 4, rows = 4, sw = walkSheet.naturalWidth / cols, sh = walkSheet.naturalHeight / rows;
      const frame = moving ? (Math.floor((walkTime || performance.now()/100) * 0.45) % 4) : 0;
      targetCtx.drawImage(walkSheet, frame*sw, dirRow*sh, sw, sh, Math.round(x-23*sizeScale), Math.round(y-58*sizeScale+bobAsset*sizeScale), 46*sizeScale, 58*sizeScale);
    } else {
      if (facing === "left") { targetCtx.translate(x*2,0); targetCtx.scale(-1,1); }
      targetCtx.drawImage(spriteAsset, Math.round(x-23*sizeScale), Math.round(y-58*sizeScale+bobAsset*sizeScale), 46*sizeScale, 58*sizeScale);
    }
    targetCtx.restore();
    const heldAsset = getHeldItem();
    if (heldAsset && facing !== "up") {
      const assetKey = /axe/i.test(heldAsset.id || "") ? "stoneAxe" : /sword/i.test(heldAsset.id || "") ? "sword" : null;
      if (assetKey) AssetManager.draw(assetKey, targetCtx, x+6, y-32+bobAsset, 20, 24);
    }
    return;
  }

  // 64×64 风格角色精灵：以脚底为锚点绘制，碰撞箱仍由原玩家逻辑控制。
  // 像素块保持整数坐标，关闭平滑插值，避免放大后轮廓发糊。
  const styles = {
    scout:    { coat:"#536f43", shade:"#2d4931", light:"#78985a", hair:"#4a3828", skin:"#d4a17a", pack:"#a17a45", accent:"#d7c38a", boot:"#45392d", role:"#d8cba7" },
    medic:    { coat:"#ddd9c8", shade:"#929f95", light:"#f0ecdc", hair:"#57382b", skin:"#d8a783", pack:"#a9433c", accent:"#c9463d", boot:"#51483e", role:"#f4efe0" },
    mechanic: { coat:"#b87338", shade:"#70492f", light:"#d89a50", hair:"#302d29", skin:"#c99570", pack:"#53616a", accent:"#e4b95d", boot:"#40372e", role:"#a7bbc0" },
    hunter:   { coat:"#354f3b", shade:"#23372b", light:"#58734a", hair:"#2f2924", skin:"#c99772", pack:"#67543a", accent:"#b7a16b", boot:"#39372c", role:"#9ba96c" }
  };
  const c = styles[characterId] || styles.scout;
  const t = Math.sin(walkTime || performance.now() / 130);
  const step = moving ? Math.round(t * 3) : 0;
  const actionElapsed = gameState.player?.actionStartedAt ? performance.now() - gameState.player.actionStartedAt : 0;
  const attackPhase = action === "attack" ? Math.max(0, Math.min(1, Number.isFinite(gameState.player?.attackAnimProgress) ? gameState.player.attackAnimProgress : actionElapsed / 520)) : 0;
  const attackSwing = action === "attack" ? Math.sin(attackPhase * Math.PI) : 0;
  const bob = moving ? Math.round(Math.sin(walkTime * 2) * 1.5) : action === "attack" ? Math.round(Math.sin(attackPhase * Math.PI) * -2) : 0;
  targetCtx.save();
  targetCtx.translate(Math.round(x), Math.round(y));
  // 96px 美术基准的程序化角色：在原有轮廓上放大到约 4 头身观感，脚底锚点仍固定在 (0,0)。
  targetCtx.scale(1.12 * sizeScale, 1.12 * sizeScale);
  targetCtx.imageSmoothingEnabled = false;

  // 地面投影统一向右下偏移，脚底锚点用于场景深度排序。
  targetCtx.fillStyle = "rgba(15,22,15,.42)";
  targetCtx.beginPath(); targetCtx.ellipse(2, 3, 17, 6, 0, 0, Math.PI*2); targetCtx.fill();

  targetCtx.save();
  targetCtx.translate(0, bob);

  // 朝上时武器先绘制，随后由躯干/背包遮挡，落实 back sorting layer。
  const backLayerItem = getHeldItem();
  if (backLayerItem && facing === "up") {
    drawHeldWeaponAtSocket(targetCtx, backLayerItem, facing, moving, walkTime, action, attackPhase, c);
  }

  // 双腿分开绘制髋部、裤腿、膝部与靴子；左右腿以反相摆动，走路时不会再像两根静止柱子。
  const phase = walkTime * 1.45;
  const strideL = moving ? Math.sin(phase) * 5 : 0;
  const strideR = moving ? Math.sin(phase + Math.PI) * 5 : 0;
  const liftL = moving ? Math.max(0, Math.cos(phase)) * 2 : 0;
  const liftR = moving ? Math.max(0, Math.cos(phase + Math.PI)) * 2 : 0;
  function drawLeg(x, stride, lift, front) {
    targetCtx.save();
    targetCtx.translate(x + stride*.22, -17);
    targetCtx.fillStyle = "#242a25"; targetCtx.fillRect(-3, 0, 7, 15);
    targetCtx.fillStyle = characterId === "medic" ? "#697066" : "#514f42";
    targetCtx.fillRect(-2, 1, 5, 9); targetCtx.fillStyle = "#343c32"; targetCtx.fillRect(-2, 8, 5, 3);
    // 小腿与靴子向步幅方向延伸，配合脚尖抬起形成可见的交替迈步。
    targetCtx.fillStyle = "#292d27"; targetCtx.fillRect(-2 + stride*.12, 8-lift, 5, 5);
    targetCtx.fillStyle = c.boot; targetCtx.fillRect(-4 + stride*.48, 11-lift, 10, 5);
    targetCtx.fillStyle = "#8a795b"; targetCtx.fillRect(-3 + stride*.48, 11-lift, 6, 1);
    targetCtx.restore();
  }
  // 后腿先画，前腿后画；步幅同时带来轻微脚尖抬起与前后错位。
  if (strideL < strideR) { drawLeg(-5,strideL,liftL,false); drawLeg(5,strideR,liftR,true); }
  else { drawLeg(5,strideR,liftR,false); drawLeg(-5,strideL,liftL,true); }

  // 背包轮廓、肩带与职业装备。
  targetCtx.fillStyle = "#202b24"; targetCtx.fillRect(7, -43, 10, 23);
  targetCtx.fillStyle = c.pack; targetCtx.fillRect(8, -42, 8, 19);
  targetCtx.fillStyle = c.shade; targetCtx.fillRect(8, -37, 8, 2);
  targetCtx.fillStyle = c.accent; targetCtx.fillRect(10, -32, 4, 3);
  targetCtx.fillStyle = "#202b24"; targetCtx.fillRect(-8, -42, 16, 26);

  // 躯干外轮廓与衣服分层，形成清楚的肩、腰、下摆轮廓。
  targetCtx.fillStyle = "#1d2922";
  targetCtx.fillRect(-11, -45, 22, 25);
  targetCtx.fillRect(-9, -48, 18, 5);
  targetCtx.fillStyle = c.shade;
  targetCtx.fillRect(-9, -44, 18, 22);
  targetCtx.fillStyle = c.coat;
  targetCtx.fillRect(-7, -44, 14, 20);
  targetCtx.fillStyle = c.light;
  targetCtx.fillRect(-6, -43, 3, 13);
  targetCtx.fillRect(3, -42, 2, 7);
  targetCtx.fillStyle = c.shade;
  targetCtx.fillRect(-9, -25, 18, 4);
  targetCtx.fillStyle = "#302d27"; targetCtx.fillRect(-8, -23, 16, 3);
  targetCtx.fillStyle = c.accent; targetCtx.fillRect(-2, -24, 4, 4);
  // 衣领、缝线与腰带扣。
  targetCtx.fillStyle = "#1f2b24";
  targetCtx.fillRect(-4, -46, 8, 4);
  targetCtx.fillStyle = c.light;
  targetCtx.fillRect(-3, -45, 6, 2);
  targetCtx.fillStyle = "#d2bd83"; targetCtx.fillRect(-1, -23, 2, 2);
  // 衣料压线、肩部补强、胸前工具袋与布料褶皱，增加人物近看细节。
  targetCtx.fillStyle = "rgba(12,20,15,.58)"; targetCtx.fillRect(-7,-40,2,12); targetCtx.fillRect(5,-39,1,9);
  targetCtx.fillStyle = c.light; targetCtx.fillRect(-8,-44,5,2); targetCtx.fillRect(4,-44,4,2);
  targetCtx.fillStyle = c.shade; targetCtx.fillRect(-6,-31,5,5); targetCtx.fillRect(2,-34,5,6);
  targetCtx.fillStyle = c.accent; targetCtx.fillRect(-5,-30,3,1); targetCtx.fillRect(3,-32,3,1);
  targetCtx.fillStyle = "#292d27"; targetCtx.fillRect(-9,-21,18,2);

  // 双臂分成袖子、明暗面和手部；攻击/调查动作保留原接口。
  const reach = action === "investigate" ? -4 : action === "attack" ? -Math.round(4 + attackSwing * 13) : (moving ? Math.round(Math.sin(walkTime + Math.PI/2)*3) : 0);
  targetCtx.fillStyle = "#202920";
  targetCtx.fillRect(-14, -43, 6, 17 + Math.max(0, reach));
  targetCtx.fillRect(8, -43, 6, 17 - Math.min(0, reach));
  targetCtx.fillStyle = c.shade;
  targetCtx.fillRect(-13, -42, 4, 13 + Math.max(0, reach));
  targetCtx.fillRect(9, -42, 4, 13 - Math.min(0, reach));
  targetCtx.fillStyle = c.coat;
  targetCtx.fillRect(-12, -40, 3, 8);
  targetCtx.fillRect(9, -40, 3, 8);
  targetCtx.fillStyle = c.skin;
  targetCtx.fillRect(-13, -28 + Math.max(0, reach), 5, 4);
  targetCtx.fillRect(8, -28 - Math.min(0, reach), 5, 4);

  // 职业辨识细节：医疗包十字、机械工具、猎人弓具、侦察披肩。
  if (characterId === "medic") {
    targetCtx.fillStyle = "#f7f0dc"; targetCtx.fillRect(8, -36, 7, 8);
    targetCtx.fillStyle = "#b63832"; targetCtx.fillRect(10, -35, 3, 6); targetCtx.fillRect(9, -33, 5, 2);
    targetCtx.fillStyle = "#e9e3d2"; targetCtx.fillRect(-5, -39, 3, 8);
  } else if (characterId === "mechanic") {
    targetCtx.fillStyle = "#8da2a8"; targetCtx.fillRect(-15, -34, 4, 9);
    targetCtx.fillStyle = "#d9b75d"; targetCtx.fillRect(-16, -35, 6, 3);
    targetCtx.fillStyle = "#383b35"; targetCtx.fillRect(3, -39, 3, 8);
  } else if (characterId === "hunter") {
    targetCtx.strokeStyle = "#a98a55"; targetCtx.lineWidth = 2;
    targetCtx.beginPath(); targetCtx.arc(-14, -34, 7, -1.15, 1.15); targetCtx.stroke();
    targetCtx.fillStyle = "#6f704b"; targetCtx.fillRect(-7, -43, 3, 16);
  } else {
    targetCtx.fillStyle = "#d8d0b5"; targetCtx.fillRect(-10, -42, 3, 14);
    targetCtx.fillStyle = "#8e9b69"; targetCtx.fillRect(-12, -43, 5, 4);
  }

  // 头部外轮廓、耳朵、脸、头发与方向性面部细节。
  targetCtx.fillStyle = "#24231f"; targetCtx.fillRect(-9, -61, 18, 17);
  targetCtx.fillStyle = c.skin; targetCtx.fillRect(-7, -59, 14, 13);
  targetCtx.fillStyle = c.skin; targetCtx.fillRect(-9, -55, 2, 4); targetCtx.fillRect(7, -55, 2, 4);
  targetCtx.fillStyle = c.hair;
  targetCtx.fillRect(-9, -62, 18, 6);
  targetCtx.fillRect(-9, -59, 4, 7);
  targetCtx.fillRect(5, -59, 4, 4);
  targetCtx.fillStyle = "#6b4b32"; targetCtx.fillRect(-6, -61, 4, 2);
  // 发丝高光与角色头饰。
  targetCtx.fillStyle = characterId === "medic" ? "#f1eee0" : characterId === "mechanic" ? "#d5a04b" : characterId === "hunter" ? "#6d8250" : "#73533a";
  targetCtx.fillRect(-5, -62, 7, 2);
  if (characterId === "medic") {
    targetCtx.fillStyle = "#f0ebdb"; targetCtx.fillRect(-7, -64, 14, 3);
    targetCtx.fillStyle = "#bf443c"; targetCtx.fillRect(-2, -64, 4, 3);
  } else if (characterId === "mechanic") {
    targetCtx.fillStyle = "#c17b39"; targetCtx.fillRect(-10, -63, 20, 4);
    targetCtx.fillStyle = "#e8c56c"; targetCtx.fillRect(4, -62, 4, 2);
  } else if (characterId === "hunter") {
    targetCtx.fillStyle = "#607748"; targetCtx.fillRect(-10, -63, 20, 3);
    targetCtx.fillStyle = "#9aa76c"; targetCtx.fillRect(-4, -65, 8, 2);
  } else {
    targetCtx.fillStyle = "#435b3d"; targetCtx.fillRect(-10, -60, 4, 5);
  }
  targetCtx.fillStyle = "#332820";
  if (facing === "up") {
    targetCtx.fillStyle = c.hair; targetCtx.fillRect(-7, -58, 14, 9);
  } else if (facing === "left") {
    targetCtx.fillRect(-6, -54, 2, 2); targetCtx.fillRect(-7, -51, 2, 2);
    targetCtx.fillStyle = "#e7bd95"; targetCtx.fillRect(-8, -54, 1, 3);
  } else if (facing === "right") {
    targetCtx.fillRect(4, -54, 2, 2); targetCtx.fillRect(5, -51, 2, 2);
    targetCtx.fillStyle = "#e7bd95"; targetCtx.fillRect(7, -54, 1, 3);
  } else {
    targetCtx.fillRect(-4, -54, 2, 2); targetCtx.fillRect(2, -54, 2, 2);
    targetCtx.fillStyle = "#805b45"; targetCtx.fillRect(-2, -49, 4, 1);
  }
  // 脸颊、衣服高光，增强缩放后仍可辨认的像素轮廓。
  if (facing !== "up") {
    targetCtx.fillStyle = "rgba(255,220,180,.48)";
    targetCtx.fillRect(-6, -52, 2, 2); targetCtx.fillRect(4, -52, 2, 2);
    // 眉骨、瞳孔与嘴角：用少量高对比像素提升近看表情辨识度。
    targetCtx.fillStyle = c.hair;
    if (facing === "down") {
      targetCtx.fillRect(-5, -56, 4, 1); targetCtx.fillRect(2, -56, 4, 1);
      targetCtx.fillStyle = "#f1dfc8"; targetCtx.fillRect(-4, -54, 3, 2); targetCtx.fillRect(2, -54, 3, 2);
      targetCtx.fillStyle = "#342820"; targetCtx.fillRect(-3, -54, 1, 2); targetCtx.fillRect(3, -54, 1, 2);
      targetCtx.fillStyle = "#9b654f"; targetCtx.fillRect(-1, -51, 2, 1);
      targetCtx.fillStyle = "#704537"; targetCtx.fillRect(-2, -48, 4, 1);
    } else {
      const eyeX = facing === "left" ? -6 : 4;
      targetCtx.fillStyle = "#f1dfc8"; targetCtx.fillRect(eyeX, -54, 2, 2);
      targetCtx.fillStyle = "#342820"; targetCtx.fillRect(eyeX + (facing === "left" ? 0 : 1), -54, 1, 2);
      targetCtx.fillStyle = "#9b654f"; targetCtx.fillRect(facing === "left" ? -7 : 5, -50, 2, 1);
    }
  }
  // v30 侧脸结构：侧向时用鼻尖、唇线、下颌暗部和鬓角重建轮廓，避免整块纯色脸。
  if (facing === "left" || facing === "right") {
    const dir = facing === "left" ? -1 : 1;
    // 远侧面部压暗，鼻梁到鼻尖形成小阶梯轮廓。
    targetCtx.fillStyle = "rgba(91,57,42,.42)";
    targetCtx.fillRect(dir < 0 ? -7 : 3, -53, 4, 7);
    targetCtx.fillStyle = c.skin;
    targetCtx.fillRect(dir < 0 ? -9 : 7, -53, 2, 3);
    targetCtx.fillRect(dir < 0 ? -8 : 6, -51, 2, 2);
    // 侧面只保留一只主眼，眉骨与眼窝有明暗区分。
    targetCtx.fillStyle = c.hair;
    targetCtx.fillRect(dir < 0 ? -7 : 5, -56, 3, 1);
    targetCtx.fillStyle = "#f1dfc8";
    targetCtx.fillRect(dir < 0 ? -7 : 5, -54, 2, 2);
    targetCtx.fillStyle = "#342820";
    targetCtx.fillRect(dir < 0 ? -7 : 6, -54, 1, 2);
    // 嘴部和下巴的短线条保持克制，确保缩放后仍能辨认。
    targetCtx.fillStyle = "#704537";
    targetCtx.fillRect(dir < 0 ? -8 : 6, -48, 3, 1);
    targetCtx.fillStyle = "rgba(91,57,42,.55)";
    targetCtx.fillRect(dir < 0 ? -6 : 4, -46, 4, 2);
    targetCtx.fillStyle = "rgba(255,220,180,.38)";
    targetCtx.fillRect(dir < 0 ? -7 : 5, -47, 2, 1);
    // 发际线与鬓角把脸部轮廓收住，不再像圆角矩形贴一只眼睛。
    targetCtx.fillStyle = c.hair;
    targetCtx.fillRect(dir < 0 ? -9 : 7, -58, 3, 5);
    targetCtx.fillRect(dir < 0 ? -8 : 6, -54, 2, 3);
  }

  // 服装细节：衣襟双缝线、胸前扣件、肩部补丁与膝部护片。
  targetCtx.fillStyle = "rgba(239,226,187,.58)";
  targetCtx.fillRect(-4, -41, 1, 10); targetCtx.fillRect(3, -40, 1, 8);
  targetCtx.fillStyle = c.accent; targetCtx.fillRect(-2, -39, 2, 2); targetCtx.fillRect(-2, -34, 2, 2);
  targetCtx.fillStyle = "#252b25"; targetCtx.fillRect(-8, -13, 7, 3); targetCtx.fillRect(2, -13, 7, 3);
  targetCtx.fillStyle = c.light; targetCtx.fillRect(-7, -13, 3, 1); targetCtx.fillRect(3, -13, 3, 1);

  // 快捷栏装备常驻手持：四向独立手部挂点，武器绕握柄原点旋转，不再绕人物中心漂移。
  const heldItem = getHeldItem();
  // 面向上方时，武器放在身体后层；其它方向放在前层，手掌会覆盖握柄形成真实持握感。
  if (heldItem && facing !== "up") {
    drawHeldWeaponAtSocket(targetCtx, heldItem, facing, moving, walkTime, action, attackPhase, c);
  }
  if (action === "investigate") {
    targetCtx.fillStyle = "#f4d77b"; targetCtx.fillRect(12, -53, 3, 3); targetCtx.fillRect(15, -57, 2, 2);
  }
  targetCtx.restore();
  targetCtx.restore();
}
function drawPlayerCamp(x,y,level=1){
  const roof=level===1?"#806044":level===2?"#a47746":"#c7a66c",wall=level===1?"#6e4c31":level===2?"#8b6039":"#b58b55";
  ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(x-28,y+25,56,9);
  drawOutlinePath([[x-34,y+1],[x,y-29],[x+34,y+1],[x+28,y+7],[x,y-18],[x-28,y+7]],roof,"#30281f",3);
  ctx.fillStyle="#40382b";ctx.fillRect(x-29,y+24,58,7);
  ctx.fillStyle=wall;ctx.fillRect(x-25,y+2,50,27);ctx.fillStyle=level===1?"#b18a58":"#d0ae75";ctx.fillRect(x-20,y+6,40,22);
  // 墙板接缝、木梁、窗框与门板纹理，避免住宅像单色方块。
  ctx.fillStyle="#4d3b2b";for(let i=0;i<5;i++)ctx.fillRect(x-19+i*9,y+7,2,18);
  ctx.fillStyle="#3b3024";ctx.fillRect(x-18,y+11,8,8);ctx.fillStyle="#7e9a91";ctx.fillRect(x-16,y+13,4,4);ctx.fillStyle="#c8d6b8";ctx.fillRect(x-16,y+13,2,1);
  ctx.fillStyle="#493525";ctx.fillRect(x+2,y+11,12,18);ctx.fillStyle="#725035";ctx.fillRect(x+4,y+13,8,14);ctx.fillStyle="#b9935d";ctx.fillRect(x+9,y+19,2,2);
  ctx.fillStyle="#f2d58b";ctx.fillRect(x+3,y+18,2,3);
  ctx.strokeStyle="#d0ad75";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-24,y+4);ctx.lineTo(x,y-22);ctx.lineTo(x+24,y+4);ctx.stroke();
  if(level>=2){ctx.fillStyle="#c9a96f";ctx.fillRect(x-32,y+1,5,25);ctx.fillRect(x+27,y+1,5,25);}
  if(level>=3){ctx.fillStyle="#f5d98a";ctx.fillRect(x-22,y-3,5,5);ctx.fillRect(x+17,y-3,5,5);}
  ctx.fillStyle="#f5e7bd";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText(`营地 ${["","I","II","III"][level]}`,x,y+43);
}
function drawCampEntrance(x,y,col,row) {
  // 破旧住宅入口：石基、木框、斜屋顶、破损木板、门槛与门边灯，脚点作为排序锚点。
  ctx.save();
  ctx.fillStyle="rgba(8,13,9,.34)";ctx.beginPath();ctx.ellipse(x+17,y+27,24,7,0,0,Math.PI*2);ctx.fill();
  // 屋顶投影和两侧檐口
  drawOutlinePath([[x-8,y+7],[x+15,y-15],[x+42,y+6],[x+36,y+11],[x+15,y-6],[x-2,y+12]],"#47372a","#292b23",3);
  drawOutlinePath([[x-5,y+5],[x+15,y-13],[x+39,y+5],[x+34,y+8],[x+15,y-7],[x,y+10]],"#77583a","#392f25",1.5);
  // 屋顶瓦片/木板纹理
  ctx.strokeStyle="#a17a4e";ctx.lineWidth=1;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x+2+i*7,y+5-i*5);ctx.lineTo(x+8+i*7,y+8-i*5);ctx.stroke();}
  // 墙体、石基与横向木梁
  ctx.fillStyle="#3b3328";ctx.fillRect(x+1,y+7,32,22);
  ctx.fillStyle="#846746";ctx.fillRect(x+4,y+9,26,17);
  ctx.fillStyle="#b18b5c";ctx.fillRect(x+5,y+10,24,3);ctx.fillRect(x+5,y+18,24,2);
  ctx.fillStyle="#5c4832";ctx.fillRect(x+4,y+24,28,5);
  ctx.fillStyle="#858174";for(let i=0;i<5;i++)ctx.fillRect(x+3+i*6,y+26,4,3);
  // 深色门洞、门板木纹和斜挂门板
  ctx.fillStyle="#1d211c";ctx.fillRect(x+12,y+12,11,16);
  ctx.fillStyle="#4a3726";ctx.fillRect(x+14,y+13,8,15);
  ctx.fillStyle="#785739";ctx.fillRect(x+15,y+14,2,12);ctx.fillRect(x+19,y+14,1,12);
  ctx.fillStyle="#c7a16b";ctx.fillRect(x+20,y+20,2,2);
  ctx.strokeStyle="#c4a071";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+14,y+14);ctx.lineTo(x+21,y+24);ctx.stroke();
  // 门侧窗、碎玻璃和暖色灯
  ctx.fillStyle="#26352f";ctx.fillRect(x+5,y+12,5,6);ctx.fillStyle="#72918a";ctx.fillRect(x+6,y+13,3,4);ctx.fillStyle="#c2d3ba";ctx.fillRect(x+6,y+13,1,2);
  ctx.fillStyle="#3b3022";ctx.fillRect(x+27,y+5,2,6);ctx.fillStyle="#e8bd67";ctx.fillRect(x+25,y+7,5,5);ctx.fillStyle="rgba(255,190,83,.2)";ctx.beginPath();ctx.arc(x+27,y+10,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#f2d58b";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.fillText("入口",x+17,y+41);
  ctx.restore();
}

function drawStonePile(x,y,col,row) {
  if (AssetManager.draw("stonePile", ctx, x - 4, y + 2, 40, 36)) return;

  const r=getTileRandom(col+91,row+17);drawIrregularPatch(x+3,y+22,27,8,"rgba(17,23,18,.3)",col+row,7);
  [[x+5,y+20,8,6],[x+12,y+15,10,9],[x+21,y+21,7,5],[x+8,y+12,5,4]].forEach((p,i)=>{
    drawOutlinePath([[p[0],p[1]+p[3]],[p[0]+1,p[1]+1],[p[0]+p[2]*.55,p[1]],[p[0]+p[2],p[1]+2],[p[0]+p[2]-1,p[1]+p[3]],[p[0]+2,p[1]+p[3]+1]],i%2?"#8c9589":"#a1a69a","#424b43",1);
    ctx.fillStyle="#d0d1c1";ctx.fillRect(p[0]+2,p[1]+2,3,1);
  });
}
function drawCampfire(x,y,lit=true) {
  if (lit && AssetManager.draw("campfire", ctx, x - 24, y - 34, 48, 40)) return;

  ctx.fillStyle="rgba(0,0,0,.3)";ctx.beginPath();ctx.ellipse(x,y+10,20,7,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#5b3b27";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-12,y+7);ctx.lineTo(x+12,y-2);ctx.moveTo(x-11,y-2);ctx.lineTo(x+11,y+7);ctx.stroke();
  if(!lit){ctx.fillStyle="#4b4d43";ctx.fillRect(x-5,y-5,10,5);ctx.fillStyle="#73766a";ctx.fillRect(x-2,y-6,4,3);return;}
  ctx.fillStyle="#f18b35";ctx.beginPath();ctx.moveTo(x,y+5);ctx.lineTo(x-7,y-5);ctx.lineTo(x-2,y-14);ctx.lineTo(x+2,y-8);ctx.lineTo(x+7,y-13);ctx.lineTo(x+6,y+1);ctx.closePath();ctx.fill();
  ctx.fillStyle="#ffd66d";ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x-3,y-5);ctx.lineTo(x+1,y-10);ctx.lineTo(x+4,y-2);ctx.closePath();ctx.fill();
}
function drawAbandonedCabin(x,y,col,row){
  // 木屋外观以破损木墙、塌陷屋顶、青苔和一扇半开的门构成，而非卷轴标记。
  const bx=x-64,by=y-108;ctx.save();ctx.fillStyle="rgba(8,13,10,.32)";ctx.beginPath();ctx.ellipse(x+4,y+8,76,20,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#3a3028";ctx.fillRect(bx+8,by+35,112,72);ctx.fillStyle="#6b543b";ctx.fillRect(bx+13,by+39,102,64);
  for(let i=0;i<6;i++){ctx.fillStyle=i%2?"#896b48":"#795c3e";ctx.fillRect(bx+13,by+42+i*10,102,7);ctx.strokeStyle="#3f3529";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx+15,by+49+i*10);ctx.lineTo(bx+112,by+49+i*10);ctx.stroke();}
  ctx.fillStyle="#443a30";ctx.beginPath();ctx.moveTo(bx+2,by+42);ctx.lineTo(bx+28,by+4);ctx.lineTo(bx+83,by+12);ctx.lineTo(bx+127,by+31);ctx.lineTo(bx+120,by+45);ctx.closePath();ctx.fill();
  ctx.fillStyle="#4c5940";ctx.beginPath();ctx.moveTo(bx+20,by+25);ctx.lineTo(bx+44,by+14);ctx.lineTo(bx+68,by+20);ctx.lineTo(bx+91,by+31);ctx.lineTo(bx+73,by+35);ctx.lineTo(bx+45,by+29);ctx.closePath();ctx.fill();
  ctx.fillStyle="#252a23";ctx.fillRect(bx+54,by+68,25,39);ctx.fillStyle="#2e3027";ctx.fillRect(bx+20,by+53,18,19);ctx.fillStyle="#9eb6a1";ctx.fillRect(bx+23,by+56,12,13);ctx.strokeStyle="#302b25";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx+29,by+56);ctx.lineTo(bx+29,by+69);ctx.moveTo(bx+23,by+62);ctx.lineTo(bx+35,by+62);ctx.stroke();
  ctx.fillStyle="#3e4c31";for(let i=0;i<8;i++){ctx.fillRect(bx+14+i*12,by+83+(i%3)*4,5,13);}ctx.fillStyle="#d2c29b";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText("废弃木屋 · E 进入",x,y+24);ctx.restore();
}
function enterAbandonedCabin(){gameState.cabinReturnPosition={x:gameState.player.x,y:gameState.player.y};gameState.location="cabin";gameState.player.x=canvas.width/2;gameState.player.y=canvas.height-92;gameState.player.moving=false;gameState.keys.clear();showToast("进入废弃木屋：桌边有巡护记录，南侧门口可以离开。");drawWorld();saveGame(false);}
function leaveAbandonedCabin(){const p=gameState.cabinReturnPosition;gameState.location="world";gameState.player.x=p?.x??(58.5*TILE_SIZE);gameState.player.y=p?.y??(47*TILE_SIZE);gameState.cabinReturnPosition=null;gameState.keys.clear();drawWorld();saveGame(false);}
function drawAbandonedCabinInterior(){
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#202a22";ctx.fillRect(0,0,canvas.width,canvas.height);
  const pad=56,top=48,w=canvas.width-pad*2,h=canvas.height-96;ctx.fillStyle="#49382b";ctx.fillRect(pad,top,w,h);ctx.fillStyle="#90714b";ctx.fillRect(pad+12,top+14,w-24,h-26);
  for(let y=top+22;y<top+h-8;y+=19){ctx.strokeStyle="#6f5135";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pad+12,y);ctx.lineTo(pad+w-12,y);ctx.stroke();}
  // 墙体和破损天花板
  ctx.fillStyle="#30271f";ctx.fillRect(pad,top,w,18);ctx.fillRect(pad,top,18,h);ctx.fillRect(pad+w-18,top,18,h);
  ctx.fillStyle="#4d3d2d";ctx.beginPath();ctx.moveTo(pad+10,top+4);ctx.lineTo(pad+170,top+1);ctx.lineTo(pad+220,top+12);ctx.lineTo(pad+360,top+5);ctx.lineTo(pad+380,top+19);ctx.lineTo(pad+10,top+19);ctx.closePath();ctx.fill();
  // 旧桌、巡护记录、倒塌书架和床铺形成明确的室内动线
  ctx.fillStyle="#4d3422";ctx.fillRect(canvas.width*.24,canvas.height*.32,112,42);ctx.fillStyle="#8b6540";ctx.fillRect(canvas.width*.24+5,canvas.height*.32+5,102,8);ctx.fillStyle="#c9bea0";ctx.fillRect(canvas.width*.24+30,canvas.height*.32+14,32,18);ctx.strokeStyle="#504a3c";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(canvas.width*.24+34,canvas.height*.32+19);ctx.lineTo(canvas.width*.24+56,canvas.height*.32+19);ctx.moveTo(canvas.width*.24+34,canvas.height*.32+24);ctx.lineTo(canvas.width*.24+53,canvas.height*.32+24);ctx.stroke();
  ctx.fillStyle="#3c3025";ctx.fillRect(canvas.width*.65,canvas.height*.43,58,92);ctx.fillStyle="#705339";ctx.fillRect(canvas.width*.65+4,canvas.height*.43+8,50,12);ctx.fillRect(canvas.width*.65+4,canvas.height*.43+34,50,12);ctx.fillStyle="#9a7952";ctx.fillRect(canvas.width*.65+8,canvas.height*.43+10,42,5);ctx.fillRect(canvas.width*.65+8,canvas.height*.43+36,42,5);
  ctx.fillStyle="#4a3326";ctx.fillRect(canvas.width*.16,canvas.height*.62,92,38);ctx.fillStyle="#b8b09a";ctx.fillRect(canvas.width*.16+6,canvas.height*.62+5,80,28);ctx.fillStyle="#65745a";ctx.fillRect(canvas.width*.16+6,canvas.height*.62+5,80,9);
  ctx.fillStyle="#f0ddb0";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.fillText("废弃木屋 · 室内",canvas.width/2,28);ctx.font="12px sans-serif";ctx.fillText("靠近桌边按 E 调查 · 南侧出口按 E 离开",canvas.width/2,canvas.height-18);
  drawCharacterSprite(ctx,gameState.player.x,gameState.player.y,gameState.selectedCharacter?.id||"scout",gameState.player.facing||"down",gameState.player.moving,gameState.player.walkTime||0,gameState.player.actionUntil>performance.now()?gameState.player.actionType:"");
}

function drawCampInterior() {
  const camp=selectedCamp(); if(!camp){gameState.location="world";drawWorld();return;}
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#1d2a20";ctx.fillRect(0,0,canvas.width,canvas.height);
  const pad=Math.min(54,canvas.width*.07), top=54, roomW=canvas.width-pad*2, roomH=canvas.height-110;
  // 等级只改变房间面积、墙面材质和装饰，不会自动生成家具。
  const scale=[0,.82,.92,1][camp.level]; const innerPad=(1-scale)*roomW*.5;
  ctx.fillStyle=camp.level===1?"#493629":camp.level===2?"#5a422c":"#756044";ctx.fillRect(pad,top,roomW,roomH);
  ctx.fillStyle=camp.level===1?"#9b7951":camp.level===2?"#ad8b5e":"#d2b77f";ctx.fillRect(pad+12+innerPad,top+16+innerPad*.4,roomW-24-innerPad*2,roomH-28-innerPad*.8);
  ctx.strokeStyle=camp.level===1?"#6e4d32":camp.level===2?"#775638":"#8c7047";ctx.lineWidth=3;
  for(let y=top+28;y<top+roomH-10;y+=camp.level===3?32:24){ctx.beginPath();ctx.moveTo(pad+12+innerPad,y);ctx.lineTo(pad+roomW-12-innerPad,y);ctx.stroke();}
  ctx.fillStyle=camp.level===1?"#3d2c22":camp.level===2?"#493526":"#5a432c";ctx.fillRect(pad,top,roomW,24);ctx.fillRect(pad,top,24,roomH);ctx.fillRect(pad+roomW-24,top,24,roomH);
  // 魔法球是每座营地自带的升级核心，不属于可拆卸家具。
  const orbX=canvas.width/2,orbY=top+roomH*.28;
  ctx.fillStyle="rgba(70,160,255,.18)";ctx.beginPath();ctx.arc(orbX,orbY,38,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#5f86c7";ctx.beginPath();ctx.arc(orbX,orbY,19,0,Math.PI*2);ctx.fill();ctx.fillStyle="#bfeaff";ctx.beginPath();ctx.arc(orbX-6,orbY-6,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#eaf1ff";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.fillText("魔法球 · 靠近按 E 升级",orbX,orbY+48);
  // 家具只绘制玩家实际制作并摆放的内容。
  for(const f of camp.furniture){const x=f.x,y=f.y;ctx.fillStyle="rgba(0,0,0,.22)";ctx.fillRect(x-24,y+13,48,8);
    if(f.type==="workbench"){ctx.fillStyle=f.level===1?"#6d4528":f.level===2?"#855c34":"#9e7949";ctx.fillRect(x-26,y-10,52,24);ctx.fillStyle="#d0aa70";ctx.fillRect(x-22,y-8,44,7);ctx.fillStyle="#44301f";ctx.fillRect(x-20,y+12,5,14);ctx.fillRect(x+15,y+12,5,14);}
    else if(f.type==="bed"){ctx.fillStyle="#55402e";ctx.fillRect(x-22,y-26,44,52);ctx.fillStyle="#c6c1a4";ctx.fillRect(x-18,y-21,36,42);ctx.fillStyle="#7c8d70";ctx.fillRect(x-18,y-21,36,12);}
    else if(f.type==="chest"){ctx.fillStyle=f.level===1?"#79512f":"#655c50";ctx.fillRect(x-20,y-12,40,27);ctx.fillStyle="#c49a61";ctx.fillRect(x-20,y-12,40,7);ctx.fillStyle="#e4c67d";ctx.fillRect(x-3,y-3,6,8);}
    else if(f.type==="furnace"){ctx.fillStyle="#6b706c";ctx.fillRect(x-23,y-20,46,40);ctx.fillStyle="#292e2b";ctx.fillRect(x-12,y-6,24,22);ctx.fillStyle="#ed8d42";ctx.fillRect(x-6,y+2,12,10);}
  }
  // 出口是室内边缘的通道，不是地图自建营地。
  ctx.fillStyle="#34251c";ctx.fillRect(canvas.width/2-38,top+roomH-6,76,28);ctx.fillStyle="#c8a16b";ctx.fillRect(canvas.width/2-30,top+roomH-4,60,20);
  ctx.fillStyle="#f4e3b2";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.fillText(`自建营地 · 等级 ${["","I","II","III"][camp.level]} · 已建 ${gameState.camps.length} 座`,canvas.width/2,30);
  ctx.font="13px sans-serif";ctx.fillStyle="#f1e5c9";ctx.fillText("营地外观随等级提升；工作台、床、储物柜、熔炉都要自己制作摆放",canvas.width/2,canvas.height-20);
  // 苏棠加入后固定在室内整理药草；其他伙伴按白天/夜晚日程活动。
  const indoorNpcs=[
    {id:"medic",x:pad+72,y:top+roomH*.58,label:"苏棠 · 医疗台"},
    {id:"scout",x:pad+roomW-70,y:top+roomH*.57,label:"林野 · 休息中"},
    {id:"mechanic",x:pad+roomW*.32,y:top+roomH*.68,label:"陈砾 · 工匠"},
    {id:"hunter",x:pad+roomW*.68,y:top+roomH*.68,label:"叶岚 · 休息中"}
  ];
  for(const npc of indoorNpcs){if(!mainQuestState.flags[`companion_${npc.id}`])continue;if(npc.id!=="medic"&&!mainQuestState.flags.companionsResting)continue;ctx.save();ctx.fillStyle="#e8e1d0";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(npc.label,npc.x,npc.y-23);drawCharacterSprite(ctx,npc.x,npc.y,npc.id,"down",false,0,"",0.78);ctx.restore();}
  if(mainQuestState.flags.companionsResting){ctx.save();ctx.fillStyle="#e0cda0";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText("夜间：伙伴已回屋休息",canvas.width/2,top+roomH-34);ctx.restore();}
  const px=gameState.player.x,py=gameState.player.y;
  drawCharacterSprite(ctx, px, py, gameState.selectedCharacter?.id || "scout", gameState.player.facing || "down", gameState.player.moving, gameState.player.walkTime || 0, gameState.player.actionUntil > performance.now() ? gameState.player.actionType : "");
  drawCombatEntities(0, 0);
  document.querySelector("#world-position").textContent="位置：自建营地内部";
}

const RECIPE_CATEGORIES = [
  { id: "all", name: "全部配方", icon: "images/ui/workbench.png" },
  { id: "camp", name: "营地建筑", icon: "images/items/icons/campKit.png" },
  { id: "combat", name: "武器防卫", icon: "images/items/icons/sword.png" },
  { id: "tools", name: "工具装备", icon: "images/items/icons/axe.png" },
  { id: "materials", name: "生存道具", icon: "images/items/icons/rope.png" },
  { id: "medicine", name: "医药与烹饪", icon: "images/items/icons/bandage.png" }
];
function recipeCategory(recipe) {
  const id = recipe.outputId || recipe.id;
  if (/campKit|campfireKit|workbench|bed1|chest[12]|furnaceFurniture|raft|waterFilter/.test(id)) return "camp";
  if (/sword|spear|bow|arrow|crossbow/.test(id)) return "combat";
  if (/axe|pickaxe|fishingRod|repair|backpackUpgrade/.test(id)) return "tools";
  if (/bandage|poultice|cooked|roasted|safeWater|driedBerries|charcoal|identifyMushroom/.test(id)) return "medicine";
  return "materials";
}
const CREATURE_LORE = {
  wolf: { name: "灰狼", image: "wolf.png", habit: "群居或结伴巡游，发现目标后会主动追击。保持距离，避免被多只围住。", area: "森林边缘、林间空地；黄昏与夜间活动更频繁。", threat: "中等", drops: ["rawMeat", "hide", "bone"] },
  boar: { name: "野猪", image: "boar.png", habit: "体格结实，受惊或被激怒后会冲撞目标。狭窄地形不利于躲避。", area: "林地、灌木与水源附近；白天也会活动。", threat: "中高", drops: ["rawMeat", "bone"] },
  fox: { name: "赤狐", image: "fox.png", habit: "警觉、移动迅速，通常会避开强敌；不要把它的速度误判为高攻击性。", area: "森林边缘与草地；清晨、傍晚较容易遇见。", threat: "较低", drops: ["rawMeat", "hide"] },
  bear: { name: "棕熊", image: "bear.png", habit: "力量强、生命值高，近身攻击危险。装备不足时建议绕行。", area: "深林、山地与偏远区域；夜间遭遇风险更高。", threat: "极高", drops: ["rawMeat", "hide", "bone"] },
  wildDog: { name: "野犬", image: "wild_dog.png", habit: "具有较强攻击性，可能快速接近并持续追击。", area: "森林边缘、废弃营地和开阔地；夜间出现率上升。", threat: "中等", drops: ["rawMeat", "hide"] }
};
function openCompendium(tab = "items") {
  activeCompendiumTab = tab;
  compendiumModal?.classList.remove("hidden");
  renderCompendium();
  playSoundEffect("tap");
}
function closeCompendium() { compendiumModal?.classList.add("hidden"); playSoundEffect("tap"); }
function setCompendiumTab(tab) {
  activeCompendiumTab = tab;
  document.querySelector("#compendium-items-tab")?.classList.toggle("active", tab === "items");
  document.querySelector("#compendium-creatures-tab")?.classList.toggle("active", tab === "creatures");
  compendiumList?.classList.toggle("hidden", tab !== "items");
  creatureCompendiumList?.classList.toggle("hidden", tab !== "creatures");
  document.querySelector("#compendium-intro").textContent = tab === "items" ? "记录材料、加工品、工具与生存用品。图标由 images/items/icons/ 下的 PNG 资产驱动。" : "记录荒野中已知的野兽。生命值与威胁评级来自当前游戏敌人数据，掉落物图标与物品图鉴保持一致。";
}
function renderCompendium() {
  // 独立图鉴只刷新百科内容，不触发制造列表或制造状态 UI。
  renderResourceCompendium();
  creatureCompendiumList.innerHTML = "";
  for (const [id, lore] of Object.entries(CREATURE_LORE)) {
    const cfg = ENEMY_TYPES[id];
    const card = document.createElement("article"); card.className = "creature-card";
    const image = document.createElement("img"); image.className = "creature-portrait"; image.alt = lore.name; image.src = `images/enemies/${lore.image}`;
    image.onerror = () => { image.onerror = null; image.src = "images/enemies/creature_fallback.png"; image.classList.add("creature-fallback-image"); };
    const body = document.createElement("div"); body.className = "creature-details";
    const title = document.createElement("div"); title.className = "creature-title-row";
    const name = document.createElement("h3"); name.textContent = lore.name;
    const threat = document.createElement("span"); threat.className = `threat-badge threat-${id}`; threat.textContent = `威胁：${lore.threat}`;
    title.append(name, threat);
    const meta = document.createElement("div"); meta.className = "creature-meta"; meta.textContent = `生命 ${cfg.hp} · 攻击 ${cfg.damage} · 移速 ${cfg.speed}`;
    const habit = document.createElement("p"); habit.textContent = lore.habit;
    const area = document.createElement("p"); area.className = "creature-area"; area.textContent = `出没：${lore.area}`;
    const drops = document.createElement("div"); drops.className = "creature-drops";
    const dropLabel = document.createElement("span"); dropLabel.textContent = "可能掉落："; drops.append(dropLabel);
    for (const dropId of lore.drops) { const item = itemCatalog[dropId]; if (!item) continue; const chip = document.createElement("span"); chip.className = "creature-drop-chip"; chip.append(createItemIcon(dropId, "creature-drop-icon", item.name)); const label = document.createElement("span"); label.textContent = item.name; chip.append(label); drops.append(chip); }
    body.append(title, meta, habit, area, drops); card.append(image, body); creatureCompendiumList.append(card);
  }
  setCompendiumTab(activeCompendiumTab);
}

function renderResourceCompendium() {
  compendiumList.innerHTML="";
  // 保留原有的生存知识条目，再补充完整的逐物品图鉴；每项直接使用 images/items/icons/{id}.png。
  const loreHeading=document.createElement("h3"); loreHeading.className="compendium-section-title"; loreHeading.textContent="生存知识"; compendiumList.append(loreHeading);
  const loreIconRules = [
    [/树枝/, "branch"], [/木材|原木/, "wood"], [/树脂/, "resin"], [/木板/, "plank"], [/木炭/, "charcoal"],
    [/木棍|长木杆/, "longPole"], [/石块|碎石/, "stone"], [/石片/, "stoneShard"], [/石砖/, "stoneBrick"], [/铁矿|铜矿/, "ironOre"],
    [/植物纤维|芦苇/, "fiber"], [/绳索|粗布/, "rope"], [/止血草|草药粉/, "herb"], [/生水|净水/, "water"], [/未知蘑菇/, "unknownMushroom"],
    [/绷带|草药敷剂/, "bandage"], [/石斧|石镐/, "axe"], [/工具维修/, "tape"], [/篝火/, "campfireKit"], [/自建营地/, "campKit"],
    [/营地等级 II/, "workbench2"], [/营地等级 III/, "workbench3"], [/碎石河谷/, "reeds"], [/断脊高地/, "ironOre"],
    [/狩猎资源/, "hide"], [/工业零件/, "basicParts"], [/主线科技/, "radioRepairKit"]
  ];
  for(const [name,description] of compendiumEntries){
    const card=document.createElement("article");card.className="compendium-card compendium-lore-card";
    const head=document.createElement("div");head.className="compendium-lore-head";
    const matched=loreIconRules.find(([pattern])=>pattern.test(name));
    const iconId=matched?.[1];
    if(iconId) head.append(createItemIcon(iconId,"compendium-lore-icon",name));
    const title=document.createElement("strong");title.textContent=name.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u,"");head.append(title);
    const p=document.createElement("p");p.textContent=description;card.append(head,p);compendiumList.append(card);
  }
  const itemHeading=document.createElement("h3"); itemHeading.className="compendium-section-title"; itemHeading.textContent=`物品素材库 · ${Object.keys(itemCatalog).length} 项`; compendiumList.append(itemHeading);
  for (const item of Object.values(itemCatalog)) {
    const card=document.createElement("article"); card.className="compendium-card compendium-item-card";
    const head=document.createElement("div"); head.className="compendium-item-head";
    const image=createItemIcon(item.id,"compendium-item-icon",item.name);
    image.onerror=()=>{image.onerror=null;image.src="images/ui/item_fallback.png";};
    const title=document.createElement("strong"); title.textContent=item.name;
    const category=document.createElement("small"); category.textContent=item.category||"其他";
    const nameWrap=document.createElement("div"); nameWrap.className="compendium-item-name"; nameWrap.append(title,category); head.append(image,nameWrap);
    const desc=document.createElement("p"); desc.textContent=item.description||"可在探索中收集或通过制作获得。";
    card.append(head,desc); compendiumList.append(card);
  }
}

function renderCrafting() {
  setCraftTab(activeCraftTab);
  craftingList.innerHTML="";
  if (craftCategoryNav && !craftCategoryNav.dataset.ready) {
    craftCategoryNav.dataset.ready = "1";
    for (const category of RECIPE_CATEGORIES) {
      const button = document.createElement("button"); button.type = "button"; button.className = "craft-category-button"; button.dataset.category = category.id;
      const icon = document.createElement("img"); icon.src = category.icon; icon.alt = ""; icon.onerror = () => { icon.style.display = "none"; };
      const label = document.createElement("span"); label.textContent = category.name; button.append(icon, label);
      button.addEventListener("click", () => { activeRecipeCategory = category.id; renderCrafting(); }); craftCategoryNav.append(button);
    }
  }
  craftCategoryNav?.querySelectorAll(".craft-category-button").forEach(button => button.classList.toggle("active", button.dataset.category === activeRecipeCategory));
  const orderedRecipes = recipes.map((recipe, index) => {
    const lockReason = recipeLockReason(recipe);
    const nearbyFire = recipe.station === "fire" ? nearestCampfire(110) : null;
    const effectiveIngredients=effectiveRecipeIngredients(recipe);
    const enough = Object.entries(effectiveIngredients).every(([id,n]) => getItemCount(id) >= n);
    const outputId = recipe.outputId || recipe.id;
    const canOutput = recipe.backpackUpgrade ? recipe.backpackUpgrade === inventoryState.backpackLevel + 1 : (recipe.repairTool ? Boolean(findTool(recipe.repairTool) && findTool(recipe.repairTool).durability < itemCatalog[recipe.repairTool].durabilityMax) : (!itemCatalog[outputId] || canStoreItem(outputId)));
    const hasFuel = recipe.station !== "fire" || gameState.location === "camp" || Boolean(nearbyFire && nearbyFire.fuel > 0);
    const craftable = !lockReason && enough && canOutput && hasFuel;
    return { recipe, index, craftable, enough };
  }).sort((a,b) => Number(b.craftable)-Number(a.craftable) || Number(b.enough)-Number(a.enough) || a.index-b.index);
  const filteredRecipes = orderedRecipes.filter(entry => activeRecipeCategory === "all" || recipeCategory(entry.recipe) === activeRecipeCategory);
  if (craftCategorySummary) craftCategorySummary.textContent = `${RECIPE_CATEGORIES.find(c => c.id === activeRecipeCategory)?.name || "全部配方"} · ${filteredRecipes.length} 项；绿色边框表示当前可制作` ;
  for(const entry of filteredRecipes){
    const recipe = entry.recipe;
    const nearbyFire=recipe.station==="fire"?nearestCampfire(110):null;
    const lockReason=recipeLockReason(recipe);
    const canStation=!lockReason;
    const hasFuel=recipe.station!=="fire"||gameState.location==="camp"||Boolean(nearbyFire&&nearbyFire.fuel>0);
    const effectiveIngredients=effectiveRecipeIngredients(recipe);
    const enough=Object.entries(effectiveIngredients).every(([id,n])=>getItemCount(id)>=n);
    const outputId=recipe.outputId||recipe.id;
    const canOutput=recipe.backpackUpgrade ? recipe.backpackUpgrade === inventoryState.backpackLevel + 1 : (recipe.repairTool ? Boolean(findTool(recipe.repairTool) && findTool(recipe.repairTool).durability < itemCatalog[recipe.repairTool].durabilityMax) : (!itemCatalog[outputId] || canStoreItem(outputId)));
    const isCraftable = !lockReason && enough && canOutput && hasFuel;
    const card=document.createElement("article");card.className="recipe-card"; if(isCraftable) card.classList.add("recipe-craftable"); else card.classList.add("recipe-unavailable");
    const head=document.createElement("div");head.className="recipe-head";
    const icon=document.createElement("img");icon.className="recipe-icon recipe-icon-image";icon.alt=recipe.name;
    icon.src=itemCatalog[outputId]?`images/items/icons/${outputId}.png`:`images/items/icons/${recipe.id}.png`;
    icon.onerror=()=>{icon.onerror=null;icon.src="images/ui/item_fallback.png";};
    const title=document.createElement("strong");title.textContent=recipe.name;
    const desc=document.createElement("p");desc.textContent=recipe.desc + ((gameState.camps.length>0 && (gameState.selectedCharacter?.id==="mechanic" || mainQuestState.flags.companion_mechanic) && (recipe.station==="workbench" || ["campKit","campfireKit","workbench","workbench2","workbench3","bed","chest1","furnaceFurniture","plank","woodenWall","woodenFence","simpleShelter"].includes(outputId))) ? " · 工匠协作：材料消耗减少约 20%" : "");
    head.append(icon,title);card.append(head,desc);
    card.append(renderIngredients(effectiveIngredients));
    const stationLabel=document.createElement("small");stationLabel.className="recipe-station";stationLabel.textContent={hand:"徒手制作",workbench:"营地内已放置的工作台",fire:"篝火 / 炉台",forge:"营地内已放置的石质熔炉"}[recipe.station]||"制作";card.append(stationLabel);
    const btn=document.createElement("button");btn.type="button";btn.className="primary-btn";const missingText=Object.entries(effectiveIngredients).filter(([id,n])=>getItemCount(id)<n).map(([id,n])=>`${itemCatalog[id]?.name||id} ×${n-getItemCount(id)}`).join("、");btn.textContent=lockReason?lockReason:!hasFuel?"篝火缺少燃料":!canOutput?"已持有 / 无法维修":!enough?`材料不足：${missingText}`:"制作";btn.disabled=!enough||!canStation||!hasFuel||!canOutput;btn.addEventListener("click",()=>craftRecipe(recipe.id));card.append(btn);craftingList.append(card);
  }
  const upgrade=document.querySelector("#camp-upgrade-btn");
  if(upgrade){
    const level=selectedCamp()?.level||1; const cost=level===1?"木材 ×12、石块 ×8、木板 ×4、绳索 ×3": "铁锭 ×4、木板 ×10、粗布 ×4、基础零件 ×2";
    upgrade.textContent=level>=3?"营地已达最高等级":"魔法球升级（等级 "+["","II","III"][level]+"） · "+cost;
    const nearOrb=gameState.location==="camp"&&Math.hypot(gameState.player.x-canvas.width/2,gameState.player.y-(54+(canvas.height-110)*.28))<=115;
    upgrade.disabled=gameState.location!=="camp"||level>=3||!nearOrb;
  }

}

createWorldObjects();
// v14：修复营地传送、制作排序、资源再生与背包丢弃。
// 主线区域入口：当前版本开放初始地图；河谷需木筏，高地需完成河谷补给箱事件。
function addFixedWorldObject(obj) {
  const key = `${obj.col},${obj.row}`;
  const old = worldObjectByTile.get(key);
  if (old) { worldObjects.splice(worldObjects.indexOf(old), 1); worldObjectByTile.delete(key); }
  worldObjects.push(obj); worldObjectByTile.set(key, obj);
}
addFixedWorldObject({ id: "gate-river-valley", col: 67, row: 51, type: "riverGate" });
addFixedWorldObject({ id: "gate-ridge-highlands", col: 82, row: 15, type: "ridgeGate" });
addFixedWorldObject({ id: "abandoned-cabin-door", col: 58, row: 46, type: "cabinEntrance", label: "废弃木屋入口" });
// v42：第一章主地图闭环地标。污染源与巢穴都属于主地图，不解锁后续区域。
addFixedWorldObject({ id:"anomaly-aircraft", col:52, row:54, type:"storyPoint", questId:4, storyKey:"anomaly_aircraft", label:"机舱污染结晶", icon:"✦" });
addFixedWorldObject({ id:"anomaly-clearing", col:49, row:38, type:"storyPoint", questId:4, storyKey:"anomaly_clearing", label:"林地污染裂隙", icon:"✦" });
addFixedWorldObject({ id:"nest-boss", col:51, row:40, type:"storyPoint", questId:6, storyKey:"nest_boss", label:"中央污染巢穴", icon:"☣" });
// 木屋占地清场：墙体与入口不会被自然资源遮住。
for(const obj of [...worldObjects]){if(obj.col>=56&&obj.col<=60&&obj.row>=42&&obj.row<=46&&["tree","treeMedium","treeSmall","treeYoung","treeStump","rock","log","driftwood","fruitTree","bush"].includes(obj.type)){worldObjects.splice(worldObjects.indexOf(obj),1);worldObjectByTile.delete(`${obj.col},${obj.row}`);}}
// v41：同伴散落在第一张地图上，靠近后按 E 交谈并邀请回营地；选中的角色不会重复出现。
const COMPANION_DEFS = {
  scout: { name: "林野", job: "侦察员", col: 61, row: 42, portrait: "scout", intro: "我沿着旧路找到了一处安全的林间通道。地图上有几处兽迹，但巢穴附近的雾不太正常。", recruit: "林野加入了营地：每天有概率标记资源富集点与野兽活动区。" },
  medic: { name: "苏棠", job: "医者", col: 48, row: 56, portrait: "medic", intro: "我还能处理轻伤，但药品不够。找到止血草和干净的布，我就能在营地配制基础绷带。", recruit: "苏棠加入了营地：每天有概率准备基础绷带。" },
  mechanic: { name: "陈砾", job: "工匠", col: 44, row: 47, portrait: "mechanic", intro: "飞机的金属骨架还能拆出些零件。把工作台搭起来，我能帮你加工木料，也能照看低阶工具。", recruit: "陈砾加入了营地：每天有概率加工少量木材与基础零件。" },
  hunter: { name: "叶岚", job: "猎手", col: 64, row: 58, portrait: "hunter", intro: "这片林子里的兽群在迁徙，留下的足迹不太对劲。我可以帮营地留意猎物，但不会替你挑战危险巢穴。", recruit: "叶岚加入了营地：每天有概率带回少量生肉或野果。" }
};

const storyDialog = document.querySelector("#story-dialog");
const storyDialogName = document.querySelector("#story-dialog-name");
const storyDialogText = document.querySelector("#story-dialog-text");
const storyDialogAction = document.querySelector("#story-dialog-action");
const storyDialogPortrait = document.querySelector("#story-dialog-portrait");
let storyDialogCallback = null;
function setStoryDialogPortrait(name) {
  if (!storyDialogPortrait) return;
  let portrait = "scout";
  if (String(name).includes("陈砾") || String(name).includes("工匠")) portrait = "mechanic";
  else if (String(name).includes("苏棠") || String(name).includes("医者")) portrait = "medic";
  else if (String(name).includes("叶岚") || String(name).includes("猎手")) portrait = "hunter";
  storyDialogPortrait.className = `story-dialog-portrait portrait-${portrait}`;
  storyDialogPortrait.setAttribute("aria-label", `${name} 的动态立绘`);
}
function openStoryDialog(name, text, actionLabel = "继续", callback = null) {
  if (!storyDialog || !storyDialogName || !storyDialogText || !storyDialogAction) {
    console.error("剧情对话框 DOM 缺失：请确认 index.html 中存在 #story-dialog 及其子元素。", { name, text });
    showToast(`${name}：${text}`);
    return;
  }
  gameState.keys.clear();
  // 强制同步可见状态，避免旧样式/隐藏类导致交谈触发后没有对话框。
  storyDialogName.textContent = name;
  setStoryDialogPortrait(name);
  storyDialogText.textContent = text;
  storyDialogAction.textContent = actionLabel;
  storyDialogCallback = callback;
  storyDialog.classList.remove("hidden");
  storyDialog.setAttribute("aria-hidden", "false");
  storyDialog.style.display = "grid";
  storyDialog.style.visibility = "visible";
  storyDialog.style.pointerEvents = "auto";
  storyDialog.style.position = "fixed";
  storyDialog.style.left = "50%";
  storyDialog.style.bottom = window.matchMedia("(max-width: 600px)").matches ? "8px" : "22px";
  storyDialog.style.transform = "translateX(-50%)";
  storyDialog.style.width = window.matchMedia("(max-width: 600px)").matches ? "calc(100% - 16px)" : "min(820px, calc(100% - 34px))";
  storyDialog.style.zIndex = "999999";
  requestAnimationFrame(() => {
    storyDialog?.scrollIntoView({ block: "nearest", behavior: "auto" });
    storyDialogAction?.focus({ preventScroll: true });
  });
}
function closeStoryDialog(runAction = true) {
  if (!storyDialog || storyDialog.classList.contains("hidden")) return;
  storyDialog.classList.add("hidden");
  storyDialog.setAttribute("aria-hidden", "true");
  storyDialog.style.display = "none";
  const cb = storyDialogCallback; storyDialogCallback = null;
  if (runAction && cb) cb();
}
storyDialogAction?.addEventListener("click", () => closeStoryDialog(true));
function companionForObject(obj) { return obj?.type === "companionNpc" ? COMPANION_DEFS[obj.characterId] : null; }
function recruitCompanion(characterId) {
  const def = COMPANION_DEFS[characterId]; if (!def) return;
  if (!gameState.camps.length) {
    openStoryDialog(def.name, `${def.intro} 我愿意和你一起活下去，但我们不能一直睡在露天。先建一间能遮风避雨的屋子，再来找我。`, "我先去建屋", () => { mainQuestState.flags[`talked_${characterId}`]=true; saveGame(false); });
    return;
  }
  const flag = `companion_${characterId}`;
  if (mainQuestState.flags[flag]) { openStoryDialog(def.name, companionHomeLine(characterId), "知道了", null); return; }
  openStoryDialog(def.name, `${def.intro} 我加入你们。先回营地安顿下来，白天我会按自己的专长帮忙，晚上回屋休息。`, "一起回营地", () => {
    mainQuestState.flags[flag] = true;
    mainQuestState.flags[`companionJoinedAt_${characterId}`] = Math.floor(worldTimeMinutes / 1440) + 1;
    mainQuestState.flags[`talked_${characterId}`] = true;
    placeAvailableCompanions(); updateCompanionSupport(true);
    showToast(def.recruit); checkMainQuestProgress(); saveGame(false); drawWorld();
  });
}
function companionHomeLine(id) {
  return ({
    medic:"我会留在屋里整理药草、制作基础绷带。夜里我不出门，受伤时记得回来补给。",
    scout:"我会在白天沿森林边缘侦察，标记资源点和危险足迹，傍晚把找到的东西带回营地。",
    mechanic:"我就在屋子附近照看工作台。白天能加工木板、修补低阶工具，也能帮你减少普通建造的材料消耗。",
    hunter:"我可以跟你出门。靠近我按 E，我会跟随你一段路；但巢穴首领必须由你自己解决。"
  })[id] || "我会在营地等你回来。";
}

let companionDailyTick = Math.floor(worldTimeMinutes / 1440);
function updateCompanionSupport(force = false) {
  if (gameState.location !== "world" && gameState.location !== "camp") return;
  const hour = ((worldTimeMinutes % 1440) + 1440) % 1440 / 60;
  const day = Math.floor(worldTimeMinutes / 1440) + 1;
  const isDay = hour >= 6 && hour < 19;
  if (!isDay) { mainQuestState.flags.companionsResting = true; return; }
  mainQuestState.flags.companionsResting = false;
  if (!force && day <= companionDailyTick) return;
  companionDailyTick = day;
  // 所有后勤只在白天结算，夜间伙伴休息，不会继续自动工作。
  const hasRole = id => gameState.selectedCharacter?.id === id || Boolean(mainQuestState.flags[`companion_${id}`]);
  if (gameState.camps.length && hasRole("mechanic") && Math.random() < .82) {
    addItemToInventory("wood", 2);
    if (Math.random() < .65) addItemToInventory("plank", 1);
    const tool = [...inventoryState.slots, ...inventoryState.hotbar].find(i => i && i.durabilityMax && i.durability < i.durabilityMax && ["stoneAxe","stonePickaxe","copperAxe","copperPickaxe"].includes(i.id));
    if (tool) tool.durability = Math.min(tool.durabilityMax, tool.durability + 3);
  }
  if (hasRole("hunter") && Math.random() < .72) addItemToInventory(Math.random() < .58 ? "rawMeat" : "berries", 1);
  if (hasRole("medic") && Math.random() < .8) addItemToInventory("bandage", 1);
  if (hasRole("scout") && Math.random() < .9) {
    mainQuestState.flags.scoutIntel = { day, col: 18 + Math.floor(Math.random() * 62), row: 18 + Math.floor(Math.random() * 62) };
    mainQuestState.flags.scoutSupplies = (mainQuestState.flags.scoutSupplies || 0) + 1;
    if (Math.random() < .5) addItemToInventory(Math.random()<.5?"berries":"branch",1);
  }
  renderInventory(); renderHotbar(); saveGame(false);
}

for (const [i, row] of [27, 52, 77].entries()) {
  const center = Math.round(51 + Math.sin(row * 0.09) * 9);
  addFixedWorldObject({ id: `water-source-${i}`, col: center, row, type: "waterSource" });
}
function placeAvailableCompanions() {
  for (const obj of [...worldObjects]) {
    if (obj.type === "companionNpc") { worldObjects.splice(worldObjects.indexOf(obj), 1); worldObjectByTile.delete(`${obj.col},${obj.row}`); }
  }
  const camp = gameState.camps?.[0];
  for (const [id, def] of Object.entries(COMPANION_DEFS)) {
    if (gameState.selectedCharacter?.id === id) continue;
    // 医者加入后固定留在室内；其他伙伴留在世界层，由日程逻辑管理。
    if (id === "medic" && mainQuestState.flags[`companion_${id}`]) continue;
    let col=def.col, row=def.row;
    if (mainQuestState.flags[`companion_${id}`] && camp && id === "mechanic") { col=camp.col+2; row=camp.row-1; }
    if (mainQuestState.flags[`companion_${id}`] && camp && id === "scout" && !mainQuestState.flags.scoutOnExpedition) { col=camp.col-2; row=camp.row-1; }
    if (mainQuestState.flags[`companion_${id}`] && id === "hunter" && mainQuestState.flags.hunterFollowing) { col=Math.max(2,Math.min(MAP_WIDTH-3,Math.floor(gameState.player.x/TILE_SIZE)-1)); row=Math.max(2,Math.min(MAP_HEIGHT-3,Math.floor(gameState.player.y/TILE_SIZE)+1)); }
    const key=`${col},${row}`;
    const occupied=worldObjectByTile.get(key);
    if(occupied && ["tree","treeMedium","treeSmall","rock","log","driftwood","fruitTree","bush"].includes(occupied.type)) { worldObjects.splice(worldObjects.indexOf(occupied),1); worldObjectByTile.delete(key); }
    if (!worldObjectByTile.has(key)) addFixedWorldObject({ id:`companion-${id}`, col, row, type:"companionNpc", characterId:id, depthY:(row+1)*TILE_SIZE });
  }
}
let companionRoutineElapsed = 0;
function updateCompanionRoutine(deltaTime) {
  if (gameState.location !== "world") return;
  companionRoutineElapsed += deltaTime; if (companionRoutineElapsed < .7) return; companionRoutineElapsed=0;
  const hour=((worldTimeMinutes%1440)+1440)%1440/60, isDay=hour>=6&&hour<19;
  const findNpc=id=>worldObjects.find(o=>o.type==="companionNpc"&&o.characterId===id);
  const scout=findNpc("scout");
  if (scout && mainQuestState.flags.companion_scout && isDay) {
    mainQuestState.flags.scoutRoutineElapsed=(mainQuestState.flags.scoutRoutineElapsed||0)+.7;
    if(mainQuestState.flags.scoutRoutineElapsed>=24){mainQuestState.flags.scoutRoutineElapsed=0;mainQuestState.flags.scoutOnExpedition=true;const camp=gameState.camps?.[0];
      if(camp){const angle=Math.random()*Math.PI*2,dist=5+Math.random()*8;const col=Math.max(3,Math.min(MAP_WIDTH-4,Math.round(camp.col+Math.cos(angle)*dist))),row=Math.max(3,Math.min(MAP_HEIGHT-4,Math.round(camp.row+Math.sin(angle)*dist)));const oldKey=`${scout.col},${scout.row}`;worldObjectByTile.delete(oldKey);scout.col=col;scout.row=row;scout.depthY=(row+1)*TILE_SIZE;const key=`${col},${row}`;if(!worldObjectByTile.has(key))worldObjectByTile.set(key,scout);else {scout.col=camp.col-2;scout.row=camp.row-1;worldObjectByTile.set(`${scout.col},${scout.row}`,scout);}}
    }
  }
  const hunter=findNpc("hunter");
  if(hunter && mainQuestState.flags.companion_hunter && mainQuestState.flags.hunterFollowing){
    const col=Math.max(2,Math.min(MAP_WIDTH-3,Math.floor(gameState.player.x/TILE_SIZE)-1));const row=Math.max(2,Math.min(MAP_HEIGHT-3,Math.floor(gameState.player.y/TILE_SIZE)+1));
    worldObjectByTile.delete(`${hunter.col},${hunter.row}`);hunter.col=col;hunter.row=row;hunter.depthY=(row+1)*TILE_SIZE;worldObjectByTile.set(`${col},${row}`,hunter);
  }
  if(!isDay) mainQuestState.flags.companionsResting=true;
}

placeAvailableCompanions();
// 入口周围清出通道，避免被生成的树木/石块挡住。
for (const gate of [{col:67,row:51},{col:82,row:15}]) {
  for (let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) {
    if(Math.abs(dx)+Math.abs(dy)>3) continue;
    const key=`${gate.col+dx},${gate.row+dy}`; const obj=worldObjectByTile.get(key);
    if(obj && ["tree","treeMedium","treeSmall","rock","log","driftwood","fruitTree"].includes(obj.type)) { worldObjects.splice(worldObjects.indexOf(obj),1); worldObjectByTile.delete(key); }
  }
}
// ================================
// 地图美术 2.0：无缝地表 + 手绘像素物件
// 所有装饰均由坐标生成，移动/刷新时不会闪烁或改变位置。
// ================================
function terrainPalette(terrain) {
  const palettes = {
    [TERRAIN.GRASS]: ["#71884b", "#7d9653", "#879c5a", "#526e3b", "#a3ad68"],
    [TERRAIN.FOREST]: ["#3e5f39", "#496a3f", "#547548", "#304d32", "#719052"],
    [TERRAIN.RIVER]: ["#286782", "#347c98", "#438eaa", "#20566f", "#80b6c1"],
    [TERRAIN.SHALLOW_WATER]: ["#75a69c", "#8bb9ad", "#9cc6b8", "#5d9088", "#c2d8b4"],
    [TERRAIN.ROCKY]: ["#686f65", "#777e72", "#85897b", "#50594f", "#a2a18f"],
    [TERRAIN.SAND]: ["#b6a16d", "#c5b47e", "#d0bd88", "#9f8c5e", "#e0cd99"],
    [TERRAIN.DIRT]: ["#72573b", "#846747", "#927550", "#5b452f", "#b19468"],
    [TERRAIN.MEADOW]: ["#829d55", "#92aa60", "#a0b76a", "#668344", "#d0c979"]
  };
  return palettes[terrain] || palettes[TERRAIN.GRASS];
}
function drawIrregularPatch(x, y, w, h, color, seed, points = 7) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points;
    const wobble = 0.66 + getTileRandom(seed + i * 7.13, seed * 0.31 + i * 3.7) * 0.5;
    const px = x + w / 2 + Math.cos(angle) * w * 0.5 * wobble;
    const py = y + h / 2 + Math.sin(angle) * h * 0.5 * wobble;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}
function drawTerrainTile(x, y, terrain, col, row) {
  const tileKey = terrain === TERRAIN.GRASS ? "tileGrass" : terrain === TERRAIN.FOREST ? "tileForest" : terrain === TERRAIN.MEADOW ? "tileMeadow" : terrain === TERRAIN.DIRT ? "tileDirt" : terrain === TERRAIN.SAND ? "tileSand" : terrain === TERRAIN.ROCKY ? "tileRocky" : terrain === TERRAIN.RIVER ? "tileWater" : terrain === TERRAIN.SHALLOW_WATER ? "tileShallowWater" : null;
  if (tileKey && AssetManager.draw(tileKey, ctx, x, y, TILE_SIZE+1, TILE_SIZE+1)) return;

  const r = getTileRandom(col + 200, row + 300);
  const palette = terrainPalette(terrain);
  ctx.fillStyle = palette[Math.floor(r * 3)];
  ctx.fillRect(x, y, TILE_SIZE + 1, TILE_SIZE + 1);
  // 地表斑驳采用跨格的不规则色块，不绘制任何格线。
  for (let i = 0; i < 3; i++) {
    const seed = col * 19.7 + row * 31.3 + i * 47.1;
    const px = x - 8 + getTileRandom(seed, row + i) * 34;
    const py = y - 8 + getTileRandom(col + i * 11, seed) * 34;
    const pw = 10 + getTileRandom(seed + 2, col) * 20;
    const ph = 7 + getTileRandom(row + 3, seed + 9) * 16;
    drawIrregularPatch(px, py, pw, ph, i === 0 ? palette[3] + "55" : palette[4] + "45", seed, 5 + i % 4);
  }
  // 地表微观纹理：草叶、砂粒、泥点、碎石和水面波光。
  for (let i = 0; i < 8; i++) {
    const seed = col * 73 + row * 127 + i * 17;
    const px = x + getTileRandom(seed, row + 1) * TILE_SIZE;
    const py = y + getTileRandom(col + 1, seed) * TILE_SIZE;
    if (terrain === TERRAIN.GRASS || terrain === TERRAIN.FOREST || terrain === TERRAIN.MEADOW) {
      const hue = getTileRandom(seed + 4, seed + 8);
      ctx.strokeStyle = hue > 0.58 ? "#b3bd72" : (hue > 0.28 ? "#354f31" : "#637f43");
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py + 3); ctx.lineTo(px + (hue > 0.5 ? 2 : -2), py - 2 - hue * 2); ctx.stroke();
      if (i % 3 === 0) { ctx.fillStyle = "#d4c879"; ctx.fillRect(px + 2, py - 2, 2, 2); }
    } else if (terrain === TERRAIN.SAND || terrain === TERRAIN.DIRT || terrain === TERRAIN.ROCKY) {
      ctx.fillStyle = palette[i % palette.length];
      ctx.fillRect(px, py, 1 + (i % 3), 1 + (i % 2));
    } else {
      ctx.fillStyle = i % 2 ? "#a8d2d0" : "#245e78";
      ctx.fillRect(px, py, 3 + (i % 3) * 2, 1);
    }
  }
  if (terrain === TERRAIN.RIVER || terrain === TERRAIN.SHALLOW_WATER) {
    // 水体深浅层：深水底色、浅水反光与短促波纹，保持固定随机种子。
    if (terrain === TERRAIN.RIVER) {
      drawIrregularPatch(x + 2 + r * 7, y + 4 + r * 10, 23, 21, "#183f56" + "55", col * 3 + row, 7);
      drawIrregularPatch(x + 4 + r * 8, y + 8 + r * 7, 17, 3, "#9dcac7" + "99", col + row * 7, 5);
    } else {
      drawIrregularPatch(x + 2, y + 2, 28, 28, "#b8d0b0" + "22", col + row, 8);
      drawIrregularPatch(x + 5 + r * 5, y + 5 + r * 8, 18, 2, "#d4e2c4" + "aa", col * 7 + row, 5);
    }
    drawIrregularPatch(x + 3 + r * 10, y + 7 + r * 12, 13 + r * 8, 3, "#b2d9d1" + "88", col + row, 5);
  }
  // 邻接地形的边缘用半透明、不规则斑块混色，弱化河岸/林缘的直线拼接感。
  const edges = [
    [col - 1, row, x - 3, y + 5, 12, 22], [col + 1, row, x + 23, y + 4, 12, 23],
    [col, row - 1, x + 4, y - 3, 24, 12], [col, row + 1, x + 3, y + 23, 25, 12]
  ];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e[0] < 0 || e[0] >= MAP_WIDTH || e[1] < 0 || e[1] >= MAP_HEIGHT) continue;
    const neighbour = getTerrain(e[0], e[1]);
    if (neighbour === terrain) continue;
    const blend = terrainPalette(neighbour);
    const opacity = (terrain === TERRAIN.RIVER || terrain === TERRAIN.SHALLOW_WATER || neighbour === TERRAIN.RIVER || neighbour === TERRAIN.SHALLOW_WATER) ? "66" : "3d";
    drawIrregularPatch(e[2], e[3], e[4], e[5], blend[1] + opacity, col * 5 + row * 3 + i, 6);
  }
  // Blob/47-tile 风格的边、内角、外角：按四邻接与对角邻接生成锯齿状像素边缘。
  // 这不是简单矩形描边；每个瓦片根据相邻地形决定哪些边需要过渡。
  const neighbourAt = (dx, dy) => (col + dx < 0 || col + dx >= MAP_WIDTH || row + dy < 0 || row + dy >= MAP_HEIGHT) ? terrain : getTerrain(col + dx, row + dy);
  const edgeKinds = [
    {dx:0,dy:-1, name:"top"}, {dx:1,dy:0,name:"right"}, {dx:0,dy:1,name:"bottom"}, {dx:-1,dy:0,name:"left"}
  ];
  const waterLike = t => t === TERRAIN.RIVER || t === TERRAIN.SHALLOW_WATER;
  for (const edge of edgeKinds) {
    const nt = neighbourAt(edge.dx, edge.dy);
    if (nt === terrain) continue;
    const waterEdge = waterLike(terrain) || waterLike(nt);
    const sandEdge = terrain === TERRAIN.SAND || nt === TERRAIN.SAND;
    const edgeColor = waterEdge ? (terrain === TERRAIN.RIVER || nt === TERRAIN.RIVER ? "#b7d8cc" : "#c6d7b5") : sandEdge ? "#d0bc83" : "#394c32";
    const darkColor = waterEdge ? "#244e5c" : sandEdge ? "#8c8159" : "#43523a";
    const seed = col * 31 + row * 17 + edge.dx * 11 + edge.dy * 19;
    ctx.lineJoin = "miter";
    ctx.lineWidth = waterEdge ? 2 : 1.5;
    ctx.strokeStyle = darkColor + "99";
    ctx.beginPath();
    for (let i=0;i<=8;i++) {
      const jitter = Math.round((getTileRandom(seed+i*3, seed-i*5)-.5)*3);
      const t = i / 8;
      let px=x, py=y;
      if (edge.name === "top") { px=x+t*TILE_SIZE; py=y+Math.max(0,jitter+1); }
      else if (edge.name === "bottom") { px=x+t*TILE_SIZE; py=y+TILE_SIZE-Math.max(0,jitter+1); }
      else if (edge.name === "left") { px=x+Math.max(0,jitter+1); py=y+t*TILE_SIZE; }
      else { px=x+TILE_SIZE-Math.max(0,jitter+1); py=y+t*TILE_SIZE; }
      if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();
    ctx.strokeStyle = edgeColor + (waterEdge ? "bb" : "77");
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=0;i<=7;i++) {
      const t = i/7;
      const jitter = Math.round((getTileRandom(seed+i*7, seed+i*2)-.5)*4);
      let px=x,py=y;
      if (edge.name === "top") {px=x+t*TILE_SIZE;py=y+2+jitter;}
      else if (edge.name === "bottom") {px=x+t*TILE_SIZE;py=y+TILE_SIZE-2-jitter;}
      else if (edge.name === "left") {px=x+2+jitter;py=y+t*TILE_SIZE;}
      else {px=x+TILE_SIZE-2-jitter;py=y+t*TILE_SIZE;}
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.stroke();
  }
  // 对角内角补丁：防止四块地形交界处出现明显的尖角/漏缝。
  const diagonals = [[-1,-1],[1,-1],[-1,1],[1,1]];
  diagonals.forEach(([dx,dy],i)=>{
    const diagonal = neighbourAt(dx,dy);
    const sideA = neighbourAt(dx,0), sideB = neighbourAt(0,dy);
    if (diagonal === terrain || (sideA === terrain && sideB === terrain)) return;
    const px = dx < 0 ? x+1 : x+TILE_SIZE-7;
    const py = dy < 0 ? y+1 : y+TILE_SIZE-7;
    const pal = terrainPalette(diagonal);
    drawIrregularPatch(px,py,7,7,pal[1]+"66",col*13+row*5+i,5);
  });
  // 3–5 种可复现地表贴花：小石、断枝、泥斑与野草，打破纯色重复感。
  const decal = getTileRandom(col*43+row*29, row*61-col*7);
  if (decal > .78) {
    const dx = x + 5 + getTileRandom(col+row*3, row+col*7)*21;
    const dy = y + 5 + getTileRandom(row+col*5, col-row*2)*21;
    if (terrain === TERRAIN.GRASS || terrain === TERRAIN.MEADOW || terrain === TERRAIN.FOREST) {
      ctx.fillStyle = "#344b31"; ctx.fillRect(dx,dy+2,2,3); ctx.fillRect(dx+3,dy,2,4);
      ctx.fillStyle = "#9aa964"; ctx.fillRect(dx+1,dy+1,1,2); ctx.fillRect(dx+4,dy+1,1,2);
    } else if (terrain === TERRAIN.SAND || terrain === TERRAIN.DIRT) {
      ctx.fillStyle = terrain === TERRAIN.SAND ? "#e1ce98" : "#a4875c";
      ctx.fillRect(dx,dy,3,1); ctx.fillRect(dx+4,dy+3,2,1); ctx.fillRect(dx+1,dy+5,1,1);
    } else if (terrain === TERRAIN.ROCKY) {
      ctx.fillStyle = "#414a42"; ctx.fillRect(dx,dy+2,4,2);
      ctx.fillStyle = "#a4a89a"; ctx.fillRect(dx+1,dy,3,2);
    } else if (waterLike(terrain)) {
      ctx.fillStyle = "#d4e5d3"; ctx.fillRect(dx,dy,6,1); ctx.fillRect(dx+4,dy+3,4,1);
    }
  }
}
function drawOutlinePath(points, fill, outline = "#263526", width = 2) {
  ctx.beginPath();
  points.forEach((point, i) => i ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.stroke();
}
function drawTree(x, y, col = 0, row = 0, obj = null) {
  const treeObj = obj || worldObjectByTile.get(`${col},${row}`);
  const factor = treeObj?.type === "treeSmall" ? 0.48 : treeObj?.type === "treeMedium" ? 0.72 : 1;
  if (factor !== 1) {
    ctx.save();
    ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE - 1);
    ctx.scale(factor, factor);
    drawTreeCore(-TILE_SIZE / 2, -(TILE_SIZE - 1), col, row, treeObj);
    ctx.restore();
    return;
  }
  drawTreeCore(x, y, col, row, treeObj);
}
function drawTreeCore(x, y, col = 0, row = 0, suppliedObj = null) {
  // v31：受击树干短促摇晃，挥斧次数同步显示为树干切痕。
  const treeObj = suppliedObj || worldObjectByTile.get(`${col},${row}`);
  if (treeObj?.hitAt) {
    const age = performance.now() - treeObj.hitAt;
    if (age < 260) x += Math.sin(age * .085) * (1 - age / 260) * 4;
  }
  // 图片版本同样使用衰减正弦摇晃；缺图则落回原程序化绘制。
  if (AssetManager.draw("tree", ctx, x - 32, y - 96, 96, 128)) return;
  // v25：高树冠、分层枝叶、树皮刻纹与稳定种子；树脚仍锚定在地块底部，便于 Y-sort。
  const seed = col * 97 + row * 53;
  const r = getTileRandom(col + 77, row + 33);
  const variant = Math.floor(getTileRandom(col + 137, row + 71) * 3); // 0 阔叶、1 针叶、2 金绿阔叶
  const scale = 0.92 + getTileRandom(col + 41, row + 19) * 0.24;
  const cx = x + 16 + (r - 0.5) * 8;
  const baseY = y + 31 + (getTileRandom(col + 3, row + 8) - 0.5) * 4;
  const H = scale;
  const crown = variant === 2
    ? {shadow:'#303b27', dark:'#53673a', mid:'#788d48', light:'#b4b85c', glint:'#d4d17a'}
    : variant === 1
      ? {shadow:'#1e382a', dark:'#285239', mid:'#3d7145', light:'#6e9b55', glint:'#a9c878'}
      : {shadow:'#243e2a', dark:'#2e5836', mid:'#477b43', light:'#70a34e', glint:'#a8c76a'};

  // 地面接触阴影：偏右下，树干脚部不会漂浮。
  ctx.fillStyle = 'rgba(16,25,17,.38)';
  drawIrregularPatch(cx - 31*H + 8, baseY - 9, 69*H, 18, 'rgba(16,25,17,.38)', seed + 1, 10);
  ctx.fillStyle = 'rgba(18,26,18,.2)';
  drawIrregularPatch(cx - 23*H + 4, baseY - 5, 49*H, 9, 'rgba(18,26,18,.2)', seed + 2, 8);

  // 粗树根与有明暗面的树干。树干比旧版更高，带树皮竖纹和节疤。
  drawOutlinePath([
    [cx-8,baseY-1],[cx-7,baseY-17],[cx-5,baseY-38*H],[cx-7,baseY-49*H],
    [cx-3,baseY-54*H],[cx+3,baseY-53*H],[cx+7,baseY-45*H],[cx+6,baseY-24],
    [cx+9,baseY-7],[cx+14,baseY-2],[cx+6,baseY-3],[cx+1,baseY-8],
    [cx-3,baseY-3],[cx-10,baseY-2]
  ], '#6b482e', '#302c23', 2.2);
  // 树干受光面、背光面、裂纹与根部。
  drawOutlinePath([[cx-5,baseY-44*H],[cx-2,baseY-50*H],[cx+1,baseY-48*H],[cx+1,baseY-12],[cx-2,baseY-8],[cx-4,baseY-20]], '#a77a4b', '#775238', 1);
  ctx.fillStyle = '#4b3528';
  ctx.fillRect(cx+3, baseY-43*H, 2, 22*H);
  ctx.fillRect(cx+5, baseY-18, 2, 8);
  ctx.fillStyle = '#c0955f';
  ctx.fillRect(cx-3, baseY-40*H, 1.5, 12*H);
  ctx.fillRect(cx-1, baseY-24, 2, 5);
  // 树节/树皮裂纹
  ctx.fillStyle = '#493327'; ctx.fillRect(cx+1,baseY-31,4,2); ctx.fillRect(cx-4,baseY-19,3,1);
  ctx.fillStyle = '#bd8c56'; ctx.fillRect(cx-6,baseY-6,3,2); ctx.fillRect(cx+5,baseY-5,3,2);

  if (variant === 1) {
    // 针叶树：从下至上三层锯齿枝冠，顶部尖、层间有深色分界。
    const tiers = [
      {w:57,h:34,top:baseY-112*H,c:'#28553a'},
      {w:49,h:31,top:baseY-94*H,c:'#346b42'},
      {w:39,h:28,top:baseY-77*H,c:'#467e49'},
      {w:28,h:24,top:baseY-61*H,c:'#639650'}
    ];
    tiers.forEach((t,i)=>{
      const yy=t.top, ww=t.w*H, hh=t.h*H;
      drawOutlinePath([
        [cx,yy],[cx-ww*.22,yy+hh*.32],[cx-ww*.47,yy+hh*.43],[cx-ww*.32,yy+hh*.48],
        [cx-ww*.53,yy+hh*.67],[cx-ww*.35,yy+hh*.7],[cx-ww*.48,yy+hh*.88],
        [cx,yy+hh],[cx+ww*.48,yy+hh*.88],[cx+ww*.35,yy+hh*.7],[cx+ww*.53,yy+hh*.67],
        [cx+ww*.32,yy+hh*.48],[cx+ww*.47,yy+hh*.43],[cx+ww*.22,yy+hh*.32]
      ], t.c, '#203a2a', 2);
      drawOutlinePath([[cx-ww*.08,yy+hh*.24],[cx-ww*.25,yy+hh*.48],[cx-ww*.17,yy+hh*.5],[cx-ww*.32,yy+hh*.73],[cx-ww*.15,yy+hh*.72],[cx,yy+hh*.91],[cx-ww*.02,yy+hh*.48]], i%2 ? '#76a65a' : '#588c4b', '#3b6840', 1);
      ctx.fillStyle = '#a6c477';
      ctx.fillRect(cx-2,yy+hh*.35,3,2); ctx.fillRect(cx-ww*.21,yy+hh*.53,5,2);
      ctx.fillStyle = '#1d432f'; ctx.fillRect(cx+ww*.13,yy+hh*.57,ww*.18,3);
    });
    // 枝梢与细小高光针叶
    ctx.fillStyle = '#9abd6d'; ctx.fillRect(cx-1,baseY-111*H,3,8);
    for(let i=0;i<12;i++){
      const yy=baseY-(101-getTileRandom(seed+i,seed-i)*54)*H;
      const side=i%2?-1:1, xx=cx+side*(7+getTileRandom(seed+i*3,seed+i*7)*20)*H;
      ctx.fillStyle=i%3===0?'#a9c77a':(i%2?'#467a43':'#2c5c39');
      ctx.fillRect(xx,yy,3,2); ctx.fillRect(xx+side*2,yy+3,2,2);
    }
  } else {
    // 阔叶树：多团块叠成宽大立体树冠，暗部先铺底，亮部偏左上。
    const lobes = variant === 2 ? [
      [-25,-85,37,39],[-8,-105,37,39],[13,-91,37,39],[-34,-66,37,33],[-9,-71,43,37],[17,-67,31,34],[1,-52,34,25]
    ] : [
      [-26,-82,37,38],[-10,-101,38,39],[12,-91,37,40],[-35,-66,39,33],[-9,-70,45,38],[18,-67,31,35],[2,-51,34,26]
    ];
    // 背阴外轮廓与主叶团
    lobes.forEach((b,i)=>drawIrregularPatch(cx+(b[0]-b[2]/2)*H,baseY+b[1]*H,b[2]*H,b[3]*H,crown.shadow,seed+i*5,9));
    lobes.forEach((b,i)=>drawIrregularPatch(cx+(b[0]-b[2]/2+2)*H,baseY+(b[1]+2)*H,(b[2]-4)*H,(b[3]-4)*H,i%3===0?crown.dark:crown.mid,seed+i*7+21,8));
    // 叶簇明暗面：亮面集中左上，右下保留厚重阴影。
    drawIrregularPatch(cx-25*H,baseY-99*H,31*H,29*H,crown.light,seed+41,8);
    drawIrregularPatch(cx-5*H,baseY-108*H,24*H,24*H,crown.mid,seed+42,7);
    drawIrregularPatch(cx+3*H,baseY-85*H,24*H,27*H,crown.dark,seed+43,7);
    drawIrregularPatch(cx-26*H,baseY-70*H,27*H,23*H,crown.light,seed+44,7);
    drawIrregularPatch(cx-7*H,baseY-75*H,28*H,24*H,crown.mid,seed+45,7);
    drawIrregularPatch(cx+6*H,baseY-62*H,25*H,21*H,crown.dark,seed+46,7);
    // 叶片高光簇与深色叶隙，形成像素块面的层次。
    for(let i=0;i<28;i++){
      const px=cx-31*H+getTileRandom(seed+i*13,seed-i*7)*61*H;
      const py=baseY-107*H+getTileRandom(seed+i*5,seed+i*19)*57*H;
      const q=getTileRandom(seed+i*23,seed-i*11);
      ctx.fillStyle=q>.72?crown.glint:(q>.4?crown.light:(q>.18?crown.mid:crown.shadow));
      const pw=(2+(i%4))*H, ph=(1+(i%3))*H;
      ctx.fillRect(Math.round(px),Math.round(py),pw,ph);
    }
    // 树冠边缘垂落的小枝叶
    ctx.fillStyle=crown.dark;
    ctx.fillRect(cx-27*H,baseY-53*H,5*H,8*H); ctx.fillRect(cx+19*H,baseY-55*H,5*H,7*H);
    ctx.fillStyle=crown.light;
    ctx.fillRect(cx-23*H,baseY-58*H,3*H,4*H); ctx.fillRect(cx+14*H,baseY-61*H,4*H,3*H);
  }
  // 低垂枝条从树冠下沿探出，增加树冠与树干的结构联系。
  ctx.strokeStyle = '#493a29'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx-2,baseY-42*H); ctx.lineTo(cx-13*H,baseY-56*H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+2,baseY-39*H); ctx.lineTo(cx+14*H,baseY-53*H); ctx.stroke();
  ctx.fillStyle = crown.mid;
  ctx.fillRect(cx-16*H,baseY-59*H,7*H,4*H); ctx.fillRect(cx+10*H,baseY-56*H,8*H,4*H);
}


function drawTreeGrowthStage(x, y, obj) {
  const young = obj.type === "treeYoung";
  const cx = x + TILE_SIZE / 2, base = y + TILE_SIZE - 3;
  drawIrregularPatch(cx-10,base-2,20,6,"rgba(16,25,17,.24)",obj.col*3+obj.row,6);
  if (!young) {
    ctx.strokeStyle = "#69462d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx,base); ctx.lineTo(cx,base-13); ctx.stroke();
    drawOutlinePath([[cx,base-22],[cx-8,base-12],[cx-5,base-10],[cx,base-14],[cx+5,base-10],[cx+8,base-12]], "#648d45", "#304b30", 1.5);
    ctx.fillStyle="#a4c66b"; ctx.fillRect(cx-2,base-20,3,3);
  } else {
    ctx.strokeStyle="#65452d";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,base);ctx.lineTo(cx+1,base-21);ctx.stroke();
    drawIrregularPatch(cx-12,base-37,24,22,"#31583a",obj.col*5+obj.row,7);
    drawIrregularPatch(cx-8,base-36,17,17,"#588649",obj.col+obj.row*2,6);
    ctx.fillStyle="#9fc36a";ctx.fillRect(cx-5,base-34,4,3);ctx.fillRect(cx+2,base-28,3,2);
  }
}

function drawTreeStump(x, y, col = 0, row = 0, obj = null) {
  if (obj?.hitAt) { const age = performance.now() - obj.hitAt; if (age < 260) x += Math.sin(age * .085) * (1-age/260) * 3; }
  if (AssetManager.draw("treeStump", ctx, x - 8, y + 1, 48, 40)) return;

  const cx = x + 16 + (getTileRandom(col + 19, row + 23) - .5) * 4;
  const by = y + 29;
  drawIrregularPatch(cx - 16, by - 3, 34, 9, "rgba(14,22,14,.30)", col * 7 + row, 7);
  drawOutlinePath([[cx-13,by-4],[cx-11,by-13],[cx-6,by-17],[cx+8,by-17],[cx+13,by-11],[cx+14,by-4],[cx+8,by],[cx-9,by]], "#765033", "#352c22", 2);
  ctx.fillStyle = "#bd9561"; ctx.beginPath(); ctx.ellipse(cx, by-14, 8, 3.5, -.05, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#6a482f"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, by-14, 4, 1.6, -.05, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = "#d0aa72"; ctx.fillRect(cx-2, by-15, 2, 1);
  if (obj?.chopHits) { ctx.fillStyle = "#4a3021"; ctx.fillRect(cx-7, by-8, 5, 2); }
}
function drawResourceHitEffects(cameraX, cameraY) {
  const now = performance.now();
  for (let i = resourceHitEffects.length - 1; i >= 0; i--) {
    const fx = resourceHitEffects[i], age = now - fx.born;
    if (age > 420) { resourceHitEffects.splice(i, 1); continue; }
    const progress = age / 420, sx = fx.x - cameraX, sy = fx.y - cameraY;
    ctx.save(); ctx.globalAlpha = 1 - progress;
    for (let n = 0; n < 5; n++) {
      const seed = fx.seed * 100 + n * 17;
      const px = sx + Math.sin(seed) * (5 + progress * 16);
      const py = sy + Math.cos(seed * 1.7) * (4 + progress * 14) + progress * 8;
      ctx.fillStyle = fx.kind === "stone" ? (n % 2 ? "#c4c9bd" : "#747e73") : (n % 2 ? "#d6b078" : "#8a6039");
      ctx.fillRect(Math.round(px), Math.round(py), n % 3 === 0 ? 3 : 2, 2);
    }
    ctx.restore();
  }
}

function drawFruitDetails(x, y, col, row) {
  // 果实挂在高处叶簇边缘，避免旧版果实堆在树干附近。
  const r = getTileRandom(col + 77, row + 33);
  const cx = x + 16 + (r - .5) * 8;
  const cy = y - 55;
  [[cx-20,cy+2],[cx+5,cy-12],[cx+20,cy+7],[cx-2,cy+17],[cx-11,cy-20]].forEach((pt,i)=>{
    ctx.fillStyle = '#273b27'; ctx.fillRect(pt[0]-1,pt[1]-1,6,6);
    ctx.fillStyle = i%2 ? '#d6a746' : '#bd4d3c'; ctx.fillRect(pt[0],pt[1],4,5);
    ctx.fillStyle = '#f1d27b'; ctx.fillRect(pt[0],pt[1],2,1);
    ctx.fillStyle = '#45633a'; ctx.fillRect(pt[0]+2,pt[1]-2,2,2);
  });
}
function drawRock(x, y, col = 0, row = 0) {
  const rockObj = worldObjectByTile.get(`${col},${row}`);
  if (rockObj?.hitAt) { const age = performance.now() - rockObj.hitAt; if (age < 240) x += Math.sin(age * .11) * (1-age/240) * 3.5; }
  if (AssetManager.draw("rock", ctx, x - 8, y - 7, 48, 44)) return;

  const r=getTileRandom(col+51,row+97), cx=x+16+(r-.5)*5, by=y+29;
  drawIrregularPatch(cx-15,by-3,35,10,"rgba(17,23,18,.38)",col+row*2,8);
  const pts=[[cx-16,by-7],[cx-18,by-16],[cx-11,by-25],[cx-2,by-29],[cx+8,by-24],[cx+16,by-15],[cx+14,by-6],[cx+5,by-3],[cx-8,by-4]];
  drawOutlinePath(pts,"#626b61","#303a32",2);
  drawOutlinePath([[cx-13,by-15],[cx-8,by-23],[cx-2,by-26],[cx+2,by-20],[cx-2,by-13]],"#9ca394","#515a50",1.5);
  drawOutlinePath([[cx+1,by-20],[cx+8,by-22],[cx+13,by-15],[cx+10,by-8],[cx+2,by-10]],"#7d8779","#414b41",1);
  ctx.fillStyle="#c2c6b5"; ctx.fillRect(cx-8,by-22,4,2); ctx.fillRect(cx-3,by-24,3,2);
  ctx.fillStyle="#414b42"; ctx.fillRect(cx+5,by-12,4,2); ctx.fillRect(cx-12,by-8,3,2);
  if(r>.42){ctx.fillStyle="#587b48";ctx.fillRect(cx+6,by-7,5,3);ctx.fillRect(cx+8,by-9,3,2);}
}
function drawLog(x,y,col,row,driftwood=false){
  const r=getTileRandom(col+8,row+61), cx=x+16+(r-.5)*8, cy=y+23;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate((r-.5)*.7);
  drawIrregularPatch(-16,-2,37,12,"rgba(14,20,14,.34)",col+row,8);
  drawOutlinePath([[-17,-5],[-12,-9],[12,-8],[17,-3],[15,4],[-12,5],[-18,1]],driftwood?"#8c7959":"#69482f","#342e25",2);
  ctx.fillStyle=driftwood?"#c0a77b":"#a57a4f"; ctx.fillRect(-12,-5,22,3);
  ctx.fillStyle="#493727"; ctx.fillRect(10,-4,5,7);
  ctx.fillStyle="#d1b78b"; ctx.beginPath();ctx.ellipse(13,-1,3,4,.1,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#61462f";ctx.lineWidth=1;ctx.stroke();
  for(let i=0;i<5;i++){ctx.fillStyle=i%2?"#4e3928":"#b18b5c";ctx.fillRect(-10+i*4,-2+(i%2)*3,3,1);}
  ctx.restore();
}
function drawPlant(x,y,type,col,row){
  const plantAsset = type === "highGrass" ? "highGrass" : type === "branch" ? "branch" : type === "mushroom" ? "plant" : type === "reeds" ? "highGrass" : type === "wildgrass" || type === "fern" ? "plant" : null;
  if (plantAsset && AssetManager.draw(plantAsset, ctx, x - 5, y - 7, 42, 42)) return;

  const r=getTileRandom(col+311,row+71), cx=x+16+(r-.5)*10, base=y+27;
  // 植物统一有落影和深色轮廓，绘制为小型像素插画而非 emoji。
  drawIrregularPatch(cx-8,base-1,18,5,"rgba(17,28,17,.28)",col+row,6);
  if(type==="wildgrass"){
    for(let i=0;i<7;i++){
      const bx=cx-7+i*2, h=5+getTileRandom(col+i,row+i*3)*9;
      ctx.strokeStyle="#2c452c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,base);ctx.lineTo(bx+(i%2?2:-2),base-h);ctx.stroke();
      ctx.strokeStyle=i%3===0?"#c0c477":(i%2?"#73934b":"#4b733d");ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(bx,base-1);ctx.lineTo(bx+(i%2?2:-2),base-h);ctx.stroke();
    }
    if(r>.68){ctx.fillStyle="#8f75b5";ctx.fillRect(cx+3,base-9,3,3);ctx.fillStyle="#e5cf7d";ctx.fillRect(cx-5,base-6,2,2);}return;
  }
  if(type==="fern"){
    // 蕨类羽状叶片：多层弧形叶，深色描边加嫩绿高光。
    for(let side of [-1,1]){
      for(let i=0;i<5;i++){
        const yy=base-4-i*3, xx=cx+side*(2+i*1.4);
        ctx.strokeStyle="#263f2b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,base);ctx.lineTo(xx,yy);ctx.stroke();
        ctx.fillStyle=i%2?"#5f9149":"#83a95b";ctx.fillRect(xx-2,yy-2,4,3);
        ctx.fillStyle="#b0c978";ctx.fillRect(xx-1,yy-2,2,1);
      }
    }return;
  }
  if(type==="branch"){
    ctx.lineCap="round";ctx.strokeStyle="#342f24";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-11,base-7);ctx.lineTo(cx+10,base-1);ctx.lineTo(cx+3,base-9);ctx.moveTo(cx-1,base-4);ctx.lineTo(cx-5,base+1);ctx.stroke();
    ctx.strokeStyle="#9b7950";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-10,base-8);ctx.lineTo(cx+9,base-2);ctx.stroke();return;
  }
  if(type==="mushroom"){
    drawOutlinePath([[cx-2,base-2],[cx-1,base-10],[cx+3,base-10],[cx+4,base-2]],"#e6d7b7","#3c332b",1.5);
    drawOutlinePath([[cx-8,base-10],[cx-6,base-15],[cx,base-18],[cx+7,base-14],[cx+9,base-10],[cx+4,base-8],[cx-5,base-8]],r>.5?"#bd5946":"#a84c43","#3b302b",1.5);
    ctx.fillStyle="#f0d9a5";ctx.fillRect(cx-3,base-14,3,2);ctx.fillRect(cx+3,base-12,2,2);return;
  }
  if(type==="reeds"){
    for(let i=0;i<4;i++){const bx=cx-5+i*3, h=13+(i%3)*3;ctx.strokeStyle="#31462b";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bx,base);ctx.lineTo(bx-2,base-h);ctx.stroke();ctx.strokeStyle="#92a85b";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx,base-1);ctx.lineTo(bx-2,base-h);ctx.stroke();ctx.fillStyle="#705039";ctx.fillRect(bx-4,base-h-4,4,6);}return;
  }
  if(type==="highGrass"){
    // 高草丛刻意做得更高、更密，并加浅色穗头和地面标记，方便玩家远距离辨认。
    drawIrregularPatch(cx-15,base-3,31,8,"rgba(22,38,19,.52)",col*5+row,8);
    for(let i=0;i<13;i++){
      const bx=cx-14+i*2.3, h=13+getTileRandom(col+i,row+i*7)*17;
      ctx.strokeStyle="#263e24";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bx,base);ctx.lineTo(bx+(i%2?4:-3),base-h);ctx.stroke();
      ctx.strokeStyle=i%3===0?"#d3dc83":(i%2?"#9ebc55":"#6f9b43");ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(bx,base-1);ctx.lineTo(bx+(i%2?4:-3),base-h);ctx.stroke();
      if(i%3===0){ctx.fillStyle="#d9d48a";ctx.fillRect(bx+(i%2?3:-3),base-h-2,3,3);}
    }
    ctx.fillStyle="rgba(17,29,15,.72)";ctx.fillRect(cx-13,base+1,27,9);ctx.fillStyle="#e4eab4";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText("高草",cx,base+8);return;
  }
  if(type==="medicinalHerb"){
    for(let i=0;i<5;i++){const bx=cx-7+i*3,yy=base-5-(i%3)*4;ctx.strokeStyle="#2d482d";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,base);ctx.lineTo(bx,yy);ctx.stroke();ctx.fillStyle=i%2?"#9cbf69":"#6d994e";ctx.fillRect(bx-2,yy-2,5,4);ctx.fillStyle="#d7c879";ctx.fillRect(bx,yy-1,2,2);}return;
  }
  if(type==="flower"){
    // 紫色、奶白与黄色花簇混合，大小不一。
    for(let i=0;i<5;i++){
      const fx=cx-7+(i%3)*6, fy=base-3-(i%2)*5;
      ctx.strokeStyle="#354b2e";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx,base);ctx.lineTo(fx-1,fy+2);ctx.stroke();
      const purple=getTileRandom(col+i*3,row+i*5)>.38;
      const petal=purple?(i%2?"#8f70bc":"#b69ad8"):(i%2?"#e8cf75":"#f0e8c5");
      ctx.fillStyle="#392f3d";ctx.fillRect(fx-3,fy-2,6,5);ctx.fillStyle=petal;ctx.fillRect(fx-2,fy-3,4,4);ctx.fillStyle="#e9c86a";ctx.fillRect(fx,fy-1,2,2);
    }return;
  }
  // 灌木与浆果：层叠叶团，边缘深描线，带高光和果实。
  const leaf=type==="berries"?"#38633a":"#477442";
  [[cx-10,base-12,14,12],[cx-3,base-17,15,15],[cx+4,base-11,12,11]].forEach((b,i)=>{
    drawIrregularPatch(b[0],b[1],b[2],b[3],"#263c2b",col*3+row+i,7);
    drawIrregularPatch(b[0]+1,b[1]+1,b[2]-3,b[3]-3,i===1?"#5d8c4c":leaf,col+row*7+i,7);
  });
  ctx.fillStyle="#8eaa60";ctx.fillRect(cx-5,base-14,4,2);ctx.fillRect(cx+5,base-10,3,2);
  if(type==="berries")[[cx-4,base-8],[cx+3,base-12],[cx+7,base-7]].forEach((pt,i)=>{ctx.fillStyle="#302b32";ctx.fillRect(pt[0],pt[1],5,5);ctx.fillStyle=i%2?"#b94c64":"#d16a76";ctx.fillRect(pt[0]+1,pt[1],3,4);ctx.fillStyle="#f0a1a0";ctx.fillRect(pt[0]+1,pt[1],1,1);});
}
// 静态地面与装饰植被按区块缓存，避免每一帧重复绘制数千个地表细节。
const BACKGROUND_CHUNK_TILES = 12;
const backgroundChunkCache = new Map();
function drawGroundDecoration(col, row, x, y, terrain) {
  const deco = getTileRandom(col + 171, row + 239);
  if (terrain !== TERRAIN.GRASS && terrain !== TERRAIN.MEADOW && terrain !== TERRAIN.FOREST) return;
  if (deco > .67) {
    const plantRoll = getTileRandom(col + 181, row + 293);
    const plantType = plantRoll > .84 ? "flower" : plantRoll > .70 && terrain === TERRAIN.FOREST ? "fern" : "wildgrass";
    drawPlant(x + (getTileRandom(col + 8, row + 2) - .5) * 16, y, plantType, col, row);
  }
  if (deco > .95) {
    const secondRoll = getTileRandom(col + 401, row + 503);
    const secondType = secondRoll > .68 ? "flower" : "wildgrass";
    drawPlant(x + (getTileRandom(col + 41, row + 22) - .5) * 22, y + (getTileRandom(col + 31, row + 12) - .5) * 10, secondType, col + 71, row + 37);
  }
}
function getBackgroundChunk(chunkCol, chunkRow) {
  const key = `${chunkCol},${chunkRow}`;
  if (backgroundChunkCache.has(key)) return backgroundChunkCache.get(key);
  const startCol = chunkCol * BACKGROUND_CHUNK_TILES;
  const startRow = chunkRow * BACKGROUND_CHUNK_TILES;
  const cols = Math.min(BACKGROUND_CHUNK_TILES, MAP_WIDTH - startCol);
  const rows = Math.min(BACKGROUND_CHUNK_TILES, MAP_HEIGHT - startRow);
  const chunkCanvas = document.createElement("canvas");
  chunkCanvas.width = cols * TILE_SIZE;
  chunkCanvas.height = rows * TILE_SIZE;
  const chunkCtx = chunkCanvas.getContext("2d");
  const mainCtx = ctx;
  ctx = chunkCtx;
  for (let row = startRow; row < startRow + rows; row++) {
    for (let col = startCol; col < startCol + cols; col++) {
      const x = (col - startCol) * TILE_SIZE;
      const y = (row - startRow) * TILE_SIZE;
      const terrain = getTerrain(col, row);
      drawTerrainTile(x, y, terrain, col, row);
      if (!worldObjectByTile.has(`${col},${row}`)) drawGroundDecoration(col, row, x, y, terrain);
    }
  }
  ctx = mainCtx;
  const chunk = { canvas: chunkCanvas, x: startCol * TILE_SIZE, y: startRow * TILE_SIZE };
  backgroundChunkCache.set(key, chunk);
  return chunk;
}
function drawCachedGround(cameraX, cameraY, startCol, startRow, endCol, endRow) {
  const firstChunkCol = Math.floor(startCol / BACKGROUND_CHUNK_TILES);
  const firstChunkRow = Math.floor(startRow / BACKGROUND_CHUNK_TILES);
  const lastChunkCol = Math.floor(Math.max(startCol, endCol - 1) / BACKGROUND_CHUNK_TILES);
  const lastChunkRow = Math.floor(Math.max(startRow, endRow - 1) / BACKGROUND_CHUNK_TILES);
  for (let chunkRow = firstChunkRow; chunkRow <= lastChunkRow; chunkRow++) {
    for (let chunkCol = firstChunkCol; chunkCol <= lastChunkCol; chunkCol++) {
      const chunk = getBackgroundChunk(chunkCol, chunkRow);
      ctx.drawImage(chunk.canvas, chunk.x - cameraX, chunk.y - cameraY);
    }
  }
}
// 绘制整张地图的可视区域
function drawWorld() {
  if (gameState.location === "camp") { drawCampInterior(); applyEnvironmentOverlay(); return; }
  if (gameState.location === "cabin") { drawAbandonedCabinInterior(); applyEnvironmentOverlay(); return; }
  if (gameState.location === "aircraft") { drawAircraftInterior(); applyEnvironmentOverlay(); return; }
  if (gameState.location === "region") { drawRegionMap(); applyEnvironmentOverlay(); return; }
  const player = gameState.player;
  const worldPixelWidth = MAP_WIDTH * TILE_SIZE;
  const worldPixelHeight = MAP_HEIGHT * TILE_SIZE;
  // v33 平滑相机：先计算目标镜头，再按帧时间指数插值，避免边界死区触发时瞬移。
  let targetCameraX = player.x - canvas.width / 2;
  let targetCameraY = player.y - canvas.height / 2;
  if (reduceCameraMotion && cameraState.x !== null && cameraState.y !== null) {
    const screenPlayerX = player.x - cameraState.x;
    const screenPlayerY = player.y - cameraState.y;
    const leftDeadZone = canvas.width * 0.32, rightDeadZone = canvas.width * 0.68;
    const topDeadZone = canvas.height * 0.32, bottomDeadZone = canvas.height * 0.68;
    targetCameraX = cameraState.x;
    targetCameraY = cameraState.y;
    if (screenPlayerX < leftDeadZone) targetCameraX = player.x - leftDeadZone;
    else if (screenPlayerX > rightDeadZone) targetCameraX = player.x - rightDeadZone;
    if (screenPlayerY < topDeadZone) targetCameraY = player.y - topDeadZone;
    else if (screenPlayerY > bottomDeadZone) targetCameraY = player.y - bottomDeadZone;
  }
  targetCameraX = Math.max(0, Math.min(targetCameraX, Math.max(0, worldPixelWidth - canvas.width)));
  targetCameraY = Math.max(0, Math.min(targetCameraY, Math.max(0, worldPixelHeight - canvas.height)));
  if (cameraState.x === null || cameraState.y === null) {
    cameraState.x = targetCameraX; cameraState.y = targetCameraY;
  } else {
    const smoothAlpha = 1 - Math.exp(-Math.max(0.001, cameraDeltaTime) * 9.5);
    cameraState.x += (targetCameraX - cameraState.x) * smoothAlpha;
    cameraState.y += (targetCameraY - cameraState.y) * smoothAlpha;
  }
  const cameraX = cameraState.x, cameraY = cameraState.y;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 仅绘制当前屏幕范围内的地块
  const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE));
  const endCol = Math.min(
    MAP_WIDTH,
    Math.ceil((cameraX + canvas.width) / TILE_SIZE)
  );
  const endRow = Math.min(
    MAP_HEIGHT,
    Math.ceil((cameraY + canvas.height) / TILE_SIZE)
  );
  // 第一遍：绘制已缓存的地面与装饰植物；镜头移动时只平移区块图片。
  drawCachedGround(cameraX, cameraY, startCol, startRow, endCol, endRow);
  // 第二遍：绘制自然物件。允许树冠向相邻地块伸展，画面不再呈现一格一物的摆放感。
  const objectStartCol = Math.max(0, startCol - 8);
  const objectStartRow = Math.max(0, startRow - 4);
  const objectEndCol = Math.min(MAP_WIDTH, endCol + 8);
  const objectEndRow = Math.min(MAP_HEIGHT, endRow + 4);
  const visibleObjects = [];
  for (let row = objectStartRow; row < objectEndRow; row++) {
    for (let col = objectStartCol; col < objectEndCol; col++) {
      const obj = worldObjectByTile.get(`${col},${row}`);
      if (obj && !harvestedObjects.has(obj.id)) visibleObjects.push(obj);
    }
  }
  // 统一以“物件脚点世界Y”排序，而不是按网格左上角或创建顺序排序。
  // 可为特殊对象设置 depthOffset；默认以物件所在格的底边作为脚点。
  const objectDepthY = obj => obj.depthY ?? (obj.row * TILE_SIZE + TILE_SIZE);
  visibleObjects.sort((a,b) => objectDepthY(a) - objectDepthY(b) || (a.col*TILE_SIZE) - (b.col*TILE_SIZE));
  // 玩家脚底坐标与物件脚点放入同一排序基准，人物可自然走到树后/树前。
  const playerDepthY = player.y;
  let playerSpriteDrawn = false;
  const drawPlayerSpriteAtCamera = () => {
    const px = player.x - cameraX, py = player.y - cameraY;
    drawCharacterSprite(ctx, px, py, gameState.selectedCharacter?.id || "scout", player.facing || "down", player.moving, player.walkTime || 0, player.actionUntil > performance.now() ? player.actionType : "");
    playerSpriteDrawn = true;
  };
  for (const obj of visibleObjects) {
    if (!playerSpriteDrawn && objectDepthY(obj) > playerDepthY) drawPlayerSpriteAtCamera();
    const screenX=obj.col*TILE_SIZE-cameraX, screenY=obj.row*TILE_SIZE-cameraY;
    if (["tree", "treeMedium", "treeSmall", "fruitTree"].includes(obj.type)) {
      drawTree(screenX,screenY,obj.col,obj.row,obj);
      if (obj.type === "fruitTree") drawFruitDetails(screenX,screenY,obj.col,obj.row);
      if (["tree", "treeMedium", "treeSmall"].includes(obj.type) && obj.chopHits) { ctx.fillStyle="#4a3021"; ctx.fillRect(screenX+TILE_SIZE/2-5,screenY+TILE_SIZE-10,Math.min(10,2+obj.chopHits),2); }
    }
    else if (obj.type === "treeStump") drawTreeStump(screenX,screenY,obj.col,obj.row,obj);
    else if (obj.type === "treeSapling" || obj.type === "treeYoung") drawTreeGrowthStage(screenX,screenY,obj);
    else if (obj.type === "rock") drawRock(screenX,screenY,obj.col,obj.row);
    else if (obj.type === "stonePile") drawStonePile(screenX,screenY,obj.col,obj.row);
    else if (obj.type === "campEntrance") drawCampEntrance(screenX,screenY,obj.col,obj.row);
    else if (obj.type === "cabinEntrance") drawAbandonedCabin(screenX,screenY,obj.col,obj.row);
    else if (obj.type === "riverGate" || obj.type === "ridgeGate") drawRegionGate(screenX,screenY,obj.type);
    else if (obj.type === "waterSource") drawWaterSource(screenX,screenY);
    else if (obj.type === "storyPoint") { if(obj.storyKey?.startsWith("anomaly_")||obj.storyKey==="nest_boss") drawContaminationAura(screenX,screenY,obj); drawStoryPoint(screenX, screenY, obj); }
    else if (obj.type === "companionNpc") {
      const def = companionForObject(obj);
      if (def) {
        const portrait = AssetManager.get(def.portrait);
        ctx.save(); ctx.fillStyle="rgba(10,16,13,.30)"; ctx.beginPath(); ctx.ellipse(screenX+TILE_SIZE/2,screenY+TILE_SIZE-2,12,4,0,0,Math.PI*2);ctx.fill();
        if (portrait) { ctx.imageSmoothingEnabled=false; ctx.drawImage(portrait,screenX+3,screenY-5,26,31); }
        else drawCharacterSprite(ctx,screenX+TILE_SIZE/2,screenY+TILE_SIZE-2,obj.characterId,"down",false,0,"",0.78);
        ctx.fillStyle="#f3e4c3";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(def.name,screenX+TILE_SIZE/2,screenY-8);
        ctx.fillStyle="#d8c79b";ctx.font="9px sans-serif";ctx.fillText(mainQuestState.flags[`companion_${obj.characterId}`] ? (obj.characterId==="hunter"&&mainQuestState.flags.hunterFollowing?"E 让其回营":"E 交谈") : "E 交谈",screenX+TILE_SIZE/2,screenY+TILE_SIZE+9);ctx.restore();
      }
    }
    else if (obj.type === "aircraftWreck") drawAircraftWreck(screenX, screenY);
    else if (obj.type === "droppedItem") {
      const dropKey = obj.itemId === "wood" ? "wood" : obj.itemId === "berry" ? "berry" : null;
      if (!(dropKey && AssetManager.draw(dropKey, ctx, screenX+2, screenY+2, 28, 28))) {
        const dropIcon = AssetManager.get(`item_${obj.itemId}`);
        if (dropIcon) { ctx.save(); ctx.imageSmoothingEnabled=false; ctx.fillStyle="rgba(18,24,16,.22)";ctx.beginPath();ctx.ellipse(Math.round(screenX+16),Math.round(screenY+26),9,3,0,0,Math.PI*2);ctx.fill();ctx.drawImage(dropIcon,Math.round(screenX+4),Math.round(screenY+3),24,24);ctx.restore(); }
        else { ctx.font="20px sans-serif"; ctx.textAlign="center"; ctx.fillText(itemCatalog[obj.itemId]?.icon || "📦", screenX+TILE_SIZE/2, screenY+TILE_SIZE*.78); }
      }
    }
    else if (obj.type === "log" || obj.type === "driftwood") drawLog(screenX,screenY,obj.col,obj.row,obj.type==="driftwood");
    else drawPlant(screenX,screenY,obj.type,obj.col,obj.row);
  }
  // 第三遍：绘制玩家放置的篝火。
  for (const fire of gameState.placedCampfires) {
    const fx = fire.x - cameraX, fy = fire.y - cameraY;
    if (fx > -40 && fy > -40 && fx < canvas.width + 40 && fy < canvas.height + 40) drawCampfire(fx, fy, fire.fuel > 0);
  }
  // 侦察员带回的资源情报会在主地图显示为可见标记。
  const intel=mainQuestState.flags.scoutIntel;
  if(intel && (mainQuestState.flags.companion_scout || gameState.selectedCharacter?.id === "scout") && intel.day >= Math.floor(worldTimeMinutes/1440)+1){const ix=(intel.col+.5)*TILE_SIZE-cameraX,iy=(intel.row+.5)*TILE_SIZE-cameraY;if(ix>-24&&iy>-24&&ix<canvas.width+24&&iy<canvas.height+24){ctx.save();ctx.strokeStyle="#f4d77d";ctx.lineWidth=2;ctx.beginPath();ctx.arc(ix,iy,13+Math.sin(performance.now()/220)*2,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#fff0b4";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText("资源情报",ix,iy-18);ctx.restore();}}
  // 玩家自己建造的营地：等级影响外观，营地入口附近可按 E 进入。
  for(const camp of gameState.camps){const x=camp.x-cameraX,y=camp.y-cameraY;if(x<-100||y<-100||x>canvas.width+100||y>canvas.height+100)continue;drawPlayerCamp(x,y,camp.level);}
  // 若视野内没有比玩家更靠后的物件，则在物件层之后补画玩家。
  if (!playerSpriteDrawn) drawPlayerSpriteAtCamera();
  drawCombatEntities(cameraX, cameraY);
  drawResourceHitEffects(cameraX, cameraY);
  // 地图坐标显示
  applyEnvironmentOverlay();
  const targetInfo=questTargetInfo();
  document.querySelector("#world-position").textContent = targetInfo ? `坐标：${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)} · 目标：${targetInfo.label}` : `坐标：${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`;
}
// ================================
// 8.5 沉浸式 HUD、地图与背包
// ================================
function getTerrainColor(terrain) {
  switch (terrain) {
    case TERRAIN.GRASS: return "#7a9052";
    case TERRAIN.FOREST: return "#31583a";
    case TERRAIN.RIVER: return "#347d9e";
    case TERRAIN.SHALLOW_WATER: return "#8bb9b0";
    case TERRAIN.ROCKY: return "#777b70";
    case TERRAIN.SAND: return "#c0ae78";
    case TERRAIN.DIRT: return "#856b49";
    case TERRAIN.MEADOW: return "#8da45c";
    default: return "#526e42";
  }
}
function questTargetInfo() {
  const quest=activeMainQuest(); if(!quest) return null;
  const guide=questGuidance[quest.chapter]; if(!guide) return null;
  if (quest.chapter === 1) return { map: "world", x: QUEST_LANDMARKS.aircraftWreck.entrance.x, y: QUEST_LANDMARKS.aircraftWreck.entrance.y, col: 56, row: 52, label: "坠毁客机·残骸入口" };
  if(quest.chapter===2 && gameState.camps.length) { const camp=gameState.camps[0]; return {map:"world",x:camp.x,y:camp.y,label:"营地"}; }
  if (guide.map === "riverValley" || guide.map === "ridgeHighlands") {
    const l = getRegionMapLayout();
    const col = quest.chapter === 4 && gameState.visitedRegions.riverValley ? 22 : guide.col;
    const row = quest.chapter === 4 && gameState.visitedRegions.riverValley ? 11 : guide.row;
    return { map: guide.map, x: l.x + (col + .5) * l.tile, y: l.y + (row + .5) * l.tile, col, row, label: quest.chapter === 4 ? "三号旧巡护站·日志" : guide.location };
  }
  return {map:guide.map,x:(guide.col+.5)*TILE_SIZE,y:(guide.row+.5)*TILE_SIZE,col:guide.col,row:guide.row,label:guide.location};
}
function drawMapQuestPin(targetCtx, targetCanvas, x, y, label="任务目标") {
  targetCtx.save(); targetCtx.beginPath();targetCtx.arc(x,y,Math.max(5,targetCanvas.width/100),0,Math.PI*2);targetCtx.fillStyle="#f5d36f";targetCtx.fill();targetCtx.lineWidth=2;targetCtx.strokeStyle="#302b1c";targetCtx.stroke();
  targetCtx.font=`bold ${Math.max(9,targetCanvas.width/65)}px sans-serif`;targetCtx.textAlign="center";targetCtx.fillStyle="#fff2bb";targetCtx.strokeStyle="#1c251c";targetCtx.lineWidth=3;targetCtx.strokeText("◆",x,y-7);targetCtx.fillText("◆",x,y-7);targetCtx.restore();
}
function drawRegionOverviewMap(targetCtx,targetCanvas) {
  const width=targetCanvas.width,height=targetCanvas.height,cols=30,rows=16,cw=width/cols,ch=height/rows;
  targetCtx.clearRect(0,0,width,height);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const v=getTileRandom(c+21,r+73);targetCtx.fillStyle=gameState.regionId==="riverValley"?(v>.78?"#71875a":v>.4?"#486a49":"#8a9870"):(v>.72?"#85877d":v>.4?"#52614f":"#72766b");targetCtx.fillRect(c*cw,r*ch,Math.ceil(cw)+1,Math.ceil(ch)+1);}
  if(gameState.regionId==="riverValley") {targetCtx.fillStyle="#347d9e";targetCtx.beginPath();targetCtx.moveTo(0,height*.32);targetCtx.bezierCurveTo(width*.24,height*.24,width*.32,height*.52,width*.52,height*.43);targetCtx.bezierCurveTo(width*.72,height*.35,width*.78,height*.66,width,height*.56);targetCtx.lineTo(width,height*.68);targetCtx.bezierCurveTo(width*.76,height*.76,width*.66,height*.53,width*.5,height*.55);targetCtx.bezierCurveTo(width*.26,height*.67,width*.18,height*.4,0,height*.45);targetCtx.closePath();targetCtx.fill();targetCtx.fillStyle="#8bb9b0";targetCtx.fillRect(0,height*.3,width*.28,height*.025);targetCtx.fillRect(width*.66,height*.48,width*.34,height*.025);} else { for(let i=0;i<11;i++){const x=(i*71)%width,y=(i*43)%height;targetCtx.fillStyle=i%2?"#96988c":"#626b64";targetCtx.beginPath();targetCtx.moveTo(x,y+height*.12);targetCtx.lineTo(x+width*.045,y);targetCtx.lineTo(x+width*.09,y+height*.12);targetCtx.closePath();targetCtx.fill();} }
  for(const obj of regionObjects){if(obj.hidden||(obj.type!=="storyPoint"&&!obj.type.endsWith("Ore")))continue;const px=(obj.col+.5)*cw,py=(obj.row+.5)*ch;targetCtx.beginPath();targetCtx.arc(px,py,Math.max(3,width/150),0,Math.PI*2);targetCtx.fillStyle=obj.type==="storyPoint"?"#e5d39c":obj.type==="goldOre"?"#ffd24c":obj.type==="silverOre"?"#dce4e5":"#d18a4c";targetCtx.fill();}
  const target=questTargetInfo();if(target&&target.map===gameState.regionId)drawMapQuestPin(targetCtx,targetCanvas,(target.col+.5)*cw,(target.row+.5)*ch);
  const px=(gameState.player.x/(30*TILE_SIZE))*width,py=(gameState.player.y/(16*TILE_SIZE))*height;targetCtx.beginPath();targetCtx.arc(px,py,Math.max(3,width/100),0,Math.PI*2);targetCtx.fillStyle="#fff6b0";targetCtx.fill();targetCtx.strokeStyle="#20291d";targetCtx.lineWidth=2;targetCtx.stroke();
  targetCtx.fillStyle="#f4e6b7";targetCtx.font=`bold ${Math.max(10,width/55)}px sans-serif`;targetCtx.textAlign="left";targetCtx.fillText(gameState.regionId==="riverValley"?"碎石河谷 · 区域图":"断脊高地 · 区域图",8,16);
}
function drawOverviewMap(targetCtx, targetCanvas) {
  if(gameState.location==="region" && gameState.regionId){drawRegionOverviewMap(targetCtx,targetCanvas);return;}
  const width = targetCanvas.width;
  const height = targetCanvas.height;
  targetCtx.clearRect(0, 0, width, height);
  const cellWidth = width / MAP_WIDTH;
  const cellHeight = height / MAP_HEIGHT;
  for (let row = 0; row < MAP_HEIGHT; row++) {
    for (let col = 0; col < MAP_WIDTH; col++) {
      const discovered = exploredTiles.has(row * MAP_WIDTH + col);
      targetCtx.fillStyle = discovered ? getTerrainColor(getTerrain(col, row)) : "#101711";
      targetCtx.fillRect(Math.floor(col * cellWidth), Math.floor(row * cellHeight),
        Math.ceil(cellWidth) + 1, Math.ceil(cellHeight) + 1);
    }
  }
  const markerX = gameState.location === "camp" && gameState.campReturnPosition ? gameState.campReturnPosition.x : gameState.location === "aircraft" && gameState.aircraftReturnPosition ? gameState.aircraftReturnPosition.x : gameState.player.x;
  const markerY = gameState.location === "camp" && gameState.campReturnPosition ? gameState.campReturnPosition.y : gameState.location === "aircraft" && gameState.aircraftReturnPosition ? gameState.aircraftReturnPosition.y : gameState.player.y;
  const px = (markerX / (MAP_WIDTH * TILE_SIZE)) * width;
  const py = (markerY / (MAP_HEIGHT * TILE_SIZE)) * height;
  targetCtx.beginPath();
  targetCtx.arc(px, py, Math.max(3, width / 55), 0, Math.PI * 2);
  targetCtx.fillStyle = "#fff6b0";
  targetCtx.fill();
  targetCtx.lineWidth = Math.max(1, width / 180);
  targetCtx.strokeStyle = "#20291d";
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(px, py, Math.max(6, width / 30), 0, Math.PI * 2);
  targetCtx.strokeStyle = "rgba(255, 246, 176, 0.75)";
  targetCtx.lineWidth = Math.max(1, width / 150);
  targetCtx.stroke();
  // 固定地点始终显示在大地图：木屋、河谷入口、断脊入口与水源。
  const landmarks=[{col:56,row:52,label:"坠机残骸",color:"#f0c96d"},{col:58,row:45,label:"木屋",color:"#e8c27c"},{col:67,row:51,label:"河谷",color:"#78c9d8"},{col:82,row:15,label:"断崖",color:"#d4d8c9"}];
  for(const mark of landmarks){const mx=(mark.col/MAP_WIDTH)*width,my=(mark.row/MAP_HEIGHT)*height;targetCtx.beginPath();targetCtx.arc(mx,my,Math.max(3,width/90),0,Math.PI*2);targetCtx.fillStyle=mark.color;targetCtx.fill();targetCtx.font=`${Math.max(8,width/85)}px sans-serif`;targetCtx.textAlign="center";targetCtx.fillStyle="#fff0c2";targetCtx.fillText(mark.label,mx,my-5);}
  const target=questTargetInfo();if(target&&target.map==="world")drawMapQuestPin(targetCtx,targetCanvas,(target.x/(MAP_WIDTH*TILE_SIZE))*width,(target.y/(MAP_HEIGHT*TILE_SIZE))*height);
}
function getWeatherType() { return weatherTypes.find(item => item.id === weatherState.id) || weatherTypes[0]; }
function updateWeather() {
  if (worldTimeMinutes < weatherState.nextChangeAt) return;
  const pool = weatherTypes.filter(item => item.id !== weatherState.id);
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  let next = pool[0];
  for (const item of pool) { roll -= item.weight; if (roll <= 0) { next = item; break; } }
  const previous = weatherState.id;
  weatherState.id = next.id;
  weatherState.nextChangeAt = worldTimeMinutes + 100 + Math.random() * 220;
  if (previous !== next.id) showToast(`天气变化：${next.label}。${next.id === "storm" ? "雷暴中尽量寻找遮蔽。" : next.id === "rain" ? "雨水会让荒野能见度降低。" : next.id === "fog" ? "浓雾遮挡远处视线。" : "天气逐渐稳定。"}`);
}
function getNightDarkness() {
  const hour = ((worldTimeMinutes % 1440) + 1440) % 1440 / 60;
  if (hour >= 6 && hour < 17) return 0;
  if (hour >= 17 && hour < 20) return ((hour - 17) / 3) * 0.48;
  if (hour >= 20 || hour < 4.5) return 0.56;
  if (hour >= 4.5 && hour < 6) return ((6 - hour) / 1.5) * 0.56;
  return 0;
}
function applyEnvironmentOverlay() {
  ctx.save();
  clipToOutdoorRegions(ctx);
  const darkness = getNightDarkness() * roomEnvironment.outdoorTintAlpha;
  const weather = weatherState.id;
  const weatherAlpha = Math.max(0, Math.min(1, roomEnvironment.weatherAlpha));
  const tintAlpha = Math.max(0, Math.min(1, roomEnvironment.outdoorTintAlpha));

  // 夜色只影响室外环境；切换进室内时通过 outdoorTintAlpha 平滑退去。
  if (darkness > 0.01) {
    ctx.fillStyle = `rgba(8, 13, 35, ${darkness})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const fire of gameState.placedCampfires) {
      if (fire.fuel <= 0) continue;
      const x = fire.x - (cameraState.x || 0), y = fire.y - (cameraState.y || 0);
      if (x < -180 || y < -180 || x > canvas.width + 180 || y > canvas.height + 180) continue;
      const glow = ctx.createRadialGradient(x, y, 5, x, y, 150);
      glow.addColorStop(0, `rgba(255, 177, 74, ${Math.min(.42, darkness * .8)})`);
      glow.addColorStop(1, "rgba(255, 160, 60, 0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 150, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 过渡期间允许天气粒子和色调淡出；稳定进入室内后 alpha 为 0，不会继续下雨。
  if (weather === "fog" && weatherAlpha > 0.005) {
    ctx.fillStyle = `rgba(198, 211, 203, ${0.20 * weatherAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(210, 220, 214, ${0.10 * weatherAlpha})`;
    for (let i = 0; i < 4; i++) {
      const y = canvas.height * (.18 + i * .2) + Math.sin(worldTimeMinutes * .02 + i) * 12;
      ctx.fillRect(0, y, canvas.width, 30);
    }
  }
  if (weather === "cloudy" && tintAlpha > 0.005) {
    ctx.fillStyle = `rgba(37, 48, 58, ${0.10 * tintAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if ((weather === "rain" || weather === "storm") && weatherAlpha > 0.005) {
    const storm = weather === "storm";
    const amount = Math.round((storm ? 100 : 58) * weatherAlpha);
    ctx.save();
    ctx.globalAlpha = weatherAlpha;
    ctx.strokeStyle = storm ? "rgba(196, 218, 232, 0.58)" : "rgba(191, 218, 225, 0.42)";
    ctx.lineWidth = storm ? 1.5 : 1;
    const drift = (worldTimeMinutes * 38 * Math.max(.15, roomEnvironment.windExposure)) % Math.max(1, canvas.width);
    for (let i = 0; i < amount; i++) {
      const x = (i * 97 + drift * (storm ? 1.6 : 1)) % canvas.width;
      const y = (i * 53 + worldTimeMinutes * 70) % canvas.height;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + (storm ? 18 : 12)); ctx.stroke();
    }
    if (storm && Math.sin(worldTimeMinutes * .16) > .985) {
      ctx.fillStyle = `rgba(220, 230, 245, ${0.24 * weatherAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }
  ctx.restore();
}

function getClockText() {
  const minutesInDay = Math.floor(worldTimeMinutes) % (24 * 60);
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
function renderVital(name, value) {
  const roundedValue = Math.round(value);
  const valueElement = document.querySelector(`#hud-${name}-value`);
  const ringElement = document.querySelector(`#${name}-ring`);
  const legacyValue = document.querySelector(`#${name}-value`);
  const legacyBar = document.querySelector(`#${name}-bar`);
  if (valueElement) valueElement.textContent = roundedValue;
  if (ringElement) ringElement.style.setProperty("--vital-percent", `${Math.max(0, Math.min(100, value))}%`);
  if (legacyValue) legacyValue.textContent = roundedValue;
  if (legacyBar) legacyBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
}
function renderHUD() {
  document.querySelector("#survival-day-value").textContent =
    Math.floor(worldTimeMinutes / (24 * 60)) + 1;
  document.querySelector("#game-time-value").textContent = getClockText();
  const weatherLabel = document.querySelector("#weather-value");
  if (weatherLabel) { const weather = getWeatherType(); weatherLabel.textContent = `${weather.icon} ${weather.label}`; }
  renderVital("health", survivalState.health);
  renderVital("hunger", survivalState.hunger);
  renderVital("thirst", survivalState.thirst);
  hudRefreshElapsed += 1 / 60;
  if (hudRefreshElapsed >= 0.25) {
    drawOverviewMap(minimapCtx, minimapCanvas);
    if (!mapModal.classList.contains("hidden")) {
      drawOverviewMap(expandedMapCtx, expandedMapCanvas);
      updateExpandedMapDetails();
    }
    hudRefreshElapsed = 0;
  }
}
function updateExpandedMapDetails() {
  const marker = gameState.location === "camp" && gameState.campReturnPosition ? gameState.campReturnPosition : gameState.player;
  const x = Math.floor(marker.x / TILE_SIZE);
  const y = Math.floor(marker.y / TILE_SIZE);
  document.querySelector("#expanded-world-position").textContent = gameState.location === "camp" ? `位置：营地室内（野外入口 ${x}, ${y}）` : `坐标：${x}, ${y}`;
  document.querySelector("#expanded-current-task").textContent =
    document.querySelector("#current-task").textContent;
}
function renderSlotButton(item, index, type) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "item-slot";
  button.setAttribute("aria-label", item ? `${item.name}，${item.durabilityMax ? `耐久 ${item.durability ?? item.durabilityMax}/${item.durabilityMax}` : `数量 ${item.count}`}` : `空格 ${index + 1}`);
  if (type === "hotbar" && index === inventoryState.activeHotbarIndex) button.classList.add("active");
  if (inventoryState.selectedContainer &&
      inventoryState.selectedContainer.type === type &&
      inventoryState.selectedContainer.index === index) button.classList.add("selected");
  const number = document.createElement("span");
  number.className = "slot-number";
  number.textContent = index + 1;
  button.appendChild(number);
  if (item) {
    const icon = document.createElement("img");
    icon.className = "item-icon item-icon-image";
    icon.alt = item.name;
    icon.src = `images/items/icons/${item.id}.png`;
    icon.onerror = () => { icon.onerror = null; icon.src = "images/ui/item_fallback.png"; };
    const count = document.createElement("span");
    count.className = "item-count";
    count.textContent = item.durabilityMax ? "" : item.count;
    button.append(icon, count);
    if (item.durabilityMax) { const dur=document.createElement("span");dur.className="item-durability";dur.textContent=`${item.durability ?? item.durabilityMax}/${item.durabilityMax}`;button.appendChild(dur);button.title=`${item.name} · 耐久 ${item.durability ?? item.durabilityMax}/${item.durabilityMax}`; }
    if (type === "inventory") {
      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = item.name;
      button.appendChild(name);
    }
  } else {
    const empty = document.createElement("span");
    empty.className = "empty-slot-mark";
    empty.textContent = "·";
    button.appendChild(empty);
  }
  return button;
}
function renderHotbar() {
  hotbarElement.innerHTML = "";
  inventoryState.hotbar.forEach((item, index) => {
    const button = renderSlotButton(item, index, "hotbar");
    button.title = item ? `${item.name} ×${item.count}` : `快捷栏 ${index + 1}`;
    button.addEventListener("click", () => {
      if (!inventoryModal.classList.contains("hidden")) {
        handleHotbarClickInInventory(index);
        return;
      }
      inventoryState.activeHotbarIndex = index;
      renderHotbar();
    });
    hotbarElement.appendChild(button);
  });
}
function renderInventory() {
  resizeBackpack(inventoryState.backpackLevel);
  inventoryGrid.innerHTML = "";
  inventoryState.slots.forEach((item, index) => {
    const button = renderSlotButton(item, index, "inventory");
    button.addEventListener("click", () => handleInventorySlotClick(index));
    button.addEventListener("dblclick", () => useInventoryItem(index));
    inventoryGrid.appendChild(button);
  });
  renderHotbar();
  const hint = document.querySelector("#inventory-selection-hint");
  const dropButton = document.querySelector("#inventory-drop-btn");
  if (dropButton) dropButton.disabled = !inventoryState.selectedContainer || !(inventoryState.selectedContainer.type === "inventory" ? inventoryState.slots[inventoryState.selectedContainer.index] : inventoryState.hotbar[inventoryState.selectedContainer.index]);
  if (!inventoryState.selectedContainer) {
    hint.textContent = "点击物品，再点击快捷栏空格进行装备；双击可使用。";
  } else {
    const { type, index } = inventoryState.selectedContainer;
    const selectedItem = type === "inventory" ? inventoryState.slots[index] : inventoryState.hotbar[index];
    hint.textContent = selectedItem ? `已选择：${selectedItem.name} ×${selectedItem.count}` : "当前选择的是空格。";
  }
}
function handleInventorySlotClick(index) {
  const selected = inventoryState.selectedContainer;
  const clickedItem = inventoryState.slots[index];
  if (selected && selected.type === "hotbar") {
    const hotbarItem = inventoryState.hotbar[selected.index];
    if (hotbarItem && !clickedItem) {
      inventoryState.slots[index] = hotbarItem;
      inventoryState.hotbar[selected.index] = null;
      inventoryState.selectedContainer = null;
    } else if (hotbarItem && clickedItem) {
      inventoryState.slots[index] = hotbarItem;
      inventoryState.hotbar[selected.index] = clickedItem;
      inventoryState.selectedContainer = null;
    } else {
      inventoryState.selectedContainer = clickedItem ? { type: "inventory", index } : null;
    }
  } else if (clickedItem) {
    inventoryState.selectedContainer = { type: "inventory", index };
  } else {
    inventoryState.selectedContainer = null;
  }
  renderInventory();
  saveGame(false);
}
function handleHotbarClickInInventory(index) {
  const selected = inventoryState.selectedContainer;
  const hotbarItem = inventoryState.hotbar[index];
  if (selected && selected.type === "inventory") {
    const inventoryItem = inventoryState.slots[selected.index];
    if (inventoryItem) {
      if (!hotbarItem) {
        inventoryState.hotbar[index] = inventoryItem;
        inventoryState.slots[selected.index] = null;
      } else {
        inventoryState.hotbar[index] = inventoryItem;
        inventoryState.slots[selected.index] = hotbarItem;
      }
      inventoryState.selectedContainer = null;
    }
  } else {
    inventoryState.selectedContainer = hotbarItem ? { type: "hotbar", index } : null;
  }
  renderInventory();
  saveGame(false);
}
function dropSelectedInventoryItem() {
  const selected = inventoryState.selectedContainer;
  if (!selected) { showToast("请先点击背包或快捷栏中的一个物品。"); return; }
  const list = selected.type === "hotbar" ? inventoryState.hotbar : inventoryState.slots;
  const item = list[selected.index];
  if (!item) { showToast("选中的格子是空的。"); return; }
  if (item.id === "orbCore") { showToast("营地魔法球不可丢弃。"); return; }
  if (gameState.location !== "world" && gameState.location !== "region") { showToast("请先回到野外或探索区域再丢弃物品。"); return; }
  const col0 = Math.floor(gameState.player.x / TILE_SIZE), row0 = Math.floor(gameState.player.y / TILE_SIZE);
  let spot = null;
  for (let radius=0; radius<=3 && !spot; radius++) {
    for (let dy=-radius; dy<=radius && !spot; dy++) for (let dx=-radius; dx<=radius && !spot; dx++) {
      if (Math.max(Math.abs(dx),Math.abs(dy)) !== radius) continue;
      const col=col0+dx,row=row0+dy;
      if (col<1 || row<1 || col>=MAP_WIDTH-1 || row>=MAP_HEIGHT-1) continue;
      const occupied = (gameState.location === "world" ? worldObjectByTile.get(`${col},${row}`) : regionObjects.find(o=>o.col===col&&o.row===row));
      if (occupied && !harvestedObjects.has(occupied.id)) continue;
      if (gameState.location === "world" && isInsideCampNoSpawn(col,row)) continue;
      spot={col,row};
    }
  }
  if (!spot) { showToast("附近没有空地可以丢弃物品。"); return; }
  const dropId = `drop-${Date.now()}-${Math.floor(Math.random()*100000)}`;
  const dropped = {id:dropId,col:spot.col,row:spot.row,type:"droppedItem",itemId:item.id,count:item.count,regionId:gameState.location === "region" ? gameState.regionId : null};
  if (gameState.location === "world") { worldObjects.push(dropped); worldObjectByTile.set(`${spot.col},${spot.row}`,dropped); }
  else regionObjects.push(dropped);
  list[selected.index] = null;
  inventoryState.selectedContainer = null;
  renderInventory(); renderCrafting(); drawWorld(); saveGame(false);
  playSoundEffect("drop");
  showToast(`已丢弃 ${item.name} ×${item.count}，物品留在地上，可再靠近按 E 捡起。`);
}
function openInventory() {
  playSoundEffect("tap");
  inventoryState.selectedContainer = null;
  inventoryModal.classList.remove("hidden");
  renderInventory();
}
function closeInventory() {
  inventoryModal.classList.add("hidden");
  playSoundEffect("tap");
  inventoryState.selectedContainer = null;
  renderHotbar();
}
function openExpandedMap() {
  playSoundEffect("tap");
  mapModal.classList.remove("hidden");
  drawOverviewMap(expandedMapCtx, expandedMapCanvas);
  updateExpandedMapDetails();
  renderMapQuestPanel();
}
function closeExpandedMap() {
  mapModal.classList.add("hidden");
  playSoundEffect("tap");
}
function useItemFromContainer(container, index) {
  const list = container === "hotbar" ? inventoryState.hotbar : inventoryState.slots;
  const item = list[index];
  if (!item || item.count <= 0) { showToast("这个格子里没有可使用的物品。"); return; }
  // v31：玩家可以在野外空地种下树种，树苗会随游戏内时间成长。
  if (item.id === "seed") {
    if (gameState.location !== "world") { showToast("树种只能种在初始地图的野外空地。先回到翠影森林。 "); return; }
    const pc = Math.floor(gameState.player.x / TILE_SIZE), pr = Math.floor(gameState.player.y / TILE_SIZE);
    let spot = null;
    for (let radius = 1; radius <= 3 && !spot; radius++) {
      for (let dy = -radius; dy <= radius && !spot; dy++) for (let dx = -radius; dx <= radius && !spot; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const col = pc + dx, row = pr + dy;
        if (col < 1 || row < 1 || col >= MAP_WIDTH - 1 || row >= MAP_HEIGHT - 1) continue;
        const terrain = getTerrain(col, row);
        if (![TERRAIN.GRASS, TERRAIN.MEADOW, TERRAIN.FOREST].includes(terrain) || isInsideCampNoSpawn(col, row)) continue;
        const existing = worldObjectByTile.get(`${col},${row}`);
        if (existing && !harvestedObjects.has(existing.id)) continue;
        spot = { col, row, existing };
      }
    }
    if (!spot) { showToast("附近没有适合种树的空地。找一块草地或草甸，避开道路、石块和营地。 "); return; }
    let sapling = spot.existing;
    if (sapling) { sapling.type = "treeSapling"; sapling.stageAt = worldTimeMinutes; sapling.chopHits = 0; harvestedObjects.delete(sapling.id); harvestedAtMinutes.delete(sapling.id); noRespawnObjects.delete(sapling.id); }
    else { sapling = { id: worldObjectId(spot.col, spot.row), col: spot.col, row: spot.row, type: "treeSapling", stageAt: worldTimeMinutes }; worldObjects.push(sapling); worldObjectByTile.set(`${spot.col},${spot.row}`, sapling); }
    item.count -= 1; if (item.count <= 0) list[index] = null;
    renderInventory(); renderHotbar(); drawWorld(); saveGame(false);
    showToast("种下了树种。约 1 天后长成幼树，再经过约 2 天成长为成熟树。 "); playSoundEffect("pickup"); return;
  }
  if (item.id === "campKit") {
    if(buildCamp()){item.count-=1;if(item.count<=0)list[index]=null;renderInventory();renderHotbar();saveGame(false);} return;
  }
  if(itemCatalog[item.id]?.furniture){
    if(placeFurniture(item.id)){item.count-=1;if(item.count<=0)list[index]=null;renderInventory();renderHotbar();drawWorld();saveGame(false);} return;
  }
  if (item.id === "campfireKit") {
    if (gameState.location !== "world") { showToast("请回到野外再放置篝火。"); return; }
    if (placeCampfire()) {
      item.count -= 1; if (item.count <= 0) list[index] = null;
      renderInventory(); renderHotbar(); saveGame(false);
    }
    return;
  }
  if (!item.effect) { showToast(`${item.name}暂时不能直接使用。未知蘑菇需要先辨识或加工；工具会自动生效并消耗耐久。`); return; }
  const before = survivalState[item.effect];
  if (before >= 100 && !(item.effect === "hunger" && survivalState.health < 100)) { showToast(`${item.effect === "health" ? "生命" : item.effect === "hunger" ? "饱腹" : "水分"}值已满，不需要使用。`); return; }
  survivalState[item.effect] = Math.min(100, before + item.amount);
  // 所有可直接食用的食物都会少量恢复生命；特殊食谱可用 bonusHealth 覆盖默认值。
  if (item.effect === "hunger") survivalState.health = Math.min(100, survivalState.health + (Number(item.bonusHealth) || 3));
  else if (item.bonusHealth) survivalState.health = Math.min(100, survivalState.health + item.bonusHealth);
  if (item.bonusThirst) survivalState.thirst = Math.min(100, survivalState.thirst + item.bonusThirst);
  if (item.riskDamage) { survivalState.health = Math.max(0, survivalState.health - item.riskDamage); showToast("你饮用了未经处理的生水，虽然补充了水分，但出现了身体不适！"); }
  item.count -= 1;
  if (item.count <= 0) list[index] = null;
  renderHUD(); renderHotbar();
  if (!inventoryModal.classList.contains("hidden")) renderInventory();
  playSoundEffect("use");
  showToast(`${item.name}已使用，状态得到恢复。`);
  saveGame(false);
}
function useActiveItem() { useItemFromContainer("hotbar", inventoryState.activeHotbarIndex); }
function useInventoryItem(index) { useItemFromContainer("inventory", index); }

questLogButton?.addEventListener("click", openQuestLog);
questHudButton?.addEventListener("click", openQuestLog);
questCloseButton?.addEventListener("click", closeQuestLog);
questModal?.addEventListener("click", event => { if (event.target === questModal) closeQuestLog(); });
document.querySelector("#crafting-open-btn").addEventListener("click",()=>openCrafting("recipes"));
document.querySelector("#crafting-close-btn").addEventListener("click",closeCrafting);
craftTabButton.addEventListener("click",()=>setCraftTab("recipes"));
document.querySelector("#compendium-open-btn")?.addEventListener("click", () => openCompendium("items"));
document.querySelector("#compendium-close-btn")?.addEventListener("click", closeCompendium);
document.querySelector("#compendium-items-tab")?.addEventListener("click", () => setCompendiumTab("items"));
document.querySelector("#compendium-creatures-tab")?.addEventListener("click", () => setCompendiumTab("creatures"));
compendiumModal?.addEventListener("click", event => { if (event.target === compendiumModal) closeCompendium(); });
document.querySelector("#camp-upgrade-btn").addEventListener("click",upgradeCamp);
canvas.addEventListener("click", (event) => { if(gameState.location!=="camp"||!gameState.running)return; const rect=canvas.getBoundingClientRect(); const x=event.clientX-rect.left,y=event.clientY-rect.top; const orbX=canvas.width/2,orbY=54+(canvas.height-110)*.28; if(Math.hypot(x-orbX,y-orbY)<48) upgradeCamp(true); });
document.querySelector("#campfire-refuel-btn").addEventListener("click",refuelCampfire);
document.querySelector("#sleep-3h-btn")?.addEventListener("click", () => sleepForHours(3, false));
document.querySelector("#sleep-day-btn")?.addEventListener("click", () => sleepForHours(0, true));
document.querySelector("#sleep-close-btn")?.addEventListener("click", () => sleepModal?.classList.add("hidden"));
sleepModal?.addEventListener("click", event => { if (event.target === sleepModal) sleepModal.classList.add("hidden"); });
craftingModal.addEventListener("click",event=>{if(event.target===craftingModal)closeCrafting();});
document.querySelector("#minimap-open-btn").addEventListener("click", openExpandedMap);
document.querySelector("#inventory-open-btn").addEventListener("click", openInventory);
document.querySelector("#map-open-text-btn").addEventListener("click", openExpandedMap);
document.querySelector("#map-close-btn").addEventListener("click", closeExpandedMap);
mapMainTab?.addEventListener("click", () => setMapQuestMode("main"));
mapSideTab?.addEventListener("click", () => setMapQuestMode("side"));
document.querySelector("#inventory-close-btn").addEventListener("click", closeInventory);
document.querySelector("#inventory-done-btn").addEventListener("click", closeInventory);
document.querySelector("#inventory-drop-btn").addEventListener("click", dropSelectedInventoryItem);
[inventoryModal, mapModal].forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target !== modal) return;
    if (modal === inventoryModal) closeInventory();
    else closeExpandedMap();
  });
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (storyDialog && !storyDialog.classList.contains("hidden")) { closeStoryDialog(false); return; }
    if (gameState.running && gameState.location === "aircraft") { leaveAircraft(); return; }
    if (!inventoryModal.classList.contains("hidden")) closeInventory();
    if (!mapModal.classList.contains("hidden")) closeExpandedMap();
    if (!craftingModal.classList.contains("hidden")) closeCrafting();
    if (compendiumModal && !compendiumModal.classList.contains("hidden")) closeCompendium();
    if (questModal && !questModal.classList.contains("hidden")) closeQuestLog();
    if (saveSlotModal && !saveSlotModal.classList.contains("hidden")) saveSlotModal.classList.add("hidden");
    if (sleepModal && !sleepModal.classList.contains("hidden")) sleepModal.classList.add("hidden");
    return;
  }
  if ((saveSlotModal && !saveSlotModal.classList.contains("hidden")) || (sleepModal && !sleepModal.classList.contains("hidden"))) return;
  if (!gameState.running) return;
  if (storyDialog && !storyDialog.classList.contains("hidden")) { if (event.key === "Enter" || event.key === "e" || event.key === " " ) { event.preventDefault(); closeStoryDialog(true); } return; }
  const key = event.key.toLowerCase();
  if (gameState.location === "aircraft" && key === "q") { event.preventDefault(); leaveAircraft(); return; }
  if (!questModal.classList.contains("hidden") && key !== "j") return;
  if (key === "m") {
    event.preventDefault();
    if (mapModal.classList.contains("hidden")) openExpandedMap(); else closeExpandedMap();
    return;
  }
  if (key === "j") {
    event.preventDefault();
    if (questModal.classList.contains("hidden")) openQuestLog(); else closeQuestLog();
    return;
  }
  if (key === "b") {
    event.preventDefault();
    if (compendiumModal.classList.contains("hidden")) openCompendium("items"); else closeCompendium();
    return;
  }
  if (key === "c") {
    event.preventDefault();
    if (craftingModal.classList.contains("hidden")) openCrafting("recipes"); else closeCrafting();
    return;
  }
  if (key === "i") {
    event.preventDefault();
    if (inventoryModal.classList.contains("hidden")) openInventory();
    else closeInventory();
    return;
  }
  if (key === "e") {
    event.preventDefault();
    if (event.repeat) return;
    interactWithWorld();
    return;
  }
  if (key === "f") {
    event.preventDefault();
    if (getActiveWeapon()) attackWithMouseAim(); else useActiveItem();
    return;
  }
  if (key === "p") {
    event.preventDefault();
    gameState.keys.clear();
    openSaveSlotPicker("save");
    return;
  }
  if (/^[1-5]$/.test(key)) {
    inventoryState.activeHotbarIndex = Number(key) - 1;
    renderHotbar();
  }
});

// ================================
// 9. 玩家移动
// ================================
function handleKeyDown(event) {
  if (document.querySelector("#settings-screen").classList.contains("active")) return;
  const key = event.key.toLowerCase();
  if (
    ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]
      .includes(key)
  ) {
    event.preventDefault();
    gameState.keys.add(key);
  }
}
function handleKeyUp(event) {
  gameState.keys.delete(event.key.toLowerCase());
}
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", () => {
  gameState.keys.clear();
});
function isSolidTile(col, row) {
  if (col < 0 || row < 0 || col >= MAP_WIDTH || row >= MAP_HEIGHT) return true;
  // v40：飞机贴图有凹口和透明空白，不能再用整块矩形碰撞箱。
  // 只阻挡机身外沿的实心轮廓，机腹凹口与南侧入口保持可通行。
  const wreckSolid =
    (row === 48 && col >= 54 && col <= 58) ||
    (row === 49 && col >= 53 && col <= 59) ||
    (row === 50 && (col === 53 || col === 54 || col === 58 || col === 59)) ||
    (row === 51 && (col === 53 || col === 54 || col === 58 || col === 59));
  if (wreckSolid) return true;
  // 废弃木屋按墙体轮廓碰撞，南侧门洞保持开放。
  const cabinWall = (row===43 && col>=56 && col<=60) || (row===44 && (col===56||col===57||col===59||col===60)) || (row===45 && (col===56||col===57||col===59||col===60));
  if(cabinWall) return true;
  if (getTerrain(col, row) === TERRAIN.RIVER) return true;
  const obj = worldObjectByTile.get(`${col},${row}`);
  if (!obj || harvestedObjects.has(obj.id)) return false;
  return ["tree", "treeMedium", "treeSmall", "treeYoung", "treeStump", "fruitTree", "rock", "log", "driftwood"].includes(obj.type);
}
// 以玩家碰撞箱检查覆盖到的所有地块，不再只检测几个点，减少树角/石角卡脚。
function canOccupyPlayer(x, y) {
  const radius = Math.max(8, gameState.player.size * 0.48);
  const left = Math.floor((x - radius) / TILE_SIZE);
  const right = Math.floor((x + radius) / TILE_SIZE);
  const top = Math.floor((y - radius) / TILE_SIZE);
  const bottom = Math.floor((y + radius) / TILE_SIZE);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (!isSolidTile(col, row)) continue;
      const tileLeft = col * TILE_SIZE;
      const tileTop = row * TILE_SIZE;
      const closestX = Math.max(tileLeft, Math.min(x, tileLeft + TILE_SIZE));
      const closestY = Math.max(tileTop, Math.min(y, tileTop + TILE_SIZE));
      if (Math.hypot(x - closestX, y - closestY) < radius) return false;
    }
  }
  return true;
}
// 旧存档若恰好把角色保存在障碍物边缘，自动挪到最近的可行走地块。
function recoverPlayerPosition() {
  const player = gameState.player;
  if (canOccupyPlayer(player.x, player.y)) return;
  const baseCol = Math.floor(player.x / TILE_SIZE);
  const baseRow = Math.floor(player.y / TILE_SIZE);
  for (let radius = 1; radius <= 10; radius++) {
    for (let row = baseRow - radius; row <= baseRow + radius; row++) {
      for (let col = baseCol - radius; col <= baseCol + radius; col++) {
        if (Math.max(Math.abs(col - baseCol), Math.abs(row - baseRow)) !== radius) continue;
        const x = (col + 0.5) * TILE_SIZE;
        const y = (row + 0.5) * TILE_SIZE;
        if (canOccupyPlayer(x, y)) {
          player.x = x;
          player.y = y;
          showToast("已自动调整角色位置，避免卡在障碍物中。");
          return;
        }
      }
    }
  }
  player.x = 50.5 * TILE_SIZE;
  player.y = 50.5 * TILE_SIZE;
}

function canOccupyAircraft(x, y) {
  const w=canvas.width,h=canvas.height,r=10,upper=gameState.aircraftFloor==="upper";
  const left=w*.12,top=h*.12,width=w*.76,height=h*.75;
  const blocks=[];
  // 机身左右金属舱壁，入口/破损处留出通道。
  blocks.push([left+7,top+12,9,height-24],[left+width-16,top+12,9,height-24]);
  if(!upper){
    // 与绘制函数完全一致的四列座椅；中央过道和左右侧过道保持可通行。
    for(let row=0;row<4;row++)for(const sx of [.235,.292,.651,.708])blocks.push([w*sx,h*(.245+row*.112),w*.043,h*.070]);
    // 货舱箱体与隔板，仅封闭实体部分，不封死通道。
    for(let i=0;i<4;i++){const bx=w*(.20+i*.105),by=h*(.72+(i%2)*.035);blocks.push([bx,by,w*.075,h*.05]);}
    blocks.push([w*.57,h*.53,w*.15,h*.055]);
  }else{
    // 驾驶舱仪表台、控制台与断裂翼梁。
    blocks.push([w*.36,h*.19,w*.28,h*.13],[w*.30,h*.38,w*.40,h*.14],[w*.17,h*.57,w*.26,h*.11]);
  }
  // 碰撞边界使用圆形角色半径扩展矩形，允许贴边走动。
  for(const [bx,by,bw,bh] of blocks){
    const cx=Math.max(bx,Math.min(x,bx+bw)),cy=Math.max(by,Math.min(y,by+bh));
    if(Math.hypot(x-cx,y-cy)<r) return false;
  }
  return x>=left+18+r && x<=left+width-18-r && y>=top+18+r && y<=top+height-18-r;
}

function updatePlayer(deltaTime) {
  const player = gameState.player;
  const keys = gameState.keys;
  let dx = 0, dy = 0;
  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;
  if (dx && dy) { const length = Math.hypot(dx, dy); dx /= length; dy /= length; }
  player.moving = Boolean(dx || dy);
  if (!dx && !dy) { stepSoundElapsed = 0; return; }
  if (Math.abs(dx) > Math.abs(dy)) player.facing = dx < 0 ? "left" : "right";
  else player.facing = dy < 0 ? "up" : "down";
  player.walkTime += deltaTime * 10;
  stepSoundElapsed += deltaTime;
  if (stepSoundElapsed >= 0.38) { playSoundEffect("step"); stepSoundElapsed = 0; }
  if (gameState.location === "camp") {
    const step = player.speed * deltaTime;
    const nx=Math.max(42,Math.min(canvas.width-42,player.x+dx*step));
    const ny=Math.max(78,Math.min(canvas.height-44,player.y+dy*step));
    const camp=selectedCamp();
    const blocked=(x,y)=>Boolean(camp?.furniture?.some(f=>Math.abs(x-f.x)<30&&Math.abs(y-f.y)<27));
    if(!blocked(nx,player.y))player.x=nx;
    if(!blocked(player.x,ny))player.y=ny;
    return;
  }
  if (gameState.location === "cabin") {
    const step=player.speed*deltaTime, margin=38;
    const nx=Math.max(margin,Math.min(canvas.width-margin,player.x+dx*step));
    const ny=Math.max(82,Math.min(canvas.height-48,player.y+dy*step));
    const blocked=(x,y)=> (Math.abs(x-canvas.width*.34)<44&&Math.abs(y-canvas.height*.39)<38) || (Math.abs(x-canvas.width*.68)<48&&Math.abs(y-canvas.height*.50)<42) || (Math.abs(x-canvas.width*.18)<34&&Math.abs(y-canvas.height*.68)<32);
    if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny;return;
  }
  if (gameState.location === "aircraft") {
    const step = player.speed * deltaTime, margin = 36;
    const nx = Math.max(margin, Math.min(canvas.width - margin, player.x + dx * step));
    const ny = Math.max(82, Math.min(canvas.height - 54, player.y + dy * step));
    // 分轴碰撞：椅子、驾驶台、货箱、断裂金属梁和舱壁均为实体，不能穿模。
    if (canOccupyAircraft(nx, player.y)) player.x = nx;
    if (canOccupyAircraft(player.x, ny)) player.y = ny;
    return;
  }
  if (gameState.location === "region") {
    const l = getRegionMapLayout(), step = player.speed * deltaTime, r = 12;
    player.x = Math.max(l.x + r, Math.min(l.x + l.width - r, player.x + dx * step));
    player.y = Math.max(l.y + r, Math.min(l.y + l.height - r, player.y + dy * step));
    return;
  }
  recoverPlayerPosition();
  const stepX = dx * player.speed * deltaTime;
  const stepY = dy * player.speed * deltaTime;
  const radius = Math.max(8, player.size * 0.48);
  // X/Y 分轴检测，碰撞后允许沿障碍边缘滑动。
  const nextX = Math.max(radius, Math.min(MAP_WIDTH * TILE_SIZE - radius, player.x + stepX));
  if (canOccupyPlayer(nextX, player.y)) player.x = nextX;
  const nextY = Math.max(radius, Math.min(MAP_HEIGHT * TILE_SIZE - radius, player.y + stepY));
  if (canOccupyPlayer(player.x, nextY)) player.y = nextY;
  revealAroundPlayer();
}
// ================================
// 9.5 敌人与鼠标瞄准战斗
// ================================
const ENEMY_TYPES = {
  wolf: { name: "灰狼", hp: 48, speed: 64, damage: 8, radius: 17, aggression: 1.0, drops: ["rawMeat", "hide", "bone"] },
  boar: { name: "野猪", hp: 78, speed: 48, damage: 13, radius: 20, aggression: .82, drops: ["rawMeat", "bone"] },
  fox: { name: "赤狐", hp: 30, speed: 78, damage: 5, radius: 13, aggression: .46, drops: ["rawMeat", "hide"] },
  bear: { name: "棕熊", hp: 145, speed: 39, damage: 19, radius: 25, aggression: .7, drops: ["rawMeat", "hide", "bone"] },
  wildDog: { name: "野犬", hp: 39, speed: 70, damage: 7, radius: 15, aggression: .92, drops: ["rawMeat", "hide"] },
  nestBoss: { name: "污染巢穴首领", hp: 680, speed: 43, damage: 22, radius: 32, aggression: 1.25, drops: ["rawMeat", "hide", "bone"] }
};
function isNightTime() { const h = ((Math.floor(worldTimeMinutes) % 1440) + 1440) % 1440 / 60; return h >= 19 || h < 5; }
function enemyTypesForCurrentArea() {
  if (gameState.location === "region" && gameState.regionId === "riverValley") return ["wolf", "boar", "fox", "bear", "wildDog"];
  if (gameState.location === "region" && gameState.regionId === "ridgeHighlands") return ["wolf", "fox", "bear", "wildDog"];
  return ["wolf", "boar", "fox", "wildDog", "bear"];
}
// 怪物难度由全局生存天数统一计算；白天/夜晚只影响刷新节奏和物种倾向。
// v41：难度按生存阶段增长，而不是每天升一阶。阶段 10 约在第 41 天到达。
function getEnemyDifficultyStage() {
  const day = Math.max(1, Math.floor(Math.max(0, worldTimeMinutes) / 1440) + 1);
  if (day <= 3) return 0;
  if (day <= 6) return 1;
  if (day <= 9) return 2;
  if (day <= 13) return 3;
  if (day <= 17) return 4;
  if (day <= 21) return 5;
  if (day <= 25) return 6;
  if (day <= 30) return 7;
  if (day <= 35) return 8;
  if (day <= 40) return 9;
  return 10;
}
function getEnemyDifficultyMultiplier(stage = getEnemyDifficultyStage()) {
  return Math.pow(1.085, Math.min(10, Math.max(0, stage)));
}
function applyEnemyDifficulty(enemy) {
  const cfg = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.wolf;
  const stage = getEnemyDifficultyStage();
  const multiplier = getEnemyDifficultyMultiplier(stage);
  const oldMax = Number(enemy.maxHp) || cfg.hp;
  const hpRatio = Number.isFinite(enemy.hp) ? Math.max(0, Math.min(1, enemy.hp / oldMax)) : 1;
  enemy.maxHp = Math.round(cfg.hp * multiplier);
  enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
  enemy.speed = cfg.speed * (1 + Math.min(10, stage) * 0.017);
  enemy.damage = Math.round(cfg.damage * multiplier);
  enemy.radius = cfg.radius;
  enemy.difficultyStage = stage;
  return enemy;
}
function makeEnemy(type, x, y) {
  const cfg = ENEMY_TYPES[type] || ENEMY_TYPES.wolf;
  return applyEnemyDifficulty({ id: `enemy-${Date.now()}-${Math.floor(Math.random()*999999)}`, type, location: gameState.location, regionId: gameState.regionId, x, y, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed, damage: cfg.damage, radius: cfg.radius, attackElapsed: Math.random() * .7, hitFlash: 0, alive: true, facing: "down", walkTime: Math.random() * 6, chargeTime: 0 });
}
function getRandomEnemySpawnPoint(minDistance = 280, maxDistance = 560) {
  const layout = gameState.location === "region" ? getRegionMapLayout() : null;
  for (let attempt = 0; attempt < 48; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    let x = gameState.player.x + Math.cos(angle) * distance;
    let y = gameState.player.y + Math.sin(angle) * distance;
    if (layout) {
      x = Math.max(layout.x + layout.tile * 1.5, Math.min(layout.x + layout.width - layout.tile * 1.5, x));
      y = Math.max(layout.y + layout.tile * 1.5, Math.min(layout.y + layout.height - layout.tile * 1.5, y));
      if (Math.hypot(x - gameState.player.x, y - gameState.player.y) < 110) continue;
      return { x, y };
    }
    x = Math.max(TILE_SIZE * 2, Math.min(MAP_WIDTH * TILE_SIZE - TILE_SIZE * 2, x));
    y = Math.max(TILE_SIZE * 2, Math.min(MAP_HEIGHT * TILE_SIZE - TILE_SIZE * 2, y));
    if (Math.hypot(x - gameState.player.x, y - gameState.player.y) < 180) continue;
    if (!canOccupyPlayer(x, y)) continue;
    // 不在飞机机身及入口附近刷新，避免怪物/玩家被碰撞轮廓夹住。
    const col = Math.floor(x / TILE_SIZE), row = Math.floor(y / TILE_SIZE);
    if (col >= 52 && col <= 60 && row >= 47 && row <= 56) continue;
    return { x, y };
  }
  // 极端地形下兜底到玩家附近一个可走位置，不固定使用同一角度。
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = Math.max(TILE_SIZE * 2, Math.min(MAP_WIDTH * TILE_SIZE - TILE_SIZE * 2, gameState.player.x + (Math.random() - .5) * 700));
    const y = Math.max(TILE_SIZE * 2, Math.min(MAP_HEIGHT * TILE_SIZE - TILE_SIZE * 2, gameState.player.y + (Math.random() - .5) * 700));
    if (canOccupyPlayer(x, y) && Math.hypot(x - gameState.player.x, y - gameState.player.y) > 130) return { x, y };
  }
  return { x: gameState.player.x + 220, y: gameState.player.y + 180 };
}
function spawnInitialEnemies() {
  enemies = enemies.filter(e => !(e.location === gameState.location && (gameState.location !== "region" || e.regionId === gameState.regionId)));
  const survivalDay = Math.max(1, Math.floor(Math.max(0, worldTimeMinutes) / 1440) + 1);
  // 第一天是安全日：不生成随机野怪，给玩家收集资源、建营地的缓冲期。
  if (survivalDay <= 1) { enemySpawnElapsed = 0; return; }
  const types = enemyTypesForCurrentArea();
  const count = isNightTime() ? 6 : 4;
  for (let i = 0; i < count; i++) {
    const point = getRandomEnemySpawnPoint(260, 560);
    const type = types[Math.floor(Math.random() * types.length)];
    enemies.push(makeEnemy(type, point.x, point.y));
  }
}
function getMouseWorldPoint() {
  if (gameState.location === "world") return { x: mouseAim.x + (cameraState.x || 0), y: mouseAim.y + (cameraState.y || 0) };
  return { x: mouseAim.x, y: mouseAim.y };
}
function getHeldItem() {
  const item = inventoryState.hotbar[inventoryState.activeHotbarIndex];
  if (!item) return null;
  // 快捷栏当前选中的装备始终显示在手上；消耗品/材料不强行当成武器挥舞。
  const heldIds = ["bow","crossbow","spear","sword","stoneShard","axe","ironAxe","copperAxe","silverAxe","goldAxe","pickaxe","ironPickaxe","copperPickaxe","silverPickaxe","goldPickaxe","torch","fishingRod"];
  return heldIds.includes(item.id) ? item : null;
}
function getActiveWeapon() {
  const item = getHeldItem();
  if (!item) return null;
  if (["bow", "crossbow", "spear", "sword", "axe", "ironAxe", "copperAxe", "silverAxe", "goldAxe", "stoneShard"].includes(item.id)) return item;
  return null;
}
function attackWithMouseAim() {
  if (!gameState.running) return;
  const weapon = getActiveWeapon();
  if (!weapon) { useActiveItem(); return; }
  if (attackCooldown > 0) return;
  const list = inventoryState.hotbar;
  const index = inventoryState.activeHotbarIndex;
  const item = list[index];
  const origin = { x: gameState.player.x, y: gameState.player.y };
  const target = getMouseWorldPoint();
  let dx = target.x - origin.x, dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  dx /= length; dy /= length;
  gameState.player.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
  gameState.player.actionType = "attack"; gameState.player.actionStartedAt = performance.now(); gameState.player.actionUntil = performance.now() + 470; gameState.player.attackAnimProgress = 0;
  if (weapon.id === "bow" || weapon.id === "crossbow") {
    const arrowIndex = inventoryState.hotbar.findIndex(i => i?.id === "arrow" && i.count > 0);
    const backpackArrowIndex = inventoryState.slots.findIndex(i => i?.id === "arrow" && i.count > 0);
    const arrow = arrowIndex >= 0 ? inventoryState.hotbar[arrowIndex] : backpackArrowIndex >= 0 ? inventoryState.slots[backpackArrowIndex] : null;
    if (!arrow) { showToast("没有箭矢了。先制作箭矢并放入背包或快捷栏。"); return; }
    arrow.count -= 1;
    if (arrow.count <= 0) { if (arrowIndex >= 0) inventoryState.hotbar[arrowIndex] = null; else inventoryState.slots[backpackArrowIndex] = null; }
    projectiles.push({ x: origin.x, y: origin.y, vx: dx * (weapon.id === "crossbow" ? 650 : 520), vy: dy * (weapon.id === "crossbow" ? 650 : 520), damage: weapon.id === "crossbow" ? 38 : 25, life: 1.6, location: gameState.location, regionId: gameState.regionId, color: weapon.id === "crossbow" ? "#e7d8a4" : "#f5e5b1", trail: [] });
    meleeEffects.push({ x: origin.x, y: origin.y, angle: Math.atan2(dy, dx), until: performance.now() + 230, kind: "ranged" });
    attackCooldown = weapon.id === "crossbow" ? 0.62 : 0.48;
    renderInventory(); renderHotbar(); playSoundEffect("bow");
  } else {
    // 近战攻击改为时间轴驱动：点击时只进入蓄力，挥砍有效帧才检测伤害。
    if (meleeAttackState) return;
    const isAxe = /Axe$|^axe$/.test(weapon.id);
    const isSpear = weapon.id === "spear";
    const config = {
      windup: isAxe ? 0.20 : isSpear ? 0.14 : 0.105,
      active: isAxe ? 0.18 : isSpear ? 0.12 : 0.145,
      recovery: isAxe ? 0.34 : isSpear ? 0.25 : 0.22,
      damage: isAxe ? 25 : isSpear ? 34 : weapon.id === "sword" ? 32 : 22,
      reach: isSpear ? 100 : weapon.id === "sword" ? 82 : 76,
      halfAngle: isSpear ? 0.24 : isAxe ? 0.78 : 0.92,
      hitstop: isAxe ? 0.095 : 0.065
    };
    const total = config.windup + config.active + config.recovery;
    meleeAttackState = {
      weaponId: weapon.id, state: "windup", elapsed: 0, config,
      originX: origin.x, originY: origin.y, dx, dy,
      angle: Math.atan2(dy, dx), hitTargets: new Set(), hitResolved: false,
      total, hitstop: config.hitstop
    };
    gameState.player.actionType = "attack";
    gameState.player.actionStartedAt = performance.now();
    gameState.player.actionUntil = performance.now() + total * 1000;
    gameState.player.attackAnimProgress = 0;
    attackCooldown = total + 0.06;
  }
  saveGame(false);
}
function updateMeleeAttack(deltaTime) {
  const attack = meleeAttackState;
  if (!attack) return;
  const player = gameState.player;
  const cfg = attack.config;
  attack.elapsed += deltaTime;
  const totalElapsed = attack.state === "windup" ? attack.elapsed : attack.state === "active" ? cfg.windup + attack.elapsed : cfg.windup + cfg.active + attack.elapsed;
  player.attackAnimProgress = Math.min(1, totalElapsed / attack.total);

  if (attack.state === "windup" && attack.elapsed >= cfg.windup) {
    attack.state = "active";
    attack.elapsed = 0;
    const kind = attack.weaponId === "spear" ? "thrust" : "slash";
    meleeEffects.push({ x: player.x, y: player.y - 22, angle: attack.angle, startedAt: performance.now(), duration: cfg.active * 1000 + 100, until: performance.now() + cfg.active * 1000 + 100, kind });
  }
  if (attack.state === "active") {
    // 命中点位于有效挥砍中段，伤害与刀光时间轴同步；同一目标每刀只受伤一次。
    if (!attack.hitResolved && attack.elapsed >= cfg.active * 0.42) {
      attack.hitResolved = true;
      let hitAny = false;
      for (const enemy of enemies) {
        if (!enemy.alive || enemy.location !== gameState.location || (enemy.location === "region" && enemy.regionId !== gameState.regionId)) continue;
        if (attack.hitTargets.has(enemy.id)) continue;
        const ex = enemy.x - player.x, ey = enemy.y - player.y;
        const distance = Math.hypot(ex, ey);
        const radius = ENEMY_TYPES[enemy.type]?.radius || 16;
        if (distance > cfg.reach + radius || distance < 4) continue;
        const dot = (ex / distance) * attack.dx + (ey / distance) * attack.dy;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle > cfg.halfAngle) continue;
        attack.hitTargets.add(enemy.id);
        damageEnemy(enemy, cfg.damage);
        hitAny = true;
      }
      if (hitAny) {
        hitstopRemaining = Math.max(hitstopRemaining, cfg.hitstop);
      } else {
        // 只有确认没有命中目标才播放空挥声；命中音效与空挥音效不会混在一起。
        playSoundEffect("swing");
      }
    }
    if (attack.elapsed >= cfg.active) {
      attack.state = "recovery";
      attack.elapsed = 0;
    }
  } else if (attack.state === "recovery" && attack.elapsed >= cfg.recovery) {
    meleeAttackState = null;
    player.attackAnimProgress = 1;
    player.actionType = "";
    player.actionUntil = 0;
  }
}
function damageEnemy(enemy, damage) {
  if (!enemy.alive) return;
  enemy.hp -= damage; enemy.hitFlash = .18;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    if (enemy.type === "nestBoss") { mainQuestState.flags.nestBossDefeated = true; showToast("污染巢穴首领倒下了！森林中的异变脉动正在消退。回营地与伙伴汇合。"); checkMainQuestProgress(); saveGame(false); }
    enemy.corpseExpiresAt = worldTimeMinutes + 60;
    enemy.looted = false;
    const cfg = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.wolf;
    const loot = [];
    loot.push({ id: "rawMeat", count: 1 + (enemy.type === "bear" ? 1 : 0) });
    if (cfg.drops.includes("hide") && Math.random() < (enemy.type === "bear" ? .9 : .55)) loot.push({ id: "hide", count: 1 });
    if (cfg.drops.includes("bone") && Math.random() < .38) loot.push({ id: "bone", count: 1 });
    enemy.loot = loot;
    showToast(`${cfg.name}被击倒了。尸体会保留 1 个游戏小时，走近后按 E 搜索战利品。`);
    playSoundEffect("beastDeath");
  } else {
    playSoundEffect("hit");
  }
}
function getNearbyLightRepulsion(enemy) {
  // 返回驱赶方向与强度。篝火范围更大且不会像火把一样被怪物逐渐适应。
  let best = null;
  for (const fire of gameState.placedCampfires || []) {
    if (!(fire.fuel > 0) || gameState.location !== "world") continue;
    const dx = enemy.x - fire.x, dy = enemy.y - fire.y, distance = Math.hypot(dx, dy) || 1;
    const radius = 270;
    if (distance < radius && (!best || distance / radius < best.ratio)) best = { dx: dx / distance, dy: dy / distance, ratio: distance / radius, strength: 1.8 };
  }
  const held = getHeldItem();
  if (held?.id === "torch") {
    const dx = enemy.x - gameState.player.x, dy = enemy.y - gameState.player.y, distance = Math.hypot(dx, dy) || 1;
    const day = Math.max(1, Math.floor(Math.max(0, worldTimeMinutes) / 1440) + 1);
    // 适应随生存天数缓慢发生：第 2 天起逐渐适应，约第 15 天接近适应完成。
    const adaptation = Math.max(0, Math.min(0.82, (day - 1) * 0.06 + Math.max(0, (worldTimeMinutes % 1440) / 1440) * 0.04));
    const radius = 205 * (1 - adaptation * 0.72);
    if (distance < radius) {
      const torchLight = { dx: dx / distance, dy: dy / distance, ratio: distance / radius, strength: 1.15 * (1 - adaptation * 0.68) };
      if (!best || torchLight.ratio < best.ratio) best = torchLight;
    }
  }
  return best;
}
function updateCombat(deltaTime) {
  enemies = enemies.filter(e => e.alive || (Number.isFinite(e.corpseExpiresAt) && worldTimeMinutes < e.corpseExpiresAt));
  meleeEffects = meleeEffects.filter(effect => effect.until > performance.now());
  attackCooldown = Math.max(0, attackCooldown - deltaTime);
  updateMeleeAttack(deltaTime);
  // 飞机内部是独立场景：外部野兽不能追踪、攻击或在机舱内生成。
  if (gameState.location === "aircraft") {
    projectiles = projectiles.filter(p => p.location === "aircraft");
    return;
  }
  const canSpawnEnemies = gameState.location !== "camp";
  const survivalDay = Math.max(1, Math.floor(Math.max(0, worldTimeMinutes) / 1440) + 1);
  enemySpawnElapsed += deltaTime;
  const night = isNightTime();
  const livingHere = enemies.filter(e => e.alive && e.location === gameState.location && (e.location !== "region" || e.regionId === gameState.regionId)).length;
  // 白天/夜晚各自使用刷新间隔与上限；怪物属性不分昼夜，统一随生存天数递增。
  const cap = night ? 10 : 6;
  const spawnInterval = night ? 18 : 30;
  if (canSpawnEnemies && survivalDay > 1 && enemySpawnElapsed > spawnInterval && livingHere < cap) {
    const types = enemyTypesForCurrentArea();
    let type = types[Math.floor(Math.random() * types.length)];
    if (night && Math.random() < .62) type = ["wolf", "boar", "bear", "wildDog"][Math.floor(Math.random() * 4)];
    if (!night && Math.random() < .48) type = ["fox", "wildDog", "wolf"][Math.floor(Math.random() * 3)];
    const point = getRandomEnemySpawnPoint(320, 620);
    enemies.push(makeEnemy(type, point.x, point.y));
    enemySpawnElapsed = 0;
  }
  // 已经存在的怪物也会随着阶段升级，不会只有新刷出的怪物变强。
  const stage = getEnemyDifficultyStage();
  for (const enemy of enemies) {
    if (enemy.alive && enemy.difficultyStage !== stage) applyEnemyDifficulty(enemy);
  }
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.location !== gameState.location || (enemy.location === "region" && enemy.regionId !== gameState.regionId)) continue;
    enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - deltaTime);
    enemy.walkTime = (enemy.walkTime || 0) + deltaTime * 7;
    const dx = gameState.player.x - enemy.x, dy = gameState.player.y - enemy.y, distance = Math.hypot(dx, dy) || 1;
    const cfg = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.wolf;
    if (Math.abs(dx) > Math.abs(dy)) enemy.facing = dx < 0 ? "left" : "right"; else enemy.facing = dy < 0 ? "up" : "down";
    const lightRepulsion = getNearbyLightRepulsion(enemy);
    if (lightRepulsion && distance > cfg.radius + 11) {
      // 怪物优先远离光源；篝火的强度高于火把。适应火把后，驱赶范围与力度逐步下降。
      const fleeStep = cfg.speed * lightRepulsion.strength * deltaTime;
      const fx = enemy.x + lightRepulsion.dx * fleeStep;
      const fy = enemy.y + lightRepulsion.dy * fleeStep;
      if (gameState.location === "world" ? canOccupyPlayer(fx, fy) : gameState.location !== "region") { enemy.x = fx; enemy.y = fy; }
      enemy.attackElapsed = Math.min(enemy.attackElapsed || 0, 0.25);
      continue;
    }
    const detection = night ? 560 : 390;
    if (distance < detection && distance > cfg.radius + 11) {
      let speed = cfg.speed * (enemy.type === "fox" && distance < 100 ? .75 : 1);
      if (enemy.type === "boar" && distance < 210) { enemy.chargeTime = (enemy.chargeTime || 0) + deltaTime; speed *= 1.45; }
      const step = speed * deltaTime;
      const nx = enemy.x + dx / distance * step, ny = enemy.y + dy / distance * step;
      if (gameState.location === "region") {
        const l = getRegionMapLayout();
        if (nx > l.x + 12 && nx < l.x + l.width - 12 && ny > l.y + 12 && ny < l.y + l.height - 12) { enemy.x = nx; enemy.y = ny; }
      } else if (gameState.location !== "world" || canOccupyPlayer(nx, ny)) { enemy.x = nx; enemy.y = ny; }
    }
    enemy.attackElapsed = (enemy.attackElapsed || 0) + deltaTime;
    if (distance < cfg.radius + 13 && enemy.attackElapsed >= (enemy.type === "fox" ? 1.45 : enemy.type === "bear" ? 1.55 : 1.2)) {
      survivalState.health = Math.max(0, survivalState.health - cfg.damage);
      enemy.attackElapsed = 0; renderHUD();
      showToast(`${cfg.name}${enemy.type === "boar" ? "冲撞" : enemy.type === "bear" ? "挥爪" : "扑击"}了你！按住移动键拉开距离。`);
      if (survivalState.health <= 0) triggerPlayerDeath();
    }
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.location !== gameState.location || (p.location === "region" && p.regionId !== gameState.regionId)) { projectiles.splice(i, 1); continue; }
    p.x += p.vx * deltaTime; p.y += p.vy * deltaTime; p.life -= deltaTime;
    let hit = false;
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.location !== p.location || (enemy.location === "region" && enemy.regionId !== p.regionId)) continue;
      if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < (ENEMY_TYPES[enemy.type]?.radius || 16)) { damageEnemy(enemy, p.damage); hit = true; break; }
    }
    if (hit || p.life <= 0) projectiles.splice(i, 1);
  }
}
function drawPixelAnimal(targetCtx, enemy, x, y) {
  const type = enemy.type, cfg = ENEMY_TYPES[type] || ENEMY_TYPES.wolf;
  const flash = enemy.hitFlash > 0, walk = Math.sin(enemy.walkTime || 0) * 2;
  targetCtx.save(); targetCtx.translate(Math.round(x), Math.round(y));
  const angle = enemy.facing === "left" ? Math.PI : enemy.facing === "up" ? -Math.PI/2 : enemy.facing === "down" ? Math.PI/2 : 0;
  // 统一朝向变换后，五种动物拥有不同体型、头部比例和轮廓，不再是换色方块。
  targetCtx.rotate(angle);
  targetCtx.fillStyle = "rgba(0,0,0,.32)"; targetCtx.beginPath(); targetCtx.ellipse(0, 5, type === "bear" ? 20 : type === "boar" ? 17 : 14, 7, 0, 0, Math.PI*2); targetCtx.fill();
  const fur = flash ? "#fff1c7" : ({wolf:"#77766b",boar:"#76513b",fox:"#c56f3e",bear:"#5d4737",wildDog:"#9a8667"})[type];
  const dark = ({wolf:"#464b46",boar:"#4d3025",fox:"#8d452d",bear:"#342c27",wildDog:"#5a4b3c"})[type];
  const light = ({wolf:"#b4b0a0",boar:"#b18a69",fox:"#e7b77d",bear:"#98785a",wildDog:"#c4b091"})[type];
  // hindquarters / body
  targetCtx.fillStyle = dark; targetCtx.fillRect(-13, -7 + walk, 7, 9); targetCtx.fillRect(6, -7 - walk, 7, 9);
  targetCtx.fillStyle = fur;
  if (type === "bear") { targetCtx.beginPath(); targetCtx.ellipse(-1, -1, 18, 12, 0, 0, Math.PI*2); targetCtx.fill(); targetCtx.beginPath(); targetCtx.arc(14,-4,9,0,Math.PI*2); targetCtx.fill(); }
  else if (type === "boar") { targetCtx.beginPath(); targetCtx.ellipse(0, -1, 18, 10, 0, 0, Math.PI*2); targetCtx.fill(); targetCtx.beginPath(); targetCtx.ellipse(15,-2,10,7,0,0,Math.PI*2); targetCtx.fill(); }
  else if (type === "fox") { targetCtx.beginPath(); targetCtx.ellipse(-1, -1, 14, 7, 0, 0, Math.PI*2); targetCtx.fill(); targetCtx.fillStyle=light; targetCtx.beginPath(); targetCtx.moveTo(-12,-2);targetCtx.lineTo(-25,-7);targetCtx.lineTo(-18,2);targetCtx.lineTo(-10,4);targetCtx.closePath();targetCtx.fill(); }
  else if (type === "wildDog") { targetCtx.beginPath(); targetCtx.ellipse(-1, -1, 15, 8, 0, 0, Math.PI*2); targetCtx.fill(); }
  else { targetCtx.beginPath(); targetCtx.ellipse(-1, -1, 15, 8, 0, 0, Math.PI*2); targetCtx.fill(); }
  // legs are visible below body; alternating stride gives life even at idle
  targetCtx.fillStyle = dark;
  targetCtx.fillRect(-10, 2 + walk, 4, 7); targetCtx.fillRect(-2, 2 - walk, 4, 7); targetCtx.fillRect(7, 2 + walk, 4, 7);
  // species-specific head and silhouette
  if (type === "wolf" || type === "wildDog") {
    targetCtx.fillStyle = fur; targetCtx.beginPath(); targetCtx.moveTo(7,-8);targetCtx.lineTo(17,-9);targetCtx.lineTo(24,-4);targetCtx.lineTo(18,2);targetCtx.lineTo(8,2);targetCtx.closePath();targetCtx.fill();
    targetCtx.fillStyle = dark; targetCtx.beginPath();targetCtx.moveTo(10,-8);targetCtx.lineTo(9,-15);targetCtx.lineTo(15,-10);targetCtx.closePath();targetCtx.fill();targetCtx.beginPath();targetCtx.moveTo(16,-8);targetCtx.lineTo(20,-13);targetCtx.lineTo(21,-6);targetCtx.closePath();targetCtx.fill();
    targetCtx.fillStyle = light; targetCtx.fillRect(19,-3,6,3); targetCtx.fillStyle="#f3c95f";targetCtx.fillRect(15,-6,2,2);
    if (type === "wolf") { targetCtx.fillStyle="#d2cdb9";targetCtx.fillRect(-16,-5,4,3);targetCtx.fillRect(-13,-8,4,3); }
  } else if (type === "fox") {
    targetCtx.fillStyle = fur; targetCtx.beginPath();targetCtx.moveTo(8,-7);targetCtx.lineTo(20,-7);targetCtx.lineTo(26,-2);targetCtx.lineTo(18,3);targetCtx.lineTo(7,1);targetCtx.closePath();targetCtx.fill();
    targetCtx.fillStyle="#6e3827";targetCtx.beginPath();targetCtx.moveTo(11,-7);targetCtx.lineTo(10,-14);targetCtx.lineTo(16,-9);targetCtx.closePath();targetCtx.fill();targetCtx.beginPath();targetCtx.moveTo(17,-7);targetCtx.lineTo(22,-13);targetCtx.lineTo(22,-5);targetCtx.closePath();targetCtx.fill();
    targetCtx.fillStyle="#f4e2c3";targetCtx.fillRect(20,-1,6,3);targetCtx.fillStyle="#241d18";targetCtx.fillRect(23,-3,2,2);
  } else if (type === "boar") {
    targetCtx.fillStyle = dark; targetCtx.beginPath();targetCtx.moveTo(13,-7);targetCtx.lineTo(17,-12);targetCtx.lineTo(21,-7);targetCtx.closePath();targetCtx.fill();
    targetCtx.fillStyle = light; targetCtx.beginPath();targetCtx.moveTo(19,-1);targetCtx.lineTo(23,-4);targetCtx.lineTo(24,1);targetCtx.closePath();targetCtx.fill();targetCtx.beginPath();targetCtx.moveTo(16,1);targetCtx.lineTo(19,4);targetCtx.lineTo(21,0);targetCtx.closePath();targetCtx.fill();
    targetCtx.fillStyle="#39251d";targetCtx.fillRect(20,-4,2,2);targetCtx.fillStyle="#bd8a68";targetCtx.fillRect(23,-1,3,3);
  } else if (type === "bear") {
    targetCtx.fillStyle = dark; targetCtx.beginPath();targetCtx.arc(16,-8,5,0,Math.PI*2);targetCtx.fill();targetCtx.beginPath();targetCtx.arc(23,-5,4,0,Math.PI*2);targetCtx.fill();
    targetCtx.fillStyle=light;targetCtx.beginPath();targetCtx.ellipse(21,-1,6,4,0,0,Math.PI*2);targetCtx.fill();targetCtx.fillStyle="#1d1916";targetCtx.fillRect(24,-3,3,3);targetCtx.fillStyle="#d6bd87";targetCtx.fillRect(12,-7,2,2);
  }
  // small species markings: wolf saddle, fox white tail tip, bear shoulder hump, boar bristles
  if (type === "wolf") { targetCtx.fillStyle="#a7a18d";targetCtx.fillRect(-5,-7,7,3); }
  if (type === "fox") { targetCtx.fillStyle="#f1e6ce";targetCtx.fillRect(-23,-7,4,3); }
  if (type === "bear") { targetCtx.fillStyle="#7a5b42";targetCtx.fillRect(-5,-11,9,4); }
  if (type === "boar") { targetCtx.fillStyle="#4c3428";for(let i=0;i<5;i++)targetCtx.fillRect(-4+i*3,-11-(i%2)*2,2,3); }
  targetCtx.restore();
}
function drawCombatEntities(cameraX = 0, cameraY = 0) {
  const toScreen = (x,y) => ({x:x-cameraX,y:y-cameraY});
  for (const enemy of enemies) {
    if (enemy.location !== gameState.location || (enemy.location === "region" && enemy.regionId !== gameState.regionId)) continue;
    const pos = toScreen(enemy.x, enemy.y);
    if (pos.x < -70 || pos.y < -70 || pos.x > canvas.width + 70 || pos.y > canvas.height + 70) continue;
    if (!enemy.alive) {
      if (!activeCorpseMatchesLocation(enemy)) continue;
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(-0.18);
      ctx.globalAlpha = 0.88; ctx.fillStyle = "#2b2520"; ctx.beginPath(); ctx.ellipse(0, 2, (enemy.type === "bear" || enemy.type === "nestBoss") ? 30 : 18, (enemy.type === "bear" || enemy.type === "nestBoss") ? 15 : 8, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = ({wolf:"#77766b",boar:"#76513b",fox:"#c56f3e",bear:"#5d4737",wildDog:"#9a8667"})[enemy.type] || "#77766b";
      ctx.beginPath(); ctx.ellipse(-1, -2, enemy.type === "nestBoss" ? 26 : enemy.type === "bear" ? 19 : enemy.type === "boar" ? 17 : 14, enemy.type === "nestBoss" ? 15 : enemy.type === "bear" ? 10 : 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#d6cbb0"; ctx.fillRect(10, -4, 4, 2); ctx.restore();
      if (enemy.loot?.length && Math.hypot(enemy.x-gameState.player.x, enemy.y-gameState.player.y) < 100) { ctx.fillStyle="#f2dca0"; ctx.font="11px sans-serif"; ctx.textAlign="center"; ctx.fillText("E 搜索",pos.x,pos.y-18); }
      continue;
    }
    drawPixelAnimal(ctx, enemy, pos.x, pos.y);
    if (enemy.hp < enemy.maxHp || Math.hypot(enemy.x-gameState.player.x,enemy.y-gameState.player.y)<260) {
      const w = enemy.type === "nestBoss" ? 56 : enemy.type === "bear" ? 38 : 30, x = pos.x - w/2, y = pos.y - (enemy.type === "nestBoss" ? 40 : enemy.type === "bear" ? 29 : 24);
      ctx.fillStyle="rgba(12,16,13,.8)";ctx.fillRect(x-1,y-1,w+2,5);ctx.fillStyle="#c7c2aa";ctx.fillRect(x,y,w,3);ctx.fillStyle=enemy.hp/enemy.maxHp<.3?"#e66b55":"#b74f42";ctx.fillRect(x,y,w*Math.max(0,enemy.hp/enemy.maxHp),3);
      if (Math.hypot(enemy.x-gameState.player.x,enemy.y-gameState.player.y)<170) { ctx.fillStyle="#f1e6cf";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText(ENEMY_TYPES[enemy.type]?.name||"野兽",pos.x,y-5); }
    }
  }
  const now = performance.now();
  for (const effect of meleeEffects) {
    const duration = effect.duration || 290;
    const remain = Math.max(0, Math.min(1, (effect.until - now) / duration));
    if (remain <= 0) continue;
    const pos = toScreen(effect.x, effect.y);
    ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(effect.angle);
    if (effect.kind === "slash") {
      // 半月刀光沿挥砍时间轴逐步展开：暗色外缘、冷色主体、白色刃光与少量像素粒子。
      const progress = 1 - remain;
      const sweep = 0.18 + progress * 1.92;
      const startA = -1.18 + progress * 0.16;
      const endA = startA + sweep;
      const alpha = Math.min(.96, Math.sin(Math.min(1, progress * 1.12) * Math.PI) * 1.1) * Math.min(1, progress * 5);
      ctx.globalAlpha = alpha * .55;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#367da4"; ctx.lineWidth = 15;
      ctx.beginPath(); ctx.arc(20, -24, 43, startA, endA); ctx.stroke();
      ctx.globalAlpha = alpha * .9;
      ctx.strokeStyle = "#79d5ff"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(20, -24, 43, startA, endA); ctx.stroke();
      ctx.strokeStyle = "#f4fcff"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(20, -24, 39, startA + .06, endA - .05); ctx.stroke();
      ctx.fillStyle = "rgba(220,248,255,.92)";
      for (let i = 0; i < 4; i++) {
        const a = startA + sweep * (i / 4);
        const r = 42 + (i % 2) * 3;
        ctx.fillRect(Math.round(20 + Math.cos(a) * r - 1), Math.round(-24 + Math.sin(a) * r - 1), 3, 3);
      }
    } else if (effect.kind === "thrust") {
      ctx.globalAlpha = Math.min(1, remain * 1.6);
      ctx.strokeStyle = "#e7d6a5"; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(88 * (1.15 - remain*.15), 0); ctx.stroke();
      ctx.strokeStyle = "#fff5d5"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(84,0); ctx.stroke();
    } else {
      ctx.globalAlpha = Math.min(1, remain * 1.5);
      ctx.strokeStyle = "#fff0b0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(44,0); ctx.stroke();
    }
    ctx.restore();
  }
  for (const p of projectiles) {
    if (p.location!==gameState.location || (p.location==="region"&&p.regionId!==gameState.regionId)) continue;
    const pos=toScreen(p.x,p.y); ctx.save(); ctx.translate(pos.x,pos.y); ctx.rotate(Math.atan2(p.vy,p.vx));
    ctx.strokeStyle=p.color;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(9,0);ctx.stroke();ctx.fillStyle="#dfd6b5";ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(5,-3);ctx.lineTo(5,3);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(mouseAim.inside && getActiveWeapon()) {
    const playerScreen=toScreen(gameState.player.x,gameState.player.y);
    ctx.save();ctx.strokeStyle="rgba(255,245,190,.55)";ctx.lineWidth=1.3;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(playerScreen.x,playerScreen.y);ctx.lineTo(mouseAim.x,mouseAim.y);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle="#fff2b0";ctx.beginPath();ctx.arc(mouseAim.x,mouseAim.y,7,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
}
canvas.addEventListener("mousemove", event => { const rect=canvas.getBoundingClientRect();mouseAim.x=(event.clientX-rect.left)*canvas.width/rect.width;mouseAim.y=(event.clientY-rect.top)*canvas.height/rect.height;mouseAim.inside=true; });
canvas.addEventListener("mouseleave",()=>{mouseAim.inside=false;});

// ================================
// 10. 游戏主循环
// ================================
// v33：让浏览器原生 requestAnimationFrame 决定绘制节奏，不再用 16.7ms 门槛丢帧；
// 地面区块缓存继续降低每帧开销。相机插值使用同一帧的真实 delta。
let lastRenderTimestamp = 0;
let cameraDeltaTime = 1 / 60;
let questCheckElapsed = 0;
function gameLoop(timestamp) {
  if (!gameState.running) return;
  if (!gameState.lastTime) {
    gameState.lastTime = timestamp;
  }
  // 限制单帧时间差，防止切回页面后角色突然移动很远
  const rawDelta = (timestamp - gameState.lastTime) / 1000;
  const deltaTime = Math.min(Math.max(rawDelta, 0), 0.05);
  cameraDeltaTime = deltaTime || 1 / 60;
  lastRenderTimestamp = timestamp;
  gameState.lastTime = timestamp;
  // 剧情对话期间冻结整个游戏场景：不更新世界、不重绘地图、不推进任务/存档计时；只保留 DOM 对话框与下一帧调度。
  if (storyDialog && !storyDialog.classList.contains("hidden")) {
    gameState.animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  const modalOpen = !inventoryModal.classList.contains("hidden") || !mapModal.classList.contains("hidden") || !craftingModal.classList.contains("hidden") || !questModal.classList.contains("hidden") || (saveSlotModal && !saveSlotModal.classList.contains("hidden")) || (sleepModal && !sleepModal.classList.contains("hidden")) || (storyDialog && !storyDialog.classList.contains("hidden"));
  // 场景切换即使发生在暂停界面，也继续平滑更新室内外视觉状态。
  updateRoomEnvironment(deltaTime);
  // 命中顿帧冻结游戏模拟而不冻结绘制，角色/怪物/世界暂停约 65–95ms，刀光仍可见。
  const inHitstop = hitstopRemaining > 0;
  if (inHitstop) hitstopRemaining = Math.max(0, hitstopRemaining - deltaTime);
  if (!modalOpen && !inHitstop) {
    updatePlayer(deltaTime);
    // 只有实际游玩时才推进世界时间与生存消耗；整理背包/看地图时暂停。
    worldTimeMinutes += deltaTime * 2;
    updateWeather();
    updateResourceRespawns();
    updateCompanionSupport();
    updateCompanionRoutine(deltaTime);
    updateSurvival(deltaTime);
    updateCombat(deltaTime);
    updateAircraftSearch();
  }
  questCheckElapsed += deltaTime;
  if (questCheckElapsed >= 0.25) { checkMainQuestProgress(); questCheckElapsed = 0; }
  drawWorld();
  renderHUD();
  updateInteractionPrompt(deltaTime);
  saveElapsed += deltaTime;
  if (saveElapsed >= 2) { saveGame(false); saveElapsed = 0; }
  gameState.animationFrameId = requestAnimationFrame(gameLoop);
}
function resetNewGame() {
  gameState.player.x = 50.5 * TILE_SIZE;
  gameState.player.y = 50.5 * TILE_SIZE;
  gameState.player.facing = "down"; gameState.player.moving = false; gameState.player.walkTime = 0; gameState.player.actionUntil = 0; gameState.player.actionType = "";
  gameState.keys.clear();
  gameState.lastTime = 0;
  worldTimeMinutes = 8 * 60 + 30;
  weatherState = { id: "clear", nextChangeAt: worldTimeMinutes + 90 + Math.random() * 100 };
  survivalState.health = 100; survivalState.hunger = 100; survivalState.thirst = 100;
  inventoryState.backpackLevel = 1;
  inventoryState.slots = [
    { ...itemCatalog.bread, count: 3 }, { ...itemCatalog.water, count: 3 }, { ...itemCatalog.medkit, count: 2 },
    null, null, null, null, null, null, null, null, null
  ];
  resizeBackpack(1);
  inventoryState.hotbar = [null, null, null, null, null];
  if (gameState.selectedCharacter?.id === "hunter") { inventoryState.slots[3] = { ...itemCatalog.bow, count: 1 }; inventoryState.slots[4] = { ...itemCatalog.arrow, count: 6 }; }
  inventoryState.activeHotbarIndex = 0;
  inventoryState.selectedContainer = null;
  gameState.location = "world"; gameState.regionId = null; gameState.regionReturnPosition = null; gameState.campReturnPosition = null; gameState.cabinReturnPosition = null; gameState.campLevel = 1; gameState.camps=[]; gameState.selectedCampId=null; gameState.nextCampId=1; gameState.placedCampfires = []; gameState.hasFurnace = false; gameState.unlockedRegions = { riverValley:false, ridgeHighlands:false, cave:false, researchStation:false }; gameState.visitedRegions = { riverValley:false, ridgeHighlands:false }; gameState.searchedContainers = [];
  mainQuestState.chapter = 1; mainQuestState.completed = []; mainQuestState.flags = {}; mainQuestState.gathered = { wood: 0, berries: 0, stone: 0, branch: 0, fiber: 0 }; mainQuestState.crafted = {};
  companionDailyTick = Math.floor(worldTimeMinutes / 1440);
  placeAvailableCompanions();
  harvestedObjects.clear(); harvestedAtMinutes.clear(); noRespawnObjects.clear(); exploredTiles.clear();
  enemies = []; projectiles = []; meleeEffects = []; enemySpawnElapsed = 0; attackCooldown = 0; meleeAttackState = null; hitstopRemaining = 0; spawnInitialEnemies();
  revealAroundPlayer();
  updateMainQuestUI();
}
function saveGame(showMessage = true) {
  if (!gameState.selectedCharacter) return;
  const saveData = {
    version: 2,
    saveSlot: currentSaveSlot,
    selectedCharacterId: gameState.selectedCharacter.id,
    player: { x: gameState.location === "aircraft" ? (gameState.aircraftReturnPosition?.x ?? QUEST_LANDMARKS.aircraftWreck.entrance.x) : gameState.player.x, y: gameState.location === "aircraft" ? (gameState.aircraftReturnPosition?.y ?? QUEST_LANDMARKS.aircraftWreck.entrance.y + 48) : gameState.player.y, facing: gameState.player.facing || "down" },
    location: gameState.location === "aircraft" ? "world" : gameState.location,
    cabinReturnPosition: gameState.cabinReturnPosition,
    aircraftFloor: gameState.aircraftFloor,
    aircraftReturnPosition: gameState.aircraftReturnPosition,
    regionId: gameState.regionId,
    regionReturnPosition: gameState.regionReturnPosition,
    unlockedRegions: gameState.unlockedRegions,
    visitedRegions: gameState.visitedRegions,
    searchedContainers: gameState.searchedContainers,
    mainQuest: { chapter: mainQuestState.chapter, completed: mainQuestState.completed, flags: mainQuestState.flags, gathered: mainQuestState.gathered, crafted: mainQuestState.crafted },
    hasFurnace: gameState.hasFurnace,
    campReturnPosition: gameState.campReturnPosition,
    campLevel: gameState.campLevel,
    camps: gameState.camps, selectedCampId: gameState.selectedCampId, nextCampId: gameState.nextCampId,
    placedCampfires: gameState.placedCampfires,
    survival: { ...survivalState },
    worldTimeMinutes,
    inventory: {
      backpackLevel: inventoryState.backpackLevel,
      slots: inventoryState.slots,
      hotbar: inventoryState.hotbar,
      activeHotbarIndex: inventoryState.activeHotbarIndex
    },
    harvested: [...harvestedObjects],
    harvestedAtMinutes: [...harvestedAtMinutes.entries()],
    noRespawnObjects: [...noRespawnObjects],
    droppedItems: [...worldObjects, ...regionObjects].filter(o=>o.type === "droppedItem"),
    resourceStates: worldObjects.filter(o => ["tree","treeMedium","treeSmall","treeStump","treeSapling","treeYoung"].includes(o.type)).map(o => ({ id:o.id, type:o.type, chopHits:o.chopHits||0, stageAt:o.stageAt??null, hitAt:0, felledAt:0 })),
    enemies: enemies.map(e => ({ ...e })),
    explored: [...exploredTiles],
    task: document.querySelector("#current-task").textContent,
    savedAt: Date.now()
  };
  try {
    localStorage.setItem(`${SAVE_SLOT_PREFIX}${currentSaveSlot}`, JSON.stringify(saveData));
    updateContinueButton();
    if (showMessage) {
      showToast(`游戏进度已保存到存档位 ${currentSaveSlot}。`);
      playSoundEffect("save");
    }
    return true;
  } catch (error) {
    if (showMessage) showToast("存档失败：浏览器存储空间可能不足。");
    return false;
  }
}
function readSaveSlot(slot) {
  try {
    const stored = localStorage.getItem(`${SAVE_SLOT_PREFIX}${slot}`);
    if (stored) return JSON.parse(stored);
    if (slot === 1) {
      for (const key of LEGACY_SAVE_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (parsed && parsed.version === 1 && parsed.selectedCharacterId) {
            localStorage.setItem(`${SAVE_SLOT_PREFIX}1`, JSON.stringify(parsed));
            return parsed;
          }
        }
      }
    }
  } catch (error) {}
  return null;
}
function openSaveSlotPicker(mode = "continue") {
  saveSlotPickerMode = mode;
  if (!saveSlotModal || !saveSlotList) return;
  saveSlotTitle.textContent = mode === "new" ? "选择存档位 · 开始新旅程" : mode === "save" ? "选择存档位 · 保存进度" : "选择存档 · 继续游戏";
  saveSlotList.innerHTML = "";
  for (let slot = 1; slot <= 4; slot++) {
    const data = readSaveSlot(slot);
    const card = document.createElement("article");
    card.className = `save-slot-card${data ? " occupied" : " empty"}`;
    const heading = document.createElement("h3"); heading.textContent = `存档位 ${slot}${slot === currentSaveSlot ? " · 当前档位" : ""}`;
    const details = document.createElement("p");
    if (data) {
      const q = data.mainQuest?.chapter || 1;
      const qTitle = mainQuests.find(item => item.chapter === q)?.title || "第一章已完成";
      const saved = data.savedAt ? new Date(data.savedAt).toLocaleString("zh-CN", { hour12: false }) : "时间未知";
      details.textContent = `${characters.find(c=>c.id===data.selectedCharacterId)?.name || "求生者"} · 第 ${Math.min(q,16)} 章 · ${qTitle} · ${saved}`;
    } else details.textContent = "空存档位 · 尚无游戏进度";
    const action = document.createElement("button"); action.dataset.slotAction = "true"; action.dataset.slot = String(slot);
    if (mode === "new") action.textContent = data ? "覆盖此档并开始新游戏" : "在此档位开始新游戏";
    else if (mode === "save") action.textContent = data ? `覆盖并保存到此档位` : "保存到这个空档位";
    else { action.textContent = data ? "继续此存档" : "空档位"; action.disabled = !data; }
    card.append(heading, details, action); saveSlotList.appendChild(card);
  }
  saveSlotModal.classList.remove("hidden");
} 
function loadGame(slot = currentSaveSlot) {
  let data = readSaveSlot(slot);
  if (!data || ![1, 2].includes(Number(data.version))) { showToast("没有找到有效存档，请先开始新游戏。"); updateContinueButton(); return false; }
  const character = characters.find(item => item.id === data.selectedCharacterId);
  if (!character) { showToast("存档角色数据无效，请开始新游戏。"); return false; }
  gameState.selectedCharacter = character;
  currentSaveSlot = slot;
  document.querySelector("#death-overlay")?.classList.add("hidden");
  document.querySelector("#player-name").textContent = character.name;
  gameState.player.x = Number(data.player?.x) || 50.5 * TILE_SIZE;
  gameState.player.y = Number(data.player?.y) || 50.5 * TILE_SIZE;
  gameState.player.moving = false; gameState.player.actionUntil = 0; gameState.player.facing = data.player?.facing || "down";
  gameState.location = ["camp","region","cabin"].includes(data.location) ? data.location : "world";
  gameState.cabinReturnPosition = data.cabinReturnPosition && Number.isFinite(data.cabinReturnPosition.x) ? data.cabinReturnPosition : null;
  gameState.aircraftFloor = data.aircraftFloor === "upper" ? "upper" : "lower";
  gameState.aircraftReturnPosition = data.aircraftReturnPosition && Number.isFinite(data.aircraftReturnPosition.x) ? data.aircraftReturnPosition : null;
  gameState.regionId = ["riverValley","ridgeHighlands"].includes(data.regionId) ? data.regionId : (data.location === "region" ? "riverValley" : null);
  gameState.regionReturnPosition = data.regionReturnPosition && Number.isFinite(data.regionReturnPosition.x) ? data.regionReturnPosition : null;
  gameState.unlockedRegions = { riverValley:Boolean(data.unlockedRegions?.riverValley), ridgeHighlands:Boolean(data.unlockedRegions?.ridgeHighlands), cave:Boolean(data.unlockedRegions?.cave), researchStation:Boolean(data.unlockedRegions?.researchStation) };
  gameState.visitedRegions = { riverValley:Boolean(data.visitedRegions?.riverValley), ridgeHighlands:Boolean(data.visitedRegions?.ridgeHighlands) };
  gameState.searchedContainers = Array.isArray(data.searchedContainers) ? data.searchedContainers : [];
  const savedQuest = data.mainQuest || {};
  mainQuestState.chapter = Math.max(1, Math.min(8, Number(savedQuest.chapter) || 1));
  mainQuestState.completed = Array.isArray(savedQuest.completed) ? savedQuest.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=7) : [];
  mainQuestState.flags = savedQuest.flags && typeof savedQuest.flags === "object" ? savedQuest.flags : {};
  mainQuestState.gathered = { wood: Math.max(0, Number(savedQuest.gathered?.wood)||0), berries: Math.max(0, Number(savedQuest.gathered?.berries)||0), stone: Math.max(0, Number(savedQuest.gathered?.stone)||0), branch: Math.max(0, Number(savedQuest.gathered?.branch)||0), fiber: Math.max(0, Number(savedQuest.gathered?.fiber)||0) };
  mainQuestState.crafted = savedQuest.crafted && typeof savedQuest.crafted === "object" ? savedQuest.crafted : {};
  placeAvailableCompanions();
  companionDailyTick = Math.floor(worldTimeMinutes / 1440);
  gameState.hasFurnace = Boolean(data.hasFurnace);
  gameState.campReturnPosition = data.campReturnPosition && Number.isFinite(data.campReturnPosition.x) ? data.campReturnPosition : null;
  gameState.camps = Array.isArray(data.camps) ? data.camps.filter(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)).map(c=>({...c,level:Math.max(1,Math.min(3,Number(c.level)||1)),furniture:Array.isArray(c.furniture)?c.furniture:[]})) : [];
  gameState.nextCampId = Math.max(1,Number(data.nextCampId)||gameState.camps.length+1);
  gameState.selectedCampId = gameState.camps.some(c=>c.id===data.selectedCampId)?data.selectedCampId:null;
  gameState.campLevel = Math.max(1, Math.min(3, Number(data.campLevel) || 1));
  if(gameState.location==="camp"&&!gameState.selectedCampId) gameState.location="world";
  if(gameState.selectedCampId) gameState.campLevel=selectedCamp()?.level||1;
  gameState.placedCampfires = Array.isArray(data.placedCampfires) ? data.placedCampfires.filter(f => Number.isFinite(f.x) && Number.isFinite(f.y)).slice(0, 30) : [];
  survivalState.health = Math.max(0, Math.min(100, Number(data.survival?.health ?? 100)));
  survivalState.hunger = Math.max(0, Math.min(100, Number(data.survival?.hunger ?? 100)));
  survivalState.thirst = Math.max(0, Math.min(100, Number(data.survival?.thirst ?? 100)));
  worldTimeMinutes = Number(data.worldTimeMinutes) || 8 * 60 + 30;
  weatherState = { id: "clear", nextChangeAt: worldTimeMinutes + 70 + Math.random() * 140 };
  const normalizeItem = item => item && itemCatalog[item.id] ? { ...itemCatalog[item.id], count: itemCatalog[item.id].durabilityMax ? 1 : Math.max(1, Number(item.count) || 1), ...(itemCatalog[item.id].durabilityMax ? { durability: Math.max(0, Math.min(itemCatalog[item.id].durabilityMax, Number(item.durability ?? itemCatalog[item.id].durabilityMax))) } : {}) } : null;
  inventoryState.backpackLevel = Math.max(1, Math.min(5, Number(data.inventory?.backpackLevel) || 1));
  const savedSlots = Array.isArray(data.inventory?.slots) ? data.inventory.slots : [];
  inventoryState.slots = Array.from({ length: backpackCapacity(inventoryState.backpackLevel) }, (_, i) => normalizeItem(savedSlots[i]));
  resizeBackpack(inventoryState.backpackLevel);
  inventoryState.hotbar = Array.from({ length: 5 }, (_, i) => normalizeItem(data.inventory?.hotbar?.[i]));
  inventoryState.activeHotbarIndex = Math.max(0, Math.min(4, Number(data.inventory?.activeHotbarIndex) || 0));
  inventoryState.selectedContainer = null;
  harvestedObjects.clear(); (data.harvested || []).forEach(id => harvestedObjects.add(id));
  enemies = Array.isArray(data.enemies) ? data.enemies.map(e => { const oldType = e.type === "raider" ? "wolf" : e.type; const cfg = ENEMY_TYPES[oldType] || ENEMY_TYPES.wolf; const loaded = { ...e, type: oldType, hp: Number.isFinite(e.hp) ? e.hp : cfg.hp, maxHp: Number.isFinite(e.maxHp) ? e.maxHp : cfg.hp, speed: cfg.speed, damage: cfg.damage, radius: cfg.radius, difficultyStage: -1 }; return loaded; }).map(applyEnemyDifficulty) : []; projectiles = []; meleeEffects = []; enemySpawnElapsed = 0;
  harvestedAtMinutes.clear(); (Array.isArray(data.harvestedAtMinutes) ? data.harvestedAtMinutes : []).forEach(([id, minute]) => { if (Number.isFinite(minute)) harvestedAtMinutes.set(id, minute); });
  noRespawnObjects.clear(); (data.noRespawnObjects || []).forEach(id => noRespawnObjects.add(id));
  // v31：恢复树木砍伐进度与再生阶段，避免保存/读取后树桩或幼树回滚。
  for (const state of (Array.isArray(data.resourceStates) ? data.resourceStates : [])) {
    if (!["tree","treeMedium","treeSmall","treeStump","treeSapling","treeYoung"].includes(state.type)) continue;
    const key = String(state.id);
    let obj = worldObjectByTile.get(key);
    // 玩家自行种植的树可能原本不属于程序生成的资源点，读档时需要补回对象。
    if (!obj) {
      const [col, row] = key.split(",").map(Number);
      if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
      obj = { id:key, col, row, type:state.type };
      worldObjects.push(obj); worldObjectByTile.set(key, obj);
    }
    obj.type = state.type; obj.chopHits = Math.max(0, Number(state.chopHits)||0);
    if (Number(state.stageAt) > 0) obj.stageAt = Number(state.stageAt); else delete obj.stageAt;
  }
  for (const id of harvestedObjects) if (!harvestedAtMinutes.has(id) && !noRespawnObjects.has(id)) harvestedAtMinutes.set(id, worldTimeMinutes);
  for (const camp of gameState.camps) reserveCampGround(camp);
  if (gameState.location === "region") createRegionObjects(gameState.regionId || "riverValley");
  for (const obj of (data.droppedItems || [])) {
    if (!itemCatalog[obj.itemId] || !Number.isFinite(obj.col) || !Number.isFinite(obj.row)) continue;
    const drop={...obj,type:"droppedItem"};
    if (drop.regionId) {
      if (gameState.location === "region" && drop.regionId === gameState.regionId) regionObjects.push(drop);
    } else if (gameState.location !== "region") {
      const key=`${drop.col},${drop.row}`; const current = worldObjectByTile.get(key);
      if (!current || harvestedObjects.has(current.id)) { worldObjects.push(drop); worldObjectByTile.set(key,drop); }
    }
  }
  // 存档中的营地位置已恢复后重新放置伙伴，避免读档时沿用默认出生坐标。
  placeAvailableCompanions();
  if (gameState.location === "world") recoverPlayerPosition();
  exploredTiles.clear(); (data.explored || []).forEach(id => exploredTiles.add(Number(id)));
  revealAroundPlayer();
  updateMainQuestUI();
  return true;
}
function updateContinueButton() {
  let valid = false;
  for (let slot = 1; slot <= 4; slot++) if (readSaveSlot(slot)) { valid = true; break; }
  continueButton.disabled = !valid;
  continueButton.textContent = valid ? "继续游戏 · 选择存档" : "继续游戏（暂无存档）";
}
function launchGameLoop() {
  gameState.keys.clear(); gameState.lastTime = 0; lastRenderTimestamp = 0; questCheckElapsed = 0;
  cameraState.x = null; cameraState.y = null;
  resizeGameCanvas();
  if (gameState.location === "region") { createRegionObjects(gameState.regionId || "riverValley"); const l=getRegionMapLayout(); gameState.player.x=Math.max(l.x+12,Math.min(l.x+l.width-12,gameState.player.x||l.x+l.width/2)); gameState.player.y=Math.max(l.y+12,Math.min(l.y+l.height-12,gameState.player.y||l.y+l.height*.78)); }
  if (gameState.location === "camp") {
    gameState.player.x = Math.max(54, Math.min(canvas.width - 54, gameState.player.x || canvas.width / 2));
    gameState.player.y = Math.max(100, Math.min(canvas.height - 62, gameState.player.y || canvas.height * .62));
  }
  showScreen("game-screen");
  gameState.running = true;
  renderHUD(); renderHotbar(); renderInventory();
  drawWorld(); drawOverviewMap(minimapCtx, minimapCanvas);
  if (gameState.animationFrameId !== null) cancelAnimationFrame(gameState.animationFrameId);
  gameState.animationFrameId = requestAnimationFrame(gameLoop);
}
function startGame() {
  if (!gameState.selectedCharacter) return;
  document.querySelector("#player-name").textContent = gameState.selectedCharacter.name;
  document.querySelector("#death-overlay")?.classList.add("hidden");
  resetNewGame();
  launchGameLoop();
  saveGame(false);
  showToast("WASD 移动 · E 交互/采集 · C 制造 · B 生存图鉴 · I 背包 · F 使用/放置 · P 保存");
}
function stopGame() {
  if (gameState.running) saveGame(false);
  gameState.running = false;
  gameState.keys.clear(); gameState.lastTime = 0;
  inventoryModal.classList.add("hidden"); mapModal.classList.add("hidden"); craftingModal.classList.add("hidden"); questModal.classList.add("hidden");
  if (gameState.animationFrameId !== null) {
    cancelAnimationFrame(gameState.animationFrameId);
    gameState.animationFrameId = null;
  }
  updateContinueButton();
}
window.addEventListener("beforeunload", () => saveGame(false));
// ================================
// 11. 启动
// ================================
renderProfiles();
resizeBackpack(inventoryState.backpackLevel);
setupAudioSettings();
updateMainQuestUI();
updateContinueButton();
showScreen("menu-screen");
