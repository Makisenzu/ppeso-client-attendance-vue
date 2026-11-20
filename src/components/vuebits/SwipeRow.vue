<script setup lang="ts">
/**
 * Swipe-to-reveal row for the mobile view of data tables (DESIGN.md §11.2).
 * Drag the row sideways to reveal its actions; a full swipe runs the first (primary) action.
 * Keyboard: Tab to the hidden "N actions" button, then Arrow keys / Enter / Escape.
 */
import { Trash2 } from '@lucide/vue';
import { usePreferredReducedMotion } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, useId, watch, type Component, type CSSProperties } from 'vue';
import { animate, MotionValue } from '@/components/vuebits/swipeMotion';

export interface SwipeAction {
  id: string;
  label: string;
  icon?: Component;
  /** Background, as a CSS color (use tokens, e.g. `var(--primary)`). */
  color?: string;
  /** Label / icon color on top of `color`. */
  textColor?: string;
  dismiss?: boolean;
  onSelect?: () => void;
}

interface SwipeRowProps {
  actions?: SwipeAction[];
  actionColor?: string;
  actionTextColor?: string;
  drawerColor?: string;
  drawerTextColor?: string;
  rowColor?: string;
  textColor?: string;
  /** Fixed row height in px; leave empty to size the row to its content. */
  height?: number | null;
  radius?: number;
  actionWidth?: number;
  direction?: 'left' | 'right';
  snapBounce?: number;
  resistance?: number;
  collapseMs?: number;
  commitAt?: number;
  fullSwipe?: boolean;
  /**
   * Collapse the row after the primary action runs. Off by default: in this app a delete opens a confirmation
   * dialog, and the row disappears with the refetch only if the user confirms.
   */
  collapseOnCommit?: boolean;
  disabled?: boolean;
  open?: boolean;
  closeOnAction?: boolean;
  haptic?: boolean;
  label?: string;
  className?: string;
}

type Sample = [number, number];
type Phase = 'idle' | 'committing' | 'collapsing';

interface Grip {
  id: number;
  x0: number;
  y0: number;
  grab: number | null;
  moved: boolean;
  hist: Sample[];
  touch: boolean;
}

const HYST = 10;
const FLICK = 110;
const DECEL = 0.998;
const VMAX = 1500;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SPRING_UI = { type: 'spring' as const, duration: 0.3, bounce: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rubber = (o: number, dim: number, c: number) => (o * dim * c) / (dim + c * Math.abs(o));
const unrubber = (y: number, dim: number, c: number) => (y * dim) / (c * Math.max(1, dim - Math.abs(y)));
const project = (v: number) => ((v / 1000) * DECEL) / (1 - DECEL);
const velocityOf = (hist: Sample[]) => {
  if (hist.length < 2) return 0;
  const a = hist[0];
  const b = hist[hist.length - 1];
  return ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000;
};

const props = withDefaults(defineProps<SwipeRowProps>(), {
  actions: undefined,
  actionColor: 'var(--destructive)',
  // same as the shadcn destructive button (`text-white`); the theme has no --destructive-foreground token
  actionTextColor: 'white',
  drawerColor: 'var(--secondary)',
  drawerTextColor: 'var(--secondary-foreground)',
  rowColor: 'var(--card)',
  textColor: 'var(--card-foreground)',
  height: null,
  radius: 0,
  actionWidth: 72,
  direction: 'left',
  snapBounce: 0.2,
  resistance: 0.55,
  collapseMs: 200,
  commitAt: 0.6,
  fullSwipe: true,
  collapseOnCommit: false,
  disabled: false,
  open: undefined,
  closeOnAction: true,
  haptic: true,
  label: 'List item',
  className: ''
});

const emit = defineEmits<{
  openChange: [open: boolean];
  action: [action: SwipeAction];
  commit: [action: SwipeAction];
}>();

const uid = useId();
const motionPref = usePreferredReducedMotion();
const reduce = computed(() => motionPref.value === 'reduce');
const acts = computed<SwipeAction[]>(() => props.actions ?? [{ id: 'delete', label: 'Delete' }]);
const s = computed(() => (props.direction === 'left' ? -1 : 1));
const A = computed(() => props.actionWidth);
const n = computed(() => acts.value.length);
const D = computed(() => n.value * A.value);
const c = computed(() => clamp(props.resistance, 0.05, 1));
const primary = computed(() => acts.value[0]);

const openState = ref(false);
const phase = ref<Phase>('idle');
const say = ref('');
const open = computed(() => props.open ?? openState.value);

const rootRef = ref<HTMLDivElement | null>(null);
const surfaceRef = ref<HTMLDivElement | null>(null);
const railRef = ref<HTMLDivElement | null>(null);
const blockRef = ref<HTMLDivElement | null>(null);
const glyphRef = ref<HTMLButtonElement | null>(null);

let w = 360;
let grip: Grip | null = null;
let foldTimer: ReturnType<typeof setTimeout> | undefined;
let heading: number | null = null;
let unwatch: (() => void) | null = null;
let observer: ResizeObserver | null = null;
/** Set when a drag ends, so the click that follows it does not hit a button or checkbox inside the row. */
let swallowClick = false;
const offs: (() => void)[] = [];

const x = new MotionValue(0);
const spread = new MotionValue(0);
const landed = new MotionValue(0);
const exposed = () => s.value * x.get();
const commitPoint = () => Math.max(props.commitAt * w, D.value + A.value / 2);
const canCommit = () => props.fullSwipe && n.value > 0 && commitPoint() <= w;

// transforms are written by hand so a drag never triggers a Vue render
const paint = () => {
  const sv = s.value;
  const e = exposed();
  const shift = spread.get() * Math.max(0, e - A.value);
  if (surfaceRef.value) surfaceRef.value.style.transform = `translateX(${x.get()}px)`;
  if (railRef.value) railRef.value.style.transform = `translateX(${-sv * Math.max(0, D.value - e)}px)`;
  if (blockRef.value) blockRef.value.style.transform = `translateX(${sv * shift}px)`;
  if (glyphRef.value)
    glyphRef.value.style.transform = `translateX(${-sv * landed.get() * (shift - (w - A.value) / 2)}px)`;
};

const map = (raw: number) => {
  const W = w;
  const cc = c.value;
  const d = D.value;
  if (raw < 0) return rubber(raw, W, cc);
  if (raw <= d) return raw;
  if (!canCommit()) return d + rubber(raw - d, W, cc);
  const C = commitPoint();
  const knee = d + (C - d) / cc;
  return raw <= knee ? d + cc * (raw - d) : C + rubber(raw - knee, W, cc);
};
const inv = (ex: number) => {
  const W = w;
  const cc = c.value;
  const d = D.value;
  if (ex < 0) return unrubber(ex, W, cc);
  if (ex <= d) return ex;
  if (!canCommit()) return d + unrubber(ex - d, W, cc);
  const C = commitPoint();
  const knee = d + (C - d) / cc;
  return ex <= C ? d + (ex - d) / cc : knee + unrubber(ex - C, W, cc);
};

onMounted(() => {
  const el = rootRef.value;
  if (el) {
    w = el.offsetWidth || w;
    observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) w = width;
    });
    observer.observe(el);
  }
  paint();
  offs.push(x.on('change', paint), spread.on('change', paint), landed.on('change', paint));
});
watch([s, A, D], paint, { flush: 'post' });
onUnmounted(() => {
  clearTimeout(foldTimer);
  unwatch?.();
  observer?.disconnect();
  offs.forEach(off => off());
  x.stop();
  spread.stop();
  landed.stop();
});

const setOpen = (next: boolean) => {
  if (next === open.value) return;
  openState.value = next;
  emit('openChange', next);
};
const settle = (target: number, v = 0) => {
  heading = target;
  const sv = s.value;
  if (reduce.value) return animate(x, sv * target, { duration: 0.2, ease: EASE_OUT });
  const flick = Math.abs(v) >= FLICK;
  return animate(
    x,
    sv * target,
    flick
      ? { type: 'spring', duration: 0.4, bounce: props.snapBounce, velocity: sv * clamp(v, -VMAX, VMAX) }
      : { ...SPRING_UI, velocity: sv * v }
  );
};
const setSpread = (on: boolean) => {
  if ((spread.get() === 1) === on) return;
  if (reduce.value) spread.set(on ? 1 : 0);
  else animate(spread, on ? 1 : 0, SPRING_UI);
  if (on && primary.value) {
    say.value = `Release to ${primary.value.label}`;
    if (props.haptic && grip?.touch) navigator.vibrate?.(8);
  }
};
const commit = (a: SwipeAction, viaKey: boolean, v = 0) => {
  const leap = a === primary.value;
  const sv = s.value;
  say.value = a.label;
  setOpen(false);
  const run = () => {
    emit('commit', a);
    a.onSelect?.();
  };
  if (!props.collapseOnCommit) {
    // the row stays: run the action and slide back to rest
    run();
    setSpread(false);
    landed.set(0);
    if (viaKey) closeNow();
    else settle(0, v);
    return;
  }
  phase.value = 'committing';
  const fold = () => {
    // pin the current height so the collapse can transition from it (an auto height cannot animate)
    const el = rootRef.value;
    if (el) {
      el.style.height = `${el.offsetHeight}px`;
      void el.offsetHeight;
    }
    phase.value = 'collapsing';
    foldTimer = setTimeout(run, props.collapseMs);
  };
  if (viaKey || reduce.value) {
    if (leap) {
      spread.set(1);
      landed.set(1);
    }
    if (viaKey) {
      x.set(sv * w);
      fold();
    } else animate(x, sv * w, { duration: 0.2, ease: EASE_OUT }).then(fold);
    return;
  }
  if (leap) {
    if (spread.get() < 1) animate(spread, 1, SPRING_UI);
    animate(landed, 1, SPRING_UI);
  }
  animate(x, sv * w, { ...SPRING_UI, velocity: sv * v }).then(fold);
};

watch(
  [open, D],
  () => {
    if (props.open === undefined || grip || phase.value !== 'idle') return;
    const target = open.value ? D.value : 0;
    if (heading === target) return;
    if (Math.abs(exposed() - target) > 0.5) settle(target);
  },
  { flush: 'post' }
);

const move = (e: PointerEvent) => {
  const g = grip;
  if (!g || g.id !== e.pointerId) return;
  const sv = s.value;
  if (g.grab === null) {
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (Math.abs(dx) < HYST || Math.abs(dx) < Math.abs(dy)) return;
    g.grab = sv * (g.x0 + Math.sign(dx) * HYST) - inv(exposed());
    g.moved = true;
    rootRef.value?.setAttribute('data-dragging', '');
    // capture only once a drag starts: capturing on pointerdown retargets the click of a plain tap to the row,
    // so checkboxes and buttons inside it stopped working
    try {
      surfaceRef.value?.setPointerCapture(e.pointerId);
    } catch {
      // capture unavailable
    }
  }
  const ex = map(sv * e.clientX - g.grab);
  x.set(sv * ex);
  g.hist.push([performance.now(), ex]);
  if (g.hist.length > 4) g.hist.shift();
  setSpread(canCommit() && ex >= commitPoint());
};
const up = (e: PointerEvent) => {
  const g = grip;
  if (!g || g.id !== e.pointerId) return;
  grip = null;
  unwatch?.();
  unwatch = null;
  rootRef.value?.removeAttribute('data-dragging');
  try {
    surfaceRef.value?.releasePointerCapture(e.pointerId);
  } catch {
    // already released
  }
  const ex = exposed();
  const v = velocityOf(g.hist);
  if (!g.moved) {
    if (open.value) {
      // a tap on an open row only closes it
      swallowClick = true;
      setOpen(false);
      settle(0);
    }
    return;
  }
  swallowClick = true;
  if (primary.value && canCommit() && ex >= commitPoint()) {
    commit(primary.value, false, v);
    return;
  }
  const d = D.value;
  const target = Math.abs(v) >= FLICK ? (v > 0 ? d : 0) : ex + project(v) > d / 2 ? d : 0;
  setSpread(false);
  setOpen(target === d);
  settle(target, v);
};
const onSurfaceClickCapture = (e: MouseEvent) => {
  if (!swallowClick) return;
  swallowClick = false;
  e.preventDefault();
  e.stopPropagation();
};
const watchWindow = () => {
  const onMove = (e: PointerEvent) => {
    if (e.isTrusted) move(e);
  };
  const onUp = (e: PointerEvent) => {
    if (e.isTrusted) up(e);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };
};
const down = (e: PointerEvent) => {
  swallowClick = false;
  if (props.disabled || n.value === 0 || phase.value !== 'idle' || grip || e.button !== 0) return;
  x.stop();
  heading = null;
  grip = {
    id: e.pointerId,
    x0: e.clientX,
    y0: e.clientY,
    grab: null,
    moved: false,
    hist: [],
    touch: e.pointerType === 'touch'
  };
  unwatch?.();
  unwatch = watchWindow();
};

const act = (a: SwipeAction, e: MouseEvent) => {
  if (phase.value !== 'idle') return;
  emit('action', a);
  if (a === primary.value || a.dismiss) {
    commit(a, e.detail === 0);
    return;
  }
  a.onSelect?.();
  if (!props.closeOnAction) return;
  setOpen(false);
  if (e.detail === 0) {
    heading = 0;
    x.set(0);
  } else settle(0);
};
const openNow = () => {
  heading = D.value;
  x.set(s.value * D.value);
  setOpen(true);
  say.value = `${n.value} actions revealed`;
};
const closeNow = () => {
  heading = 0;
  x.set(0);
  setOpen(false);
};
const onToggleKey = (e: KeyboardEvent) => {
  if (props.disabled || phase.value !== 'idle' || n.value === 0) return;
  const left = s.value < 0;
  const openKey = left ? 'ArrowLeft' : 'ArrowRight';
  const closeKey = left ? 'ArrowRight' : 'ArrowLeft';
  const toggle = e.key === 'Enter' || e.key === ' ';
  if (e.key === openKey || (toggle && !open.value)) {
    e.preventDefault();
    openNow();
  } else if (e.key === closeKey || e.key === 'Escape' || (toggle && open.value)) {
    e.preventDefault();
    closeNow();
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && open.value && primary.value && canCommit()) {
    e.preventDefault();
    commit(primary.value, true);
  }
};
const onToggleClick = (e: MouseEvent) => {
  if (e.detail !== 0 || props.disabled || phase.value !== 'idle' || n.value === 0) return;
  if (open.value) closeNow();
  else openNow();
};

const railId = computed(() => `${uid}-rail`);
const secondary = computed(() => acts.value.slice(1));
const secondaryStyle = (a: SwipeAction, i: number): CSSProperties => ({
  [s.value < 0 ? 'right' : 'left']: `${(i + 1) * A.value}px`,
  background: a.color ?? props.drawerColor,
  color: a.textColor ?? props.drawerTextColor
});

const rootStyle = computed(
  () =>
    ({
      '--sr-h': props.height ? `${props.height}px` : 'auto',
      '--sr-r': `${props.radius}px`,
      '--sr-a': `${A.value}px`,
      '--sr-row': props.rowColor,
      '--sr-text': props.textColor,
      '--sr-drawer': props.drawerColor,
      '--sr-on-drawer': props.drawerTextColor,
      '--sr-action': primary.value?.color ?? props.actionColor,
      '--sr-on-action': primary.value?.textColor ?? props.actionTextColor,
      '--sr-collapse': `${props.collapseMs}ms`
    }) as CSSProperties
);
</script>

<template>
  <div
    ref="rootRef"
    role="group"
    :aria-label="label"
    class="group relative data-[disabled]:opacity-55 data-[phase=collapsing]:opacity-0 data-[phase=collapsing]:mb-0! data-[phase=collapsing]:h-0! overflow-hidden data-[disabled]:pointer-events-none [height:var(--sr-h)] [transition:height_var(--sr-collapse)_cubic-bezier(0.23,1,0.32,1),margin-bottom_var(--sr-collapse)_cubic-bezier(0.23,1,0.32,1),opacity_var(--sr-collapse)_cubic-bezier(0.23,1,0.32,1)]"
    :class="className"
    :data-direction="direction"
    :data-open="open ? '' : undefined"
    :data-phase="phase"
    :data-disabled="disabled ? '' : undefined"
    :style="rootStyle"
  >
    <div class="relative overflow-hidden h-full [border-radius:var(--sr-r)] [background:var(--sr-row)]">
      <div
        :id="railId"
        ref="railRef"
        class="absolute inset-0 [background:var(--sr-drawer)]"
        :inert="!open || undefined"
        :aria-hidden="!open"
      >
        <button
          v-for="(a, i) in secondary"
          :key="a.id"
          type="button"
          class="group/action top-0 absolute after:absolute after:inset-0 place-items-center grid after:bg-white after:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:hover:after:opacity-[0.08] p-0 border-0 outline-none h-full after:content-[''] [-webkit-touch-callout:none] touch-manipulation cursor-pointer after:pointer-events-none select-none [font:inherit] [width:var(--sr-a)] [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:after:[transition:opacity_150ms_ease]"
          :style="secondaryStyle(a, i)"
          @click="act(a, $event)"
        >
          <span
            class="justify-items-center gap-1 grid font-medium text-[11px] leading-none tracking-[0.01em] [transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)] group-active/action:[transform:scale(0.97)] motion-reduce:group-active/action:[transform:none]"
          >
            <span v-if="a.icon" class="inline-flex"><component :is="a.icon" class="size-5" /></span>
            <span>{{ a.label }}</span>
          </span>
        </button>
        <div
          v-if="primary"
          ref="blockRef"
          class="top-0 absolute w-full h-full [background:var(--sr-action)] group-data-[direction=left]:[left:calc(100%-var(--sr-a))] group-data-[direction=right]:[right:calc(100%-var(--sr-a))]"
        >
          <button
            ref="glyphRef"
            type="button"
            class="group/action top-0 group-data-[direction=right]:right-0 group-data-[direction=left]:left-0 absolute after:absolute after:inset-0 place-items-center grid bg-transparent after:bg-white after:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:hover:after:opacity-[0.08] p-0 border-0 outline-none h-full after:content-[''] [-webkit-touch-callout:none] touch-manipulation cursor-pointer after:pointer-events-none select-none [font:inherit] [width:var(--sr-a)] [color:var(--sr-on-action)] [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:after:[transition:opacity_150ms_ease]"
            @click="act(primary, $event)"
          >
            <span
              class="justify-items-center gap-1 grid font-medium text-[11px] leading-none tracking-[0.01em] [transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)] group-active/action:[transform:scale(0.97)] motion-reduce:group-active/action:[transform:none]"
            >
              <span class="inline-flex">
                <component :is="primary.icon ?? Trash2" class="size-5" />
              </span>
              <span>{{ primary.label }}</span>
            </span>
          </button>
        </div>
      </div>
      <div
        ref="surfaceRef"
        class="z-[1] relative flex items-center gap-3 px-4 py-3 min-h-full [-webkit-touch-callout:none] touch-pan-y [@media(hover:hover)_and_(pointer:fine)]:cursor-grab [@media(hover:hover)_and_(pointer:fine)]:group-data-[dragging]:cursor-grabbing [@media(pointer:coarse)]:select-none group-data-[dragging]:[&_*]:select-none group-data-[dragging]:select-none [background:var(--sr-row)] [color:var(--sr-text)] [-webkit-tap-highlight-color:transparent]"
        @pointerdown="down"
        @click.capture="onSurfaceClickCapture"
      >
        <slot />
        <button
          v-if="n > 0"
          type="button"
          class="top-1/2 group-data-[direction=left]:right-3 group-data-[direction=right]:left-3 absolute bg-transparent m-0 p-0 focus-visible:px-2.5 border-0 focus-visible:rounded-xl outline-none w-px focus-visible:w-auto h-px focus-visible:h-6 overflow-hidden focus-visible:overflow-visible focus-visible:text-xs focus-visible:whitespace-nowrap focus-visible:-translate-y-1/2 [font:inherit] [clip-path:inset(50%)] [color:var(--sr-text)] focus-visible:[clip-path:none] focus-visible:[background:color-mix(in_srgb,var(--sr-text)_12%,transparent)]"
          :tabindex="disabled ? -1 : 0"
          :aria-expanded="open"
          :aria-controls="railId"
          :aria-keyshortcuts="s < 0 ? 'ArrowLeft' : 'ArrowRight'"
          @keydown="onToggleKey"
          @click="onToggleClick"
        >
          {{ n }} {{ n === 1 ? 'action' : 'actions' }}
        </button>
      </div>
    </div>
    <span class="sr-only" aria-live="polite">{{ say }}</span>
  </div>
</template>
