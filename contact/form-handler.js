(() => {
  const FORM_SELECTOR = "form#mail"
  const API_URL = "/api/contact"

  const COPY = {
    title: "Klaar om stappen te zetten?",
    intro:
      "Vertel me waar je mee zit. Of waar je naartoe wilt. De rest ontdekken we samen.",
    button: "Versturen",
  }

  function labelText(input) {
    const label = input.closest("label")
    return label?.innerText?.trim() || input.value || ""
  }

  function replaceText(element, text) {
    if (!element) return
    element.textContent = text
  }

  function applyPageChanges() {
    const form = document.querySelector(FORM_SELECTOR)
    if (!form) return false

    // Titel
    const title =
      document.querySelector('[data-framer-name="Contact title"] h1') ||
      [...document.querySelectorAll("h1")].find((el) =>
        /klaar om stappen te zetten/i.test(el.textContent || "")
      )
    replaceText(title, COPY.title)

    // Intro: verwijder "Relax." en vervang de alinea.
    const intro = document.querySelector(
      '[data-framer-name="Contact introduction"]'
    )
    if (intro) {
      intro.querySelector("h2")?.remove()
      const paragraph = intro.querySelector("p")
      replaceText(paragraph, COPY.intro)
    }

    // Verwijder het volledige contactmoment-blok.
    const contactMomentBlock =
      form.querySelector('[data-framer-name="Wanneer wil je contact?"]') ||
      form.querySelector('[name="Contactmoment"]')?.closest(
        '[data-framer-name]'
      )
    contactMomentBlock?.remove()

    // Knoptekst.
    const submitButton = form.querySelector('button[type="submit"]')
    if (submitButton) {
      const textNode =
        submitButton.querySelector("p") ||
        submitButton.querySelector('[data-framer-component-type="RichTextContainer"]') ||
        submitButton
      replaceText(textNode, COPY.button)
      submitButton.dataset.originalLabel = COPY.button
    }

    // Verwijder tekst onder het formulier over bellen / LinkedIn.
    document
      .querySelector('[data-framer-name="Direct contact note"]')
      ?.remove()

    return true
  }

  function keepPageChangesApplied() {
    applyPageChanges()

    // Framer hydrateert na de eerste HTML-render en kan elementen vervangen.
    // Deze observer past de wijzigingen dan opnieuw toe.
    const observer = new MutationObserver(() => applyPageChanges())
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })

    // Na 10 seconden is de Framer-hydratatie normaal gesproken klaar.
    window.setTimeout(() => observer.disconnect(), 10000)
  }

  function setStatus(form, message, type) {
    let status = form.querySelector("[data-rattl-form-status]")

    if (!status) {
      status = document.createElement("div")
      status.setAttribute("data-rattl-form-status", "")
      status.setAttribute("role", "status")
      status.setAttribute("aria-live", "polite")

      Object.assign(status.style, {
        marginTop: "14px",
        fontFamily: '"Alegreya Sans", Arial, sans-serif',
        fontSize: "16px",
        lineHeight: "1.35",
        textAlign: "center",
      })

      form.appendChild(status)
    }

    status.textContent = message
    status.style.color = type === "error" ? "#B84218" : "#031B28"
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]')
    if (!button) return

    button.dataset.originalLabel = COPY.button
    button.disabled = busy
    button.style.opacity = busy ? "0.65" : "1"
    button.style.cursor = busy ? "wait" : "pointer"

    const textNode =
      button.querySelector("p") ||
      button.querySelector('[data-framer-component-type="RichTextContainer"]') ||
      button

    textNode.textContent = busy ? "Even versturen…" : COPY.button
  }

  async function submitForm(form) {
    const name =
      form.querySelector('[name="Naam"]')?.value?.trim() || ""
    const email =
      form.querySelector('[name="E-mail"]')?.value?.trim() || ""
    const message =
      form.querySelector('[name="Bericht"]')?.value?.trim() || ""
    const website =
      form.querySelector('[name="website"]')?.value?.trim() || ""
    const helpInput = form.querySelector('[name="Hulpvraag"]:checked')

    if (!name || !email || !message) {
      setStatus(
        form,
        "Vul je naam, e-mailadres en bericht in.",
        "error"
      )

      form
        .querySelector(
          !name
            ? '[name="Naam"]'
            : !email
              ? '[name="E-mail"]'
              : '[name="Bericht"]'
        )
        ?.focus()

      return
    }

    setBusy(form, true)
    setStatus(form, "", "success")

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          website,
          helpQuestion: helpInput ? labelText(helpInput) : "",
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Verzenden is niet gelukt.")
      }

      form.reset()
      setStatus(
        form,
        "Dankjewel! Je bericht is verstuurd. Ik neem snel contact met je op.",
        "success"
      )
    } catch (error) {
      console.error(error)
      setStatus(
        form,
        error?.message ||
          "Verzenden is niet gelukt. Probeer het later opnieuw.",
        "error"
      )
    } finally {
      setBusy(form, false)
    }
  }

  // Eerst de inhoudelijke wijzigingen toepassen.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", keepPageChangesApplied, {
      once: true,
    })
  } else {
    keepPageChangesApplied()
  }

  // Capture phase voorkomt dat Framer's oude submit-handler eerder afgaat.
  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target.closest?.(FORM_SELECTOR)
      if (!form) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      submitForm(form)
    },
    true
  )
})()
