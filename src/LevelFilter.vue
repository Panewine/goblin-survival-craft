<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({ levels: { type: Array, required: true } })
const emit = defineEmits(['change'])
const mode = ref('range'), low = ref(0), high = ref(0), exact = ref(0)
const last = computed(() => props.levels.length - 1)
const percent = index => last.value > 0 ? index / last.value * 100 : 0
const label = computed(() => mode.value === 'exact' ? `${props.levels[exact.value]} ур.` : `${props.levels[low.value]}–${props.levels[high.value]} ур.`)
function publish() {
  emit('change', mode.value === 'exact'
    ? { mode: 'exact', level: props.levels[exact.value] }
    : { mode: 'range', min: props.levels[low.value], max: props.levels[high.value], all: low.value === 0 && high.value === last.value })
}
watch(() => props.levels, () => { low.value = 0; high.value = last.value; exact.value = 0; publish() }, { immediate: true })
function setLow(event) { low.value = Math.min(Number(event.target.value), high.value); event.target.value = low.value; publish() }
function setHigh(event) { high.value = Math.max(Number(event.target.value), low.value); event.target.value = high.value; publish() }
function toggleMode() {
  if (mode.value === 'range') { exact.value = low.value; mode.value = 'exact' }
  else { low.value = 0; high.value = last.value; mode.value = 'range' }
  publish()
}
function chooseOnTrack(event) {
  if (mode.value !== 'range' || !last.value) return
  const rect = event.currentTarget.getBoundingClientRect()
  const index = Math.max(0, Math.min(last.value, Math.round((event.clientX - rect.left) / rect.width * last.value)))
  if (Math.abs(index - low.value) < Math.abs(index - high.value)) low.value = Math.min(index, high.value)
  else high.value = Math.max(index, low.value)
  publish()
}
</script>

<template>
  <div class="level-filter" role="group" aria-label="Фильтр по уровню" data-od-id="level-filter">
    <div class="level-filter-heading"><span>Уровень <b aria-live="polite">{{ label }}</b></span><button class="level-mode-button" type="button" data-od-id="level-mode-toggle" :aria-pressed="mode === 'exact'" :aria-label="mode === 'range' ? 'Режим: диапазон. Переключить на один уровень' : 'Режим: точный. Переключить на диапазон уровней'" :title="mode === 'range' ? 'Нажми, чтобы выбрать один уровень' : 'Нажми, чтобы выбрать диапазон уровней'" @click="toggleMode"><span>{{ mode === 'range' ? 'Диапазон' : 'Точный' }}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" /></svg></button></div>
    <p class="level-mode-hint">Нажми на кнопку, чтобы сменить режим</p>
    <div class="level-slider" :class="{ 'level-slider-range': mode === 'range' }" :style="{ '--level-start': `${mode === 'range' ? percent(low) : 0}%`, '--level-end': `${mode === 'range' ? percent(high) : percent(exact)}%` }" @click.self="chooseOnTrack">
      <template v-if="mode === 'range'">
        <input :value="low" :style="{ zIndex: low === high && low > 0 ? 2 : 1 }" type="range" min="0" :max="last" step="1" :disabled="last === 0" aria-label="Минимальный уровень" :aria-valuetext="`${levels[low]} уровень`" @input="setLow" />
        <input :value="high" type="range" min="0" :max="last" step="1" :disabled="last === 0" aria-label="Максимальный уровень" :aria-valuetext="`${levels[high]} уровень`" @input="setHigh" />
      </template>
      <input v-else v-model.number="exact" type="range" min="0" :max="last" step="1" :disabled="last === 0" aria-label="Точный уровень" :aria-valuetext="`${levels[exact]} уровень`" @input="publish" />
      <div class="level-ticks" aria-hidden="true"><span v-for="(level, index) in levels" :key="level" :style="{ left: `${percent(index)}%` }" :title="`${level} ур.`"></span></div>
    </div>
    <div class="level-filter-limits" aria-hidden="true"><span>{{ levels[0] }}</span><span>{{ levels[last] }}</span></div>
  </div>
</template>
