export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const update = req.body || {};
    const callback = update.callback_query;
    if (!callback) {
      return res.status(200).json({ ok: true });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ ok: false, error: "Telegram configuration missing" });
    }

    const callbackId = callback.id;
    const data = String(callback.data || "");
    const message = callback.message;

    if (!message || !data.startsWith("reviewed:")) {
      return res.status(200).json({ ok: true });
    }

    const ticketId = data.slice("reviewed:".length);
    const chatId = message.chat.id;
    const messageId = message.message_id;

    const answerResponse = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text: `Marked ${ticketId} as reviewed`,
        show_alert: false
      })
    });

    if (!answerResponse.ok) {
      console.error("Telegram callback answer failed");
    }

    const oldText = message.text || "";
    const newText = oldText
      .replace(/🟡 \\*Status:\\* NEW/g, "🟢 *Status:* REVIEWED")
      .replace(/\\n🟡 \\*Status:\\* NEW/g, "\\n🟢 *Status:* REVIEWED");

    const editResponse = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📞 Contact", url: "tel:" + (message.entities?.find(() => false) ? "" : "") }
            ],
            [
              { text: "🟢 Reviewed", callback_data: "reviewed:" + ticketId }
            ]
          ]
        }
      })
    });

    if (!editResponse.ok) {
      console.error("Telegram message edit failed");
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return res.status(500).json({ ok: false });
  }
}
