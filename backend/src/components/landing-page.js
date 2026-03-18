import Link from "next/link";

export default function LandingPage({ products, user, weather, deliveryPreview }) {
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];

  return (
    <main className="bg-slate-950 text-white">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-sm text-emerald-200">
            Fast neighborhood delivery for Ruaka market runs
          </span>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Groceries, essentials, and same-day doorstep delivery.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            Neighbourhood Rider keeps checkout simple: browse, pay with M-PESA, and track every order from pending to delivered.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={user ? "/shop" : "/auth"}
              className="rounded-full bg-amber-400 px-6 py-3 text-base font-semibold text-slate-950"
            >
              Make Your First Order
            </Link>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200">
              Weather: <strong className="capitalize">{weather}</strong> • Current delivery fee from KES {deliveryPreview}
            </div>
          </div>
          {categories.length ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  {category}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-2xl shadow-amber-950/20">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Popular picks</span>
            <span>Admin-managed inventory</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <article key={product._id.toString()} className="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200">{product.category}</p>
                    <h2 className="mt-1 text-lg font-semibold">{product.name}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">
                    {product.unit}
                  </span>
                </div>
                <p className="min-h-12 text-sm leading-6 text-slate-400">{product.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-semibold text-white">KES {product.price}</span>
                  <Link href={user ? "/shop" : "/auth"} className="text-sm text-amber-300">
                    Order now
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
