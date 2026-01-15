export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent">
      {/* Light Card */}
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-2xl overflow-hidden relative">

        {/* Decorative Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-riderMaroon/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-riderBlue/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-6 text-center">
          <h2 className="text-2xl font-extrabold text-riderLight tracking-tight italic">
            {title}
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            {subtitle}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
