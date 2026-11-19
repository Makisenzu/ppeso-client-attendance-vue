/**
 * Tiny animation primitives for RubberSegment (no animation library — DESIGN.md §9).
 * A MotionValue holds a number, tracks its velocity and animates with a spring or an ease-out tween.
 */

export interface SpringOptions {
  type: 'spring'
  /** Seconds the spring takes to settle (roughly) */
  duration: number
  /** 0 = no overshoot, 0.2 = a small wobble */
  bounce?: number
  /** Starting velocity in px/s */
  velocity?: number
}

export interface TweenOptions {
  type: 'tween'
  duration: number
}

export type AnimateOptions = SpringOptions | TweenOptions

type Listener = (value: number) => void

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

/** cubic-bezier(0.23, 1, 0.32, 1)-like ease-out (quint) */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 5)

export class MotionValue {
  private value: number
  private velocity = 0
  private lastTime = now()
  private frame: number | null = null
  private resolve: (() => void) | null = null
  private listeners = new Set<Listener>()

  constructor(initial = 0) {
    this.value = initial
  }

  get(): number {
    return this.value
  }

  getVelocity(): number {
    return this.velocity
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Sets the value as part of a gesture (keeps velocity tracking). */
  set(next: number) {
    const t = now()
    const dt = (t - this.lastTime) / 1000
    if (dt > 0) this.velocity = (next - this.value) / dt
    this.lastTime = t
    this.write(next)
  }

  /** Moves instantly, with no velocity. */
  jump(next: number) {
    this.stop()
    this.velocity = 0
    this.lastTime = now()
    this.write(next)
  }

  stop() {
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    this.frame = null
    this.resolve?.()
    this.resolve = null
  }

  animate(to: number, options: AnimateOptions): Promise<void> {
    this.stop()
    return new Promise((resolve) => {
      this.resolve = resolve
      if (options.type === 'tween') this.runTween(to, options)
      else this.runSpring(to, options)
    })
  }

  private write(next: number) {
    this.value = next
    this.listeners.forEach((listener) => listener(next))
  }

  private finish(to: number) {
    this.frame = null
    this.velocity = 0
    this.write(to)
    const done = this.resolve
    this.resolve = null
    done?.()
  }

  private runTween(to: number, { duration }: TweenOptions) {
    const from = this.value
    const start = now()
    const ms = Math.max(1, duration * 1000)
    const step = () => {
      const p = Math.min(1, (now() - start) / ms)
      this.set(from + (to - from) * easeOut(p))
      if (p < 1) this.frame = requestAnimationFrame(step)
      else this.finish(to)
    }
    this.frame = requestAnimationFrame(step)
  }

  /** Damped spring: natural frequency from the duration, damping ratio from the bounce. */
  private runSpring(to: number, { duration, bounce = 0, velocity }: SpringOptions) {
    const omega = (2 * Math.PI) / Math.max(0.05, duration)
    const zeta = Math.min(1, Math.max(0.05, 1 - bounce))
    let x = this.value
    let v = velocity ?? this.velocity
    let last = now()
    const deadline = last + duration * 3000

    const step = () => {
      const t = now()
      let dt = Math.min(0.064, (t - last) / 1000)
      last = t
      // Small fixed substeps keep the integration stable on slow frames
      while (dt > 0) {
        const h = Math.min(dt, 1 / 240)
        const accel = -omega * omega * (x - to) - 2 * zeta * omega * v
        v += accel * h
        x += v * h
        dt -= h
      }
      this.velocity = v
      this.lastTime = t
      this.write(x)
      if ((Math.abs(x - to) < 0.1 && Math.abs(v) < 5) || t > deadline) this.finish(to)
      else this.frame = requestAnimationFrame(step)
    }
    this.frame = requestAnimationFrame(step)
  }
}
