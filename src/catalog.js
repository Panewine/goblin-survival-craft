import { legacyForgeItemIds, jewelItemIds } from './data/legacy-craft-groups.js'
import { bossByDropId } from './data/boss-drop-ids.js'
import bosses from './data/bosses.json' with { type: 'json' }
import items from './data/items.json' with { type: 'json' }

const catalogById = new Map(items.map(item => [item.id, item]))
export const craftBosses = [...bosses, { id: 'dragon', name: 'Дракон', icon: './icons/forges/dragon.png' }]
const bossOrder = new Map(craftBosses.map((boss, index) => [boss.id, index]))
const bossIngredientAliases = {
  'любаячастьдрессировщика': 'handler',
  'любаячастьсетастраха': 'fear',
  'любаячастьсетаалчности': 'greed',
  'порванаясетьдрессировщика': 'handler',
}
const jewels = new Set(jewelItemIds)
export const greatForgeTabs = [
  { id: 'boss', name: 'Крафт с босса' },
  { id: 'arts', name: 'Арты' },
]
export function greatForgeCategoryFor(item) {
  if (/(?:^|\s)сет(?:\s|$)/i.test(item.name)) return 'sets'
  if (item.classes.length) return 'kv'
  if (craftBossIdsFor(item).length) return 'boss'
  return 'arts'
}
export function craftBossIdsFor(item, byId = catalogById) {
  const visited = new Set()
  let latestBoss = null
  function includeBoss(id) {
    if (id && (latestBoss === null || bossOrder.get(id) > bossOrder.get(latestBoss))) latestBoss = id
  }
  function visit(current) {
    if (!current || visited.has(current)) return
    visited.add(current)
    includeBoss(bossByDropId[current.id])
    for (const part of current.ingredients || []) {
      includeBoss(bossByDropId[part.itemId])
      if (!part.itemId) includeBoss(bossIngredientAliases[normalize(part.name)])
      visit(byId.get(part.itemId))
    }
  }
  visit(item)
  return latestBoss ? [latestBoss] : []
}

export const categories = [
  { id: 'all', name: 'Все предметы', icon: 'grid' },
  { id: 'kv', name: 'КВ', icon: 'sword' },
  { id: 'sets', name: 'Сеты', icon: 'shield' },
  { id: 'craft', name: 'Крафт', icon: 'hammer' },
  { id: 'food', name: 'Еда', icon: 'leaf' },
  { id: 'favorites', name: 'Избранное', icon: 'star' },
]
export function parentCategoryFor(item) {
  if (item.kind === 'food' || /энергетик/i.test(item.name)) return 'food'
  if (/(?:^|\s)сет(?:\s|$)/i.test(item.name)) return 'sets'
  if (item.classes.length) return 'kv'
  return 'craft'
}
export const parentCategoryLabel = (item) => categories.find(entry => entry.id === parentCategoryFor(item))?.name
export const normalize = (value) => String(value).toLocaleLowerCase('ru').replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, '')
export const iconFor = (item) => `./icons/${item?.icon || 'question-wc3.png'}`
export const itemLevels = items => [...new Set(items.map(item => item.level).filter(level => Number.isFinite(level)))].sort((a, b) => a - b)
export function matchesLevel(item, selection) {
  if (!selection || selection.mode === 'range' && selection.all) return true
  if (!Number.isFinite(item.level)) return false
  return selection.mode === 'exact' ? item.level === selection.level : item.level >= selection.min && item.level <= selection.max
}

export const forges = [
  { id: 'forge', name: 'Кузница', icon: './icons/forges/forge.png' },
  { id: 'great', name: 'Великая кузница', icon: './icons/forges/great.png' },
  { id: 'angelic', name: 'Ангельская кузница', icon: './icons/forges/angelic.png' },
  { id: 'demonic', name: 'Демоническая кузница', icon: './icons/forges/demonic.png' },
  { id: 'dragon', name: 'Драконья кузница', icon: './icons/forges/dragon.png' },
  { id: 'jewels', name: 'Драгоценности', icon: './icons/map-3facd98a9c44f0aa.png', itemIds: jewelItemIds },
]

export function forgeFor(item) {
  if (item.hidden || item.kind === 'food' || jewels.has(item.id)) return null
  const recipe = normalize(item.recipe)
  if (recipe.includes('великойкузнице')) return item.classes.length || parentCategoryFor(item) === 'sets' ? null : 'great'
  if (recipe.includes('ангельскойкузнице')) return 'angelic'
  if (recipe.includes('демоническойкузнице')) return 'demonic'
  if (recipe.includes('драконьейкузнице')) return 'dragon'
  if (recipe.includes('кузнице')) return 'forge'
  if (legacyForgeItemIds.includes(item.id)) return 'forge'
  return null
}

export function classItemsFor(items, className) {
  return items.filter(item => !item.hidden && item.level !== 1 &&
    item.classes.some(value => normalize(value) === normalize(className)))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.row - b.row)
}

export function filterItems(items, { query = '', category = 'all', className = '', level = '', favorites = [], sort = 'source' } = {}) {
  const search = normalize(query)
  const result = items.filter(item =>
    !item.hidden &&
    (category === 'all' || (category === 'favorites' ? favorites.includes(item.id) : parentCategoryFor(item) === category)) &&
    (!className || item.classes.some(value => normalize(value) === normalize(className))) &&
    (!level || (level === 'none' ? item.level === null : item.level === Number(level))) &&
    (!search || normalize(`${item.name} ${item.description} ${item.recipe} ${item.ingredients.map(part => part.name).join(' ')}`).includes(search)))
  if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  if (sort === 'level') result.sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
  return result
}

export function recipeSourcesFor(item) {
  if (!item) return []
  const sources = [item.sourceNote, ...item.ingredients.filter(part => part.source).map(part => part.name)]
  if (!item.ingredients.length) sources.push(item.recipe)
  return [...new Set(sources.map(value => String(value || '').trim()).filter(Boolean))]
}

// Only uniquely linked catalog entries can be expanded. Source/location lines stay visible.
export function collectMaterials(item, quantity, byId, path = new Set()) {
  if (path.has(item.id)) return [{ name: item.name, count: quantity, id: item.id, cycle: true }]
  const nextPath = new Set([...path, item.id])
  if (!item.ingredients.length) return [{ name: item.name, count: quantity, id: item.id }]
  const materials = item.ingredients.flatMap(part => {
    const linked = byId.get(part.itemId)
    return linked ? collectMaterials(linked, part.count * quantity, byId, nextPath)
      : [{ name: part.name, count: part.count * quantity, id: null, source: Boolean(part.source) }]
  })
  const merged = new Map()
  for (const material of materials) {
    const key = material.id || material.name
    const previous = merged.get(key)
    if (previous) previous.count += material.count
    else merged.set(key, { ...material })
  }
  return [...merged.values()]
}
