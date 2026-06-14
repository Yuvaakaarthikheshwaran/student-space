// Notice the import path changed slightly because our folders shifted!
import TodoList from "../components/TodoList";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Student<span className="text-emerald-400">Space</span>
        </h1>
        <p className="mt-2 text-zinc-400">Your minimal productivity dashboard.</p>
      </div>

      {/* Render the TodoList here */}
      <TodoList />
    </main>
  );
}