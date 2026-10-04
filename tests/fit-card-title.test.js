import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('Large catalogs measure only visible titles and skip unrelated updates', async () => {
  let intersection, measured = 0
  const frames = []
  const source = readFileSync(new URL('../src/fit-card-title.js', import.meta.url), 'utf8')
  const context = {
    document: { fonts: { ready: Promise.resolve() } },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length },
    IntersectionObserver: class {
      constructor(callback) { intersection = callback }
      observe() {}
      unobserve() {}
    },
    ResizeObserver: class { observe() {} unobserve() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '14', paddingTop: '12', lineHeight: '20' }),
  }
  runInNewContext(source.replace('export default', 'globalThis.directive ='), context)
  const directive = context.directive
  const entries = Array.from({ length: 471 }, () => {
    const copy = {
      get clientWidth() { measured += 1; return 150 },
      clientHeight: 200, scrollHeight: 200,
    }
    const title = {
      isConnected: true, style: {}, offsetHeight: 20, scrollWidth: 100, clientWidth: 100,
      closest(selector) {
        if (selector === '.compact') return null
        if (selector === '.card-copy') return copy
        return { querySelector: () => ({ offsetHeight: 64 }) }
      },
    }
    directive.mounted(title)
    return { title, copy }
  })
  await Promise.resolve()
  assert.equal(measured, 0, 'Mounting 471 offscreen titles must not read layout')
  assert.equal(frames.length, 0)

  intersection([{ target: entries[0].copy, isIntersecting: true }])
  frames.shift()()
  assert.ok(measured > 0)
  assert.equal(entries.filter(({ title }) => title.style.fontSize).length, 1)

  measured = 0
  directive.updated(entries[0].title, { value: 'grid', oldValue: 'grid' })
  assert.equal(frames.length, 0, 'Selecting or favoriting must not schedule title fitting')
  directive.updated(entries[1].title, { value: 'list', oldValue: 'grid' })
  assert.equal(frames.length, 0, 'Offscreen view changes stay deferred')
  directive.updated(entries[0].title, { value: 'list', oldValue: 'grid' })
  assert.equal(frames.length, 1)
  directive.unmounted(entries[0].title)
  frames.shift()()
  assert.equal(measured, 0, 'Unmounted titles must not be measured by queued frames')
  for (const { title } of entries.slice(1)) directive.unmounted(title)
})
