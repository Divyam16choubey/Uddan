import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="flex flex-col justify-center items-center text-white py-16 md:py-24 gap-5 px-6 md:px-0">
        <div className="flex items-center gap-3 md:gap-4">
          <img src="/uddan.gif" width={72} height={72} alt="Uddan logo" />
          <h1 className="font-extrabold text-4xl md:text-6xl tracking-tight">Uddan</h1>
        </div>

        <p className="text-base md:text-xl text-slate-300 text-center max-w-xl leading-relaxed">
          A crowdfunding platform connecting aspiring founders with supporters
          to turn their ideas into reality.
        </p>

        <div className="flex gap-3 flex-wrap justify-center mt-2">
          <Link href="/login">
            <button
              type="button"
              className="bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 transition-all text-white font-semibold rounded-lg px-7 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Get Started
            </button>
          </Link>
          <Link href="/about">
            <button
              type="button"
              className="border border-slate-600 hover:border-slate-400 hover:bg-white/5 transition-all text-white font-semibold rounded-lg px-7 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Learn More
            </button>
          </Link>
        </div>
      </section>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="bg-white h-px opacity-10 mx-6" />

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="text-white container mx-auto py-16 px-6 md:px-10">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
          Turn your vision into reality
        </h2>
        <p className="text-slate-400 text-center mb-12 max-w-lg mx-auto">
          With the support of your community, anything is possible.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
            <div className="bg-blue-900/60 rounded-full p-3">
              <img width={56} height={56} src="/man.gif" alt="Community" />
            </div>
            <div>
              <p className="font-semibold text-base mb-1">Community Support</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                Share your vision and let your supporters rally around your
                goals. Real people, real backing.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
            <div className="bg-blue-900/60 rounded-full p-3">
              <img width={56} height={56} src="/coin.gif" alt="Funding" />
            </div>
            <div>
              <p className="font-semibold text-base mb-1">Direct Funding</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                Receive contributions directly to your Razorpay account —
                no middlemen, no delays.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
            <div className="bg-blue-900/60 rounded-full p-3">
              <img width={56} height={56} src="/group.gif" alt="Network" />
            </div>
            <div>
              <p className="font-semibold text-base mb-1">Grow Together</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                Build a network of believers. Every contribution strengthens
                the community around your idea.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="bg-white h-px opacity-10 mx-6" />

      {/* ── Video ──────────────────────────────────────────────────────── */}
      <section className="text-white container mx-auto py-16 px-6 flex flex-col items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
          See how it works
        </h2>
        <p className="text-slate-400 text-center mb-10 max-w-lg mx-auto">
          Watch a quick overview of what Uddan can do for you.
        </p>
        <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-lg shadow-blue-950/50">
          <iframe
            className="w-full h-full border-0"
            src="https://www.youtube.com/embed/8-EyxMuvE9A"
            title="Uddan — How it works"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </section>
    </>
  );
}
