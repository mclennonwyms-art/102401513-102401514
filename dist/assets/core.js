(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LostFoundCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ACTIVE_STATUS = { lost: '寻找中', found: '待认领' };
  const DONE_STATUS = { lost: '已找到', found: '已归还' };

  function normalizeText(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function maskContact(value) {
    const text = String(value || '').trim();
    if (text.length <= 4) return '*'.repeat(text.length);
    if (/1\d{10}/.test(text)) return text.replace(/(1\d{2})\d{4}(\d{4})/, '$1****$2');
    const prefix = text.includes('：') ? text.split('：')[0] + '：' : '';
    const body = prefix ? text.slice(prefix.length) : text;
    if (body.length <= 3) return prefix + body[0] + '**';
    return prefix + body.slice(0, 2) + '***' + body.slice(-2);
  }

  function validateItem(input) {
    const value = input || {};
    const errors = {};
    if (!['lost', 'found'].includes(value.type)) errors.type = '请选择信息类型';
    if (!String(value.title || '').trim()) errors.title = '请填写物品名称';
    else if (String(value.title).trim().length > 30) errors.title = '物品名称不能超过30个字';
    if (!String(value.category || '').trim()) errors.category = '请选择物品类别';
    if (!String(value.area || '').trim()) errors.area = '请选择所在区域';
    if (!String(value.eventDate || '').trim()) errors.eventDate = '请选择日期';
    if (!String(value.place || '').trim()) errors.place = '请填写具体地点';
    if (!String(value.desc || '').trim()) errors.desc = '请填写物品特征';
    else if (String(value.desc).trim().length < 5) errors.desc = '物品特征至少填写5个字';
    if (!String(value.contact || '').trim()) errors.contact = '请填写联系方式';
    return errors;
  }

  function iconForCategory(category) {
    return ({
      '证件卡片': '▣',
      '数码产品': '◉',
      '生活用品': '◇',
      '钥匙': '⌘',
      '书籍资料': '▤',
      '其他物品': '○'
    })[category] || '○';
  }

  function createItem(input, options) {
    const errors = validateItem(input);
    if (Object.keys(errors).length) return { ok: false, errors };
    const opts = options || {};
    const now = opts.now instanceof Date ? opts.now : new Date();
    const type = input.type;
    return {
      ok: true,
      item: {
        id: opts.id || `item-${now.getTime()}`,
        type,
        title: String(input.title).trim(),
        category: String(input.category).trim(),
        area: String(input.area).trim(),
        eventDate: String(input.eventDate).trim(),
        place: String(input.place).trim(),
        desc: String(input.desc).trim(),
        contact: String(input.contact).trim(),
        status: ACTIVE_STATUS[type],
        owner: true,
        createdAt: now.toISOString(),
        icon: iconForCategory(input.category)
      }
    };
  }

  function isDone(item) {
    return Boolean(item.withdrawn) || item.status === DONE_STATUS[item.type];
  }

  function updateItemStatus(items, id) {
    let changed = false;
    const next = items.map((item) => {
      if (String(item.id) !== String(id) || !item.owner || isDone(item)) return item;
      changed = true;
      return { ...item, status: DONE_STATUS[item.type], updatedAt: new Date().toISOString() };
    });
    return { changed, items: next };
  }

  function withdrawItem(items, id) {
    let changed = false;
    const next = items.map((item) => {
      if (String(item.id) !== String(id) || !item.owner || item.withdrawn) return item;
      changed = true;
      return { ...item, previousStatus: item.status, status: '已撤回', withdrawn: true, updatedAt: new Date().toISOString() };
    });
    return { changed, items: next };
  }

  function restoreItem(items, id) {
    let changed = false;
    const next = items.map((item) => {
      if (String(item.id) !== String(id) || !item.owner || !item.withdrawn) return item;
      changed = true;
      const { previousStatus, ...rest } = item;
      return { ...rest, status: previousStatus || ACTIVE_STATUS[item.type], withdrawn: false, updatedAt: new Date().toISOString() };
    });
    return { changed, items: next };
  }

  function filterItems(items, filters) {
    const options = filters || {};
    const query = normalizeText(options.query);
    return [...items]
      .filter((item) => options.includeWithdrawn || !item.withdrawn)
      .filter((item) => !query || normalizeText([
        item.title, item.category, item.area, item.place, item.desc
      ].join(' ')).includes(query))
      .filter((item) => !options.type || options.type === 'all' || item.type === options.type)
      .filter((item) => !options.category || options.category === '全部类别' || item.category === options.category)
      .filter((item) => !options.area || options.area === '全部区域' || item.area === options.area)
      .sort((a, b) => String(b.createdAt || b.eventDate).localeCompare(String(a.createdAt || a.eventDate)));
  }

  function addSearchHistory(history, query, limit) {
    const value = String(query || '').trim();
    if (!value) return [...history];
    const next = [value, ...history.filter((item) => item !== value)];
    return next.slice(0, limit || 5);
  }

  return {
    ACTIVE_STATUS,
    DONE_STATUS,
    normalizeText,
    escapeHtml,
    maskContact,
    validateItem,
    iconForCategory,
    createItem,
    isDone,
    updateItemStatus,
    withdrawItem,
    restoreItem,
    filterItems,
    addSearchHistory
  };
});
