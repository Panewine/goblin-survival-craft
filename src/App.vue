<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import mapInfo from './data/map-info.json'
import classes from './data/classes.json'
import bosses from './data/bosses.json'
import items from './data/items.json'
import { categories, classItemsFor, craftBosses, craftBossIdsFor, filterItems, forgeFor, forges, greatForgeCategoryFor, greatForgeTabs, iconFor, itemLevels, matchesLevel, recipeSourcesFor } from './catalog'
import Icon from './Icon.vue'
import vFitCardTitle from './fit-card-title'
import LevelFilter from './LevelFilter.vue'

const publicAssetBase = import.meta.env.BASE_URL
const category = ref('all'), mobileNav = ref(false)
const compactViewport = window.matchMedia('(max-width: 960px)')
const isCompact = ref(compactViewport.matches)
const recipePane = ref(null)
function updateCompactViewport(event) { isCompact.value = event.matches }
const selectedGroup = ref(null)
const greatForgeTab = ref('boss')
const selectedCraftBoss = ref(null)
const isGreatForge = computed(() => category.value === 'craft' && selectedGroup.value?.id === 'great')
const query = ref('')
const directCatalog = computed(() => ['all', 'favorites', 'food'].includes(category.value))
const groups = computed(() => category.value === 'sets' ? bosses : category.value === 'craft' ? forges : classes)
function readClassView() { try { return localStorage.getItem('goblin-view') === 'list' ? 'list' : 'grid' } catch { return 'grid' } }
const classView = ref(readClassView())
watch(classView, value => { try { localStorage.setItem('goblin-view', value) } catch {} })
const selectedItem = ref(null)
const recipeSources = computed(() => recipeSourcesFor(selectedItem.value))
const recipeIngredients = computed(() => selectedItem.value?.ingredients.filter(part => !part.source) || [])
const byId = new Map(items.filter(item => !item.hidden).map(item => [item.id, item]))
const usedIn = computed(() => selectedItem.value ? items.filter(item => !item.hidden && item.ingredients.some(part => part.itemId === selectedItem.value.id)) : [])
function openItem(item) {
  selectedItem.value = item
}
function closeRecipe() { selectedItem.value = null }
function onRecipeBackdrop(event) {
  if (!isCompact.value || event.target !== event.currentTarget) return
  const bounds = event.currentTarget.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeRecipe()
}
watch([selectedItem, isCompact], () => {
  const pane = recipePane.value
  if (!isCompact.value || !pane) return
  if (selectedItem.value) { if (!pane.open) pane.showModal(); pane.scrollTop = 0 }
  else if (pane.open) pane.close()
}, { flush: 'post' })
const groupItems = computed(() => directCatalog.value ? filterItems(items, { category: category.value, favorites: favorites.value }) : !selectedGroup.value ? [] : selectedGroup.value.itemIds ? selectedGroup.value.itemIds.map(id => byId.get(id)).filter(Boolean) : category.value === 'craft' ? items.filter(item => forgeFor(item) === selectedGroup.value.id) : classItemsFor(items, selectedGroup.value.name))
const bossCraftGroups = computed(() => {
  const assignments = groupItems.value.map(item => ({ item, bossId: craftBossIdsFor(item)[0] }))
  return craftBosses.map(boss => ({ ...boss, items: assignments.filter(entry => entry.bossId === boss.id).map(entry => entry.item) })).filter(boss => boss.items.length)
})
const activeCraftBoss = computed(() => bossCraftGroups.value.find(boss => boss.id === selectedCraftBoss.value) || bossCraftGroups.value[0])
const unfilteredItems = computed(() => isGreatForge.value ? greatForgeTab.value === 'boss' ? activeCraftBoss.value?.items || [] : groupItems.value.filter(item => greatForgeCategoryFor(item) === greatForgeTab.value) : groupItems.value)
const levelSelection = ref(null)
const filterRevision = ref(0)
const levelSteps = computed(() => itemLevels(unfilteredItems.value))
const levelScope = computed(() => `${category.value}:${selectedGroup.value?.id || ''}:${greatForgeTab.value}:${activeCraftBoss.value?.id || ''}`)
const classItems = computed(() => filterItems(unfilteredItems.value, { query: query.value }).filter(item => matchesLevel(item, levelSelection.value)))
const hasFilters = computed(() => Boolean(query.value || levelSelection.value && !(levelSelection.value.mode === 'range' && levelSelection.value.all)))
function resetFilters() { query.value = ''; levelSelection.value = null; filterRevision.value += 1 }
const greatForgeCounts = computed(() => Object.fromEntries(greatForgeTabs.map(tab => [tab.id, groupItems.value.filter(item => greatForgeCategoryFor(item) === tab.id).length])))
function readFavorites() { try { const value = JSON.parse(localStorage.getItem('goblin-favorites') || '[]'); return Array.isArray(value) ? value.filter(id => byId.has(id)) : [] } catch { return [] } }
const favorites = ref(readFavorites())
watch(levelScope, resetFilters)
function toggleFavorite(id) { favorites.value = favorites.value.includes(id) ? favorites.value.filter(value => value !== id) : [...favorites.value, id] }
watch(favorites, value => { try { localStorage.setItem('goblin-favorites', JSON.stringify(value)) } catch {} })
watch(selectedGroup, () => { closeRecipe(); greatForgeTab.value = 'boss'; selectedCraftBoss.value = null })
watch(greatForgeTab, closeRecipe)
watch(selectedCraftBoss, closeRecipe)
const heading = computed(() => categories.find(entry => entry.id === category.value)?.name)
const visibleCount = items.filter(item => !item.hidden).length
const sectionDescription = computed(() => ({ all: 'Оружие, артефакты и всё, что пригодится в выживании.', kv: 'Выбери своего гоблина и найди подходящую экипировку.', sets: 'Трофеи боссов и комплекты для следующего сражения.', craft: 'Рецепты по кузницам — от первых деталей до легендарных предметов.', food: 'Еда и припасы для твоего следующего приключения.', favorites: 'Нужные рецепты всегда под рукой.' }[category.value]))
function chooseCategory(id) { category.value = id; mobileNav.value = false; selectedGroup.value = null; query.value = ''; closeRecipe() }
function onKey(event) { if (event.key === 'Escape') { mobileNav.value = false; closeRecipe() } }
onMounted(() => { window.addEventListener('keydown', onKey); compactViewport.addEventListener('change', updateCompactViewport) })
onUnmounted(() => { window.removeEventListener('keydown', onKey); compactViewport.removeEventListener('change', updateCompactViewport) })
</script>

<template>
  <div class="workshop">
    <div v-if="mobileNav" class="mobile-nav-backdrop" @click="mobileNav = false"></div>
    <button class="mobile-categories" :aria-expanded="mobileNav" aria-controls="catalog-navigation" @click="mobileNav = !mobileNav"><Icon name="grid" /> Разделы</button>
    <header data-od-id="workshop-header" class="topbar">
      <a class="brand" href="#" @click.prevent="chooseCategory('all')"><span class="brand-mark"><img :src="publicAssetBase + 'icons/classes/engineer.png'" alt="Гоблин" /></span><span><strong>GOBLIN SURVIVAL<br />craft</strong><small>GOBLIN SURVIVAL</small></span></a>
      <div class="header-version"><span class="status-dot"></span>{{ mapInfo.mapName.replace('Goblin Survival v', '') }}</div>
    </header>

    <div class="layout">
      <aside id="catalog-navigation" data-od-id="catalog-navigation" class="sidebar" :class="{ 'mobile-open': mobileNav }">
        <nav data-od-id="section-navigation" aria-label="Разделы каталога"><button :data-od-id="`section-${entry.id}`" v-for="entry in categories" :key="entry.id" :class="{ active: category === entry.id }" :aria-current="category === entry.id ? 'page' : undefined" @click="chooseCategory(entry.id)"><Icon :name="entry.icon" /><span>{{ entry.name }}</span><small v-if="entry.id === 'favorites'">{{ favorites.length }}</small></button></nav>
        <div class="sidebar-note"><img :src="publicAssetBase + 'icons/sapper.png'" alt="Гоблин-подрывник" /><p>«Сначала собери детали.<br />Потом уже взрывай!»</p><span>ПРАВИЛО МАСТЕРСКОЙ №1</span></div>
        <div class="source-button"><span class="status-dot"></span><span>Актуальная версия: {{ mapInfo.mapName.replace('Goblin Survival v', '') }}</span></div>
      </aside>

      <main data-od-id="workshop-main">
        <section data-od-id="workshop-intro" v-if="category === 'all'" class="workshop-intro" aria-labelledby="intro-title">
          <div class="intro-copy"><div class="eyebrow"><span class="status-dot"></span> GOBLIN SURVIVAL · WARCRAFT III</div><h1 id="intro-title">Большие планы.<br /><em>Маленький гоблин.</em></h1><p>Найди нужный предмет, разбери рецепт<br class="desktop-break" /> и собери всё для следующего приключения.</p><span class="intro-stat"><Icon name="book" /> Предметов в атласе: {{ visibleCount }}</span></div>
          <span class="intro-tag"><Icon name="hammer" /> Сначала детали. Потом взрывы.</span>
        </section>
        <section data-od-id="catalog" class="catalog" :aria-labelledby="selectedGroup ? 'class-title' : 'catalog-title'" style="min-height: 320px">
          <div v-if="!selectedGroup" class="catalog-heading"><div><h2 id="catalog-title">{{ heading }}</h2><p class="catalog-subtitle">{{ sectionDescription }}</p></div><LevelFilter v-if="directCatalog && levelSteps.length" :key="`${levelScope}:${filterRevision}`" :levels="levelSteps" @change="levelSelection = $event" /></div>
          <template v-if="directCatalog || category === 'kv' || category === 'sets' || category === 'craft'">
            <div v-if="!selectedGroup && !directCatalog" class="class-grid" :class="{ 'boss-portraits': category === 'sets' }" :aria-label="category === 'sets' ? 'Боссы' : category === 'craft' ? 'Кузницы' : 'Классы персонажей'">
              <button :data-od-id="`group-${entry.id}`" v-for="entry in groups" :key="entry.id" class="class-portrait" @click="selectedGroup = entry">
                <span class="class-portrait-frame"><img :src="entry.icon" alt="" /></span>
                <span class="class-name">{{ entry.name }}</span>
              </button>
            </div>
            <div v-else class="class-items">
              <button v-if="selectedGroup" class="class-back" @click="selectedGroup = null"><Icon name="back" /> {{ category === 'sets' ? 'Все боссы' : category === 'craft' ? 'Все кузницы' : 'Все классы' }}</button>
              <div v-if="selectedGroup" class="class-items-heading">
                <img :src="selectedGroup.icon" alt="" />
                <h3 id="class-title" data-od-id="group-title">{{ selectedGroup.name }} <span class="class-count">{{ unfilteredItems.length }}</span></h3>
                <LevelFilter v-if="levelSteps.length" :key="`${levelScope}:${filterRevision}`" :levels="levelSteps" @change="levelSelection = $event" />
              </div>
              <nav data-od-id="group-switcher" v-if="selectedGroup" class="class-switcher" :class="{ 'boss-switcher': category === 'sets' }" :aria-label="category === 'sets' ? 'Выбор босса' : category === 'craft' ? 'Выбор кузницы' : 'Выбор класса'"><button :data-od-id="`group-${entry.id}`" v-for="entry in groups" :key="entry.id" :class="{ active: selectedGroup.id === entry.id }" :aria-label="entry.name" :aria-pressed="selectedGroup.id === entry.id" :title="entry.name" @click="selectedGroup = entry"><img :src="entry.icon" alt="" /></button></nav>
              <nav data-od-id="great-forge-tabs" v-if="isGreatForge" class="forge-tabs" aria-label="Разделы Великой кузницы"><button v-for="tab in greatForgeTabs" :key="tab.id" :class="{ active: greatForgeTab === tab.id }" :aria-pressed="greatForgeTab === tab.id" @click="greatForgeTab = tab.id">{{ tab.name }} <span>{{ greatForgeCounts[tab.id] }}</span></button></nav>
              <nav data-od-id="craft-boss-switcher" v-if="isGreatForge && greatForgeTab === 'boss'" class="class-switcher boss-switcher" aria-label="Боссы для крафта"><button :data-od-id="`craft-boss-${boss.id}`" v-for="boss in bossCraftGroups" :key="boss.id" :class="{ active: activeCraftBoss?.id === boss.id }" :aria-label="boss.name" :title="boss.name" :aria-pressed="activeCraftBoss?.id === boss.id" @click="selectedCraftBoss = boss.id"><img :src="boss.icon" alt="" /></button></nav>
              <div class="catalog-tools" data-od-id="catalog-tools">
                <div class="global-search catalog-search"><Icon name="search" /><input v-model="query" type="search" placeholder="Название, характеристики или ингредиент" :aria-label="selectedGroup ? `Поиск: ${selectedGroup.name}` : 'Поиск предметов'" data-od-id="catalog-search" /><button v-if="query" class="search-clear" aria-label="Очистить поиск" @click="query = ''"><Icon name="close" /></button></div>
                <div class="view-switch" role="group" aria-label="Вид предметов"><button :class="{ active: classView === 'grid' }" :aria-pressed="classView === 'grid'" aria-label="Карточки" data-od-id="view-grid" @click="classView = 'grid'"><Icon name="grid" /></button><button :class="{ active: classView === 'list' }" :aria-pressed="classView === 'list'" aria-label="Список" data-od-id="view-list" @click="classView = 'list'"><Icon name="list" /></button></div>
              </div>
              <div class="results-meta"><span aria-live="polite">Предметов: <b>{{ classItems.length }}</b><template v-if="hasFilters"> из {{ unfilteredItems.length }}</template></span><button v-if="hasFilters" class="reset-filters" @click="resetFilters">Сбросить поиск и уровень <Icon name="close" /></button><span v-else>Выбери предмет для просмотра рецепта <Icon name="arrow" /></span></div>
              <div class="class-content" data-od-id="catalog-and-recipe">
              <div class="cards kv-cards" :class="{ compact: classView === 'list' }" :aria-label="selectedGroup ? `Предметы: ${selectedGroup.name}` : heading">
                <article :data-od-id="`item-${item.id}`" v-for="item in classItems" :key="item.id" class="item-card" :class="[item.category, { selected: selectedItem?.id === item.id }]">
                  <button :data-od-id="`open-${item.id}`" class="card-main" :aria-label="item.name" :title="item.name" :aria-pressed="selectedItem?.id === item.id" @click="openItem(item)"><div class="item-visual"><div class="icon-frame"><img :src="iconFor(item)" alt="" loading="lazy" decoding="async" width="64" height="64" /></div></div><div class="card-copy"><div class="kv-card-title"><h3 v-fit-card-title="classView">{{ item.name }}</h3><span v-if="item.level" class="kv-level">{{ item.level }} ур.</span></div><p v-if="(category === 'sets' || category === 'craft') && item.classes.length" :title="item.classes.join(' · ')">{{ item.classes.join(' · ') }}</p></div></button>
                  <button :data-od-id="`favorite-${item.id}`" class="favorite-button" :class="{ saved: favorites.includes(item.id) }" :aria-label="`${favorites.includes(item.id) ? 'Убрать из избранного' : 'Добавить в избранное'}: ${item.name}`" :aria-pressed="favorites.includes(item.id)" @click="toggleFavorite(item.id)"><Icon name="star" /></button>
                </article>
              <div v-if="!classItems.length" class="catalog-empty" data-od-id="catalog-empty"><Icon :name="category === 'favorites' && !hasFilters ? 'star' : 'search'" /><h3>{{ hasFilters ? 'Ничего не нашлось' : category === 'favorites' ? 'Сохрани свои рецепты' : 'Здесь пока нет предметов' }}</h3><p>{{ hasFilters ? 'Измени запрос или расширь диапазон уровней.' : category === 'favorites' ? 'Нажми звезду на карточке — предмет появится здесь.' : 'Для этой группы предметы пока не указаны.' }}</p><button v-if="hasFilters" class="clear-search" @click="resetFilters">Сбросить поиск и уровень <Icon name="close" /></button></div>
              </div>
              <component :is="isCompact ? 'dialog' : 'aside'" ref="recipePane" data-od-id="recipe-pane" class="recipe-pane" aria-label="Рецепт предмета" tabindex="-1" @click="onRecipeBackdrop" @cancel.prevent="closeRecipe">
                <button v-if="isCompact && selectedItem" class="recipe-close" aria-label="Закрыть рецепт" @click="closeRecipe"><Icon name="close" /></button>
                <div v-if="selectedItem" class="recipe-body" :key="selectedItem.id">
                  <div class="recipe-heading"><img :src="iconFor(selectedItem)" alt="" /><div><h2 data-od-id="recipe-title">{{ selectedItem.name }}</h2><span v-if="selectedItem.level">{{ selectedItem.level }} уровень</span><p v-if="selectedItem.classes.length">{{ selectedItem.classes.join(' · ') }}</p></div></div>
                  <p class="recipe-description">{{ selectedItem.description || 'Характеристики не указаны.' }}</p>
                  <section data-od-id="recipe-ingredients"><h3>Ингредиенты</h3><div class="ingredient-list"><template v-for="(part, index) in recipeIngredients" :key="index"><button v-if="byId.has(part.itemId)" class="ingredient" @click="openItem(byId.get(part.itemId))"><img :src="iconFor(byId.get(part.itemId))" alt="" /><span>{{ part.name }}</span><b>×{{ part.count }}</b><Icon name="arrow" /></button><div v-else class="ingredient unresolved"><span class="ingredient-fallback"><Icon name="box" /></span><span>{{ part.name }}</span><b>×{{ part.count }}</b></div></template></div><p v-if="!recipeIngredients.length" class="inline-note">Ингредиенты не указаны.</p></section>
                  <section data-od-id="recipe-source"><h3>Создание и получение</h3><p v-for="source in recipeSources" :key="source" class="recipe-source">{{ source }}</p><p v-if="!recipeSources.length" class="inline-note">Место создания или источник не указан.</p></section>
                  <section data-od-id="recipe-used-in"><h3>Используется в</h3><button v-for="item in usedIn" :key="item.id" class="ingredient" @click="openItem(item)"><img :src="iconFor(item)" alt="" /><span>{{ item.name }}<small>Нужно: {{ item.ingredients.filter(part => part.itemId === selectedItem.id).reduce((sum, part) => sum + part.count, 0) }} шт.</small></span><Icon name="arrow" /></button><p v-if="!usedIn.length" class="inline-note">Следующие крафты не найдены.</p></section>
                </div>
                <div v-else class="recipe-placeholder"><Icon name="hammer" /><h3>Рецепт предмета</h3><p>Выбери предмет — здесь появятся его характеристики, ингредиенты и следующие крафты.</p></div>
              </component>
              </div>
            </div>
          </template>
        </section>
        <footer data-od-id="workshop-footer" class="footer"><span><Icon name="hammer" /> Goblin Survival craft</span><p>Фанатский справочник по карте Goblin Survival</p></footer>
      </main>
    </div>
  </div>
</template>
