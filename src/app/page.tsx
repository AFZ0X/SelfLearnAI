import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-bold">SelfLearn AI</h1>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
          >
            Sign up
          </Link>
        </nav>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h2 className="text-4xl font-bold tracking-tight max-w-2xl">
          An AI that learns, remembers, and improves over time.
        </h2>
        <p className="mt-6 text-lg text-zinc-600 max-w-xl">
          SelfLearn AI is a self-improving AI assistant platform with
          long-term memory, web research, and continuous learning capabilities.
        </p>
        <p className="mt-2 text-sm text-zinc-400">
           Chat is ready. Memory, web search, and autonomous learning coming in future phases.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border text-zinc-700 font-medium hover:bg-zinc-50"
          >
            Log in
          </Link>
        </div>
      </main>
      <footer className="px-6 py-4 border-t text-center text-sm text-zinc-400">
        SelfLearn AI &mdash; Building the future of persistent AI memory.
      </footer>
    </div>
  );
}
