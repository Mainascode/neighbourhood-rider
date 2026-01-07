/**
 * Chatbot Persona Engine
 * Simulates a friendly, Kenyan-context neighborhood rider assistant.
 */

const GREETINGS = [
    "Sema boss! 👋 Ready to order?",
    "Niaje! I'm here to help. What do you need?",
    "Hello! 🚴‍♂️ Your neighborhood assistant is ready.",
    "Mambo! Let's get your shopping done.",
    "Hey there! Need anything delivered today?",
];

const OPINIONS = {
    bread: [
        "Fresh from the bakery? Nice choice! 🍞",
        "Mkate ni fresh leo. Good pick.",
        "Bread essential! I'll make sure it's soft.",
    ],
    milk: [
        "Unataka ya packet ama fresh? 🥛",
        "Milk for tea? Or just drinking?",
        "Cool. I'll check the expiry dates strictly.",
    ],
    eggs: [
        "Tray nzima ama kiasi tu? 🥚",
        "Eggs... breakfast of champions!",
        "Handling with care! 🥚 delicate cargo.",
    ],
    meat: [
        "Nyama ya choma ama stew? 🍖",
        "Butchery ipi? The local favorite?",
        "Fresh cuts only. I got you. 🥩",
    ],
    vegetables: [
        "Healthy choice! 🥦 I'll find the freshest greens.",
        "Mboga fresh! Sawa kabisa.",
        "Greens are good. 🥬 Should I add some Dania?",
    ],
    fruits: [
        "Sweet and juicy! 🍎",
        "Vitamins muhimu! 🍊",
        "Fresh fruits coming up. 🍌",
    ],
    gas: [
        "Gas imeisha? Pole! We'll rush this. ⛽",
        "K-Gas, Total, ama? Specify brand please. 🔥",
    ]
};

const CONFIRMATIONS = [
    "Got it! And where should we deliver this? 📍(e.g., 'Ruaka, Gathigi Estate')",
    "Sawa. Location ni wapi? 📍",
    "Nice options. Location please? 🗺️",
    "On it. Drop your location details. 📍",
];

const FINAL_CONFIRMATIONS = [
    (items, loc) => `Awesome. Confirm details:\n\n🛒 Items: ${items}\n📍 Loc: ${loc}\n\nType 'Yes' to confirm or 'No' to restart.`,
    (items, loc) => `Check kiasi:\n\nItems: ${items}\nDrop-off: ${loc}\n\nSawa? (Yes/No)`,
    (items, loc) => `Ready to roll?\n\n📦 ${items}\n🌍 ${loc}\n\nConfirm? (Yes/No)`,
];

export function generateResponse(step, input, context = {}) {
    const lower = input.toLowerCase();

    // STEP 0: Greeting/Idle
    if (step === 0) {
        if (lower.includes("order") || lower.includes("buy") || lower.includes("need") || lower.includes("tuma")) {
            return { nextStep: 1, text: "Sure! List what you need (e.g., 'Bread, Milk, Gas, Groceries'). 🛒" };
        }
        if (lower.includes("hello") || lower.includes("hi") || lower.includes("niaje")) {
            const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
            return { nextStep: 0, text: `${randomGreeting} Type 'Order' to start.` };
        }
        return { nextStep: 0, text: "I can help you retrieve items. Just type 'Order' or 'Buy' to start! 🚴‍♂️" };
    }

    // STEP 1: Catching Items
    if (step === 1) {
        // Simple keyword analysis for "opinions"
        let opinion = "";
        for (const [key, responses] of Object.entries(OPINIONS)) {
            if (lower.includes(key)) {
                opinion = responses[Math.floor(Math.random() * responses.length)] + " ";
                break; // Only one opinion per message to avoid clutter
            }
        }

        const confirmMsg = CONFIRMATIONS[Math.floor(Math.random() * CONFIRMATIONS.length)];
        return { nextStep: 2, text: `${opinion}${confirmMsg}`, data: { items: input } };
    }

    // STEP 2: Catching Location
    if (step === 2) {
        const template = FINAL_CONFIRMATIONS[Math.floor(Math.random() * FINAL_CONFIRMATIONS.length)];
        return { nextStep: 3, text: template(context.items, input), data: { location: input } };
    }

    // STEP 3: Final Confirmation
    if (step === 3) {
        if (lower === "yes" || lower === "y" || lower === "sawa" || lower === "confirm" || lower.includes("ok")) {
            return { nextStep: 4, text: "Wait kidogo...", action: "complete" };
        } else {
            return { nextStep: 0, text: "Cancelled. Let's start over. Type 'Order' when ready." };
        }
    }

    return { nextStep: 0, text: "Anything else? Type 'Order' for a new request." };
}
