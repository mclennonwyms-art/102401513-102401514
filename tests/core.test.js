const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../dist/assets/core.js');

const sampleItems = [
  { id: '1', type: 'found', title: '蓝色校园卡', category: '证件卡片', area: '教学楼', place: '知明楼西门', desc: '卡面为蓝色', status: '待认领', owner: false, createdAt: '2026-10-06T10:00:00Z' },
  { id: '2', type: 'lost', title: '黑色蓝牙耳机', category: '数码产品', area: '图书馆', place: '三楼自习区', desc: '盒子有划痕', status: '寻找中', owner: true, createdAt: '2026-10-07T10:00:00Z' },
  { id: '3', type: 'found', title: '折叠雨伞', category: '生活用品', area: '食堂', place: '紫荆园东门', desc: '白色挂绳', status: '已归还', owner: true, createdAt: '2026-10-05T10:00:00Z' }
];

test('关键词搜索可以匹配物品名称', () => {
  assert.deepEqual(Core.filterItems(sampleItems, { query: '耳机' }).map((item) => item.id), ['2']);
});

test('关键词搜索可以匹配具体地点', () => {
  assert.deepEqual(Core.filterItems(sampleItems, { query: '西门' }).map((item) => item.id), ['1']);
});

test('搜索忽略关键词前后空格和英文大小写', () => {
  const items = [{ ...sampleItems[0], title: 'AirPods 耳机' }];
  assert.equal(Core.filterItems(items, { query: '  airpods ' }).length, 1);
});

test('可以只筛选寻物信息', () => {
  assert.deepEqual(Core.filterItems(sampleItems, { type: 'lost' }).map((item) => item.id), ['2']);
});

test('可以按类别和区域组合筛选', () => {
  const result = Core.filterItems(sampleItems, { category: '证件卡片', area: '教学楼' });
  assert.deepEqual(result.map((item) => item.id), ['1']);
});

test('查询结果按发布时间从新到旧排列', () => {
  assert.deepEqual(Core.filterItems(sampleItems, {}).map((item) => item.id), ['2', '1', '3']);
});

test('空表单会返回所有必填项错误', () => {
  const errors = Core.validateItem({});
  assert.deepEqual(Object.keys(errors).sort(), ['area', 'category', 'contact', 'desc', 'eventDate', 'place', 'title', 'type']);
});

test('过短的物品特征不能发布', () => {
  const errors = Core.validateItem({ type: 'lost', title: '钥匙', category: '钥匙', area: '操场', eventDate: '2026-10-07', place: '跑道', desc: '黑色', contact: '123' });
  assert.equal(errors.desc, '物品特征至少填写5个字');
});

test('创建寻物信息时初始状态为寻找中', () => {
  const result = Core.createItem({ type: 'lost', title: '  黑色耳机  ', category: '数码产品', area: '图书馆', eventDate: '2026-10-07', place: '三楼', desc: '黑色盒子有划痕', contact: '微信 abc' }, { id: 'new-1', now: new Date('2026-10-07T12:00:00Z') });
  assert.equal(result.ok, true);
  assert.equal(result.item.title, '黑色耳机');
  assert.equal(result.item.status, '寻找中');
  assert.equal(result.item.owner, true);
});

test('创建招领信息时初始状态为待认领', () => {
  const result = Core.createItem({ type: 'found', title: '校园卡', category: '证件卡片', area: '教学楼', eventDate: '2026-10-07', place: '一楼', desc: '蓝色校园卡一张', contact: 'QQ 123456' });
  assert.equal(result.item.status, '待认领');
});

test('发布者可以把寻物信息改为已找到', () => {
  const result = Core.updateItemStatus(sampleItems, '2');
  assert.equal(result.changed, true);
  assert.equal(result.items.find((item) => item.id === '2').status, '已找到');
});

test('不能修改并非自己发布的信息', () => {
  const result = Core.updateItemStatus(sampleItems, '1');
  assert.equal(result.changed, false);
  assert.equal(result.items.find((item) => item.id === '1').status, '待认领');
});

test('已经结束的信息不会被重复更新', () => {
  const result = Core.updateItemStatus(sampleItems, '3');
  assert.equal(result.changed, false);
});

test('手机号码会隐藏中间四位', () => {
  assert.equal(Core.maskContact('手机：13812346021'), '手机：138****6021');
});

test('搜索记录去重并把最新关键词放在前面', () => {
  assert.deepEqual(Core.addSearchHistory(['钥匙', '校园卡'], '校园卡'), ['校园卡', '钥匙']);
});

test('搜索记录最多保留指定数量', () => {
  assert.deepEqual(Core.addSearchHistory(['二', '三', '四'], '一', 3), ['一', '二', '三']);
});

test('用户输入在显示前会转义特殊字符', () => {
  assert.equal(Core.escapeHtml('<script>'), '&lt;script&gt;');
});

test('发布者可以撤回自己的信息', () => {
  const result = Core.withdrawItem(sampleItems, '2');
  const item = result.items.find((value) => value.id === '2');
  assert.equal(result.changed, true);
  assert.equal(item.status, '已撤回');
  assert.equal(item.withdrawn, true);
});

test('不能撤回其他人发布的信息', () => {
  const result = Core.withdrawItem(sampleItems, '1');
  assert.equal(result.changed, false);
});

test('撤回的信息默认不会出现在浏览和搜索结果中', () => {
  const withdrawn = Core.withdrawItem(sampleItems, '2').items;
  assert.equal(Core.filterItems(withdrawn, {}).some((item) => item.id === '2'), false);
  assert.equal(Core.filterItems(withdrawn, { includeWithdrawn: true }).some((item) => item.id === '2'), true);
});

test('撤回的信息可以恢复到之前的状态', () => {
  const withdrawn = Core.withdrawItem(sampleItems, '2').items;
  const result = Core.restoreItem(withdrawn, '2');
  const item = result.items.find((value) => value.id === '2');
  assert.equal(result.changed, true);
  assert.equal(item.status, '寻找中');
  assert.equal(item.withdrawn, false);
});
