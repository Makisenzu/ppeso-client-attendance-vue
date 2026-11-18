import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'

const PAPER_WIDTH_PX = 794 // 210mm at 96 dpi
const PAPER_HEIGHT_PX = 1123 // 297mm, until the document reports its own height

/**
 * Shows a standalone print document (an iframe `srcdoc`) at A4 paper width, scaled to the space it has like a
 * PDF viewer: smaller on phones, larger on wide screens, never reflowed into a narrow column.
 * The template binds `ref="previewBox"` on the box, the two styles, and `@load="onPreviewLoad"` on the iframe.
 */
export function useDocumentPreview() {
  const previewBox = useTemplateRef<HTMLElement>('previewBox')
  const boxWidth = ref(PAPER_WIDTH_PX)
  const documentHeight = ref(PAPER_HEIGHT_PX)
  const previewScale = computed(() => boxWidth.value / PAPER_WIDTH_PX)

  const previewBoxStyle = computed(() => ({ height: `${Math.ceil(documentHeight.value * previewScale.value)}px` }))
  const previewFrameStyle = computed(() => ({
    width: `${PAPER_WIDTH_PX}px`,
    height: `${documentHeight.value}px`,
    transform: `scale(${previewScale.value})`,
    transformOrigin: 'top left',
  }))

  let boxObserver: ResizeObserver | null = null
  let documentObserver: ResizeObserver | null = null

  watch(previewBox, (el) => {
    boxObserver?.disconnect()
    boxObserver = null
    if (!el) return
    boxWidth.value = el.clientWidth || PAPER_WIDTH_PX
    boxObserver = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) boxWidth.value = entry.contentRect.width
    })
    boxObserver.observe(el)
  })

  const onPreviewLoad = (event: Event) => {
    const root = (event.target as HTMLIFrameElement).contentDocument?.documentElement
    if (!root) return
    const fit = () => {
      documentHeight.value = root.scrollHeight
    }
    fit()
    documentObserver?.disconnect()
    documentObserver = new ResizeObserver(fit)
    documentObserver.observe(root)
  }

  onUnmounted(() => {
    boxObserver?.disconnect()
    documentObserver?.disconnect()
  })

  return { previewBoxStyle, previewFrameStyle, onPreviewLoad }
}
