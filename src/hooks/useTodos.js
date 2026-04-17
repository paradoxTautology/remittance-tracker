import { useState, useCallback } from "react";

const STORAGE_KEY = "onestop-todos";

export function useTodos() {
  const [todos, setTodosState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const save = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save todos:", e);
    }
  };

  const addTodo = useCallback((todo) => {
    const next = [
      ...todos,
      {
        ...todo,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdDate: new Date().toISOString(),
        done: false,
      },
    ];
    setTodosState(next);
    save(next);
  }, [todos]);

  const updateTodo = useCallback((id, updates) => {
    const next = todos.map((t) => t.id === id ? { ...t, ...updates } : t);
    setTodosState(next);
    save(next);
  }, [todos]);

  const removeTodo = useCallback((id) => {
    const next = todos.filter((t) => t.id !== id);
    setTodosState(next);
    save(next);
  }, [todos]);

  const toggleDone = useCallback((id) => {
    const next = todos.map((t) =>
      t.id === id ? { ...t, done: !t.done, doneDate: !t.done ? new Date().toISOString() : "" } : t
    );
    setTodosState(next);
    save(next);
  }, [todos]);

  const clearDone = useCallback(() => {
    const next = todos.filter((t) => !t.done);
    setTodosState(next);
    save(next);
  }, [todos]);

  return { todos, addTodo, updateTodo, removeTodo, toggleDone, clearDone };
}
