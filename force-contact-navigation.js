(() => {
  function isContactLink(anchor) {
    if (!anchor) return false

    const rawHref = anchor.getAttribute("href") || ""

    try {
      const url = new URL(rawHref, window.location.href)
      return (
        url.origin === window.location.origin &&
        /^\/contact(?:\/|\/index\.html)?$/.test(url.pathname)
      )
    } catch {
      return false
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const anchor = event.target.closest?.("a[href]")
      if (!isContactLink(anchor)) return

      // Prevent Framer's client-side router from rendering the old
      // exported contact route from its JavaScript bundle.
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      window.location.assign("/contact/")
    },
    true
  )
})()
