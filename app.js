// ==========================================
// 衣橱整理助手 - 主应用逻辑
// ==========================================

// ---------- 全局状态 ----------
let supabase = null;
let mobileNetModel = null;
let allBoxes = [];
let allClothes = [];
let currentBoxId = null;
let currentClothesId = null;
let currentTags = [];
let currentPhotoData = null;  // base64 compressed photo
let currentFilter = 'all';
let currentSeasonFilter = 'all';
let isEditingBox = false;
let editingBoxId = null;

// ---------- 衣物类别映射 (MobileNet → 中文) ----------
const CATEGORY_MAP = {
  // 上衣
  'shirt': '上衣', 'blouse': '上衣', 'tee_shirt': '上衣', 'sweatshirt': '上衣',
  'jersey': '上衣', 'cardigan': '上衣', 'pullover': '上衣', 'tank_top': '上衣',
  'polo_shirt': '上衣', 'henley': '上衣', 'Windsor_tie': '上衣',
  // 外套
  'coat': '外套', 'jacket': '外套', 'overcoat': '外套', 'fur_coat': '外套',
  'raincoat': '外套', 'trench_coat': '外套', 'poncho': '外套', 'cape': '外套',
  'lab_coat': '外套', 'suit_jacket': '外套', 'bathrobe': '外套',
  'bulletproof_vest': '外套', 'vestment': '外套',
  // 裤子
  'jeans': '裤子', 'trousers': '裤子', 'pants': '裤子', 'shorts': '裤子',
  'bathing_trunks': '裤子', 'gym_shorts': '裤子',
  // 裙子
  'skirt': '裙子', 'mini-skirt': '裙子', 'hoopskirt': '裙子', 'gown': '裙子',
  'dress': '裙子', 'sarong': '裙子',
  // 鞋子
  'shoe': '鞋子', 'sneaker': '鞋子', 'boot': '鞋子', 'sandal': '鞋子',
  'clog': '鞋子', 'Loafer': '鞋子', 'oxford': '鞋子', 'running_shoe': '鞋子',
  'cowboy_boot': '鞋子', 'flip_flop': '鞋子', 'slipper': '鞋子',
  // 配饰
  'hat': '配饰', 'cap': '配饰', 'sunglasses': '配饰', 'handbag': '配饰',
  'purse': '配饰', 'wallet': '配饰', 'bow_tie': '配饰', 'necklace': '配饰',
  'bracelet': '配饰', 'ring': '配饰', 'watch': '配饰', 'bolo_tie': '配饰',
  'bonnet': '配饰', 'sombrero': '配饰',
  // 包
  'backpack': '配饰', 'briefcase': '配饰', 'suitcase': '配饰',
  'mailbag': '配饰', 'shopping_basket': '配饰',
};

// 中文颜色关键词
const COLOR_KEYWORDS = {
  '黑色': ['black', 'dark'],
  '白色': ['white', 'light'],
  '红色': ['red', 'crimson', 'scarlet'],
  '蓝色': ['blue', 'navy', 'cobalt'],
  '绿色': ['green', 'olive', 'lime'],
  '黄色': ['yellow', 'gold'],
  '灰色': ['gray', 'grey', 'silver'],
  '棕色': ['brown', 'tan', 'beige', 'khaki'],
  '粉色': ['pink', 'rose'],
  '紫色': ['purple', 'violet', 'lavender'],
  '橙色': ['orange'],
};

// ---------- 初始化 ----------
document.addEventListener('DOMContentLoaded', () => {
  try {
    // 检查是否已有 Supabase 配置
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_key');

    if (url && key && typeof window.supabase !== 'undefined') {
      initSupabase(url, key);
      document.getElementById('page-setup').classList.remove('active');
      document.getElementById('app').style.display = 'flex';
      loadAllData();
    }

    // 标签输入事件
    const tagsInput = document.getElementById('add-tags-input');
    if (tagsInput) {
      tagsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const tag = tagsInput.value.trim();
          if (tag && !currentTags.includes(tag)) {
            currentTags.push(tag);
            renderTags();
          }
          tagsInput.value = '';
        }
      });
    }

    // 颜色选择器事件
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('add-color').value = btn.dataset.color;
      });
    });

    // 搜索输入回车
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
      });
      searchInput.addEventListener('input', debounce(doSearch, 300));
    }

    // 预加载 AI 模型（不阻塞主流程）
    setTimeout(() => loadAIModel(), 3000);
  } catch (err) {
    console.error('Init error:', err);
  }
});

// ---------- Supabase 初始化 ----------
function initSupabase(url, key) {
  supabase = window.supabase.createClient(url, key);
}

// ---------- 引导页操作 ----------
function copySQL() {
  const sql = document.getElementById('sql-content').textContent;
  navigator.clipboard.writeText(sql).then(() => {
    showToast('SQL 已复制到剪贴板');
  }).catch(() => {
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = sql;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('SQL 已复制到剪贴板');
  });
}

async function startApp() {
  const url = document.getElementById('setup-url').value.trim();
  const key = document.getElementById('setup-key').value.trim();
  const btn = document.querySelector('.btn-start');

  // 显示错误信息的容器
  let errBox = document.getElementById('setup-error');
  if (!errBox) {
    errBox = document.createElement('div');
    errBox.id = 'setup-error';
    errBox.style.cssText = 'background:#FEE2E2;color:#991B1B;padding:12px;border-radius:8px;margin-bottom:12px;font-size:14px;display:none;';
    btn.parentNode.insertBefore(errBox, btn);
  }
  errBox.style.display = 'none';

  if (!url || !key) {
    errBox.textContent = '请填写 Project URL 和 Anon Key';
    errBox.style.display = 'block';
    errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (!url.includes('supabase.co')) {
    errBox.textContent = 'URL 格式不正确，应包含 supabase.co';
    errBox.style.display = 'block';
    errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 检查 Supabase SDK 是否加载
  if (typeof window.supabase === 'undefined') {
    errBox.textContent = 'Supabase SDK 加载失败，请刷新页面重试';
    errBox.style.display = 'block';
    errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  btn.textContent = '连接中...';
  btn.disabled = true;

  // 保存配置
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);

  try {
    initSupabase(url, key);

    // 测试连接
    const { error } = await supabase.from('boxes').select('id').limit(1);
    if (error) throw error;

    document.getElementById('page-setup').classList.remove('active');
    document.getElementById('app').style.display = 'flex';
    showToast('连接成功！');
    loadAllData();
  } catch (err) {
    const msg = err.message || '请检查配置';
    errBox.innerHTML = '连接失败：' + msg +
      '<br><br>请检查：<br>1. 是否已在 SQL Editor 中运行了 setup.sql<br>2. URL 和 Key 是否正确';
    errBox.style.display = 'block';
    errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('连接失败，请检查配置');
  } finally {
    btn.textContent = '开始使用';
    btn.disabled = false;
  }
}

// ---------- 页面导航 ----------
function navigateTo(page) {
  // 隐藏所有页面
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));

  // 显示目标页面
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // 更新导航高亮
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  // 更新标题
  const titles = {
    home: '我的衣橱',
    boxes: '箱子管理',
    add: '收纳衣物',
    search: '搜索衣物',
    settings: '设置',
    'box-detail': '箱子详情',
  };
  document.getElementById('header-title').textContent = titles[page] || '衣橱整理助手';

  // 页面进入时的操作
  if (page === 'home') renderHome();
  if (page === 'boxes') renderBoxes();
  if (page === 'add') prepareAddPage();
  if (page === 'search') {
    document.getElementById('search-input').focus();
    doSearch();
  }
  if (page === 'settings') renderSettings();
}

// ---------- 数据加载 ----------
async function loadAllData() {
  await Promise.all([loadBoxes(), loadClothes()]);
  renderHome();
}

async function loadBoxes() {
  try {
    const { data, error } = await supabase
      .from('boxes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allBoxes = data || [];
  } catch (err) {
    showToast('加载箱子失败：' + err.message);
  }
}

async function loadClothes() {
  try {
    const { data, error } = await supabase
      .from('clothes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allClothes = data || [];
  } catch (err) {
    showToast('加载衣物失败：' + err.message);
  }
}

// ---------- 首页渲染 ----------
function renderHome() {
  const stored = allClothes.filter(c => c.status === 'stored').length;
  document.getElementById('stat-boxes').textContent = allBoxes.length;
  document.getElementById('stat-clothes').textContent = allClothes.length;
  document.getElementById('stat-stored').textContent = stored;

  // 最近添加
  const recent = allClothes.slice(0, 6);
  const recentContainer = document.getElementById('recent-clothes');
  const emptyHome = document.getElementById('empty-home');

  if (allClothes.length === 0) {
    recentContainer.innerHTML = '';
    emptyHome.style.display = 'block';
  } else {
    emptyHome.style.display = 'none';
    recentContainer.innerHTML = recent.map(c => renderClothesCard(c)).join('');
  }

  // 箱子列表
  const boxesContainer = document.getElementById('home-boxes');
  const topBoxes = allBoxes.slice(0, 3);
  boxesContainer.innerHTML = topBoxes.map(box => {
    const count = allClothes.filter(c => c.box_id === box.id).length;
    const seasonEmoji = { '春季': '🌸', '夏季': '☀️', '秋季': '🍂', '冬季': '❄️', '四季': '📅' };
    return `
      <div class="box-card" onclick="openBoxDetail('${box.id}')">
        <div class="box-card-icon">${seasonEmoji[box.season] || '📦'}</div>
        <div class="box-card-info">
          <div class="box-card-name">${escapeHtml(box.name)}</div>
          <div class="box-card-meta">${box.location || box.season}</div>
        </div>
        <div class="box-card-count">${count} 件</div>
      </div>
    `;
  }).join('');
}

// ---------- 箱子列表渲染 ----------
function renderBoxes() {
  const container = document.getElementById('boxes-list');
  const emptyBoxes = document.getElementById('empty-boxes');

  if (allBoxes.length === 0) {
    container.innerHTML = '';
    emptyBoxes.style.display = 'block';
  } else {
    emptyBoxes.style.display = 'none';
    const seasonEmoji = { '春季': '🌸', '夏季': '☀️', '秋季': '🍂', '冬季': '❄️', '四季': '📅' };
    container.innerHTML = allBoxes.map(box => {
      const count = allClothes.filter(c => c.box_id === box.id).length;
      return `
        <div class="box-card" onclick="openBoxDetail('${box.id}')">
          <div class="box-card-icon">${seasonEmoji[box.season] || '📦'}</div>
          <div class="box-card-info">
            <div class="box-card-name">${escapeHtml(box.name)}</div>
            <div class="box-card-meta">${escapeHtml(box.location || box.season)} · ${box.season}</div>
          </div>
          <div class="box-card-count">${count} 件</div>
        </div>
      `;
    }).join('');
  }
}

// ---------- 箱子详情 ----------
function openBoxDetail(boxId) {
  currentBoxId = boxId;
  const box = allBoxes.find(b => b.id === boxId);
  if (!box) return;

  const clothes = allClothes.filter(c => c.box_id === boxId);
  const seasonEmoji = { '春季': '🌸', '夏季': '☀️', '秋季': '🍂', '冬季': '❄️', '四季': '📅' };

  document.getElementById('box-detail-header').innerHTML = `
    <div class="box-detail-title">${seasonEmoji[box.season] || '📦'} ${escapeHtml(box.name)}</div>
    <div class="box-detail-meta">
      ${box.location ? '📍 ' + escapeHtml(box.location) + ' · ' : ''}${box.season} · ${clothes.length} 件衣物
    </div>
    <div class="box-detail-actions">
      <button class="btn-secondary" onclick="editBox('${boxId}')">编辑</button>
      <button class="btn-danger" onclick="deleteBox('${boxId}')">删除箱子</button>
    </div>
  `;

  const container = document.getElementById('box-clothes');
  const emptyBoxClothes = document.getElementById('empty-box-clothes');

  if (clothes.length === 0) {
    container.innerHTML = '';
    emptyBoxClothes.style.display = 'block';
  } else {
    emptyBoxClothes.style.display = 'none';
    container.innerHTML = clothes.map(c => renderClothesCard(c)).join('');
  }

  navigateTo('box-detail');
  document.getElementById('header-title').textContent = box.name;
}

// ---------- 衣物卡片渲染 ----------
function renderClothesCard(clothes) {
  const box = allBoxes.find(b => b.id === clothes.box_id);
  const statusClass = clothes.status === 'stored' ? 'stored' : 'taken_out';
  const statusText = clothes.status === 'stored' ? '已收纳' : '已取出';

  const imgHtml = clothes.photo_url
    ? `<img class="clothes-card-img" src="${clothes.photo_url}" alt="${escapeHtml(clothes.name)}" loading="lazy">`
    : `<div class="clothes-card-img placeholder">👕</div>`;

  return `
    <div class="clothes-card" onclick="openClothesDetail('${clothes.id}')">
      ${imgHtml}
      <div class="clothes-card-info">
        <div class="clothes-card-name">${escapeHtml(clothes.name)}</div>
        <div class="clothes-card-meta">
          <span class="clothes-card-status ${statusClass}">${statusText}</span>
          ${box ? escapeHtml(box.name) : ''}
        </div>
      </div>
    </div>
  `;
}

// ---------- 衣物详情弹窗 ----------
function openClothesDetail(clothesId) {
  currentClothesId = clothesId;
  const clothes = allClothes.find(c => c.id === clothesId);
  if (!clothes) return;

  const box = allBoxes.find(b => b.id === clothes.box_id);
  const tags = [...(clothes.tags || []), ...(clothes.ai_labels || [])];
  const uniqueTags = [...new Set(tags)];

  document.getElementById('detail-title').textContent = clothes.name;

  let html = '';
  if (clothes.photo_url) {
    html += `<img class="detail-photo" src="${clothes.photo_url}" alt="${escapeHtml(clothes.name)}">`;
  }

  if (uniqueTags.length > 0) {
    html += `<div class="detail-tags">${uniqueTags.map(t => `<span class="detail-tag">${escapeHtml(t)}</span>`).join('')}</div>`;
  }

  html += `
    <div class="detail-row">
      <span class="detail-row-label">分类</span>
      <span class="detail-row-value">${clothes.category || '未分类'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-row-label">颜色</span>
      <span class="detail-row-value">${clothes.color || '未标注'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-row-label">箱子</span>
      <span class="detail-row-value">${box ? escapeHtml(box.name) : '未知'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-row-label">位置</span>
      <span class="detail-row-value">${box ? escapeHtml(box.location || '未设置') : '未知'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-row-label">状态</span>
      <span class="detail-row-value">${clothes.status === 'stored' ? '✅ 已收纳' : '📤 已取出'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-row-label">添加时间</span>
      <span class="detail-row-value">${new Date(clothes.created_at).toLocaleDateString('zh-CN')}</span>
    </div>
  `;

  document.getElementById('detail-body').innerHTML = html;

  // 更新按钮文字
  const toggleBtn = document.getElementById('btn-toggle-status');
  toggleBtn.textContent = clothes.status === 'stored' ? '标记取出' : '标记放回';

  openModal('modal-clothes-detail');
}

async function toggleClothesStatus() {
  if (!currentClothesId) return;
  const clothes = allClothes.find(c => c.id === currentClothesId);
  if (!clothes) return;

  const newStatus = clothes.status === 'stored' ? 'taken_out' : 'stored';
  try {
    const { error } = await supabase
      .from('clothes')
      .update({ status: newStatus })
      .eq('id', currentClothesId);
    if (error) throw error;

    clothes.status = newStatus;
    showToast(newStatus === 'stored' ? '已标记放回' : '已标记取出');
    closeModal('modal-clothes-detail');
    renderHome();
  } catch (err) {
    showToast('操作失败：' + err.message);
  }
}

async function deleteClothes() {
  if (!currentClothesId) return;
  if (!confirm('确定要删除这件衣物吗？')) return;

  try {
    const clothes = allClothes.find(c => c.id === currentClothesId);

    // 删除图片
    if (clothes && clothes.photo_url) {
      const path = extractStoragePath(clothes.photo_url);
      if (path) {
        await supabase.storage.from('wardrobe-photos').remove([path]);
      }
    }

    const { error } = await supabase.from('clothes').delete().eq('id', currentClothesId);
    if (error) throw error;

    allClothes = allClothes.filter(c => c.id !== currentClothesId);
    showToast('已删除');
    closeModal('modal-clothes-detail');
    renderHome();
  } catch (err) {
    showToast('删除失败：' + err.message);
  }
}

// ---------- 添加箱子 ----------
function showAddBoxModal() {
  isEditingBox = false;
  editingBoxId = null;
  document.getElementById('modal-box-title').textContent = '新建箱子';
  document.getElementById('box-name').value = '';
  document.getElementById('box-location').value = '';
  document.getElementById('box-notes').value = '';
  document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.season-btn[data-season="四季"]').classList.add('active');
  openModal('modal-add-box');
}

function editBox(boxId) {
  const box = allBoxes.find(b => b.id === boxId);
  if (!box) return;

  isEditingBox = true;
  editingBoxId = boxId;
  document.getElementById('modal-box-title').textContent = '编辑箱子';
  document.getElementById('box-name').value = box.name;
  document.getElementById('box-location').value = box.location || '';
  document.getElementById('box-notes').value = box.notes || '';

  document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
  const seasonBtn = document.querySelector(`.season-btn[data-season="${box.season}"]`);
  if (seasonBtn) seasonBtn.classList.add('active');

  openModal('modal-add-box');
}

function selectSeason(btn) {
  document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function saveBox() {
  const name = document.getElementById('box-name').value.trim();
  if (!name) {
    showToast('请输入箱子名称');
    return;
  }

  const season = document.querySelector('.season-btn.active')?.dataset.season || '四季';
  const location = document.getElementById('box-location').value.trim();
  const notes = document.getElementById('box-notes').value.trim();

  try {
    if (isEditingBox && editingBoxId) {
      const { error } = await supabase
        .from('boxes')
        .update({ name, season, location, notes })
        .eq('id', editingBoxId);
      if (error) throw error;

      const box = allBoxes.find(b => b.id === editingBoxId);
      if (box) Object.assign(box, { name, season, location, notes });
      showToast('箱子已更新');
    } else {
      const { data, error } = await supabase
        .from('boxes')
        .insert({ name, season, location, notes })
        .select()
        .single();
      if (error) throw error;

      allBoxes.unshift(data);
      showToast('箱子已创建');
    }

    closeModal('modal-add-box');
    renderBoxes();
    prepareAddPage(); // 刷新箱子下拉
  } catch (err) {
    showToast('保存失败：' + err.message);
  }
}

async function deleteBox(boxId) {
  const clothesInBox = allClothes.filter(c => c.box_id === boxId);
  const msg = clothesInBox.length > 0
    ? `箱子中有 ${clothesInBox.length} 件衣物，删除箱子会同时删除这些衣物。确定吗？`
    : '确定要删除这个箱子吗？';

  if (!confirm(msg)) return;

  try {
    const { error } = await supabase.from('boxes').delete().eq('id', boxId);
    if (error) throw error;

    allBoxes = allBoxes.filter(b => b.id !== boxId);
    allClothes = allClothes.filter(c => c.box_id !== boxId);
    showToast('箱子已删除');
    navigateTo('boxes');
  } catch (err) {
    showToast('删除失败：' + err.message);
  }
}

// ---------- 收纳衣物页面 ----------
function prepareAddPage() {
  // 刷新箱子下拉
  const select = document.getElementById('add-box');
  const currentVal = select.value;
  select.innerHTML = '<option value="">请选择箱子</option>' +
    allBoxes.map(b => `<option value="${b.id}">${escapeHtml(b.name)} (${b.season})</option>`).join('');
  if (currentVal) select.value = currentVal;

  // 如果从箱子详情页进入，自动选中
  if (currentBoxId) {
    select.value = currentBoxId;
  }
}

// ---------- 拍照处理 ----------
function takePhoto() {
  document.getElementById('photo-input').click();
}

async function handlePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 压缩图片
  const compressed = await compressImage(file, 800, 0.8);
  currentPhotoData = compressed;

  // 显示预览
  const img = document.getElementById('photo-img');
  img.src = compressed;
  img.style.display = 'block';
  document.querySelector('.photo-placeholder').style.display = 'none';

  // AI 识别
  runAIClassification(img);
}

function compressImage(file, maxSize, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- AI 图像识别 ----------
async function loadAIModel() {
  try {
    // 等待 TF.js 加载完成（最多等 10 秒）
    let waitCount = 0;
    while (!window.tf && waitCount < 20) {
      await new Promise(r => setTimeout(r, 500));
      waitCount++;
    }
    if (window.mobilenet) {
      mobileNetModel = await window.mobilenet.load();
      console.log('MobileNet loaded');
    } else {
      console.warn('MobileNet not available, AI classification disabled');
    }
  } catch (err) {
    console.warn('AI model load failed:', err);
  }
}

async function runAIClassification(imgElement) {
  if (!mobileNetModel) {
    try { await loadAIModel(); } catch(e) {}
  }
  if (!mobileNetModel) {
    // AI 不可用，只做颜色检测
    const resultDiv = document.getElementById('ai-result');
    const tagsDiv = document.getElementById('ai-tags');
    const detectedColor = detectDominantColor(imgElement);
    if (detectedColor) {
      resultDiv.style.display = 'block';
      tagsDiv.innerHTML = `<span class="ai-tag selected" onclick="applyAITag(this, '${detectedColor}')">${detectedColor}</span>
        <span style="color:#999;font-size:12px;margin-left:8px">（AI模型未加载，仅检测颜色）</span>`;
      if (!document.getElementById('add-color').value) {
        document.getElementById('add-color').value = detectedColor;
      }
    }
    return;
  }

  const resultDiv = document.getElementById('ai-result');
  const tagsDiv = document.getElementById('ai-tags');

  try {
    resultDiv.style.display = 'block';
    tagsDiv.innerHTML = '<span style="color:#999">识别中...</span>';

    const predictions = await mobileNetModel.classify(imgElement, 5);

    // 提取类别标签
    const aiLabels = [];
    let detectedCategory = '';
    let detectedColor = '';

    for (const pred of predictions) {
      const className = pred.className.toLowerCase();
      const probability = pred.probability;

      // 匹配衣物类别
      for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (className.includes(key.toLowerCase())) {
          if (!detectedCategory && probability > 0.1) {
            detectedCategory = value;
          }
          aiLabels.push(value);
          break;
        }
      }

      // 提取英文标签
      const parts = className.split(',').map(s => s.trim());
      parts.forEach(part => {
        if (part.length > 2 && part.length < 20) {
          aiLabels.push(part);
        }
      });
    }

    // 从图片检测颜色
    detectedColor = detectDominantColor(imgElement);

    // 显示 AI 结果
    const uniqueLabels = [...new Set(aiLabels)].slice(0, 8);
    tagsDiv.innerHTML = uniqueLabels.map(label =>
      `<span class="ai-tag" onclick="applyAITag(this, '${escapeHtml(label)}')">${escapeHtml(label)}</span>`
    ).join('');

    // 自动填充
    if (detectedCategory && !document.getElementById('add-category').value) {
      document.getElementById('add-category').value = detectedCategory;
    }
    if (detectedColor && !document.getElementById('add-color').value) {
      document.getElementById('add-color').value = detectedColor;
      // 高亮颜色按钮
      document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === detectedColor);
      });
    }

    // 保存 AI 标签供后续使用
    imgElement._aiLabels = uniqueLabels;

  } catch (err) {
    console.warn('AI classification failed:', err);
    tagsDiv.innerHTML = '<span style="color:#999">识别失败，请手动添加标签</span>';
  }
}

function applyAITag(element, tag) {
  element.classList.toggle('selected');

  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    renderTags();
  }
}

// ---------- 颜色检测 ----------
function detectDominantColor(imgElement) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50;
    canvas.height = 50;
    ctx.drawImage(imgElement, 0, 0, 50, 50);

    const imageData = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < imageData.length; i += 16) { // 采样
      r += imageData[i];
      g += imageData[i + 1];
      b += imageData[i + 2];
      count++;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    return rgbToColorName(r, g, b);
  } catch {
    return '';
  }
}

function rgbToColorName(r, g, b) {
  const hsl = rgbToHsl(r, g, b);
  const [h, s, l] = hsl;

  if (l < 15) return '黑色';
  if (l > 85) return '白色';
  if (s < 15) {
    if (l < 40) return '黑色';
    if (l < 70) return '灰色';
    return '白色';
  }

  if (h < 15 || h >= 345) return '红色';
  if (h < 45) return '橙色';
  if (h < 70) return '黄色';
  if (h < 160) return '绿色';
  if (h < 200) return '蓝色';
  if (h < 260) return '紫色';
  if (h < 300) return '粉色';
  return '红色';
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// ---------- 标签管理 ----------
function renderTags() {
  const container = document.getElementById('add-tags-container');
  container.innerHTML = currentTags.map((tag, i) =>
    `<span class="tag-item">${escapeHtml(tag)}<span class="tag-remove" onclick="removeTag(${i})">&times;</span></span>`
  ).join('');
}

function removeTag(index) {
  currentTags.splice(index, 1);
  renderTags();
}

// ---------- 保存衣物 ----------
async function saveClothes() {
  const name = document.getElementById('add-name').value.trim();
  const category = document.getElementById('add-category').value;
  const color = document.getElementById('add-color').value.trim();
  const boxId = document.getElementById('add-box').value;

  if (!name) {
    showToast('请输入衣物名称');
    return;
  }
  if (!boxId) {
    showToast('请选择箱子');
    return;
  }

  const saveBtn = document.getElementById('btn-save-clothes');
  const btnText = saveBtn.querySelector('.btn-text-content');
  const btnLoading = saveBtn.querySelector('.btn-loading');
  saveBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';

  try {
    let photoUrl = '';

    // 上传图片
    if (currentPhotoData) {
      photoUrl = await uploadPhoto(currentPhotoData);
    }

    // 获取 AI 标签
    const aiLabels = [];
    const imgEl = document.getElementById('photo-img');
    if (imgEl._aiLabels) {
      aiLabels.push(...imgEl._aiLabels);
    }

    // 保存到数据库
    const { data, error } = await supabase
      .from('clothes')
      .insert({
        name,
        category,
        color,
        tags: currentTags,
        photo_url: photoUrl,
        ai_labels: aiLabels,
        box_id: boxId,
        status: 'stored',
      })
      .select()
      .single();

    if (error) throw error;

    allClothes.unshift(data);
    showToast('衣物已保存！');

    // 重置表单
    resetAddForm();
    navigateTo('home');

  } catch (err) {
    showToast('保存失败：' + err.message);
  } finally {
    saveBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

async function uploadPhoto(base64Data) {
  const fileName = `clothes/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

  // 将 base64 转为 Blob
  const response = await fetch(base64Data);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from('wardrobe-photos')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  // 获取公开 URL
  const { data: urlData } = supabase.storage
    .from('wardrobe-photos')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

function resetAddForm() {
  document.getElementById('add-name').value = '';
  document.getElementById('add-category').value = '';
  document.getElementById('add-color').value = '';
  document.getElementById('add-box').value = '';
  currentTags = [];
  currentPhotoData = null;
  renderTags();

  document.getElementById('photo-img').style.display = 'none';
  document.querySelector('.photo-placeholder').style.display = 'flex';
  document.getElementById('ai-result').style.display = 'none';
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
}

// ---------- 搜索 ----------
function doSearch() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  const container = document.getElementById('search-results');
  const emptySearch = document.getElementById('empty-search');

  let results = [...allClothes];

  // 关键词搜索
  if (query) {
    results = results.filter(c => {
      const searchableText = [
        c.name,
        c.category,
        c.color,
        ...(c.tags || []),
        ...(c.ai_labels || []),
      ].join(' ').toLowerCase();
      return searchableText.includes(query);
    });
  }

  // 分类筛选
  if (currentFilter !== 'all') {
    results = results.filter(c => c.category === currentFilter);
  }

  // 季节筛选
  if (currentSeasonFilter !== 'all') {
    const boxIds = allBoxes
      .filter(b => b.season === currentSeasonFilter || b.season === '四季')
      .map(b => b.id);
    results = results.filter(c => boxIds.includes(c.box_id));
  }

  if (results.length === 0) {
    container.innerHTML = '';
    emptySearch.style.display = 'block';
  } else {
    emptySearch.style.display = 'none';
    container.innerHTML = results.map(c => renderClothesCard(c)).join('');
  }
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-bar:first-of-type .filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  doSearch();
}

function setSeasonFilter(season, btn) {
  currentSeasonFilter = season;
  document.querySelectorAll('[data-season]').forEach(b => {
    if (b.classList.contains('filter-chip')) b.classList.remove('active');
  });
  btn.classList.add('active');
  doSearch();
}

// ---------- 设置页 ----------
function renderSettings() {
  document.getElementById('settings-url').textContent =
    localStorage.getItem('supabase_url') || '未配置';
  document.getElementById('settings-key').textContent =
    (localStorage.getItem('supabase_key') || '未配置').slice(0, 20) + '...';
}

async function exportData() {
  const data = {
    boxes: allBoxes,
    clothes: allClothes,
    exportDate: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wardrobe-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据已导出');
}

function clearAllData() {
  if (!confirm('确定要清除所有本地配置吗？这不会删除云端数据。')) return;
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_key');
  showToast('本地配置已清除，请重新启动应用');
  location.reload();
}

// ---------- 弹窗控制 ----------
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ---------- Toast 提示 ----------
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ---------- 工具函数 ----------
function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function extractStoragePath(url) {
  if (!url) return null;
  const match = url.match(/wardrobe-photos\/(.+)/);
  return match ? match[1] : null;
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
