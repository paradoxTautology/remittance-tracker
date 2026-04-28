import { useState } from "react";

const CATEGORIES = [
  { key: "billing", label: "Billing", color: "#6ca6d6" },
  { key: "front_desk", label: "Front Desk", color: "#d4a843" },
  { key: "supervision", label: "Supervision", color: "#b07cc8" },
  { key: "admin", label: "Admin", color: "#c2703e" },
];

const PRIORITIES = [
  { key: "high", label: "High", color: "#d4604a", dot: "var(--red)" },
  { key: "medium", label: "Med", color: "#d4a838", dot: "#d4a838" },
  { key: "low", label: "Low", color: "#8a8078", dot: "#8a8078" },
];

const ASSIGNEES = [
  { key: "me", label: "Me" },
  { key: "front_desk", label: "Front Desk" },
  { key: "dr_preddy", label: "Dr. Preddy" },
];

const STATUSES = [
  { key: "not_started", label: "To Do", color: "#8a8078" },
  { key: "in_progress", label: "In Progress", color: "#6ca6d6" },
  { key: "waiting", label: "Waiting", color: "#d4a838" },
  { key: "done", label: "Done", color: "#6db856" },
];

const RECURRING = [
  { key: "", label: "None" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Biweekly" },
  { key: "monthly", label: "Monthly" },
];

const TEMPLATES = [
  { name: "Appeal Denied Claim", category: "billing", priority: "high", text: "Appeal denied claim \u2014 [Patient Name]", notes: "1. Pull original claim and EOB\n2. Review denial reason code\n3. Gather supporting documentation\n4. Write appeal letter\n5. Submit via payer portal or mail\n6. Log in work log", subtasks: [{ text: "Pull original claim & EOB", done: false },{ text: "Review denial reason", done: false },{ text: "Gather supporting docs", done: false },{ text: "Write appeal letter", done: false },{ text: "Submit appeal", done: false },{ text: "Log in work log", done: false }] },
  { name: "New Patient Onboarding", category: "front_desk", priority: "medium", text: "New patient onboarding \u2014 [Patient Name]", notes: "Collect all required info before first visit", subtasks: [{ text: "Collect insurance card (front & back)", done: false },{ text: "Verify eligibility", done: false },{ text: "Collect photo ID", done: false },{ text: "Have patient complete intake forms", done: false },{ text: "Enter demographics in system", done: false },{ text: "Check prior authorization requirements", done: false }] },
  { name: "Monthly MOC Review", category: "admin", priority: "medium", recurring: "monthly", text: "Monthly Model of Care review", notes: "CMS requirement \u2014 review and document compliance", subtasks: [{ text: "Review current MOC requirements", done: false },{ text: "Check attestation status for all plans", done: false },{ text: "Complete any outstanding attestations", done: false },{ text: "Document compliance", done: false }] },
  { name: "Credentialing / Re-credentialing", category: "admin", priority: "high", text: "Credentialing \u2014 [Payer Name]", notes: "Track credentialing application status", subtasks: [{ text: "Gather required documents", done: false },{ text: "Complete application", done: false },{ text: "Submit application", done: false },{ text: "Follow up on status (2 weeks)", done: false },{ text: "Receive approval/effective date", done: false },{ text: "Update payer list in system", done: false }] },
  { name: "Prior Authorization", category: "billing", priority: "high", text: "Prior auth \u2014 [Patient] \u2014 [Procedure]", notes: "Submit prior authorization request", subtasks: [{ text: "Verify auth requirements", done: false },{ text: "Gather clinical documentation", done: false },{ text: "Submit auth request", done: false },{ text: "Get reference number", done: false },{ text: "Follow up if no response in 5 days", done: false }] },
  { name: "Weekly Denial Review", category: "billing", priority: "medium", recurring: "weekly", text: "Weekly denial review", notes: "Review all new denials and assign follow-up actions", subtasks: [{ text: "Pull denied claims from this week", done: false },{ text: "Categorize by denial reason", done: false },{ text: "Assign rework actions", done: false },{ text: "Update work log", done: false }] },
];

function linkify(str) {
  if (!str) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = str.split(urlRegex);
  return parts.map((part, i) => urlRegex.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", wordBreak: "break-all" }}>{part}</a> : <span key={i}>{part}</span>);
}

function extractLink(notes) { if (!notes) return null; const m = notes.match(/(https?:\/\/[^\s]+)/); return m ? m[1] : null; }
function getStatus(t) { if (t.done) return "done"; return t.status || "not_started"; }
function priSort(a, b) { const o = { high: 0, medium: 1, low: 2 }; return (o[a.priority||"medium"]??1) - (o[b.priority||"medium"]??1) || (a.dueDate||"z").localeCompare(b.dueDate||"z"); }

const sel = { padding: "4px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", fontSize: 10, fontFamily: "inherit", cursor: "pointer" };
const smBtn = (c) => ({ padding: "3px 8px", borderRadius: 4, border: "1px solid " + (c||"var(--border)"), background: "transparent", color: c||"var(--text-muted)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" });
const pill = (on) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: on ? "1px solid var(--accent)" : "1px solid var(--border)", background: on ? "rgba(194,112,62,0.15)" : "transparent", color: on ? "var(--accent)" : "var(--text-muted)" });

export default function TodoPanel({ todos, onAdd, onToggle, onRemove, onClearDone, onUpdate, onToggleSubtask, onAddSubtask, onRemoveSubtask, onAddAttachments, onRemoveAttachment }) {
  const [view, setView] = useState("list");
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("billing");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("me");
  const [recurring, setRecurring] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [timeEst, setTimeEst] = useState("");
  const [filter, setFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);
  const [editNotesText, setEditNotesText] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [showDone, setShowDone] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  const active = todos.filter((t) => { if (t.done || getStatus(t)==="done") return false; if (t.snoozedUntil && t.snoozedUntil > todayStr) return false; return true; });
  const snoozed = todos.filter((t) => !t.done && t.snoozedUntil && t.snoozedUntil > todayStr);
  const done = todos.filter((t) => t.done || getStatus(t)==="done");
  const completedThisWeek = todos.filter((t) => t.done && t.doneDate && new Date(t.doneDate) > weekAgo).length;

  let filtered = showDone ? [...active, ...done] : active;
  if (filter !== "all") filtered = filtered.filter((t) => t.category === filter);
  if (assigneeFilter !== "all") filtered = filtered.filter((t) => (t.assignee||"me") === assigneeFilter);
  if (search) { const s = search.toLowerCase(); filtered = filtered.filter((t) => t.text.toLowerCase().includes(s) || (t.notes||"").toLowerCase().includes(s)); }

  const catCounts = {}; active.forEach((t) => { catCounts[t.category] = (catCounts[t.category]||0)+1; });
  const workload = {}; active.forEach((t) => { const a = t.assignee||"me"; workload[a] = (workload[a]||0)+1; });
  const totalTasks = todos.length;
  const progressPct = totalTasks > 0 ? Math.round((done.length / totalTasks) * 100) : 0;

  const handleAdd = () => {
    const trimmed = text.trim(); if (!trimmed) return;
    onAdd({ text: trimmed, category, dueDate, notes: notes.trim(), priority, assignee, recurring, timeEstimate: timeEst, status: "not_started" });
    setText(""); setNotes(""); setDueDate(""); setPriority("medium"); setAssignee("me"); setRecurring(""); setTimeEst(""); setShowForm(false);
  };

  const handleTemplate = (tmpl) => {
    onAdd({ text: tmpl.text, category: tmpl.category, priority: tmpl.priority, notes: tmpl.notes||"", assignee: "me", recurring: tmpl.recurring||"", dueDate: "", timeEstimate: "", status: "not_started", subtasks: tmpl.subtasks ? tmpl.subtasks.map(s=>({...s})) : [] });
    setShowTemplates(false);
  };

  const doSetStatus = (id, status) => { if (status==="done") { onToggle(id); } else { onUpdate(id, { status, done: false, doneDate: "" }); } };
  const handleSnooze = (id, days) => { const d = new Date(); d.setDate(d.getDate()+days); onUpdate(id, { snoozedUntil: d.toISOString().split("T")[0] }); };

  const catInfo = (k) => CATEGORIES.find((c)=>c.key===k) || CATEGORIES[3];
  const priInfo = (k) => PRIORITIES.find((p)=>p.key===k) || PRIORITIES[1];
  const statusInfo = (k) => STATUSES.find((s)=>s.key===k) || STATUSES[0];

  // ─── Task Card ─────────────────────────────────────
  const TaskCard = ({ t, compact }) => {
    const cat = catInfo(t.category);
    const pri = priInfo(t.priority||"medium");
    const st = statusInfo(getStatus(t));
    const isOverdue = !t.done && t.dueDate && t.dueDate < todayStr;
    const isExp = expanded === t.id && !compact;
    const link = extractLink(t.notes);
    const subs = t.subtasks||[];
    const subsDone = subs.filter(s=>s.done).length;
    const aLabel = ASSIGNEES.find(a=>a.key===(t.assignee||"me"))?.label||"Me";

    return (
      <div style={{ marginBottom: compact ? 6 : 2 }}>
        <div onClick={() => !compact && setExpanded(isExp ? null : t.id)}
          style={{ display: "flex", alignItems: compact?"flex-start":"center", gap: 8, padding: compact?"10px 12px":"8px 12px", borderRadius: isExp?"6px 6px 0 0":6, background: t.done?"transparent":"var(--bg-input)", border: isOverdue?"1px solid rgba(212,96,74,0.4)":"1px solid var(--border)", borderBottom: isExp?"none":undefined, opacity: t.done?0.4:1, cursor: "pointer", flexWrap: compact?"wrap":"nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: pri.dot }} title={pri.label} />
            <select value={getStatus(t)} onChange={(e)=>{e.stopPropagation();doSetStatus(t.id,e.target.value);}} onClick={(e)=>e.stopPropagation()}
              style={{ padding: "2px 3px", borderRadius: 4, border: `1px solid ${st.color}40`, background: `${st.color}15`, color: st.color, fontSize: 8, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", textTransform: "uppercase" }}>
              {STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: cat.color+"20", color: cat.color, textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>{cat.label}</span>
          <span style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", textDecoration: t.done?"line-through":"none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: compact?"normal":"nowrap" }}>{t.text}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {t.recurring && <span style={{ fontSize: 10, color: "var(--text-muted)" }} title={"Repeats "+t.recurring}>↻</span>}
            {subs.length > 0 && <span style={{ fontSize: 9, color: subsDone===subs.length?"var(--green)":"var(--text-muted)" }}>{subsDone}/{subs.length}</span>}
            {t.timeEstimate && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{t.timeEstimate}m</span>}
            {(t.assignee||"me")!=="me" && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 8, background: "var(--bg-hover)", color: "var(--text-muted)" }}>{aLabel}</span>}
            {t.pinned && <span style={{ fontSize: 10, color: "var(--accent)" }}>📌</span>}
            {link && <a href={link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize: 10, color: "var(--accent)", textDecoration: "none" }}>↗</a>}
            {!compact && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{isExp?"▴":"▾"}</span>}
            {t.dueDate && <span style={{ fontSize: 10, color: isOverdue?"var(--red)":"var(--text-muted)", fontWeight: isOverdue?600:400, whiteSpace: "nowrap" }}>{new Date(t.dueDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
            {!compact && <button onClick={e=>{e.stopPropagation();onRemove(t.id);}} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>}
          </div>
        </div>
        {isExp && (
          <div style={{ padding: "12px 12px 12px 36px", background: "var(--bg-hover)", border: isOverdue?"1px solid rgba(212,96,74,0.4)":"1px solid var(--border)", borderTop: "none", borderRadius: "0 0 6px 6px", fontSize: 11, color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
              <button onClick={()=>onUpdate(t.id,{pinned:!t.pinned})} style={smBtn(t.pinned?"var(--accent)":null)}>{t.pinned?"Unpin":"Pin"}</button>
              <select value={t.priority||"medium"} onChange={e=>onUpdate(t.id,{priority:e.target.value})} style={sel}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select>
              <select value={t.assignee||"me"} onChange={e=>onUpdate(t.id,{assignee:e.target.value})} style={sel}>{ASSIGNEES.map(a=><option key={a.key} value={a.key}>{a.label}</option>)}</select>
              <select value={t.recurring||""} onChange={e=>onUpdate(t.id,{recurring:e.target.value})} style={sel}>{RECURRING.map(r=><option key={r.key} value={r.key}>{r.key?"↻ "+r.label:"No Repeat"}</option>)}</select>
              <select onChange={e=>{if(e.target.value)handleSnooze(t.id,parseInt(e.target.value));e.target.value="";}} style={sel}><option value="">Snooze</option><option value="1">Tomorrow</option><option value="3">3 days</option><option value="7">1 week</option></select>
              <input type="number" placeholder="Min" value={t.timeEstimate||""} onChange={e=>onUpdate(t.id,{timeEstimate:e.target.value})} style={{...sel,width:50}} title="Time estimate" />
              {link && <a href={link} target="_blank" rel="noopener noreferrer" style={{...smBtn("var(--accent)"),textDecoration:"none"}}>Open Link ↗</a>}
            </div>
            {editingNotes===t.id ? (
              <div style={{ marginBottom: 10 }}>
                <textarea value={editNotesText} onChange={e=>setEditNotesText(e.target.value)} rows={4} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 11, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={()=>{onUpdate(t.id,{notes:editNotesText});setEditingNotes(null);}} style={{ padding: "4px 12px", borderRadius: 4, border: "none", background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                  <button onClick={()=>setEditingNotes(null)} style={smBtn()}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 10 }}>
                {t.notes ? <div style={{ whiteSpace: "pre-wrap", marginBottom: 6, lineHeight: 1.6 }}>{linkify(t.notes)}</div> : <div style={{ color: "var(--text-muted)", fontStyle: "italic", marginBottom: 6 }}>No details</div>}
                <button onClick={()=>{setEditingNotes(t.id);setEditNotesText(t.notes||"");}} style={smBtn()}>{t.notes?"Edit":"Add details"}</button>
              </div>
            )}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Subtasks {subs.length>0&&`(${subsDone}/${subs.length})`}</div>
              {subs.length > 0 && <div style={{ height: 3, borderRadius: 2, background: "var(--border)", marginBottom: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${subs.length>0?(subsDone/subs.length)*100:0}%`, background: "var(--green)", borderRadius: 2, transition: "width 0.3s" }} /></div>}
              {subs.map((s,idx)=>(
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                  <input type="checkbox" checked={s.done} onChange={()=>onToggleSubtask?.(t.id,idx)} style={{ cursor: "pointer", accentColor: "var(--accent)" }} />
                  <span style={{ flex: 1, fontSize: 11, color: "var(--text-primary)", textDecoration: s.done?"line-through":"none", opacity: s.done?0.5:1 }}>{s.text}</span>
                  <button onClick={()=>onRemoveSubtask?.(t.id,idx)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newSubtask.trim()){onAddSubtask?.(t.id,newSubtask.trim());setNewSubtask("");}}} placeholder="Add subtask..." style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 10, fontFamily: "inherit", outline: "none" }} />
                <button onClick={()=>{if(newSubtask.trim()){onAddSubtask?.(t.id,newSubtask.trim());setNewSubtask("");}}} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "var(--accent)", color: "#fff", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>+</button>
              </div>
            </div>
            {/* Attachments */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                Attachments {(t.attachments||[]).length > 0 && `(${(t.attachments||[]).length})`}
              </div>
              {(t.attachments||[]).map((att, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <span style={{ fontSize: 14 }}>{att.name && att.name.endsWith(".pdf") ? "\ud83d\udcc4" : "\ud83d\udcce"}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (window.electronAPI) window.electronAPI.openFile(att.path); }}
                    style={{ flex: 1, background: "transparent", border: "none", color: "var(--accent)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: 0 }}
                  >
                    {att.name}
                  </button>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{att.size ? (att.size / 1024 < 1024 ? Math.round(att.size / 1024) + " KB" : (att.size / 1024 / 1024).toFixed(1) + " MB") : ""}</span>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveAttachment && onRemoveAttachment(t.id, idx); }}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>\u00d7</button>
                </div>
              ))}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.electronAPI) {
                    const files = await window.electronAPI.pickFiles();
                    if (files && files.length > 0 && onAddAttachments) onAddAttachments(t.id, files);
                  } else {
                    alert("File attachments only work in the desktop app. Build with npm run dist first.");
                  }
                }}
                style={{ marginTop: 4, padding: "4px 10px", borderRadius: 4, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 10, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
              >
                + Attach File
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 9, color: "var(--text-muted)" }}>
              Added {new Date(t.createdDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
              {t.recurring && ` \u00b7 Repeats ${t.recurring}`}
              {t.timeEstimate && ` \u00b7 ~${t.timeEstimate} min`}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Views ─────────────────────────────────────────
  const FocusView = () => {
    const overdueTasks = active.filter(t=>t.dueDate&&t.dueDate<todayStr).sort(priSort);
    const todayTasks = active.filter(t=>t.dueDate===todayStr||t.pinned).sort(priSort);
    const highPri = active.filter(t=>t.priority==="high"&&!t.pinned&&t.dueDate!==todayStr&&!(t.dueDate&&t.dueDate<todayStr)).sort(priSort);
    return (
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Today's Focus</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        {overdueTasks.length>0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", marginBottom: 6 }}>Overdue ({overdueTasks.length})</div>{overdueTasks.map(t=><TaskCard key={t.id} t={t} />)}</div>}
        {todayTasks.length>0 ? <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", textTransform: "uppercase", marginBottom: 6 }}>Today & Pinned ({todayTasks.length})</div>{todayTasks.map(t=><TaskCard key={t.id} t={t} />)}</div>
        : <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Nothing due today</div>}
        {highPri.length>0 && <div><div style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", marginBottom: 6 }}>High Priority ({highPri.length})</div>{highPri.slice(0,5).map(t=><TaskCard key={t.id} t={t} />)}</div>}
      </div>
    );
  };

  const BoardView = () => {
    const columns = STATUSES.map(s=>({...s, items: filtered.filter(t=>getStatus(t)===s.key).sort(priSort)}));
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUSES.length}, 1fr)`, gap: 12, minHeight: 300 }}>
        {columns.map(col=>(
          <div key={col.key} style={{ background: "var(--bg-input)", borderRadius: 8, padding: 10, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} /><span style={{ fontSize: 10, fontWeight: 700, color: col.color, textTransform: "uppercase" }}>{col.label}</span></div>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{col.items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {col.items.map(t=><TaskCard key={t.id} t={t} compact />)}
              {col.items.length===0 && <div style={{ padding: 16, textAlign: "center", fontSize: 10, color: "var(--text-muted)", borderRadius: 6, border: "1px dashed var(--border)" }}>No tasks</div>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const ListView = () => {
    const pinned = filtered.filter(t=>t.pinned&&!t.done);
    const unpinned = filtered.filter(t=>!t.pinned||t.done);
    const groups = { overdue:[], today:[], thisWeek:[], later:[], noDue:[] };
    unpinned.filter(t=>!t.done).forEach(t=>{ if(!t.dueDate)groups.noDue.push(t); else if(t.dueDate<todayStr)groups.overdue.push(t); else if(t.dueDate===todayStr)groups.today.push(t); else if(t.dueDate<=weekEndStr)groups.thisWeek.push(t); else groups.later.push(t); });
    const doneItems = unpinned.filter(t=>t.done);
    const rg = (label, items, color) => { if(!items.length) return null; return <div style={{ marginBottom: 8 }}><div style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, paddingLeft: 4 }}>{label}</div>{items.sort(priSort).map(t=><TaskCard key={t.id} t={t} />)}</div>; };
    if(!filtered.length) return <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 16, textAlign: "center" }}>{todos.length===0?"No tasks yet":"No match"}</div>;
    return <div>{pinned.length>0&&rg("Pinned",pinned,"var(--accent)")}{rg("Overdue",groups.overdue,"var(--red)")}{rg("Today",groups.today,"var(--green)")}{rg("This Week",groups.thisWeek,"#d4a838")}{rg("Later",groups.later,"var(--text-muted)")}{rg("No Due Date",groups.noDue,"var(--text-muted)")}{showDone&&doneItems.length>0&&rg("Completed",doneItems,"var(--green)")}</div>;
  };

  // ═══════════════════════════════════════════════════
  return (
    <div>
      {/* Header stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14, alignItems: "stretch" }}>
        <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Progress</span><span className="mono" style={{ fontSize: 12, fontWeight: 700, color: progressPct===100?"var(--green)":"var(--text-primary)" }}>{progressPct}%</span></div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}><div style={{ height: "100%", width: `${progressPct}%`, background: progressPct===100?"var(--green)":"var(--accent)", borderRadius: 3, transition: "width 0.3s" }} /></div>
          <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{done.length} done · {active.length} remaining</div>
        </div>
        <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Workload</div>
          <div style={{ display: "flex", gap: 12 }}>{ASSIGNEES.map(a=><div key={a.key} style={{ textAlign: "center" }}><div className="mono" style={{ fontSize: 16, fontWeight: 700, color: (workload[a.key]||0)>5?"var(--red)":"var(--text-primary)" }}>{workload[a.key]||0}</div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>{a.label}</div></div>)}</div>
        </div>
        <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Categories</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{CATEGORIES.map(c=><span key={c.key} style={{ fontSize: 10, color: c.color }}>{c.label}: <strong>{catCounts[c.key]||0}</strong></span>)}</div>
          {completedThisWeek>0 && <div style={{ fontSize: 9, color: "var(--green)", marginTop: 4 }}>{completedThisWeek} completed this week</div>}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 2, background: "var(--bg-input)", borderRadius: 6, padding: 2 }}>
          {[{key:"focus",label:"Focus"},{key:"list",label:"List"},{key:"board",label:"Board"}].map(v=>(
            <button key={v.key} onClick={()=>setView(v.key)} style={{ padding: "5px 12px", borderRadius: 4, border: "none", background: view===v.key?"var(--accent)":"transparent", color: view===v.key?"#fff":"var(--text-muted)", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{v.label}</button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 11, fontFamily: "inherit", outline: "none" }} />
        <div style={{ position: "relative" }}>
          <button onClick={()=>setShowTemplates(!showTemplates)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: showTemplates?"rgba(194,112,62,0.15)":"var(--bg-input)", color: showTemplates?"var(--accent)":"var(--text-muted)", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Templates</button>
          {showTemplates && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, width: 280, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6, padding: "0 4px" }}>Quick Templates</div>
              {TEMPLATES.map((tmpl,i)=>(
                <button key={i} onClick={()=>handleTemplate(tmpl)} style={{ display: "block", width: "100%", padding: "8px 10px", borderRadius: 4, border: "none", background: "transparent", color: "var(--text-primary)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 2 }}
                  onMouseEnter={e=>e.target.style.background="var(--bg-hover)"} onMouseLeave={e=>e.target.style.background="transparent"}>
                  <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{tmpl.subtasks?.length||0} subtasks · {catInfo(tmpl.category).label}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>setShowForm(!showForm)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add</button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ padding: 14, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", marginBottom: 12 }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdd()} placeholder="What needs to be done?" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={sel}>{CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select>
            <select value={priority} onChange={e=>setPriority(e.target.value)} style={sel}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select>
            <select value={assignee} onChange={e=>setAssignee(e.target.value)} style={sel}>{ASSIGNEES.map(a=><option key={a.key} value={a.key}>{a.label}</option>)}</select>
            <select value={recurring} onChange={e=>setRecurring(e.target.value)} style={sel}>{RECURRING.map(r=><option key={r.key} value={r.key}>{r.key?"↻ "+r.label:"No Repeat"}</option>)}</select>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={sel} />
            <input type="number" placeholder="Min" value={timeEst} onChange={e=>setTimeEst(e.target.value)} style={{...sel,width:50}} />
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Details, links, instructions..." rows={2} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", fontSize: 11, fontFamily: "inherit", outline: "none", resize: "vertical", marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleAdd} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add Task</button>
            <button onClick={()=>{setShowForm(false);setText("");setNotes("");}} style={smBtn()}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      {view !== "focus" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {[{key:"all",label:"All"},...CATEGORIES].map(c=><button key={c.key} onClick={()=>setFilter(c.key)} style={pill(filter===c.key)}>{c.label}</button>)}
            <span style={{ width: 1, background: "var(--border)", margin: "0 2px" }} />
            {[{key:"all",label:"Anyone"},...ASSIGNEES].map(a=><button key={a.key} onClick={()=>setAssigneeFilter(a.key)} style={pill(assigneeFilter===a.key)}>{a.label}</button>)}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {snoozed.length>0 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{snoozed.length} snoozed</span>}
            {done.length>0 && (<><button onClick={()=>setShowDone(!showDone)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>{showDone?"Hide done":`Done (${done.length})`}</button><button onClick={onClearDone} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Clear</button></>)}
          </div>
        </div>
      )}

      {view === "focus" && <FocusView />}
      {view === "list" && <ListView />}
      {view === "board" && <BoardView />}
    </div>
  );
}
