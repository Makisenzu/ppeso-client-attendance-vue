import { onUnmounted, ref } from 'vue'

/**
 * Prints a standalone HTML document (e.g. an accomplishment report form) through a hidden iframe, so the
 * page around it never shows on paper and long documents flow across pages normally.
 */
export function usePrintDocument() {
  const isPrinting = ref(false)
  let frame: HTMLIFrameElement | null = null

  const removeFrame = () => {
    frame?.remove()
    frame = null
  }

  const printHtml = (html: string) => {
    removeFrame()
    isPrinting.value = true
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    frame = iframe

    iframe.onload = () => {
      const win = iframe.contentWindow
      if (!win) {
        isPrinting.value = false
        return
      }
      // Let the letterhead images load before the dialog opens
      const images = Array.from(win.document.images)
      Promise.all(
        images.map((img) =>
          img.complete ? Promise.resolve() : new Promise<void>((done) => { img.onload = img.onerror = () => done() }),
        ),
      ).then(() => {
        win.focus()
        win.print()
        isPrinting.value = false
      })
    }

    iframe.srcdoc = html
    document.body.appendChild(iframe)
  }

  onUnmounted(removeFrame)

  return { isPrinting, printHtml }
}
