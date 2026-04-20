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
        doneDate: "",
        priority: todo.priority || "medium",
        assignee: todo.assignee || "me",
        pinned: false,
        snoozedUntil: "",
        subtasks: [],
        recurring: todo.recurring || "",
        linkedPatient: todo.linkedPatient || "",
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
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    let next;
    if (!todo.done && todo.recurring) {
      // Mark done and create next occurrence
      const newDue = getNextRecurring(todo.dueDate, todo.recurring);
      const clone = {
        ...todo,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        done: false,
        doneDate: "",
        dueDate: newDue,
        createdDate: new Date().toISOString(),
        subtasks: (todo.subtasks || []).map((s) => ({ ...s, done: false })),
      };
      next = todos.map((t) =>
        t.id === id ? { ...t, done: true, doneDate: new Date().toISOString() } : t
      );
      next.push(clone);
    } else {
      next = todos.map((t) =>
        t.id === id ? { ...t, done: !t.done, doneDate: !t.done ? new Date().toISOString() : "" } : t
      );
    }
    setTodosState(next);
    save(next);
  }, [todos]);

  const toggleSubtask = useCallback((todoId, subtaskIdx) => {
    const next = todos.map((t) => {
      if (t.id !== todoId) return t;
      const subs = [...(t.subtasks || [])];
      subs[subtaskIdx] = { ...subs[subtaskIdx], done: !subs[subtaskIdx].done };
      return { ...t, subtasks: subs };
    });
    setTodosState(next);
    save(next);
  }, [todos]);

  const addSubtask = useCallback((todoId, text) => {
    const next = todos.map((t) => {
      if (t.id !== todoId) return t;
      return { ...t, subtasks: [...(t.subtasks || []), { text, done: false }] };
    });
    setTodosState(next);
    save(next);
  }, [todos]);

  const removeSubtask = useCallback((todoId, subtaskIdx) => {
    const next = todos.map((t) => {
      if (t.id !== todoId) return t;
      const subs = [...(t.subtasks || [])];
      subs.splice(subtaskIdx, 1);
      return { ...t, subtasks: subs };
    });
    setTodosState(next);
    save(next);
  }, [todos]);

  const clearDone = useCallback(() => {
    const next = todos.filter((t) => !t.done);
    setTodosState(next);
    save(next);
  }, [todos]);

  return { todos, addTodo, updateTodo, removeTodo, toggleDone, toggleSubtask, addSubtask, removeSubtask, clearDone };
}

function getNextRecurring(currentDue, frequency) {
  const d = currentDue ? new Date(currentDue + "T12:00:00") : new Date();
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "biweekly") d.setDate(d.getDate() + 14);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}
