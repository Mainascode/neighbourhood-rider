
export default function MessageBubble({ sender, text }) {
  const isUser = sender === "user";

  return (
    <div
      className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
        isUser
          ? "ml-auto bg-cyan-500 text-black"
          : "mr-auto bg-neutral-800 text-riderLight"
      }`}
    >
      {text}
    </div>
  );
}
