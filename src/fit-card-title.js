function fit(el) {
  if (el.closest('.compact')) { el.style.fontSize = ''; el.style.webkitLineClamp = ''; el.cardTitleSize = null; return }
  const copy = el.closest('.card-copy')
  if (!copy?.clientWidth) return
  const layout = `${copy.clientWidth}:${copy.clientHeight}`
  if (el.cardTitleSize === layout) return
  el.cardTitleSize = layout
  let size = parseFloat(getComputedStyle(el).getPropertyValue('--text-ui'))
  el.style.fontSize = `${size}px`
  el.style.webkitLineClamp = 'unset'
  const icon = el.closest('.item-card').querySelector('.icon-frame')
  const space = copy.clientHeight / 2 - icon.offsetHeight / 2 - parseFloat(getComputedStyle(copy).paddingTop) - 6
  while (size > 11 && (el.offsetHeight > space || copy.scrollHeight > copy.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) {
    size -= 1
    el.style.fontSize = `${size}px`
  }
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight)
  el.style.webkitLineClamp = `${Math.max(1, Math.min(3, Math.floor(space / lineHeight)))}`
}

const visibleTitles = new Set()
const pendingTitles = new Set()
const titlesByCopy = new WeakMap()
let frame = null
let visibilityObserver
let sizeObserver

function schedule(el) {
  if (!visibleTitles.has(el)) return
  pendingTitles.add(el)
  if (frame !== null) return
  frame = requestAnimationFrame(() => {
    frame = null
    const titles = [...pendingTitles]
    pendingTitles.clear()
    for (const title of titles) {
      if (title.isConnected && visibleTitles.has(title)) fit(title)
    }
  })
}

function observeTitles() {
  if (visibilityObserver) return
  sizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const title = titlesByCopy.get(entry.target)
      if (title) schedule(title)
    }
  })
  visibilityObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const title = titlesByCopy.get(entry.target)
      if (!title) continue
      if (entry.isIntersecting) {
        visibleTitles.add(title)
        sizeObserver.observe(entry.target)
        schedule(title)
      } else {
        visibleTitles.delete(title)
        pendingTitles.delete(title)
        sizeObserver.unobserve(entry.target)
      }
    }
  }, { rootMargin: '200px 0px' })
  document.fonts.ready.then(() => {
    for (const title of visibleTitles) {
      title.cardTitleSize = null
      schedule(title)
    }
  })
}

export default {
  mounted(el) {
    observeTitles()
    const copy = el.closest('.card-copy')
    titlesByCopy.set(copy, el)
    visibilityObserver.observe(copy)
  },
  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    el.cardTitleSize = null
    schedule(el)
  },
  unmounted(el) {
    const copy = el.closest('.card-copy')
    visibilityObserver.unobserve(copy)
    sizeObserver.unobserve(copy)
    titlesByCopy.delete(copy)
    visibleTitles.delete(el)
    pendingTitles.delete(el)
  },
}
