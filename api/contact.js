const ALLOWED_ORIGINS = new Set([
  "https://rattl.nl",
  "https://www.rattl.nl",
])

function json(res, status, payload) {
  res.status(status)
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(payload))
}

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max)
}

function escapeHtml(value) {
  return clean(value, 10000)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return json(res, 405, {
      ok: false,
      message: "Alleen POST is toegestaan.",
    })
  }

  const origin = req.headers.origin
  if (
    origin &&
    !ALLOWED_ORIGINS.has(origin) &&
    !origin.endsWith(".vercel.app")
  ) {
    return json(res, 403, {
      ok: false,
      message: "Ongeldige herkomst.",
    })
  }

  const {
    name,
    email,
    helpQuestion,
    message,
    website, // honeypot
  } = req.body || {}

  if (clean(website, 200)) {
    return json(res, 200, { ok: true })
  }

  const safeName = clean(name, 120)
  const safeEmail = clean(email, 254)
  const safeHelp = clean(helpQuestion, 200)
  const safeMessage = clean(message, 5000)

  if (!safeName || !validEmail(safeEmail) || !safeMessage) {
    return json(res, 400, {
      ok: false,
      message:
        "Vul je naam, een geldig e-mailadres en je bericht in.",
    })
  }

  const apiKey = process.env.RESEND_API_KEY
  const to =
    process.env.CONTACT_TO_EMAIL || "marchalarts@gmail.com"
  const from =
    process.env.CONTACT_FROM_EMAIL ||
    "RATTL Website <onboarding@resend.dev>"

  if (!apiKey) {
    console.error("RESEND_API_KEY ontbreekt.")
    return json(res, 500, {
      ok: false,
      message: "De mailservice is nog niet geconfigureerd.",
    })
  }

  const subject = `Nieuwe aanvraag via rattl.nl van ${safeName}`

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#031B28;max-width:680px">
      <h1 style="font-size:24px;margin:0 0 24px">
        Nieuwe aanvraag via rattl.nl
      </h1>

      <table style="border-collapse:collapse;width:100%">
        <tr>
          <td style="padding:8px 0;font-weight:bold;width:180px">
            Naam
          </td>
          <td>${escapeHtml(safeName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:bold">
            E-mail
          </td>
          <td>
            <a href="mailto:${escapeHtml(safeEmail)}">
              ${escapeHtml(safeEmail)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:bold">
            Hulpvraag
          </td>
          <td>${escapeHtml(safeHelp || "Niet gekozen")}</td>
        </tr>
      </table>

      <h2 style="font-size:18px;margin:28px 0 8px">
        Bericht
      </h2>
      <div style="white-space:pre-wrap;background:#F6ECDD;padding:18px;border-radius:12px">
        ${escapeHtml(safeMessage)}
      </div>
    </div>
  `

  const resendResponse = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: safeEmail,
        subject,
        html,
        text: [
          "Nieuwe aanvraag via rattl.nl",
          "",
          `Naam: ${safeName}`,
          `E-mail: ${safeEmail}`,
          `Hulpvraag: ${safeHelp || "Niet gekozen"}`,
          "",
          "Bericht:",
          safeMessage,
        ].join("\n"),
      }),
    }
  )

  const result = await resendResponse.json().catch(() => ({}))

  if (!resendResponse.ok) {
    console.error("Resend error:", result)
    return json(res, 502, {
      ok: false,
      message:
        "Verzenden is niet gelukt. Probeer het later opnieuw.",
    })
  }

  return json(res, 200, { ok: true })
}
