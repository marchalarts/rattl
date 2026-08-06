const ALLOWED_ORIGINS = new Set([
  "https://rattl.nl",
  "https://www.rattl.nl",
])

function sendJson(res, status, payload) {
  res.status(status)
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(payload))
}

function clean(value, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength)
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeHtml(value) {
  return clean(value, 10000)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return sendJson(res, 405, {
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
    return sendJson(res, 403, {
      ok: false,
      message: "Ongeldige herkomst.",
    })
  }

  const {
    name,
    email,
    helpQuestion,
    message,
    website,
  } = req.body || {}

  // Honeypot: bots krijgen een onschuldige succesresponse.
  if (clean(website, 200)) {
    return sendJson(res, 200, { ok: true })
  }

  const safeName = clean(name, 120)
  const safeEmail = clean(email, 254)
  const safeHelp = clean(helpQuestion, 200)
  const safeMessage = clean(message, 5000)

  if (!safeName || !validEmail(safeEmail) || !safeMessage) {
    return sendJson(res, 400, {
      ok: false,
      message:
        "Vul je naam, een geldig e-mailadres en je bericht in.",
    })
  }

  const apiKey = process.env.RESEND_API_KEY
  const to =
    process.env.CONTACT_TO_EMAIL || "roelvandelden@gmail.com"
  const from =
    process.env.CONTACT_FROM_EMAIL ||
    "RATTL Website <onboarding@resend.dev>"

  if (!apiKey) {
    console.error("RESEND_API_KEY ontbreekt.")

    return sendJson(res, 500, {
      ok: false,
      message: "De mailservice is nog niet geconfigureerd.",
    })
  }

  const subject = `Nieuwe aanvraag via rattl.nl van ${safeName}`

  const emailHtml = `
    <div style="max-width:680px;font-family:Arial,sans-serif;line-height:1.55;color:#031B28">
      <h1 style="margin:0 0 24px;font-size:24px">
        Nieuwe aanvraag via rattl.nl
      </h1>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="width:180px;padding:8px 0;font-weight:bold">
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

      <h2 style="margin:28px 0 8px;font-size:18px">
        Bericht
      </h2>

      <div style="padding:18px;border-radius:12px;background:#F6ECDD;white-space:pre-wrap">
        ${escapeHtml(safeMessage)}
      </div>
    </div>
  `

  try {
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
          html: emailHtml,
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

      return sendJson(res, 502, {
        ok: false,
        message:
          "Verzenden is niet gelukt. Probeer het later opnieuw.",
      })
    }

    return sendJson(res, 200, { ok: true })
  } catch (error) {
    console.error("Contact API error:", error)

    return sendJson(res, 500, {
      ok: false,
      message:
        "Verzenden is niet gelukt. Probeer het later opnieuw.",
    })
  }
}
