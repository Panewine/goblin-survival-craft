<script setup>
defineProps({ name: String })
const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  sword: 'M4 20l4-4m-3-3 6 6m-3-6L18 3l3 0 0 3-10 10',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M12 7v10',
  gem: 'M12 2l7 10-7 10-7-10z M5 12h14 M12 2v20',
  flask: 'M9 3h6m-5 0v7L5 18a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3 M8 15h8',
  box: 'M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11 M7 5l10 5',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  search: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  book: 'M12 5v16 M12 5C8 2 4 3 2 4v15c4-1 6-1 10 2 4-3 6-3 10-2V4c-2-1-6-2-10 1',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  close: 'M6 6l12 12 M6 18 18 6',
  list: 'M8 5h13 M8 12h13 M8 19h13 M3 5h.01 M3 12h.01 M3 19h.01',
  check: 'M4 12l5 5L20 6',
  hammer: 'M3 21l9-9 M8 4l4-2 9 9-4 4-9-9z',
  leaf: 'M4 20L18 6 M4 17C0 4 15 3 21 3c0 14-7 20-17 14',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
}
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.hammer" /></svg></template>
