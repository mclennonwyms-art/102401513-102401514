const Core = window.LostFoundCore;
const app = document.querySelector('#app');
const tabs = [...document.querySelectorAll('.tab')];
const STORAGE_KEY = 'shiguang.items.v2';
const HISTORY_KEY = 'shiguang.search-history.v2';
const CATEGORIES = ['证件卡片', '数码产品', '生活用品', '钥匙', '书籍资料', '其他物品'];
const AREAS = ['教学楼', '图书馆', '食堂', '宿舍区', '操场', '其他区域'];

const seedItems = [
  { id: 'seed-1', type: 'found', icon: '▣', title: '教学楼捡到校园卡', category: '证件卡片', place: '知明楼西门台阶', area: '教学楼', eventDate: '2026-10-07', createdAt: '2026-10-07T12:40:00+08:00', desc: '在西门台阶旁捡到一张校园卡，姓陈。为保护隐私没有展示完整学号，请失主说明学院和卡面特征。', contact: 'QQ：268135519', status: '待认领', owner: false },
  { id: 'seed-2', type: 'lost', icon: '◉', title: '寻找黑色蓝牙耳机', category: '数码产品', place: '图书馆三楼东侧', area: '图书馆', eventDate: '2026-10-07', createdAt: '2026-10-07T10:15:00+08:00', desc: '黑色入耳式蓝牙耳机，充电盒右下角有轻微划痕，可能遗落在三楼东侧自习区。', contact: '微信：LinYe2026', status: '寻找中', owner: true },
  { id: 'seed-3', type: 'found', icon: '◇', title: '食堂门口的蓝色雨伞', category: '生活用品', place: '紫荆园食堂东门', area: '食堂', eventDate: '2026-10-06', createdAt: '2026-10-06T18:30:00+08:00', desc: '蓝色折叠伞，伞柄上有一条白色挂绳，在一楼东门伞架发现。', contact: '手机：13812346021', status: '待认领', owner: false },
  { id: 'seed-4', type: 'lost', icon: '⌘', title: '丢失宿舍钥匙一串', category: '钥匙', place: '东区运动场篮球场', area: '操场', eventDate: '2026-10-06', createdAt: '2026-10-06T16:05:00+08:00', desc: '两把银色钥匙和一个橙色小挂件，可能落在篮球场或跑道边。', contact: 'QQ：104782873', status: '寻找中', owner: false },
  { id: 'seed-5', type: 'found', icon: '▤', title: '拾到《构建之法》', category: '书籍资料', place: '计算机楼 205', area: '教学楼', eventDate: '2026-10-05', createdAt: '2026-10-05T21:10:00+08:00', desc: '教室后排发现一本《构建之法》，书内有少量蓝色笔记。', contact: '微信：SEteam2026', status: '已归还', owner: true },
  { id: 'seed-6', type: 'lost', icon: '◇', title: '寻找白色保温杯', category: '生活用品', place: '学生公寓 6 号楼', area: '宿舍区', eventDate: '2026-10-05', createdAt: '2026-10-05T19:20:00+08:00', desc: '杯身有一枚蓝色贴纸，杯盖边缘有轻微磕痕。', contact: '微信：cup202606', status: '寻找中', owner: false }
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    toast('浏览器无法保存数据，请检查隐私设置');
  }
}

let items = readJson(STORAGE_KEY, null);
if (!Array.isArray(items) || !items.length) {
  items = seedItems.map((item) => ({ ...item }));
  saveJson(STORAGE_KEY, items);
}

let state = {
  route: 'home', previousRoute: 'home', homeType: 'all', query: '', searchType: 'all',
  category: '全部类别', area: '全部区域', detailId: items[0]?.id,
  contactRevealed: false, lastPublishedId: null, formErrors: {},
  formDraft: { type: 'lost', title: '', category: '', area: '', eventDate: '', place: '', desc: '', contact: '' },
  searchHistory: readJson(HISTORY_KEY, ['校园卡', '蓝牙耳机'])
};

const h = Core.escapeHtml;
const today = () => new Date().toISOString().slice(0, 10);
const typeBadge = (type) => `<span class="badge ${type}">${type === 'lost' ? '寻物' : '招领'}</span>`;
const statusPill = (item) => `<span class="status-pill ${Core.isDone(item) ? 'done' : ''}">${h(item.status)}</span>`;

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${Number(match[2])}月${Number(match[3])}日` : String(value || '日期未知');
}

function itemCard(item) {
  return `<article class="item-card" data-detail="${h(item.id)}" tabindex="0" aria-label="查看${h(item.title)}详情">
    <div class="thumb" aria-hidden="true">${h(item.icon || Core.iconForCategory(item.category))}</div>
    <div class="item-main"><div class="item-top">${typeBadge(item.type)}${statusPill(item)}</div>
      <h4>${h(item.title)}</h4><div class="meta">⌖ ${h(item.place)}<br>◷ ${formatDate(item.eventDate)}</div>
    </div></article>`;
}

function pageHead(title, back) {
  return `<div class="page-head">${back ? '<button class="back" data-back aria-label="返回">‹</button>' : '<span class="head-space"></span>'}<h2>${h(title)}</h2><span class="head-space"></span></div>`;
}

function emptyPanel(title, text, action) {
  return `<div class="state-panel"><div class="state-icon">⌕</div><h3>${h(title)}</h3><p>${h(text)}</p>${action || ''}</div>`;
}

function navigate(route) {
  state.previousRoute = state.route;
  state.route = route;
  state.contactRevealed = false;
  render();
}

function render() {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.route === state.route));
  document.querySelector('#tabbar').hidden = ['detail', 'success'].includes(state.route);
  if (state.route === 'home') renderHome();
  else if (state.route === 'search') renderSearch();
  else if (state.route === 'publish') renderPublish();
  else if (state.route === 'detail') renderDetail();
  else if (state.route === 'success') renderSuccess();
  else if (state.route === 'mine') renderMine();
  app.scrollTop = 0;
  bindEvents();
}

function renderHome() {
  const list = Core.filterItems(items, { type: state.homeType });
  const content = list.length ? `<div class="feed">${list.map(itemCard).join('')}</div>` : emptyPanel('暂时没有相关信息', '可以切换分类，或发布第一条信息。', '<button class="small-primary" data-route="publish">去发布</button>');
  app.innerHTML = `<section class="screen">
    <div class="topbar"><span class="brand-mark">拾</span><h2>拾 光</h2><button class="icon-btn" data-help aria-label="使用说明">?</button></div>
    <div class="hero-image"><div><h1>校园失物招领</h1><p>集中发布 · 快速查找 · 及时更新</p></div></div>
    <button class="home-search" data-route="search" aria-label="前往搜索"><span>⌕</span><span>搜索物品、地点或关键词</span><b>搜索</b></button>
    <div class="segmented"><button data-home-type="all" class="${state.homeType === 'all' ? 'active' : ''}">全部</button><button data-home-type="lost" class="${state.homeType === 'lost' ? 'active' : ''}">寻物</button><button data-home-type="found" class="${state.homeType === 'found' ? 'active' : ''}">招领</button></div>
    <div class="section"><div class="section-title"><h3>最新信息</h3><span>${list.length} 条</span></div>${content}</div>
  </section>`;
}

function renderSearch() {
  const results = Core.filterItems(items, { query: state.query, type: state.searchType, category: state.category, area: state.area });
  const hasConditions = state.query || state.searchType !== 'all' || state.category !== '全部类别' || state.area !== '全部区域';
  let content;
  if (!hasConditions) {
    content = `<div class="history-box"><div class="history-head"><span>最近搜索</span><button data-clear-history>清除</button></div><div class="history-list">${state.searchHistory.length ? state.searchHistory.map((value) => `<button data-query="${h(value)}"><span>◷</span>${h(value)}</button>`).join('') : '<p class="history-empty">暂无搜索记录</p>'}</div></div>
      <div class="hot-row"><b>热门搜索</b>${['校园卡', '钥匙', '雨伞', '耳机'].map((value) => `<button class="chip" data-query="${value}">${value}</button>`).join('')}</div>`;
  } else {
    content = `<div class="result-tabs"><button class="${state.searchType === 'all' ? 'active' : ''}" data-search-type="all">全部</button><button class="${state.searchType === 'lost' ? 'active' : ''}" data-search-type="lost">寻物</button><button class="${state.searchType === 'found' ? 'active' : ''}" data-search-type="found">招领</button></div>
      <div class="filter-row"><select id="categoryFilter" aria-label="按类别筛选"><option>全部类别</option>${CATEGORIES.map((value) => `<option ${state.category === value ? 'selected' : ''}>${value}</option>`).join('')}</select><select id="areaFilter" aria-label="按区域筛选"><option>全部区域</option>${AREAS.map((value) => `<option ${state.area === value ? 'selected' : ''}>${value}</option>`).join('')}</select><button data-reset-search>重置条件</button></div>
      <div class="search-status">${state.query ? `“${h(state.query)}” · ` : ''}找到 ${results.length} 条信息</div>
      ${results.length ? `<div class="feed">${results.map(itemCard).join('')}</div>` : emptyPanel('暂时没有找到相关物品', '可以更换关键词，或清除筛选条件后再试。', '<button class="small-primary" data-reset-search>清除筛选</button>')}`;
  }
  app.innerHTML = `<section class="screen">${pageHead('搜索', true)}<div class="search-page"><form id="searchForm" class="input-wrap"><input id="searchInput" value="${h(state.query)}" placeholder="输入物品名称、地点或特征" aria-label="搜索关键词"><button>搜索</button></form>${content}</div></section>`;
}

const fieldError = (name) => state.formErrors[name] ? `<small class="field-error">${h(state.formErrors[name])}</small>` : '';

function renderPublish() {
  const draft = state.formDraft;
  app.innerHTML = `<section class="screen">${pageHead('发布信息', false)}<form id="publishForm" class="form" novalidate>
    <p class="form-note">请填写真实、清楚的信息，带 * 的项目必须填写。</p>
    <div class="type-choice"><label class="${draft.type === 'lost' ? 'active' : ''}"><input type="radio" name="type" value="lost" ${draft.type === 'lost' ? 'checked' : ''}><b>我丢了物品</b><span>发布寻物信息</span></label><label class="${draft.type === 'found' ? 'active' : ''}"><input type="radio" name="type" value="found" ${draft.type === 'found' ? 'checked' : ''}><b>我捡到物品</b><span>发布招领信息</span></label></div>${fieldError('type')}
    <label class="field"><span>物品名称 *</span><input name="title" maxlength="30" value="${h(draft.title)}" placeholder="例如：黑色蓝牙耳机">${fieldError('title')}</label>
    <div class="field-row"><label class="field"><span>物品类别 *</span><select name="category"><option value="">请选择</option>${CATEGORIES.map((value) => `<option ${draft.category === value ? 'selected' : ''}>${value}</option>`).join('')}</select>${fieldError('category')}</label><label class="field"><span>所在区域 *</span><select name="area"><option value="">请选择</option>${AREAS.map((value) => `<option ${draft.area === value ? 'selected' : ''}>${value}</option>`).join('')}</select>${fieldError('area')}</label></div>
    <label class="field"><span id="dateLabel">${draft.type === 'lost' ? '丢失日期' : '拾取日期'} *</span><input name="eventDate" type="date" value="${h(draft.eventDate)}" max="${today()}">${fieldError('eventDate')}</label>
    <label class="field"><span id="placeLabel">${draft.type === 'lost' ? '丢失地点' : '拾取地点'} *</span><input name="place" maxlength="40" value="${h(draft.place)}" placeholder="例如：图书馆三楼东侧">${fieldError('place')}</label>
    <label class="field"><span>物品特征 *</span><textarea name="desc" maxlength="200" placeholder="描述颜色、外观和可以核对的特征">${h(draft.desc)}</textarea>${fieldError('desc')}</label>
    <label class="field"><span>联系方式 *</span><input name="contact" maxlength="40" value="${h(draft.contact)}" placeholder="手机号、微信或 QQ">${fieldError('contact')}</label>
    <button class="primary" type="submit">立即发布</button></form></section>`;
}

function renderDetail() {
  const item = items.find((value) => String(value.id) === String(state.detailId));
  if (!item) {
    app.innerHTML = `<section class="screen">${pageHead('信息详情', true)}${emptyPanel('信息不存在', '这条信息可能已经被删除。', '<button class="small-primary" data-route="home">返回首页</button>')}</section>`;
    return;
  }
  const contact = state.contactRevealed ? item.contact : Core.maskContact(item.contact);
  app.innerHTML = `<section class="screen">${pageHead('信息详情', true)}<div class="detail-cover"><span>${h(item.icon || Core.iconForCategory(item.category))}</span>${typeBadge(item.type)}</div><div class="detail-body">
    <div class="detail-title-row"><h1>${h(item.title)}</h1>${statusPill(item)}</div><p class="lead">${h(item.desc)}</p>
    <div class="info-grid"><div class="info-cell"><span>物品类别</span><b>${h(item.category)}</b></div><div class="info-cell"><span>${item.type === 'lost' ? '丢失日期' : '拾取日期'}</span><b>${formatDate(item.eventDate)}</b></div><div class="info-cell"><span>相关地点</span><b>${h(item.place)}</b></div><div class="info-cell"><span>所在区域</span><b>${h(item.area)}</b></div></div>
    <div class="contact-card"><div><small>发布者联系方式</small><br><b>${h(contact)}</b></div><button id="contactBtn">${state.contactRevealed ? '复制' : '查看'}</button></div>
    <p class="notice">安全提示：联系前请先核对物品特征，不要公开校园卡完整学号、证件号码等个人信息。</p>
    ${item.owner && !Core.isDone(item) ? `<button class="secondary" data-status="${h(item.id)}">${item.type === 'lost' ? '标记为已找到' : '标记为已归还'}</button>` : ''}
    ${item.owner ? (item.withdrawn ? `<button class="secondary" data-restore="${h(item.id)}">恢复发布</button>` : `<button class="danger-button" data-withdraw="${h(item.id)}">撤回这条发布</button>`) : ''}
  </div></section>`;
}

function renderSuccess() {
  app.innerHTML = `<section class="success"><div class="success-icon">✓</div><h1>发布成功</h1><p>信息已经保存并显示在首页。物品找回或归还后，请及时在“我的发布”中更新状态。</p><button class="primary" data-detail="${h(state.lastPublishedId)}">查看刚发布的信息</button><button class="secondary" data-route="mine">管理我的发布</button><button class="text-button" data-route="home">返回首页</button></section>`;
}

function renderMine() {
  const mine = Core.filterItems(items.filter((item) => item.owner), { includeWithdrawn: true });
  const activeCount = mine.filter((item) => !Core.isDone(item)).length;
  app.innerHTML = `<section class="screen"><div class="profile"><div class="avatar">拾</div><div><h2>校园用户</h2><p>${activeCount} 条进行中 · ${mine.length} 条发布记录</p></div><button class="profile-reset" data-reset-data>恢复示例</button></div>
    <div class="section-title mine-title"><h3>我的发布</h3><span>撤回后可在这里恢复</span></div><div class="mine-list">${mine.length ? mine.map((item) => `<article class="mine-card ${item.withdrawn ? 'withdrawn-card' : ''}"><header>${typeBadge(item.type)}${statusPill(item)}</header><h4>${h(item.title)}</h4><div class="meta">${h(item.place)} · ${formatDate(item.eventDate)}</div><div class="mine-actions">${item.withdrawn ? `<button data-restore="${h(item.id)}">恢复发布</button>` : `${Core.isDone(item) ? '' : `<button data-status="${h(item.id)}">${item.type === 'lost' ? '标记已找到' : '标记已归还'}</button>`}<button class="danger-link" data-withdraw="${h(item.id)}">撤回</button>`}<button data-detail="${h(item.id)}">查看详情</button></div></article>`).join('') : emptyPanel('还没有发布记录', '发布的信息会出现在这里。', '<button class="small-primary" data-route="publish">去发布</button>')}</div></section>`;
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function submitPublish(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  state.formDraft = data;
  const result = Core.createItem(data);
  if (!result.ok) {
    state.formErrors = result.errors;
    render();
    document.querySelector('.field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('请补全标出的内容');
    return;
  }
  state.formErrors = {};
  state.formDraft = { type: 'lost', title: '', category: '', area: '', eventDate: '', place: '', desc: '', contact: '' };
  items = [result.item, ...items];
  saveJson(STORAGE_KEY, items);
  state.lastPublishedId = result.item.id;
  state.detailId = result.item.id;
  navigate('success');
}

function updateStatus(id) {
  const result = Core.updateItemStatus(items, id);
  if (!result.changed) return toast('这条信息无法修改或已经结束');
  items = result.items;
  saveJson(STORAGE_KEY, items);
  toast('状态更新成功');
  render();
}

function withdrawPublication(id) {
  if (!window.confirm('确定撤回这条发布吗？撤回后首页和搜索中将不再显示，但可以在“我的发布”中恢复。')) return;
  const result = Core.withdrawItem(items, id);
  if (!result.changed) return toast('这条信息无法撤回或已经撤回');
  items = result.items;
  saveJson(STORAGE_KEY, items);
  toast('发布已撤回');
  if (state.route === 'detail') navigate('mine');
  else render();
}

function restorePublication(id) {
  const result = Core.restoreItem(items, id);
  if (!result.changed) return toast('这条信息无法恢复');
  items = result.items;
  saveJson(STORAGE_KEY, items);
  toast('发布已恢复');
  render();
}

function resetSearch() {
  state.query = '';
  state.searchType = 'all';
  state.category = '全部类别';
  state.area = '全部区域';
  render();
}

function bindEvents() {
  document.querySelectorAll('[data-route]').forEach((element) => { element.onclick = () => navigate(element.dataset.route); });
  document.querySelectorAll('[data-detail]').forEach((element) => {
    const open = () => { state.detailId = element.dataset.detail; navigate('detail'); };
    element.onclick = open;
    element.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') open(); };
  });
  document.querySelectorAll('[data-home-type]').forEach((element) => { element.onclick = () => { state.homeType = element.dataset.homeType; render(); }; });
  document.querySelectorAll('[data-search-type]').forEach((element) => { element.onclick = () => { state.searchType = element.dataset.searchType; render(); }; });
  document.querySelectorAll('[data-query]').forEach((element) => { element.onclick = () => { state.query = element.dataset.query; state.searchHistory = Core.addSearchHistory(state.searchHistory, state.query); saveJson(HISTORY_KEY, state.searchHistory); render(); }; });
  document.querySelectorAll('[data-reset-search]').forEach((element) => { element.onclick = resetSearch; });

  const searchForm = document.querySelector('#searchForm');
  if (searchForm) searchForm.onsubmit = (event) => { event.preventDefault(); state.query = document.querySelector('#searchInput').value.trim(); state.searchHistory = Core.addSearchHistory(state.searchHistory, state.query); saveJson(HISTORY_KEY, state.searchHistory); render(); };
  const categoryFilter = document.querySelector('#categoryFilter');
  if (categoryFilter) categoryFilter.onchange = () => { state.category = categoryFilter.value; render(); };
  const areaFilter = document.querySelector('#areaFilter');
  if (areaFilter) areaFilter.onchange = () => { state.area = areaFilter.value; render(); };
  const clearHistory = document.querySelector('[data-clear-history]');
  if (clearHistory) clearHistory.onclick = () => { state.searchHistory = []; saveJson(HISTORY_KEY, []); render(); };

  const publishForm = document.querySelector('#publishForm');
  if (publishForm) {
    publishForm.onsubmit = (event) => { event.preventDefault(); submitPublish(publishForm); };
    publishForm.querySelectorAll('input[name="type"]').forEach((radio) => {
      radio.onchange = () => {
        publishForm.querySelectorAll('.type-choice label').forEach((label) => label.classList.toggle('active', label.contains(radio) && radio.checked));
        document.querySelector('#dateLabel').textContent = radio.value === 'lost' ? '丢失日期 *' : '拾取日期 *';
        document.querySelector('#placeLabel').textContent = radio.value === 'lost' ? '丢失地点 *' : '拾取地点 *';
      };
    });
  }

  const back = document.querySelector('[data-back]');
  if (back) back.onclick = () => navigate(state.previousRoute === 'detail' ? 'home' : state.previousRoute || 'home');
  const contact = document.querySelector('#contactBtn');
  if (contact) contact.onclick = async () => {
    const item = items.find((value) => String(value.id) === String(state.detailId));
    if (!item) return;
    if (!state.contactRevealed) { state.contactRevealed = true; render(); toast('请核对物品特征后再联系'); }
    else { await copyText(item.contact); toast('联系方式已复制'); }
  };
  document.querySelectorAll('[data-status]').forEach((element) => { element.onclick = () => updateStatus(element.dataset.status); });
  document.querySelectorAll('[data-withdraw]').forEach((element) => { element.onclick = () => withdrawPublication(element.dataset.withdraw); });
  document.querySelectorAll('[data-restore]').forEach((element) => { element.onclick = () => restorePublication(element.dataset.restore); });
  const resetData = document.querySelector('[data-reset-data]');
  if (resetData) resetData.onclick = () => { if (!window.confirm('确定恢复示例数据吗？你后来发布的内容会被清除。')) return; items = seedItems.map((item) => ({ ...item })); saveJson(STORAGE_KEY, items); toast('示例数据已恢复'); render(); };
  const help = document.querySelector('[data-help]');
  if (help) help.onclick = () => toast('从首页浏览，或使用底部按钮搜索、发布和管理信息');
}

tabs.forEach((tab) => { tab.onclick = () => navigate(tab.dataset.route); });
document.querySelectorAll('[data-demo]').forEach((button) => {
  button.onclick = () => {
    if (button.dataset.demo === 'browse') { state.detailId = items[0]?.id; navigate('detail'); }
    if (button.dataset.demo === 'publish') navigate('publish');
    if (button.dataset.demo === 'search') { state.query = '校园卡'; navigate('search'); }
  };
});

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => element.classList.remove('show'), 1800);
}

const params = new URLSearchParams(location.search);
if (['home', 'search', 'publish', 'mine'].includes(params.get('view'))) state.route = params.get('view');
render();
