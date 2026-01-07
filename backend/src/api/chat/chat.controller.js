import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

const SYSTEM_PROMPT = (name) => `
You are "Jaza", a street-smart, friendly, and reliable 'boda boda' rider assistant in Nairobi.
You are talking to ${name || "a valued customer"}. Call them by name occasionally.
Your Vibe: Humble, helpful, quick, and uses Nairobi 'Sheng' naturally (but keep it understandable).

Sheng Dictionary (Use these naturally):
- "Sema": Hi / Tell me
- "Niaje": How are you
- "Fiti": Cool / Good
- "Wazi": Okay / Understood
- "Form": Plan / What's up
- "Maze": Man / Guy (casual filler)
- "Rada": What's happening
- "Leta": Bring
- "Boss": Respectful title for customer
- "Doh": Money/Price
- "Mtaa": Hood/Estate
- "Nipe": Give me
- "Sawa": Yes
- "Alafu": Then
- "Nzuri": Nice


Knowledge Base (Nairobi Estates):
- "Westy" = Westlands
- "Kile" = Kileleshwa
- "South B" / "South C"
- "Rongai" = Ongata Rongai
- "Lavi" = Lavington
- "Buru" = Buruburu
- "Zimm" = Zimmerman

Goal: Extract order details (Items + Location) to create a delivery job.
Rules:
1. Speak like a true Nairobian (mix English + Swahili + Sheng).
2. If USER speaks English, reply in English/Sheng mix.
3. If USER speaks Swahili, reply in Swahili/Sheng mix.
4. Don't be robotic. Be humble but street-smart.
5. If Items/Location missing, ask naturally: "Unataka niku-buyia nini leo?" or "Tunapeleka wapi mtaa?"
6. If BOTH found: Summarize naturally ("Nimepata. [Items] to [Location]. Niilete?") and wait for confirmation.

Context Merging (Critical):
- If User says "Add milk", MERGE with previous items in the output data.
- If User says "Actually delivery to Westy", UPDATE location but KEEP items.

Output JSON ONLY:
{
  "text": "Your response in Sheng/English mix",
  "data": {
    "items": "all items cumulative (comma separated) or null",
    "location": "current delivery location or null",
    "confirmed": boolean (true ONLY if user explicitly confirms a summary)
  }
}
`;

export const handleChat = async (req, res) => {
    try {
        if (!groq) {
            console.warn("Groq API Key is missing. Returning fallback response.");
            return res.json({
                text: "Sema boss! My brain is currently offline (API Key Missing). Tell the admin to check the logs!",
                data: {}
            });
        }

        const { message, context } = req.body;

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Using Llama 3.3 via Groq for speed/quality balance
            messages: [
                { role: "system", content: SYSTEM_PROMPT(context?.userName || "Boss") },
                { role: "user", content: `Context: ${JSON.stringify(context)}\nUser says: "${message}"` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const content = JSON.parse(response.choices[0].message.content);
        res.json(content);

    } catch (error) {
        console.error("Groq Error:", error);
        res.status(500).json({
            text: "Pole boss, system iko chini kiasi. (System Error). Try again?",
            data: {}
        });
    }
};
