(() => {
  const form = document.querySelector("#mail")
  if (!form) return

  const button = form.querySelector('button[type="submit"]')
  const status = form.querySelector("[data-rattl-form-status]")
  const originalButtonText = "Versturen"

  function setStatus(message, state = "") {
    status.textContent = message
    status.dataset.state = state
  }

  function setBusy(busy) {
    button.disabled = busy
    button.textContent = busy ? "Even versturen…" : originalButtonText
  }

  function validate() {
    const name = form.elements["Naam"].value.trim()
    const email = form.elements["E-mail"].value.trim()
    const message = form.elements["Bericht"].value.trim()

    if (!name) {
      form.elements["Naam"].focus()
      return "Vul je naam in."
    }

    if (!email || !form.elements["E-mail"].checkValidity()) {
      form.elements["E-mail"].focus()
      return "Vul een geldig e-mailadres in."
    }

    if (!message) {
      form.elements["Bericht"].focus()
      return "Vertel kort wat je bezighoudt."
    }

    return ""
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault()

    const validationMessage = validate()
    if (validationMessage) {
      setStatus(validationMessage, "error")
      return
    }

    setBusy(true)
    setStatus("")

    const selectedHelp = form.querySelector(
      '[name="Hulpvraag"]:checked'
    )

    const payload = {
      name: form.elements["Naam"].value.trim(),
      email: form.elements["E-mail"].value.trim(),
      helpQuestion: selectedHelp?.value || "",
      message: form.elements["Bericht"].value.trim(),
      website: form.elements["website"].value.trim(),
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
            "Verzenden is niet gelukt. Probeer het later opnieuw."
        )
      }

      form.reset()
      setStatus(
        "Dankjewel! Je bericht is verstuurd. Ik neem snel contact met je op.",
        "success"
      )
    } catch (error) {
      console.error(error)
      setStatus(
        error.message ||
          "Verzenden is niet gelukt. Probeer het later opnieuw.",
        "error"
      )
    } finally {
      setBusy(false)
    }
  })
})()
