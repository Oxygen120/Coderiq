export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const contentType = String(req.headers["content-type"] || "");
    if (!contentType.toLowerCase().includes("application/json")) {
      return res.status(415).json({ success: false, error: "JSON required" });
    }

    const body = req.body || {};
    const { name, email, phone, project_type, budget, deadline, message, ticket_id } = body;

    const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
    const lead = {
      name: clean(name, 100),
      email: clean(email, 160),
      phone: clean(phone, 30),
      project_type: clean(project_type, 100),
      budget: clean(budget, 100),
      deadline: clean(deadline, 100),
      message: clean(message, 2000),
      ticket_id: clean(ticket_id, 80)
    };

    if (!lead.ticket_id || lead.ticket_id.length > 80) {
      return res.status(400).json({ success: false, error: "Invalid inquiry" });
    }

    const requestOrigin = String(req.headers.origin || "");
    if (requestOrigin && requestOrigin !== "https://coderiq.in" && requestOrigin !== "https://www.coderiq.in") {
      return res.status(403).json({ success: false, error: "Origin not allowed" });
    }

    const forwardedFor = String(req.headers["x-forwarded-for"] || "");
    const clientIp = forwardedFor.split(",")[0].trim() || "unknown";
    globalThis.__coderIqRateLimit = globalThis.__coderIqRateLimit || new Map();
    const now = Date.now();
    const previous = globalThis.__coderIqRateLimit.get(clientIp) || 0;
    if (now - previous < 15000) {
      return res.status(429).json({ success: false, error: "Too many requests" });
    }
    globalThis.__coderIqRateLimit.set(clientIp, now);

    const {
      name: safeName,
      email: safeEmail,
      phone: safePhone,
      project_type: safeProjectType,
      budget: safeBudget,
      deadline: safeDeadline,
      message: safeMessage,
      ticket_id: safeTicketId
    } = lead;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = "752458612";

    if (!botToken) {
      return res.status(500).json({ success: false, error: "Telegram configuration missing" });
    }

    const text =
      `🚀 *New Lead: CoderIQ.IN*\n\n` +
      `👤 *Name:* ${safeName || "Client"}\n` +
      `📧 *Email:* ${safeEmail || "No Email"}\n` +
      `📞 *Phone:* ${safePhone || "No Number"}\n` +
      `💻 *Project Type:* ${safeProjectType || "Not specified"}\n` +
      `💰 *Budget:* ${safeBudget || "Not specified"}\n` +
      `⏱️ *Timeline:* ${safeDeadline || "Not specified"}\n` +
      `📝 *Message:* ${safeMessage || "No Message"}\n` +
      `🎫 *Ticket ID:* ${safeTicketId || "N/A"}\n` +
      `🟡 *Status:* NEW`;

    const phoneDigits = safePhone.replace(/\D/g, "");
    const whatsappPhone =
      phoneDigits.length === 10
        ? "91" + phoneDigits
        : phoneDigits;

    const whatsappFields = [];

    if (safeTicketId) whatsappFields.push(`🎫 *Inquiry ID:* ${safeTicketId}`);
    if (safeProjectType) whatsappFields.push(`💻 *Project:* ${safeProjectType}`);
    if (safeBudget) whatsappFields.push(`💰 *Budget:* ${safeBudget}`);
    if (safeDeadline) whatsappFields.push(`⏱️ *Timeline:* ${safeDeadline}`);

    const whatsappDetails = whatsappFields.length
      ? whatsappFields.join("\n") + "\n\n"
      : "";

    const whatsappBase =
      `Hello ${safeName || "there"},\n\n` +
      `This is *CoderIQ* regarding your recent project inquiry.\n\n` +
      whatsappDetails;

    const whatsappTemplates = {
      initial:
        whatsappBase +
        `We’ve received your requirements and would be happy to discuss your project further.\n\n` +
        `Please let us know a convenient time to connect.\n\n` +
        `*Regards,*\n*CoderIQ.IN*\nWeb • Apps • Digital Solutions`,

      requirements:
        whatsappBase +
        `We’d like to understand your requirements a little better so we can suggest the right solution.\n\n` +
        `Please share any additional features, references, or specific requirements you have in mind.\n\n` +
        `*Regards,*\n*CoderIQ.IN*`,

      quote:
        whatsappBase +
        `We wanted to follow up regarding your project inquiry and the quotation.\n\n` +
        `Please let us know if you have any questions about the pricing, features, or timeline.\n\n` +
        `*Regards,*\n*CoderIQ.IN*`,

      closing:
        whatsappBase +
        `We’re ready to move forward with your project whenever you are. 🤝\n\n` +
        `If everything looks good, please confirm and we can proceed with the next steps.\n\n` +
        `*Regards,*\n*CoderIQ.IN*`
    };

    const whatsappUrl = (messageText) =>
      whatsappPhone.length >= 10
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(messageText)}`
        : null;

    const initialUrl = whatsappUrl(whatsappTemplates.initial);
    const requirementsUrl = whatsappUrl(whatsappTemplates.requirements);
    const quoteUrl = whatsappUrl(whatsappTemplates.quote);
    const closingUrl = whatsappUrl(whatsappTemplates.closing);

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              initialUrl
                ? { text: "💬 Initial Contact", url: initialUrl }
                : { text: "💬 Initial Contact", callback_data: "contact:No valid phone number" },
              requirementsUrl
                ? { text: "📋 Requirements", url: requirementsUrl }
                : { text: "📋 Requirements", callback_data: "contact:No valid phone number" }
            ],
            [
              quoteUrl
                ? { text: "💰 Quote Follow-up", url: quoteUrl }
                : { text: "💰 Quote Follow-up", callback_data: "contact:No valid phone number" },
              closingUrl
                ? { text: "🤝 Closing", url: closingUrl }
                : { text: "🤝 Closing", callback_data: "contact:No valid phone number" }
            ],
            [
              { text: "📧 Email", callback_data: "email:" + (safeEmail || "No Email") }
            ],
            [
              { text: "📞 Mark Contacted", callback_data: "contacted:" + (safeTicketId || "N/A") },
              { text: "🟡 Mark Reviewed", callback_data: "reviewed:" + (safeTicketId || "N/A") }
            ],
            [
              { text: "⚫ Close Lead", callback_data: "closed:" + (safeTicketId || "N/A") }
            ]
          ]
        }
      })
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      console.error("Telegram API error:", telegramData);
      return res.status(502).json({ success: false, error: "Telegram delivery failed" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Telegram handler error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
