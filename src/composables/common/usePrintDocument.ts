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
      // Pictures (<img> and SVG <image>) and web fonts must be in before the dialog opens, or they print blank
      const doc = win.document
      const sources = [
        ...Array.from(doc.images).map((img) => img.currentSrc || img.src),
        ...Array.from(doc.querySelectorAll('image')).map((node) => node.getAttribute('href') ?? ''),
      ].filter(Boolean)
      const loadImage = (src: string) =>
        new Promise<void>((done) => {
          const probe = new Image()
          probe.onload = probe.onerror = () => done()
          probe.src = src
          setTimeout(done, 4000)
        })
      const fontsReady = doc.fonts ? doc.fonts.ready.then(() => undefined) : Promise.resolve()
      Promise.all([...sources.map(loadImage), fontsReady])
        .then(() => new Promise((done) => setTimeout(done, 150)))
        .then(() => {
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
