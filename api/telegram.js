export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { name, email, phone, project_type, budget, deadline, message, ticket_id } = req.body || {};
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = "752458612";

    if (!botToken) {
      return res.status(500).json({ success: false, error: "Telegram configuration missing" });
    }

    const text =
      `🚀 *New Lead: CoderIQ.IN*\n\n` +
      `👤 *Name:* ${name || "Client"}\n` +
      `📧 *Email:* ${email || "No Email"}\n` +
      `📞 *Phone:* ${phone || "No Number"}\n` +
      `💻 *Project Type:* ${project_type || "Not specified"}\n` +
      `💰 *Budget:* ${budget || "Not specified"}\n` +
      `⏱️ *Timeline:* ${deadline || "Not specified"}\n` +
      `📝 *Message:* ${message || "No Message"}\n` +
      `🎫 *Ticket ID:* ${ticket_id || "N/A"}\n` +
      `🟡 *Status:* NEW`;

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
              { text: "📞 Contact", url: phone ? "tel:" + phone : "https://coderiq.in" },
              { text: "📧 Email", url: email ? "mailto:" + email : "https://coderiq.in" }
            ],
            [
              { text: "✅ Mark Reviewed", callback_data: "reviewed:" + (ticket_id || "N/A") }
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
