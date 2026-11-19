import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import type { Ref } from 'vue'
import { MotionValue } from '@/lib/springMotion'

/**
 * RubberSegment behaviour (ported from the vue-ppeso-agsurjob project, without motion-v): a segmented
 * control whose thumb stretches toward the picked option, lands with a spring and a little squash, can be
 * dragged with a rubber-band pull at the edges, and follows the arrow keys. `null` means nothing picked yet.
 */

export interface RubberSegmentOption {
  value: string
  label: string
  /** Shown as the button's tooltip / accessible name */
  description?: string
}

type Slot = { l: number; r: number }
type Sample = [number, number]
type Drag = { id: number; x0: number; slot: number; onThumb: boolean; live: boolean; offset: number; w: number; hist: Sample[] }

const INSET = 4 // px — matches p-1 on the track
const THUMB_RADIUS = 6 // px — matches rounded-md on the cells
const DILATE = 0.19
const HANDOFF = 0.15
const FLICK = 110
const MAX_VELOCITY = 2000
const DEADZONE = 4
const SLOP = 10
const RUBBER = 0.55
const STRETCH = 1
const SQUASH = 3
const GLIDE = 75

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const rubber = (over: number, dim: number) => (over * dim * RUBBER) / (dim + RUBBER * Math.abs(over))
const project = (v: number) => {
  const d = 1 - 0.1 * Math.pow(0.05, GLIDE / 100)
  return ((v / 1000) * d) / (1 - d)
}
const velocityOf = (hist: Sample[], t: number) => {
  const recent = hist.filter(([time]) => t - time <= 100)
  if (recent.length < 2) return 0
  const [t0, x0] = recent[0] as Sample
  const [t1, x1] = recent[recent.length - 1] as Sample
  return t1 - t0 >= 8 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0
}
const nearestSlot = (slots: Slot[], x: number) => {
  let best = 0
  for (let i = 1; i < slots.length; i++) {
    const mid = (s: Slot) => (s.l + s.r) / 2
    if (Math.abs(mid(slots[i] as Slot) - x) < Math.abs(mid(slots[best] as Slot) - x)) best = i
  }
  return best
}
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useRubberSegment(options: {
  items: () => RubberSegmentOption[]
  model: Ref<string | null>
  disabled: () => boolean
}) {
  const track = useTemplateRef<HTMLDivElement>('track')

  const selectedIndex = computed(() => options.items().findIndex((item) => item.value === options.model.value))
  const hasValue = computed(() => selectedIndex.value >= 0)

  // Thumb edges (px from the track's inner left) and the inner width
  const edgeL = new MotionValue(0)
  const edgeR = new MotionValue(0)
  const left = ref(0)
  const right = ref(0)
  const innerWidth = ref(0)
  const isMeasured = ref(false)
  const isHeld = ref(false)
  const pressedIndex = ref<number | null>(null)
  edgeL.onChange((v) => (left.value = v))
  edgeR.onChange((v) => (right.value = v))

  let slots: Slot[] = []
  let box: DOMRect | null = null
  let committed = selectedIndex.value
  let handoff: ReturnType<typeof setTimeout> | undefined
  let drag: Drag | null = null
  let gen = 0
  let observer: ResizeObserver | null = null

  /** Clip of the coloured thumb layer (runtime value — the allowed inline style, DESIGN.md §13) */
  const thumbStyle = computed(() => ({
    clipPath: `inset(0 ${Math.max(0, innerWidth.value - right.value)}px 0 ${Math.max(0, left.value)}px round ${THUMB_RADIUS}px)`,
  }))
  const isThumbVisible = computed(() => hasValue.value && isMeasured.value)

  const jumpTo = (i: number) => {
    const s = slots[i]
    if (!s) return
    clearTimeout(handoff)
    gen += 1
    edgeL.jump(s.l)
    edgeR.jump(s.r)
  }

  const measure = () => {
    const el = track.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    box = rect
    const buttons = el.querySelectorAll<HTMLButtonElement>('button[role="radio"]')
    slots = [...buttons].map((button) => {
      const r = button.getBoundingClientRect()
      return { l: r.left - rect.left - INSET, r: r.right - rect.left - INSET }
    })
    innerWidth.value = rect.width - INSET * 2
    isMeasured.value = slots.length > 0
    if (committed >= 0) jumpTo(committed)
  }

  const land = (to: number, v: number | null, flick: boolean, withSquash: boolean) => {
    const b = slots[to]
    if (!b) return
    const g = ++gen
    const dir = Math.sign((b.l + b.r) / 2 - (edgeL.get() + edgeR.get()) / 2) || 1
    const [lead, leadTo, trail, trailTo] = dir > 0 ? [edgeR, b.r, edgeL, b.l] : [edgeL, b.l, edgeR, b.r]
    const velocityFor = (mv: MotionValue) => clamp(v === null ? mv.getVelocity() : v, -MAX_VELOCITY, MAX_VELOCITY)
    void lead.animate(leadTo, { type: 'spring', duration: flick ? 0.4 : 0.3, bounce: flick ? 0.2 : 0, velocity: velocityFor(lead) })
    const trailVelocity = velocityFor(trail)
    if (!withSquash) {
      void trail.animate(trailTo, { type: 'spring', duration: 0.3, velocity: trailVelocity })
      return
    }
    void trail
      .animate(trailTo + dir * SQUASH, { type: 'spring', duration: 0.3, velocity: trailVelocity })
      .then(() => {
        if (gen === g) void trail.animate(trailTo, { type: 'spring', duration: 0.16 })
      })
  }

  /** Thumb stretches over both options, then the far edge lands and the near edge catches up. */
  const travel = (from: number, to: number) => {
    const b = slots[to]
    if (!b) return
    clearTimeout(handoff)
    gen += 1
    if (prefersReducedMotion()) {
      edgeL.jump(b.l)
      edgeR.jump(b.r)
      return
    }
    const a = slots[from]
    if (!a) {
      // First pick: grow out of the option's centre with a little bounce
      const mid = (b.l + b.r) / 2
      edgeL.jump(mid - 2)
      edgeR.jump(mid + 2)
      void edgeL.animate(b.l, { type: 'spring', duration: 0.4, bounce: 0.3 })
      void edgeR.animate(b.r, { type: 'spring', duration: 0.4, bounce: 0.3 })
      return
    }
    void edgeL.animate(b.l + (Math.min(a.l, b.l) - b.l) * STRETCH, { type: 'tween', duration: DILATE })
    void edgeR.animate(b.r + (Math.max(a.r, b.r) - b.r) * STRETCH, { type: 'tween', duration: DILATE })
    handoff = setTimeout(() => land(to, null, false, true), HANDOFF * 1000)
  }

  const commit = (i: number) => {
    committed = i
    const value = options.items()[i]?.value
    if (value !== undefined && value !== options.model.value) options.model.value = value
  }

  const localX = (e: { clientX: number }) => e.clientX - (box ? box.left : 0) - INSET

  const onPointerDown = (e: PointerEvent, i: number) => {
    if (options.disabled() || drag || e.button !== 0) return
    box = track.value?.getBoundingClientRect() ?? null
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // pointer capture unavailable
    }
    const x = localX(e)
    const onThumb = hasValue.value && x >= edgeL.get() && x <= edgeR.get()
    drag = { id: e.pointerId, x0: x, slot: i, onThumb, live: false, offset: 0, w: 0, hist: [[e.timeStamp, x]] }
    if (onThumb) {
      clearTimeout(handoff)
      gen += 1
      edgeL.stop()
      edgeR.stop()
    } else if (!prefersReducedMotion()) {
      pressedIndex.value = i
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    const d = drag
    if (!d || e.pointerId !== d.id || !d.onThumb) return
    const x = localX(e)
    d.hist.push([e.timeStamp, x])
    if (d.hist.length > 8) d.hist.shift()
    if (!d.live) {
      if (Math.abs(x - d.x0) < DEADZONE) return
      d.live = true
      d.offset = x - edgeL.get()
      d.w = edgeR.get() - edgeL.get()
      isHeld.value = true
    }
    const width = innerWidth.value
    const l = x - d.offset
    const maxL = width - d.w
    if (prefersReducedMotion()) {
      const c = clamp(l, 0, maxL)
      edgeL.set(c)
      edgeR.set(c + d.w)
    } else if (l < 0) {
      edgeL.set(0)
      edgeR.set(d.w - rubber(-l, d.w))
    } else if (l > maxL) {
      edgeR.set(width)
      edgeL.set(maxL + rubber(l - maxL, d.w))
    } else {
      edgeL.set(l)
      edgeR.set(l + d.w)
    }
  }

  const release = () => {
    const d = drag as Drag
    drag = null
    isHeld.value = false
    pressedIndex.value = null
    return d
  }

  const onPointerUp = (e: PointerEvent) => {
    const d = drag
    if (!d || e.pointerId !== d.id) return
    release()
    const x = localX(e)
    if (!d.live) {
      if (Math.abs(x - d.x0) <= SLOP && d.slot !== committed) {
        const from = committed
        commit(d.slot)
        travel(from, d.slot)
      }
      return
    }
    const v = velocityOf(d.hist, e.timeStamp)
    const flick = Math.abs(v) > FLICK
    let to = nearestSlot(slots, (edgeL.get() + edgeR.get()) / 2 + project(v))
    if (flick && to === committed) to = clamp(to + Math.sign(v), 0, slots.length - 1)
    commit(to)
    if (prefersReducedMotion()) jumpTo(to)
    else land(to, v, flick, flick)
  }

  const onPointerCancel = (e: PointerEvent) => {
    const d = drag
    if (!d || e.pointerId !== d.id) return
    release()
    if (!d.live) return
    if (prefersReducedMotion()) jumpTo(committed)
    else land(committed, null, false, false)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (options.disabled()) return
    const last = slots.length - 1
    const current = selectedIndex.value
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = current < 0 ? 0 : Math.min(last, current + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = current < 0 ? 0 : Math.max(0, current - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    if (next === current) return
    const from = committed
    commit(next)
    travel(from, next)
    track.value?.querySelectorAll<HTMLButtonElement>('button[role="radio"]')[next]?.focus()
  }

  /** Roving tabindex: the picked option (or the first one when nothing is picked) is the tab stop. */
  const tabIndexFor = (i: number) => (i === (hasValue.value ? selectedIndex.value : 0) ? 0 : -1)
  const isSelected = (i: number) => i === selectedIndex.value
  const isPressed = (i: number) => pressedIndex.value === i

  // Value changed from outside (e.g. a saved draft loaded): move without animating.
  watch(
    selectedIndex,
    (next) => {
      if (drag || committed === next) return
      committed = next
      if (next >= 0) jumpTo(next)
    },
    { flush: 'post' },
  )
  watch(
    () => options.items().map((item) => item.value).join('|'),
    () => void nextTick(measure),
  )

  onMounted(() => {
    measure()
    observer = new ResizeObserver(measure)
    if (track.value) observer.observe(track.value)
    if (typeof document !== 'undefined' && document.fonts) void document.fonts.ready.then(measure)
  })

  onUnmounted(() => {
    observer?.disconnect()
    clearTimeout(handoff)
    edgeL.stop()
    edgeR.stop()
  })

  return {
    thumbStyle,
    isThumbVisible,
    isHeld,
    isSelected,
    isPressed,
    tabIndexFor,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyDown,
  }
}
