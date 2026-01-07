export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent">
      {/* Glass Card */}
      <div className="w-full max-w-md bg-riderBlack/90 backdrop-blur-xl border border-riderBlue/20 rounded-3xl shadow-2xl overflow-hidden relative">

        {/* Decorative Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-riderMaroon/40 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-riderBlue/40 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="bg-riderDark/50 border-b border-riderBlue/10 px-6 py-6 text-center">
          <h2 className="text-2xl font-extrabold text-riderLight tracking-tight italic">
            {title}
          </h2>
          <p className="text-gray-600 text-sm mt-1 font-medium">
            {subtitle}
          </p>
        </div>

        {/* Body */}
        <div className="p-8 relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
