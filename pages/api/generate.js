
import OpenAI from "openai";

const openai = new OpenAI();

const SYSTEM_PROMPT = {
  role: "system",
  content:
    "You are Angel Bello's Joke Lab assistant. Your main job is to create original, funny, clean jokes. You can make programming jokes, school jokes, science jokes, dad jokes, animal jokes, and general humor. Keep jokes friendly and appropriate for a general audience. If someone asks for an explanation or another topic, be helpful and conversational. Avoid offensive humor.",
};

// Generate a prompt that asks the AI to write a joke.
function generatePrompt(animal) {
  return `Write a funny, original, family-friendly joke about ${animal}. Include a setup and a punchline.`;
}

let chatHistory = [SYSTEM_PROMPT];

export default async function handler(req, res) {
  const { method } = req;

  if (method === "POST") {
    if (req.query.endpoint === "chat") {
      const content = req.body?.message;

      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: "Please enter a message.",
        });
      }

      // If the user asks for a joke, use generatePrompt().
      const userMessage = content.trim();
      const lowerMessage = userMessage.toLowerCase();

      const jokeMatch = lowerMessage.match(
        /^(?:tell me|write|generate|give me|make me|make)\s+(?:a|an)?\s*(?:funny\s+)?joke(?:\s+about\s+(.+))?$/
      );

      const finalMessage = jokeMatch
        ? generatePrompt(jokeMatch[1] || "a random topic")
        : userMessage;

      chatHistory.push({
        role: "user",
        content: finalMessage,
      });

      return res.status(200).json({ success: true });
    }

    if (req.query.endpoint === "reset") {
      chatHistory = [SYSTEM_PROMPT];

      return res.status(200).json({ success: true });
    }

    return res.status(404).json({
      error: "Endpoint not found.",
    });
  }

  if (method === "GET") {
    if (req.query.endpoint === "history") {
      return res.status(200).json(chatHistory);
    }

    if (req.query.endpoint === "stream") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      try {
        const stream = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-5.2",
          messages: chatHistory,
          stream: true,
        });

        let assistantReply = "";

        for await (const chunk of stream) {
          if (res.destroyed) return;

          const text = chunk.choices[0]?.delta?.content || "";

          if (text) {
            assistantReply += text;
            res.write(`data: ${JSON.stringify(text)}\n\n`);
          }
        }

        if (assistantReply) {
          chatHistory.push({
            role: "assistant",
            content: assistantReply,
          });
        }

        if (!res.destroyed) {
          res.write("event: done\ndata: {}\n\n");
          res.end();
        }
      } catch (error) {
        console.error("OpenAI streaming error:", error.message);

        if (!res.destroyed) {
          res.write(
            `event: app-error\ndata: ${JSON.stringify({
              message:
                "I couldn't generate a response. Check your API key, model access, and server terminal for details.",
            })}\n\n`
          );

          res.end();
        }
      }

      return;
    }

    return res.status(404).json({
      error: "Endpoint not found.",
    });
  }

  res.setHeader("Allow", ["GET", "POST"]);

  return res.status(405).json({
    error: "Method not allowed.",
  });
}
