import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'

/**
 * Scales fixed-size content (a paper-sized form) to the width of its box, like a PDF viewer: it shrinks on phones
 * instead of overflowing or reflowing, and grows on wide screens up to `maxScale`. Smaller content is centred.
 * The template binds `ref="fitBox"` on the box and `ref="fitContent"` on the content, plus the two styles.
 * Only the screen preview is scaled; print styles should reset the transform.
 */
export function useFitToWidth(maxScale = 1.5) {
  const box = useTemplateRef<HTMLElement>('fitBox')
  const content = useTemplateRef<HTMLElement>('fitContent')

  const boxWidth = ref(0)
  const contentWidth = ref(0)
  const contentHeight = ref(0)

  const scale = computed(() => {
    if (!boxWidth.value || !contentWidth.value) return 1
    return Math.min(boxWidth.value / contentWidth.value, maxScale)
  })

  const fitBoxStyle = computed(() =>
    contentHeight.value ? { height: `${Math.ceil(contentHeight.value * scale.value)}px` } : {},
  )
  const fitContentStyle = computed(() => ({
    transform: `scale(${scale.value})`,
    transformOrigin: 'top left',
    // Centre content narrower than the box
    marginLeft: `${Math.max(0, (boxWidth.value - contentWidth.value * scale.value) / 2)}px`,
  }))

  // offsetWidth / offsetHeight ignore the transform, so they always give the natural size
  const measure = () => {
    if (box.value) boxWidth.value = box.value.clientWidth
    if (content.value) {
      contentWidth.value = content.value.offsetWidth
      contentHeight.value = content.value.offsetHeight
    }
  }

  let observer: ResizeObserver | null = null
  watch(
    [box, content],
    ([boxEl, contentEl]) => {
      observer?.disconnect()
      observer = null
      if (!boxEl || !contentEl) return
      measure()
      observer = new ResizeObserver(measure)
      observer.observe(boxEl)
      observer.observe(contentEl)
    },
    { flush: 'post' },
  )

  onUnmounted(() => observer?.disconnect())

  return { fitBoxStyle, fitContentStyle }
}
