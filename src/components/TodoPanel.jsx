import { useState } from "react";

const CATEGORIES = [
  { key: "billing", label: "Billing", color: "#6ca6d6" },
  { key: "front_desk", label: "Front Desk", color: "#d4a843" },
  { key: "supervision", label: "Supervision", color: "#b07cc8" },
  { key: "admin", label: "Admin", color: "#c2703e" },
];

export default function TodoPanel({ todos, onAdd, onToggle, onRemove, onClearDone }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("billing");
  const [dueDate, setDueDate] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [filter, setFilter] = useState("all");

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({ text: trimmed, category, dueDate: dueDate || "" });
    setText("");
    setDueDate("");
  };

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const filtered = (showDone ? todos : open).filter(
    (t) => filter === "all" || t.category === filter
  );

  const overdue = open.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString())
  );

  const catInfo = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[3];

  return (
    <div>
      {/* Add task inline */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task..."
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            fontSize: 12,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            fontSize: 11,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{
            padding: "8px 8px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            fontSize: 11,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          Add
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ key: "all", label: "All" }, ...CATEGORIES].map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              style={{
                padding: "3px 10px",
                borderRadius: 12,
                border: filter === c.key ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: filter === c.key ? "var(--accent)" + "20" : "transparent",
                color: filter === c.key ? "var(--accent)" : "var(--text-muted)",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {done.length > 0 && (
            <>
              <button
                onClick={() => setShowDone(!showDone)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {showDone ? "Hide done" : `Show done (${done.length})`}
              </button>
              <button
                onClick={onClearDone}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--red)",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Clear done
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overdue warning */}
      {overdue.length > 0 && !showDone && (
        <div style={{
          padding: "6px 12px",
          marginBottom: 8,
          borderRadius: 6,
          background: "rgba(212, 96, 74, 0.1)",
          border: "1px solid rgba(212, 96, 74, 0.3)",
          fontSize: 11,
          color: "var(--red)",
        }}>
          {overdue.length} overdue task{overdue.length > 1 ? "s" : ""}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "12px 0", textAlign: "center" }}>
          {todos.length === 0 ? "No tasks yet" : "No tasks match this filter"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered
            .sort((a, b) => {
              if (a.done !== b.done) return a.done ? 1 : -1;
              if (!a.done && a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
              return new Date(b.createdDate) - new Date(a.createdDate);
            })
            .map((t) => {
              const cat = catInfo(t.category);
              const isOverdue = !t.done && t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString());
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: t.done ? "transparent" : "var(--bg-input)",
                    border: isOverdue ? "1px solid rgba(212, 96, 74, 0.4)" : "1px solid var(--border)",
                    opacity: t.done ? 0.5 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => onToggle(t.id)}
                    style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 10,
                      background: cat.color + "20",
                      color: cat.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat.label}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: "var(--text-primary)",
                      textDecoration: t.done ? "line-through" : "none",
                    }}
                  >
                    {t.text}
                  </span>
                  {t.dueDate && (
                    <span
                      style={{
                        fontSize: 10,
                        color: isOverdue ? "var(--red)" : "var(--text-muted)",
                        fontWeight: isOverdue ? 600 : 400,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(t.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <button
                    onClick={() => onRemove(t.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: 14,
                      cursor: "pointer",
                      padding: "0 4px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
