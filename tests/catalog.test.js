import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { classItemsFor, collectMaterials, craftBosses, craftBossIdsFor, filterItems, forgeFor, forges, greatForgeCategoryFor, greatForgeTabs, itemLevels, matchesLevel, normalize, recipeSourcesFor } from '../src/catalog.js'

const items = JSON.parse(readFileSync(new URL('../src/data/items.json', import.meta.url), 'utf8'))
const byId = new Map(items.map(item => [item.id, item]))
const mapReport = JSON.parse(readFileSync(new URL('../source/map-report.json', import.meta.url), 'utf8'))
const objects = JSON.parse(readFileSync(new URL('../source/map-objects.json', import.meta.url), 'utf8')).objects
const objectsByCode = new Map(objects.map(object => [object.rawcode, object]))

test('Forge sections use recipe locations and the old site ordinary forge grouping', () => {
  assert.deepEqual(forges.map(forge => forge.name), ['Кузница', 'Великая кузница', 'Ангельская кузница', 'Демоническая кузница', 'Драконья кузница', 'Драгоценности'])
  assert.equal(forgeFor(items.find(item => item.name === 'Сет Рабовладельца')), null)
  assert.equal(forgeFor(items.find(item => item.name === 'Сет Рабовладельца v2.0')), 'angelic')
  assert.equal(forgeFor(items.find(item => item.name === 'Сет Алчности v2.0')), 'demonic')
  assert.equal(forgeFor(items.find(item => item.name === 'Арканитовый пулемет')), 'forge')
  assert.equal(forgeFor(items.find(item => item.name === 'Осколок тьмы')), 'forge')
  assert.equal(forgeFor(items.find(item => item.name === 'Ружье')), null)
  assert.ok(items.some(item => forgeFor(item) === 'dragon'))
})

test('Jewelry is duplicated by existing IDs and excludes boss drops and their crafts', () => {
  const jewels = forges.find(group => group.id === 'jewels')
  assert.equal(new Set(jewels.itemIds).size, jewels.itemIds.length)
  assert.ok(jewels.itemIds.every(id => byId.has(id) && !byId.get(id).hidden))
  for (const name of ['Рубиновое кольцо', 'Рубиновый демоно-перстень']) assert.ok(jewels.itemIds.includes(items.find(item => item.name === name).id))
  for (const name of ['Перстень Алчности', 'Рубиновый адский перстень', 'Кольцо Истинной Смерти', 'Амулет Смерти']) assert.ok(!jewels.itemIds.includes(items.find(item => item.name === name).id))
})

test('Great Forge partitions sets, nested boss crafts, class gear and remaining artifacts', () => {
  const find = name => items.find(item => item.name === name)
  assert.equal(greatForgeCategoryFor(find('Сет Рабовладельца')), 'sets')
  assert.equal(greatForgeCategoryFor(find('Амулет продажности')), 'boss')
  assert.equal(greatForgeCategoryFor(find('Нестабильный конвертер')), 'kv')
  assert.equal(greatForgeCategoryFor(find('Рубиновый демоно-перстень')), 'arts')
  assert.deepEqual(greatForgeTabs.map(tab => tab.id), ['boss', 'arts'])
  const groups = greatForgeTabs.map(tab => items.filter(item => forgeFor(item) === 'great' && greatForgeCategoryFor(item) === tab.id))
  assert.ok(groups.every(group => group.length > 0))
  assert.equal(groups.flat().length, items.filter(item => forgeFor(item) === 'great').length)
})

test('Great Forge excludes class gear and sets; jewelry is kept only in its own craft group', () => {
  const jewels = forges.find(group => group.id === 'jewels')
  assert.ok(jewels.itemIds.every(id => forgeFor(byId.get(id)) === null))
  const great = items.filter(item => forgeFor(item) === 'great')
  assert.ok(great.every(item => !item.classes.length && !/(?:^|\s)сет(?:\s|$)/i.test(item.name)))
  assert.ok(items.some(item => item.name === 'Сет Рабовладельца' && !item.hidden))
})

test('Every Great Forge boss craft belongs only to the latest required boss', () => {
  const bossCrafts = items.filter(item => forgeFor(item) === 'great' && greatForgeCategoryFor(item) === 'boss')
  assert.ok(bossCrafts.every(item => craftBossIdsFor(item).length === 1))
  assert.deepEqual(craftBossIdsFor(items.find(item => item.name === 'Амулет продажности')), ['greed'])
  assert.deepEqual(craftBossIdsFor({ ingredients: [{ itemId: 'item-100' }, { itemId: 'item-128' }, { itemId: 'item-100' }] }), ['guardian'])
})

test('Boss crafts follow encounter order and include repaired and nested trophies', () => {
  assert.deepEqual(craftBosses.slice(0, 13).map(boss => boss.id), ['arachnid', 'slavemaster', 'guardian', 'excavator', 'lust', 'bombs', 'greed', 'hazul', 'fear', 'handler', 'envy', 'shizzl', 'death'])
  const expected = {
    'Пылающий восполнитель': 'bombs',
    'Деталь Сапогов Зоофила': 'hazul',
    'Сапоги Зоофила': 'handler',
    'Арахнидский камень': 'arachnid',
    'Шторм': 'handler',
    'Украденный свет': 'envy',
    'Дух проклятого Зверя': 'envy',
    'Шлем Воеводы': 'shizzl',
    'Бесконечная микстура интеллекта': 'shizzl',
  }
  for (const [name, boss] of Object.entries(expected)) {
    const item = items.find(item => item.name === name)
    assert.deepEqual(craftBossIdsFor(item), [boss], name)
    assert.equal(greatForgeCategoryFor(item), 'boss', name)
  }
  for (const name of ['Око демона', 'Мощь', 'Набор алмазных отмычек']) {
    assert.deepEqual(craftBossIdsFor(items.find(item => item.name === name)), [], name)
    assert.equal(greatForgeCategoryFor(items.find(item => item.name === name)), 'arts', name)
  }
})

test('Boss classification follows nested recipes safely through cycles and unknown parts', () => {
  const a = { id: 'a', ingredients: [{ itemId: 'b' }, { itemId: 'item-100' }] }
  const b = { id: 'b', ingredients: [{ itemId: 'a' }, { itemId: 'item-254' }, { name: 'Неизвестный материал' }] }
  assert.deepEqual(craftBossIdsFor(a, new Map([['a', a], ['b', b]])), ['hazul'])
  assert.deepEqual(craftBossIdsFor({ ingredients: [{ name: 'Любая часть Дрессировщика' }, { name: 'Любая часть сета Страха' }] }), ['handler'])
})

test('Boss groups cover every set once in encounter order with local icons', () => {
  const bosses = JSON.parse(readFileSync(new URL('../src/data/bosses.json', import.meta.url), 'utf8'))
  assert.equal(bosses.length, 13)
  assert.equal(bosses[0].name, 'Гигантский арахнид')
  assert.equal(bosses.at(-1).name, 'Смерть')
  const ids = bosses.flatMap(boss => boss.itemIds)
  const sets = items.filter(item => !item.hidden && /(?:^|\s)сет(?:\s|$)/i.test(item.name))
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual([...ids].sort(), sets.map(item => item.id).sort())
  for (const boss of bosses) assert.ok(existsSync(new URL(`../public/${boss.icon}`, import.meta.url)))
})

test('Class lists include class sets and shared weapons but exclude starter weapons', () => {
  const engineer = classItemsFor(items, 'Инженер')
  assert.ok(engineer.some(item => item.name === 'Сет Рабовладельца'))
  assert.ok(engineer.some(item => item.name === 'Сет Рабовладельца v2.0'))
  const gunner = classItemsFor(items, 'Пулемётчик')
  assert.ok(gunner.some(item => item.name === 'Ручной акселератор'))
  assert.ok(!gunner.some(item => ['Пулемет', 'Арканитовый пулемет'].includes(item.name)))
  assert.ok(classItemsFor(items, 'Снайпер').some(item => item.name === 'Бронированная снайперка'))
  assert.ok(classItemsFor(items, 'Сталкер').some(item => item.name === 'Бронированная снайперка'))
  assert.ok(engineer.every(item => !item.hidden && item.level !== 1 && item.classes.includes('Инженер')))
})

test('Imported catalog contains unique records, valid links and local icons', () => {
  assert.equal(items.length, 479)
  assert.equal(byId.size, items.length)
  for (const item of items) {
    assert.ok(item.name.trim())
    if (item.icon) assert.ok(existsSync(new URL(`../public/icons/${item.icon}`, import.meta.url)))
    for (const part of item.ingredients) {
      assert.ok(Number.isInteger(part.count) && part.count > 0)
      if (part.itemId) {
        assert.ok(byId.has(part.itemId))
        assert.equal(normalize(part.name), normalize(byId.get(part.itemId).name))
        assert.notEqual(part.itemId, item.id)
      }
    }
  }
})

test('Search normalizes ё and punctuation and combines class, level and favorites', () => {
  const rifle = items.find(item => item.name === 'Ружье')
  assert.ok(filterItems(items, { query: 'ружьё', className: 'Снайпер', level: '1' }).some(item => item.id === rifle.id))
  assert.equal(filterItems(items, { category: 'favorites', favorites: [rifle.id] }).length, 1)
  assert.equal(filterItems(items, { query: '___невозможный предмет___' }).length, 0)
  assert.equal(filterItems(items, { category: 'favorites' }).length, 0)
})

test('Level filtering follows unique game levels, inclusive ranges and exact selections', () => {
  const source = [{ level: 35 }, { level: 10 }, { level: 25 }, { level: 10 }, { level: null }]
  assert.deepEqual(itemLevels(source), [10, 25, 35])
  assert.deepEqual(source.filter(item => matchesLevel(item, { mode: 'range', min: 10, max: 25 })).map(item => item.level), [10, 25, 10])
  assert.deepEqual(source.filter(item => matchesLevel(item, { mode: 'exact', level: 25 })).map(item => item.level), [25])
  assert.ok(matchesLevel({ level: null }, { mode: 'range', all: true }))
  assert.ok(!matchesLevel({ level: null }, { mode: 'exact', level: 25 }))
})

test('Search finds ingredient names absent from recipe text within the supplied group', () => {
  const source = [
    { id: 'a', name: 'Основа', description: '', recipe: '', classes: [], level: 10, ingredients: [{ name: 'Зелёный кристалл' }] },
    { id: 'b', name: 'Броня', description: '', recipe: '', classes: [], level: 25, ingredients: [] },
    { id: 'c', name: 'Скрытое', description: '', recipe: '', classes: [], hidden: true, ingredients: [{ name: 'Зелёный кристалл' }] },
  ]
  const levels = itemLevels(source)
  assert.deepEqual(filterItems(source, { query: 'ЗЕЛЕНЫЙ-кристалл' }).map(item => item.id), ['a'])
  assert.deepEqual(filterItems(source.slice(1), { query: 'зелёный кристалл' }), [])
  assert.deepEqual(itemLevels(source), levels)
})

test('Recipe sources preserve confirmed lines and do not expose ingredients as locations', () => {
  assert.deepEqual(recipeSourcesFor({ sourceNote: 'Кузница', recipe: 'Слиток + уголь', ingredients: [{ name: 'Слиток' }, { name: 'Кузница', source: true }, { name: '(Плавильная печь)', source: true }] }), ['Кузница', '(Плавильная печь)'])
  assert.deepEqual(recipeSourcesFor({ sourceNote: '', recipe: 'Портал в Пиратскую Бухту', ingredients: [] }), ['Портал в Пиратскую Бухту'])
  assert.deepEqual(recipeSourcesFor({ sourceNote: '', recipe: 'Слиток', ingredients: [{ name: 'Слиток' }] }), [])
  assert.deepEqual(recipeSourcesFor(null), [])
})

test('Nested materials multiply quantities, merge shared components and retain source lines', () => {
  const leaf = { id: 'leaf', name: 'Слиток', ingredients: [] }
  const middle = { id: 'middle', name: 'Основа', ingredients: [{ name: 'Слиток', itemId: 'leaf', count: 3 }] }
  const root = { id: 'root', name: 'Броня', ingredients: [{ name: 'Основа', itemId: 'middle', count: 2 }, { name: 'Слиток', itemId: 'leaf', count: 1 }, { name: 'Дроп с босса', itemId: null, count: 1, source: true }] }
  const map = new Map([leaf, middle, root].map(item => [item.id, item]))
  const result = collectMaterials(root, 2, map)
  assert.equal(result.find(part => part.id === 'leaf').count, 14)
  assert.equal(result.find(part => part.name === 'Дроп с босса').source, true)
})

test('Cyclic recipes terminate and report the unresolved cycle', () => {
  const a = { id: 'a', name: 'A', ingredients: [{ name: 'B', itemId: 'b', count: 1 }] }
  const b = { id: 'b', name: 'B', ingredients: [{ name: 'A', itemId: 'a', count: 1 }] }
  const result = collectMaterials(a, 3, new Map([['a', a], ['b', b]]))
  assert.equal(result[0].cycle, true)
  assert.equal(result[0].count, 3)
})

test('Map mappings and recipes point to real objects and preserve CSV recipes', () => {
  assert.equal(objects.length, 920)
  assert.equal(mapReport.matchedCatalogCount, 471)
  assert.equal(items.filter(item => item.iconSource === 'map').length, 195)
  assert.equal(items.filter(item => item.iconSource === 'game').length, 276)
  assert.equal(items.filter(item => item.mapObjectIds?.length && !item.icon).length, 0)
  for (const item of items) {
    for (const code of item.mapObjectIds || []) assert.ok(objectsByCode.has(code))
    if (item.iconSource === 'map' || item.iconSource === 'game') {
      assert.ok(mapReport.iconFiles[item.icon])
      const png = readFileSync(new URL(`../public/icons/${item.icon}`, import.meta.url))
      assert.equal(png.subarray(1, 4).toString(), 'PNG')
      assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0)
    }
    for (const recipe of item.mapRecipes || []) {
      assert.ok(item.mapObjectIds.includes(recipe.resultId))
      for (const part of recipe.ingredients) assert.ok(objectsByCode.has(part.rawcode))
    }
  }
  const costume = items.find(item => item.name === 'Спец-костюм')
  assert.equal(costume.mapRecipes[0].resultId, 'I0N0')
  assert.equal(costume.mapRecipes[0].ingredients.filter(part => part.rawcode === 'I0NC').length, 2)
  assert.ok(costume.recipe.includes('Осколок высших душ'))
  assert.equal(items.find(item => item.name === 'Испепелитель').mapObjectIds, undefined)
  assert.equal(items.filter(item => item.hidden).length, 8)
  assert.equal(items.filter(item => !item.hidden).length, 471)
  assert.ok(items.filter(item => !item.hidden).every(item => item.icon && ['map', 'game'].includes(item.iconSource)))
  assert.equal(filterItems(items, { query: 'Испепелитель' }).length, 0)
})
