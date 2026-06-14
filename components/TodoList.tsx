"use client";

import { useState } from "react";

interface Task {
  id: number;
  title: string;
}

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "Set up antiX Linux" },
    { id: 2, title: "Install Next.js" },
  ]);

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-white">Daily Tasks</h2>
      
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li 
            key={task.id} 
            className="flex items-center gap-3 rounded-lg bg-zinc-800 p-3 text-zinc-200"
          >
            <input type="checkbox" className="h-4 w-4 rounded bg-zinc-700 text-emerald-500" />
            <span>{task.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}