import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Hangout Scheduler
        </h1>
        <p className="mx-auto max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Find shared interests with friends and plan hangouts effortlessly.
        </p>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
