/**
 * Minimal animated values for SwipeRow: a listenable number plus tween and spring animations driven by
 * requestAnimationFrame. Replaces `motion-v` (DESIGN.md §9: no new animation libraries).
 */

type Listener = (value: number) => void

export class MotionValue {
  private value: number
  private listeners = new Set<Listener>()
  private cancel: (() => void) | null = null

  constructor(initial = 0) {
    this.value = initial
  }

  get() {
    return this.value
  }

  /** Sets the value immediately and stops any running animation. */
  set(next: number) {
    this.stop()
    this.write(next)
  }

  /** Internal write used by animations (does not stop them). */
  write(next: number) {
    if (next === this.value) return
    this.value = next
    this.listeners.forEach((fn) => fn(next))
  }

  on(_event: 'change', fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  stop() {
    this.cancel?.()
    this.cancel = null
  }

  /** @internal Registers the running animation so `stop()` / `set()` can cancel it. */
  attach(cancel: () => void) {
    this.stop()
    this.cancel = cancel
  }

  /** @internal Clears the running animation once it finished on its own. */
  detach(cancel: () => void) {
    if (this.cancel === cancel) this.cancel = null
  }
}

export interface TweenOptions {
  type?: 'tween'
  /** Seconds. */
  duration: number
  /** Cubic-bezier control points. */
  ease?: [number, number, number, number]
}

export interface SpringOptions {
  type: 'spring'
  /** Rough settle time in seconds. */
  duration: number
  /** 0 = no overshoot, 1 = undamped. */
  bounce?: number
  /** Starting velocity in units per second. */
  velocity?: number
}

export type AnimateOptions = TweenOptions | SpringOptions

/** Solves a CSS-style cubic-bezier for the eased progress at time `t` (0..1). */
function cubicBezier([x1, y1, x2, y2]: [number, number, number, number]) {
  const bez = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 20; i++) {
      const cx = bez(t, x1, x2)
      if (Math.abs(cx - x) < 1e-4) break
      if (cx < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return bez(t, y1, y2)
  }
}

/** Animates `mv` to `to`. Resolves when it finishes; never resolves if it is stopped or replaced first. */
export function animate(mv: MotionValue, to: number, opts: AnimateOptions): Promise<void> {
  return new Promise((resolve) => {
    const from = mv.get()
    const start = performance.now()
    let frame = 0
    const cancel = () => cancelAnimationFrame(frame)
    mv.attach(cancel)

    const finish = () => {
      mv.write(to)
      mv.detach(cancel)
      resolve()
    }

    if (opts.type === 'spring') {
      const zeta = Math.min(1, Math.max(0.05, 1 - (opts.bounce ?? 0)))
      const w0 = (2 * Math.PI) / Math.max(0.05, opts.duration)
      const d0 = from - to
      const v0 = opts.velocity ?? 0
      const wd = w0 * Math.sqrt(1 - zeta * zeta)
      const offset = (t: number) =>
        zeta >= 1
          ? Math.exp(-w0 * t) * (d0 + (v0 + w0 * d0) * t)
          : Math.exp(-zeta * w0 * t) * (d0 * Math.cos(wd * t) + ((v0 + zeta * w0 * d0) / wd) * Math.sin(wd * t))

      let prev = d0
      const step = (now: number) => {
        const t = (now - start) / 1000
        const d = offset(t)
        const settled = Math.abs(d) < 0.5 && Math.abs(d - prev) < 0.5
        if (settled || t > opts.duration * 4) return finish()
        prev = d
        mv.write(to + d)
        frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
      return
    }

    const ease = cubicBezier(opts.ease ?? [0.25, 0.1, 0.25, 1])
    const ms = Math.max(1, opts.duration * 1000)
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      if (p >= 1) return finish()
      mv.write(from + (to - from) * ease(p))
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  })
}
