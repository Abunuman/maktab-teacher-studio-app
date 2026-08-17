import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BookOpen, Users, ClipboardList, TrendingUp, Coins, Plus, X, Check,
  ChevronRight, Trash2, Pencil, Send, FileText, AlertCircle, Sparkles,
  Moon, GraduationCap, Languages, Feather, CalendarClock, Search,
  UserCircle2, Copy, Award, BookMarked, LogOut, Mail, Loader2,
} from "lucide-react";
import { supabase } from "./supabaseClient.js";

/* ---------------------------------- constants ---------------------------------- */

const SKILLS = [
  { key: "tajweed", label: "Tajweed", color: "#2F6B4F" },
  { key: "fluency", label: "Fluency", color: "#C08A3E" },
  { key: "makharij", label: "Makhārij", color: "#3C7A8C" },
  { key: "memorization", label: "Retention", color: "#7A4F6B" },
  { key: "confidence", label: "Confidence", color: "#8A6A3C" },
];

const PROGRAMS = [
  { name: "Noorani Qaida", icon: BookOpen },
  { name: "Quran Reading with Tajweed", icon: Sparkles },
  { name: "Quran Memorization (Hifz)", icon: Moon },
  { name: "Quran Translation & Tafseer", icon: Languages },
  { name: "Islamic Studies", icon: GraduationCap },
  { name: "Arabic Language", icon: Feather },
];

const STATUSES = ["Trial", "Active", "Paused"];

const SESSIONS = [
  { count: 2, label: "Two" },
  { count: 3, label: "Three" },
  { count: 4, label: "Four" },
  { count: 5, label: "Five" },
];

const DURATIONS = [
  { min: 30, label: "30-min" },
  { min: 60, label: "60-min" },
  { min: 120, label: "120-min" },
];

// Who each weekly-classes × class-length combination fits, drawn from Ustadh Toyyib's
// own curriculum stages (Tamhiidy, Ibtidaiyyah, I'dadiyyah) and remote adult teaching.
const PLAN_FIT = {
  "2-30": { who: "Tamhiidy beginners", note: "Young children just starting Tahajji Part 1 and the first half of Juz\u2019u 30. Short sessions match a first-timer's attention span; twice-weekly repetition builds letter recognition and basic articulation without overwhelming them." },
  "3-30": { who: "Ibtidaiyyah 1\u20132", note: "Children moving through Juz\u2019u 29\u201328 and from Tahajji Part 1 into Part 2. The most common pace at this stage \u2014 three short, closely spaced sessions reinforce madd and noon/meem s\u0101kinah before they're forgotten." },
  "4-30": { who: "Ibtidaiyyah 3 \u2192 I\u2019dadiyyah", note: "Students building fluency who need frequent, short repetition to lock in Tajweed rules from Hidayatul Mustafiid before moving into longer-format sessions." },
  "5-30": { who: "Young Hifz track (Juz\u2019u 30\u201328)", note: "For children memorizing on a set timeline. Five short, daily-style touches keep new verses fresh without tiring a young learner in one sitting." },
  "2-60": { who: "Returning or busy adults", note: "Adults or teens picking Qur\u2019an back up after time away, often combining reading practice with light Islamic Studies. Two fuller sessions a week suit an inconsistent schedule while still giving real depth per class." },
  "3-60": { who: "I\u2019dadiyyah 1\u20133", note: "Students refining articulation with Hidayatul Mustafiid and Tuhfatul Atfaal, or adult learners steadily progressing through Hifz. The balance most students settle into once the basics are solid." },
  "4-60": { who: "Adult Hifz, steady pace", note: "Adults working through a defined range (for example Juz\u2019u 26 to 24) who want consistent, well-paced memorization alongside ongoing Tajweed correction." },
  "5-60": { who: "Motivated Hifz / Thanawiyyah track", note: "Students with a memorization goal on a timeline, wanting near-daily contact with full-length sessions to combine new Hifz, review, and Tajweed refinement." },
  "2-120": { who: "Busy adults, multi-subject", note: "For adults who can only commit two days a week but want Hifz review, Tajweed correction, and Islamic Studies or Arabic covered together in the same long sitting \u2014 depth over frequency." },
  "3-120": { who: "Full I\u2019dadiyyah syllabus", note: "Qur\u2019an memorization, Islamic Studies and Arabic Language taught together in the same sessions, the way I run my own I\u2019dadiyyah classes \u2014 three unhurried sessions cover real ground each week." },
  "4-120": { who: "Serious Hifz candidates", note: "Students working through a large range at a steady clip who need long, unhurried sessions for new memorization plus thorough review of what came before." },
  "5-120": { who: "Ijazah / deadline-driven students", note: "The most intensive plan \u2014 for a firm deadline such as ijazah preparation or a family memorization goal, with daily extended sessions across memorization, Tajweed and review." },
};
const fitFor = (sessions, duration) => PLAN_FIT[`${sessions}-${duration}`] || { who: "", note: "" };

// Confirmed from the Qaari.net Pricing tab (United States, USD). Other regions start
// from the same figures as a placeholder — edit each region's currency and amounts
// in Plans & Pricing to match what actually shows for that region on the homepage.
const US_MATRIX = {
  2: { 30: "40", 60: "75", 120: "150" },
  3: { 30: "60", 60: "110", 120: "220" },
  4: { 30: "80", 60: "145", 120: "290" },
  5: { 30: "100", 60: "180", 120: "360" },
};

const DEFAULT_REGIONS = [
  { id: "us", label: "United States", currency: "$", matrix: JSON.parse(JSON.stringify(US_MATRIX)) },
  { id: "ca", label: "Canada", currency: "CA$", matrix: JSON.parse(JSON.stringify(US_MATRIX)) },
  { id: "uk", label: "United Kingdom", currency: "£", matrix: JSON.parse(JSON.stringify(US_MATRIX)) },
  { id: "eu", label: "Europe", currency: "€", matrix: JSON.parse(JSON.stringify(US_MATRIX)) },
  { id: "au", label: "Australia", currency: "A$", matrix: JSON.parse(JSON.stringify(US_MATRIX)) },
  { id: "other", label: "Others", currency: "$", matrix: JSON.parse(JSON.stringify(US_MATRIX)) },
];

const priceFor = (region, sessions, duration) => region?.matrix?.[sessions]?.[duration] ?? "—";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const avg = (obj) => {
  const vals = SKILLS.map((s) => Number(obj?.[s.key] ?? 0));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};
const daysSince = (iso) => {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso + "T00:00:00").getTime()) / 86400000);
};
const emptyScores = () => Object.fromEntries(SKILLS.map((s) => [s.key, 5]));

/* ---------------------------------- storage (Supabase) ---------------------------------- */
// Data lives in a single "maktab_data" table, one row per (user_id, key).
// Row Level Security ties every row to auth.uid(), so each signed-in teacher
// only ever sees their own data — see supabase-schema.sql for the table + policy.

async function loadKey(userId, key, fallback) {
  try {
    const { data, error } = await supabase
      .from("maktab_data")
      .select("value")
      .eq("user_id", userId)
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveKey(userId, key, value) {
  try {
    await supabase
      .from("maktab_data")
      .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
  } catch (e) {
    console.error("Storage save failed for", key, e);
  }
}

/* ---------------------------------- atoms ---------------------------------- */

const Card = ({ children, style, className = "" }) => (
  <div className={`mk-card ${className}`} style={style}>{children}</div>
);

const Badge = ({ children, tone = "default" }) => (
  <span className={`mk-badge mk-badge-${tone}`}>{children}</span>
);

const Button = ({ children, onClick, tone = "primary", icon: Icon, type = "button", disabled, style }) => (
  <button type={type} className={`mk-btn mk-btn-${tone}`} onClick={onClick} disabled={disabled} style={style}>
    {Icon && <Icon size={15} strokeWidth={2.2} />}
    {children}
  </button>
);

const Field = ({ label, children, hint }) => (
  <label className="mk-field">
    <span className="mk-field-label">{label}</span>
    {children}
    {hint && <span className="mk-field-hint">{hint}</span>}
  </label>
);

const TextInput = (props) => <input className="mk-input" {...props} />;
const TextArea = (props) => <textarea className="mk-input mk-textarea" {...props} />;
const Select = ({ children, ...props }) => (
  <select className="mk-input mk-select" {...props}>{children}</select>
);

const SkillSlider = ({ skill, value, onChange }) => (
  <div className="mk-slider-row">
    <div className="mk-slider-top">
      <span className="mk-slider-dot" style={{ background: skill.color }} />
      <span className="mk-slider-label">{skill.label}</span>
      <span className="mk-slider-value">{value}</span>
    </div>
    <input
      type="range" min={0} max={10} step={1} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ accentColor: skill.color }}
      className="mk-range"
    />
  </div>
);

const WorkspaceMark = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {/* monitor frame */}
    <rect x="5" y="5" width="30" height="20" rx="3" fill="#1E3B2C" />
    <rect x="8" y="8" width="24" height="14" rx="1.5" fill="#EFF3EA" />
    {/* open book glyph on screen */}
    <path d="M20 11.2 C18.6 10 16.6 9.6 15 10.1 V18.3 C16.6 17.8 18.6 18.2 20 19.4" stroke="#1E3B2C" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 11.2 C21.4 10 23.4 9.6 25 10.1 V18.3 C23.4 17.8 21.4 18.2 20 19.4" stroke="#1E3B2C" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="20" y1="11.2" x2="20" y2="19.4" stroke="#1E3B2C" strokeWidth="1.2" />
    {/* stand + desk */}
    <rect x="18" y="25" width="4" height="3.5" fill="#1E3B2C" />
    <rect x="4" y="30.5" width="32" height="3" rx="1.2" fill="#B8873B" />
    <rect x="9" y="28.5" width="5" height="2" rx="0.6" fill="#1E3B2C" opacity="0.85" />
    <rect x="26" y="28.5" width="5" height="2" rx="0.6" fill="#1E3B2C" opacity="0.85" />
  </svg>
);

const EmptyState = ({ icon: Icon, title, body, action }) => (
  <div className="mk-empty">
    <Icon size={28} strokeWidth={1.6} />
    <div className="mk-empty-title">{title}</div>
    <div className="mk-empty-body">{body}</div>
    {action}
  </div>
);

/* ---------------------------------- header / nav ---------------------------------- */

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: TrendingUp },
  { key: "students", label: "Students", icon: Users },
  { key: "plan", label: "Trial \u2192 Study Plan", icon: ClipboardList },
  { key: "reports", label: "Weekly Reports", icon: FileText },
  { key: "progress", label: "Progress", icon: Sparkles },
  { key: "pricing", label: "Plans & Pricing", icon: Coins },
  { key: "about", label: "About Ustadh Toyyib", icon: UserCircle2 },
];

function Header({ tab, setTab, email, onSignOut }) {
  return (
    <div className="mk-header">
      <div className="mk-header-inner">
        <div className="mk-brand">
          <WorkspaceMark size={30} />
          <div className="mk-brand-text">
            <div className="mk-brand-name">Maktab</div>
            <div className="mk-brand-sub">Teacher workspace &middot; qaari.net</div>
          </div>
        </div>
        <nav className="mk-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`mk-nav-btn ${tab === t.key ? "is-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={15} strokeWidth={2.2} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <button className="mk-signout" onClick={onSignOut} title={email ? `Signed in as ${email}` : "Sign out"}>
          <LogOut size={14} strokeWidth={2.2} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- Student modal ---------------------------------- */

function StudentModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(
    initial || { id: uid(), name: "", age: "", program: PROGRAMS[0].name, status: "Trial", startDate: todayISO(), juzCompleted: 0, guardian: "", notes: "" }
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mk-modal-head">
          <div className="mk-modal-title">{initial ? "Edit student" : "Add a student"}</div>
          <button className="mk-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mk-modal-body">
          <div className="mk-grid-2">
            <Field label="Student name">
              <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Amina R." autoFocus />
            </Field>
            <Field label="Age">
              <TextInput value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 9" />
            </Field>
          </div>
          <div className="mk-grid-2">
            <Field label="Program">
              <Select value={form.program} onChange={(e) => set("program", e.target.value)}>
                {PROGRAMS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mk-grid-2">
            <Field label="Start date">
              <TextInput type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="Guardian / contact name" hint="For your own reference only">
              <TextInput value={form.guardian} onChange={(e) => set("guardian", e.target.value)} placeholder="e.g. Sr. Fatima (mother)" />
            </Field>
          </div>
          {form.program === "Quran Memorization (Hifz)" && (
            <Field label={`Juz\u2019 completed (${form.juzCompleted}/30)`}>
              <input type="range" min={0} max={30} value={form.juzCompleted} onChange={(e) => set("juzCompleted", Number(e.target.value))} className="mk-range" style={{ accentColor: "#B8873B" }} />
            </Field>
          )}
          <Field label="Notes">
            <TextArea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything worth remembering about this student..." />
          </Field>
        </div>
        <div className="mk-modal-foot">
          <Button tone="ghost" onClick={onClose}>Cancel</Button>
          <Button tone="primary" icon={Check} onClick={() => form.name.trim() && onSave(form)}>
            {initial ? "Save changes" : "Add student"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Dashboard ---------------------------------- */

function Dashboard({ students, plans, reports, setTab, setSelectedId }) {
  const active = students.filter((s) => s.status !== "Paused");
  const pendingPlans = students.filter((s) => s.status === "Trial" && !plans[s.id]);
  const plansToSubmit = Object.values(plans).filter((p) => !p.submitted);
  const reportsDue = active.filter((s) => {
    const list = reports[s.id] || [];
    const last = list[list.length - 1];
    return plans[s.id] && (!last || daysSince(last.weekOf) >= 7);
  });

  const stat = (label, value, tone) => (
    <Card className="mk-stat">
      <div className="mk-stat-value" style={{ color: tone }}>{value}</div>
      <div className="mk-stat-label">{label}</div>
    </Card>
  );

  return (
    <div className="mk-stack">
      <div className="mk-stats-row">
        {stat("Active students", active.length, "#1E3B2C")}
        {stat("Study plans to submit", plansToSubmit.length, "#B8873B")}
        {stat("Reports due this week", reportsDue.length, "#3C7A8C")}
        {stat("Trials awaiting a plan", pendingPlans.length, "#7A4F6B")}
      </div>

      <div className="mk-grid-2-wide">
        <Card>
          <div className="mk-card-head">
            <div className="mk-card-title">Needs a study plan</div>
          </div>
          {pendingPlans.length === 0 ? (
            <div className="mk-muted-line">Every trial student has a study plan on file. Well kept.</div>
          ) : (
            <ul className="mk-list">
              {pendingPlans.map((s) => (
                <li key={s.id} className="mk-list-row" onClick={() => { setSelectedId(s.id); setTab("plan"); }}>
                  <span>{s.name}</span>
                  <Badge tone="amber">Trial complete?</Badge>
                  <ChevronRight size={15} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mk-card-head">
            <div className="mk-card-title">Weekly reports due</div>
          </div>
          {reportsDue.length === 0 ? (
            <div className="mk-muted-line">Nothing overdue — every active student is up to date.</div>
          ) : (
            <ul className="mk-list">
              {reportsDue.map((s) => {
                const list = reports[s.id] || [];
                const last = list[list.length - 1];
                return (
                  <li key={s.id} className="mk-list-row" onClick={() => { setSelectedId(s.id); setTab("reports"); }}>
                    <span>{s.name}</span>
                    <span className="mk-muted-tiny">{last ? `last: ${fmtDate(last.weekOf)}` : "no report yet"}</span>
                    <ChevronRight size={15} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="mk-card-head">
          <div className="mk-card-title">Study plans awaiting submission to Admin</div>
        </div>
        {plansToSubmit.length === 0 ? (
          <div className="mk-muted-line">Nothing waiting. Every finished plan has been sent on to the parent via Admin.</div>
        ) : (
          <ul className="mk-list">
            {plansToSubmit.map((p) => {
              const s = students.find((x) => x.id === p.studentId);
              if (!s) return null;
              return (
                <li key={p.studentId} className="mk-list-row" onClick={() => { setSelectedId(s.id); setTab("plan"); }}>
                  <span>{s.name}</span>
                  <span className="mk-muted-tiny">trial {fmtDate(p.trialDate)}</span>
                  <Badge tone="rose">Draft only</Badge>
                  <ChevronRight size={15} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------- Students tab ---------------------------------- */

function StudentsTab({ students, setStudents, plans, setTab, selectedId, setSelectedId }) {
  const [modal, setModal] = useState(null); // 'new' | student object | null
  const [query, setQuery] = useState("");

  const filtered = students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  const saveStudent = (form) => {
    setStudents((list) => {
      const exists = list.some((s) => s.id === form.id);
      return exists ? list.map((s) => (s.id === form.id ? form : s)) : [...list, form];
    });
    setModal(null);
    setSelectedId(form.id);
  };

  const removeStudent = (id) => {
    if (!confirm("Remove this student and their records from your view? This can't be undone.")) return;
    setStudents((list) => list.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="mk-stack">
      <div className="mk-toolbar">
        <div className="mk-search">
          <Search size={15} />
          <input placeholder="Search students..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button icon={Plus} onClick={() => setModal("new")}>Add student</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          body="Add a student as soon as you're matched, even before the trial class — you can fill in the study plan afterward."
          action={<Button icon={Plus} onClick={() => setModal("new")}>Add your first student</Button>}
        />
      ) : (
        <div className="mk-student-grid">
          {filtered.map((s) => {
            const prog = PROGRAMS.find((p) => p.name === s.program) || PROGRAMS[0];
            const hasPlan = !!plans[s.id];
            return (
              <Card key={s.id} className="mk-student-card">
                <div className="mk-student-top">
                  <div className="mk-student-avatar"><prog.icon size={16} strokeWidth={2} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="mk-student-name">{s.name}</div>
                    <div className="mk-muted-tiny">{s.age ? `Age ${s.age} \u00b7 ` : ""}{s.program}</div>
                  </div>
                  <Badge tone={s.status === "Active" ? "green" : s.status === "Trial" ? "amber" : "default"}>{s.status}</Badge>
                </div>
                <div className="mk-student-meta">
                  <span>Started {fmtDate(s.startDate)}</span>
                  <span>{hasPlan ? "Study plan on file" : "No study plan yet"}</span>
                </div>
                <div className="mk-student-actions">
                  <Button tone="ghost" icon={ClipboardList} onClick={() => { setSelectedId(s.id); setTab("plan"); }}>Study plan</Button>
                  <Button tone="ghost" icon={FileText} onClick={() => { setSelectedId(s.id); setTab("reports"); }}>Reports</Button>
                  <button className="mk-icon-btn" onClick={() => setModal(s)}><Pencil size={15} /></button>
                  <button className="mk-icon-btn mk-icon-btn-danger" onClick={() => removeStudent(s.id)}><Trash2 size={15} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal && (
        <StudentModal
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={saveStudent}
        />
      )}
    </div>
  );
}

/* ---------------------------------- Trial -> Study Plan tab ---------------------------------- */

function suggestSessions(scores) {
  const a = avg(scores);
  if (a >= 7.5) return 5;
  if (a >= 5.5) return 4;
  if (a >= 3) return 3;
  return 2;
}

function draftJustification(student, scores, sessions, duration) {
  const weakest = [...SKILLS].sort((a, b) => scores[a.key] - scores[b.key])[0];
  const strongest = [...SKILLS].sort((a, b) => scores[b.key] - scores[a.key])[0];
  const fit = fitFor(sessions, duration);
  const fitLine = fit.who ? ` This pace is one I'd normally set for a ${fit.who.toLowerCase()} profile.` : "";
  return `During the trial class, ${student.name} showed the strongest footing in ${strongest.label.toLowerCase()} and would benefit most from focused, repeated practice on ${weakest.label.toLowerCase()}. I recommend ${sessions} classes a week at ${duration} minutes each: consistent, closely spaced sessions will let us reinforce today's lesson before it fades, which matters most at this stage.${fitLine} We'll revisit this recommendation after the first few weekly reports.`;
}

function StudyPlanTab({ students, plans, setPlans, regions, selectedId, setSelectedId }) {
  const student = students.find((s) => s.id === selectedId) || students[0];
  const existing = student ? plans[student.id] : null;

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!student) { setForm(null); return; }
    setForm(
      existing || {
        studentId: student.id,
        trialDate: todayISO(),
        letters: "Knows most letters",
        readingLevel: "Beginning Qaida",
        tajweedFamiliarity: "None yet",
        scores: emptyScores(),
        assessmentNotes: "",
        regionId: regions[0]?.id || "us",
        sessions: 3,
        duration: 30,
        justification: "",
        submitted: false,
        submittedDate: null,
      }
    );
  }, [student?.id]); // eslint-disable-line

  if (!students.length) {
    return <EmptyState icon={ClipboardList} title="Add a student first" body="Once you add a student, come back here after their trial class to build the study plan." />;
  }
  if (!form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setScore = (key, v) => setForm((f) => ({ ...f, scores: { ...f.scores, [key]: v } }));

  const region = regions.find((r) => r.id === form.regionId) || regions[0];
  const suggestedSessions = suggestSessions(form.scores);
  const price = priceFor(region, form.sessions, form.duration);

  const applySuggestion = () => {
    set("sessions", suggestedSessions);
    set("justification", draftJustification(student, form.scores, suggestedSessions, form.duration));
  };

  const save = (markSubmitted) => {
    const record = { ...form, submitted: markSubmitted || form.submitted, submittedDate: markSubmitted ? todayISO() : form.submittedDate };
    setPlans((p) => ({ ...p, [student.id]: record }));
    setForm(record);
  };

  return (
    <div className="mk-stack">
      <div className="mk-toolbar">
        <Select value={student.id} onChange={(e) => setSelectedId(e.target.value)} style={{ maxWidth: 280 }}>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        {form.submitted && <Badge tone="green">Submitted to Admin {fmtDate(form.submittedDate)}</Badge>}
      </div>

      <div className="mk-two-col">
        <Card>
          <div className="mk-card-title" style={{ marginBottom: 4 }}>Trial class assessment</div>
          <div className="mk-muted-tiny" style={{ marginBottom: 16 }}>Article 3.2 &mdash; your read of where {student.name} stands right now.</div>

          <Field label="Trial class date">
            <TextInput type="date" value={form.trialDate} onChange={(e) => set("trialDate", e.target.value)} />
          </Field>
          <div className="mk-grid-2">
            <Field label="Arabic letters">
              <Select value={form.letters} onChange={(e) => set("letters", e.target.value)}>
                <option>Not yet introduced</option>
                <option>Knows some letters</option>
                <option>Knows most letters</option>
                <option>Confident with all letters</option>
              </Select>
            </Field>
            <Field label="Reading level">
              <Select value={form.readingLevel} onChange={(e) => set("readingLevel", e.target.value)}>
                <option>Beginning Qaida</option>
                <option>Finishing Qaida</option>
                <option>Reading Quran, needs support</option>
                <option>Reading Quran independently</option>
                <option>Reviewing for fluency</option>
              </Select>
            </Field>
          </div>
          <Field label="Tajweed familiarity">
            <Select value={form.tajweedFamiliarity} onChange={(e) => set("tajweedFamiliarity", e.target.value)}>
              <option>None yet</option>
              <option>Basic makharij only</option>
              <option>Knows a few rules</option>
              <option>Applies rules inconsistently</option>
              <option>Applies rules well</option>
            </Select>
          </Field>

          <div className="mk-divider" />
          <div className="mk-card-title" style={{ marginBottom: 12 }}>Baseline scores</div>
          {SKILLS.map((sk) => (
            <SkillSlider key={sk.key} skill={sk} value={form.scores[sk.key]} onChange={(v) => setScore(sk.key, v)} />
          ))}

          <Field label="Assessment notes">
            <TextArea rows={4} value={form.assessmentNotes} onChange={(e) => set("assessmentNotes", e.target.value)} placeholder="What did you notice? Attention span, prior teaching, home environment, anything relevant..." />
          </Field>
        </Card>

        <Card>
          <div className="mk-card-title" style={{ marginBottom: 4 }}>Recommended plan</div>
          <div className="mk-muted-tiny" style={{ marginBottom: 16 }}>Article 3.2 &mdash; choose from the Qaari.net Pricing tab and make the case for it.</div>

          <div className="mk-suggest-box">
            <Sparkles size={15} />
            <div>Based on the baseline, <strong>{suggestedSessions} classes a week</strong> looks like a good starting point.</div>
            <button className="mk-link-btn" onClick={applySuggestion}>Use this</button>
          </div>

          <div className="mk-grid-3">
            <Field label="Region">
              <Select value={form.regionId} onChange={(e) => set("regionId", e.target.value)}>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Weekly classes">
              <Select value={form.sessions} onChange={(e) => set("sessions", Number(e.target.value))}>
                {SESSIONS.map((s) => <option key={s.count} value={s.count}>{s.label} ({s.count})</option>)}
              </Select>
            </Field>
            <Field label="Class length">
              <Select value={form.duration} onChange={(e) => set("duration", Number(e.target.value))}>
                {DURATIONS.map((d) => <option key={d.min} value={d.min}>{d.label}</option>)}
              </Select>
            </Field>
          </div>

          <div className="mk-plan-preview">
            <div className="mk-plan-preview-name">
              {SESSIONS.find((s) => s.count === form.sessions)?.label} classes / week, {form.duration}-min &mdash; {region?.currency}{price}/mo ({region?.label})
            </div>
            {fitFor(form.sessions, form.duration).who && (
              <div className="mk-plan-preview-who">Best for: {fitFor(form.sessions, form.duration).who}</div>
            )}
            <div className="mk-plan-preview-note">{fitFor(form.sessions, form.duration).note}</div>
          </div>

          <Field label="Case for this plan" hint="This is what gets shared with the parent — write it for them, not for Admin.">
            <TextArea rows={6} value={form.justification} onChange={(e) => set("justification", e.target.value)} placeholder="Explain, in plain language, why this plan fits the student right now..." />
          </Field>

          <div className="mk-divider" />
          <div className="mk-plan-actions">
            <Button tone="ghost" icon={Check} onClick={() => save(false)}>Save draft</Button>
            <Button tone="primary" icon={Send} onClick={() => save(true)}>
              Mark submitted to Admin
            </Button>
          </div>
          <div className="mk-muted-tiny" style={{ marginTop: 8 }}>
            <AlertCircle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
            Submitting here just tracks that you've sent it &mdash; still deliver it to Admin per Article 3.3.
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------- Weekly Reports tab ---------------------------------- */

function ReportBead({ report, active, onClick, index }) {
  const score = report ? avg(report.scores) : 0;
  const t = score / 10;
  const color = `rgb(${Math.round(184 - t * 100)}, ${Math.round(135 + t * 40)}, ${Math.round(59 + t * 50)})`;
  return (
    <button className={`mk-bead ${active ? "is-active" : ""}`} style={{ background: color }} onClick={onClick} title={fmtDate(report.weekOf)}>
      {index + 1}
    </button>
  );
}

function WeeklyReportsTab({ students, plans, reports, setReports, selectedId, setSelectedId }) {
  const eligible = students.filter((s) => plans[s.id]);
  const student = eligible.find((s) => s.id === selectedId) || eligible[0];
  const plan = student ? plans[student.id] : null;
  const list = student ? reports[student.id] || [] : [];

  const [activeIdx, setActiveIdx] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!student) { setForm(null); setActiveIdx(null); return; }
    setActiveIdx(null);
    setForm(freshReport());
  }, [student?.id]); // eslint-disable-line

  const freshReport = () => ({
    id: uid(),
    weekOf: todayISO(),
    scores: emptyScores(),
    covered: "",
    goals: plan ? plan.justification.slice(0, 0) : "",
    homework: "",
    parentNote: "",
  });

  if (!students.length) {
    return <EmptyState icon={FileText} title="No students yet" body="Add a student before logging weekly reports." />;
  }
  if (!eligible.length) {
    return <EmptyState icon={ClipboardList} title="No study plans on file" body="Weekly reports build on the baseline set in the trial's study plan — create that first." />;
  }
  if (!form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setScore = (key, v) => setForm((f) => ({ ...f, scores: { ...f.scores, [key]: v } }));

  const selectBead = (idx) => {
    setActiveIdx(idx);
    setForm({ ...list[idx] });
  };
  const startNew = () => {
    setActiveIdx(null);
    setForm(freshReport());
  };

  const saveReport = () => {
    setReports((r) => {
      const current = r[student.id] || [];
      const exists = current.some((rep) => rep.id === form.id);
      const updated = exists ? current.map((rep) => (rep.id === form.id ? form : rep)) : [...current, form];
      updated.sort((a, b) => (a.weekOf > b.weekOf ? 1 : -1));
      return { ...r, [student.id]: updated };
    });
    setActiveIdx(null);
    setForm(freshReport());
  };

  const baseline = plan.scores;

  return (
    <div className="mk-stack">
      <div className="mk-toolbar">
        <Select value={student.id} onChange={(e) => { setSelectedId(e.target.value); }} style={{ maxWidth: 280 }}>
          {eligible.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <span className="mk-muted-tiny">{list.length} report{list.length === 1 ? "" : "s"} on file</span>
      </div>

      {list.length > 0 && (
        <Card className="mk-bead-card">
          <div className="mk-muted-tiny" style={{ marginBottom: 10 }}>Report history &mdash; tap a bead to review or edit that week</div>
          <div className="mk-bead-row">
            <div className="mk-bead-line" />
            {list.map((rep, i) => (
              <ReportBead key={rep.id} report={rep} index={i} active={activeIdx === i} onClick={() => selectBead(i)} />
            ))}
            <button className={`mk-bead mk-bead-new ${activeIdx === null ? "is-active" : ""}`} onClick={startNew}>
              <Plus size={14} />
            </button>
          </div>
        </Card>
      )}

      <div className="mk-two-col">
        <Card>
          <div className="mk-card-title" style={{ marginBottom: 4 }}>{activeIdx === null ? "New weekly report" : `Editing report ${activeIdx + 1}`}</div>
          <div className="mk-muted-tiny" style={{ marginBottom: 16 }}>Article 5.2 &mdash; kept in step with {student.name}'s original study plan.</div>

          <Field label="Week of">
            <TextInput type="date" value={form.weekOf} onChange={(e) => set("weekOf", e.target.value)} />
          </Field>

          <div className="mk-divider" />
          <div className="mk-card-title" style={{ marginBottom: 12 }}>This week's scores</div>
          {SKILLS.map((sk) => (
            <SkillSlider key={sk.key} skill={sk} value={form.scores[sk.key]} onChange={(v) => setScore(sk.key, v)} />
          ))}

          <Field label="Surahs / lessons covered this week">
            <TextArea rows={2} value={form.covered} onChange={(e) => set("covered", e.target.value)} placeholder="e.g. Reviewed Al-Fatiha, began An-Nas with tajweed focus on ghunnah" />
          </Field>
          <Field label="Goals currently being worked toward">
            <TextArea rows={2} value={form.goals} onChange={(e) => set("goals", e.target.value)} placeholder="e.g. Independent fluency through Juz 30 by year end" />
          </Field>
          <Field label="Homework assigned">
            <TextArea rows={2} value={form.homework} onChange={(e) => set("homework", e.target.value)} />
          </Field>
          <Field label="Note for the parent">
            <TextArea rows={3} value={form.parentNote} onChange={(e) => set("parentNote", e.target.value)} placeholder="Anything encouraging or important to flag..." />
          </Field>

          <div className="mk-plan-actions">
            <Button tone="ghost" onClick={startNew}>Clear</Button>
            <Button tone="primary" icon={Check} onClick={saveReport}>Save report</Button>
          </div>
        </Card>

        <Card>
          <div className="mk-card-title" style={{ marginBottom: 4 }}>Baseline &rarr; this week</div>
          <div className="mk-muted-tiny" style={{ marginBottom: 12 }}>From the trial on {fmtDate(plan.trialDate)}</div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={SKILLS.map((sk) => ({ skill: sk.label, Baseline: baseline[sk.key], "This week": form.scores[sk.key] }))} outerRadius="75%">
              <PolarGrid stroke="#DCE3D4" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: "#5B6B5E", fontSize: 12, fontFamily: "Inter, sans-serif" }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10, fill: "#9AA79C" }} />
              <Radar name="Baseline" dataKey="Baseline" stroke="#9AA79C" fill="#9AA79C" fillOpacity={0.18} strokeWidth={2} />
              <Radar name="This week" dataKey="This week" stroke="#1E3B2C" fill="#1E3B2C" fillOpacity={0.28} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mk-divider" />
          <div className="mk-card-title" style={{ marginBottom: 4, fontSize: 13 }}>Recommended plan on file</div>
          <div className="mk-muted-tiny">{(() => { return null; })()}</div>
          <div className="mk-plan-preview" style={{ marginTop: 8 }}>
            <div className="mk-plan-preview-name">Goal reference</div>
            <div className="mk-plan-preview-note">Where {student.name} started: {plan.readingLevel}, {plan.tajweedFamiliarity.toLowerCase()}.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------- Progress tab ---------------------------------- */

function ProgressTab({ students, plans, reports, selectedId, setSelectedId }) {
  const eligible = students.filter((s) => plans[s.id]);
  const student = eligible.find((s) => s.id === selectedId) || eligible[0];

  if (!eligible.length) {
    return <EmptyState icon={Sparkles} title="Nothing to visualize yet" body="Progress charts appear once a student has a study plan baseline and at least one weekly report." />;
  }

  const plan = plans[student.id];
  const list = reports[student.id] || [];

  const trend = [
    { label: "Baseline", ...plan.scores },
    ...list.map((r, i) => ({ label: `Wk ${i + 1}`, ...r.scores })),
  ];

  const latest = list.length ? list[list.length - 1] : null;
  const latestAvg = latest ? avg(latest.scores) : avg(plan.scores);
  const baselineAvg = avg(plan.scores);
  const delta = latestAvg - baselineAvg;

  return (
    <div className="mk-stack">
      <div className="mk-toolbar">
        <Select value={student.id} onChange={(e) => setSelectedId(e.target.value)} style={{ maxWidth: 280 }}>
          {eligible.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      <div className="mk-stats-row">
        <Card className="mk-stat">
          <div className="mk-stat-value" style={{ color: "#1E3B2C" }}>{list.length}</div>
          <div className="mk-stat-label">Weekly reports logged</div>
        </Card>
        <Card className="mk-stat">
          <div className="mk-stat-value" style={{ color: "#B8873B" }}>{baselineAvg.toFixed(1)}</div>
          <div className="mk-stat-label">Baseline average</div>
        </Card>
        <Card className="mk-stat">
          <div className="mk-stat-value" style={{ color: "#3C7A8C" }}>{latestAvg.toFixed(1)}</div>
          <div className="mk-stat-label">Latest average</div>
        </Card>
        <Card className="mk-stat">
          <div className="mk-stat-value" style={{ color: delta >= 0 ? "#2F6B4F" : "#B3543F" }}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}</div>
          <div className="mk-stat-label">Change since baseline</div>
        </Card>
      </div>

      <Card>
        <div className="mk-card-title" style={{ marginBottom: 12 }}>Skill trend, baseline through today</div>
        {trend.length < 2 ? (
          <div className="mk-muted-line">Log at least one weekly report to see a trend line.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#E5EADD" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5B6B5E", fontFamily: "Inter, sans-serif" }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "#5B6B5E", fontFamily: "Inter, sans-serif" }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #DCE3D4", fontFamily: "Inter, sans-serif", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }} />
              {SKILLS.map((sk) => (
                <Line key={sk.key} type="monotone" dataKey={sk.key} name={sk.label} stroke={sk.color} strokeWidth={2.4} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {student.program === "Quran Memorization (Hifz)" && (
        <Card>
          <div className="mk-card-title" style={{ marginBottom: 10 }}>Hifz progress</div>
          <div className="mk-hifz-track">
            <div className="mk-hifz-fill" style={{ width: `${(student.juzCompleted / 30) * 100}%` }} />
          </div>
          <div className="mk-muted-tiny" style={{ marginTop: 8 }}>{student.juzCompleted} of 30 Juz&rsquo; &mdash; update this from the student's profile as memorization is confirmed.</div>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------- Pricing tab ---------------------------------- */

function PricingTab({ regions, setRegions }) {
  const [activeRegion, setActiveRegion] = useState(regions[0]?.id || "us");
  const region = regions.find((r) => r.id === activeRegion) || regions[0];

  const updateCell = (sessions, duration, value) => {
    setRegions((list) =>
      list.map((r) =>
        r.id === region.id
          ? { ...r, matrix: { ...r.matrix, [sessions]: { ...r.matrix[sessions], [duration]: value } } }
          : r
      )
    );
  };
  const updateCurrency = (value) => {
    setRegions((list) => list.map((r) => (r.id === region.id ? { ...r, currency: value } : r)));
  };
  const copyFromUS = () => {
    const us = regions.find((r) => r.id === "us");
    if (!us) return;
    setRegions((list) => list.map((r) => (r.id === region.id ? { ...r, matrix: JSON.parse(JSON.stringify(us.matrix)) } : r)));
  };

  if (!region) return null;

  return (
    <div className="mk-stack">
      <Card>
        <div className="mk-card-title" style={{ marginBottom: 4 }}>Choose your region</div>
        <div className="mk-muted-tiny" style={{ marginBottom: 14 }}>
          This mirrors the Pricing tab on the Qaari.net homepage — pick a region, then keep its monthly figures in
          sync with the site so what you recommend in a study plan always matches what Admin can actually offer.
        </div>
        <div className="mk-region-row">
          {regions.map((r) => (
            <button key={r.id} className={`mk-region-btn ${activeRegion === r.id ? "is-active" : ""}`} onClick={() => setActiveRegion(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mk-toolbar" style={{ marginBottom: 14 }}>
          <Field label="Currency symbol / code" hint="Shown before each price for this region">
            <TextInput style={{ maxWidth: 120 }} value={region.currency} onChange={(e) => updateCurrency(e.target.value)} />
          </Field>
          {region.id !== "us" && (
            <Button tone="ghost" onClick={copyFromUS}>Copy US figures</Button>
          )}
        </div>

        <div className="mk-matrix">
          <div className="mk-matrix-head">
            <div className="mk-matrix-corner">Number of weekly classes</div>
            {DURATIONS.map((d) => <div key={d.min} className="mk-matrix-col-head">{d.label}</div>)}
          </div>
          {SESSIONS.map((s) => (
            <div key={s.count} className="mk-matrix-row">
              <div className="mk-matrix-row-head">{s.label}</div>
              {DURATIONS.map((d) => (
                <div key={d.min} className="mk-matrix-cell">
                  <span className="mk-matrix-currency">{region.currency}</span>
                  <input
                    className="mk-matrix-input"
                    value={region.matrix?.[s.count]?.[d.min] ?? ""}
                    onChange={(e) => updateCell(s.count, d.min, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------- About tab ---------------------------------- */

const TEACHING_TIMELINE = [
  {
    years: "2016 \u2013 2020",
    place: "Circle of Learning Institute, University of Ibadan",
    detail: "Taught Tamhiidy, Ibtidaiyyah 1\u20133, and I\u2019dadiyyah 1\u20133 in person \u2014 carrying students from the first half of Juz\u2019u 30 through to Juz\u2019u 25, alongside Tahajji Parts 1 & 2 and, at the senior levels, Hidayatul Mustafiid and Tuhfatul Atfaal.",
  },
  {
    years: "2020 \u2013 2023",
    place: "Mamaru Ihtiwaail Qur\u2019an wal Hikam (remote)",
    detail: "Teaching adult learners individually, guiding one group through Hifz from Juz\u2019u 1 to the start of Juz\u2019u 6, and another from Juz\u2019u 26 back to the start of Juz\u2019u 24, alongside Islamic Studies and Arabic Language on the I\u2019dadiyyah syllabus.",
  },
];

const CREDENTIALS = [
  { year: "2018", title: "Ijazah in Qira\u2019ah and Tajweed", place: "Mahdu Darin-Na\u2019im" },
  { year: "2020", title: "Ijazah in the memorization of Mutuunu Talibul Ilm and its commentary", place: "Al Maktabatu Ta\u2019awuniyyah" },
  { year: "current", title: "Thanawiyyah-level studies", place: "Mahdu Imam Daaril Hijrah \u2014 following I\u2019dadiyyah studies completed at Mahdu Daril Hadith, Ibadan" },
];

const PARENT_INTRO = `Ustadh Toyyib Muhammad-Jamiu has taught the Qur\u2019an since 2016, first at the Circle of Learning Institute (University of Ibadan) and, from 2020 to 2023, to adult learners remotely with Mamaru Ihtiwaail Qur\u2019an wal Hikam. His Tajweed instruction is grounded in the Tibyaan Qira\u2019a methodology, and he has coached Hifz from the very first verses of the Qur\u2019an through to the high twenties of the Juz\u2019 count \u2014 so he's equally comfortable starting a complete beginner or continuing a student who already has partial memorization. He holds an Ijazah in Qira\u2019ah and Tajweed (2018) and in the memorization of Mutuunu Talibul Ilm (2020), and is currently furthering his own studies at the Thanawiyyah level.`;

function AboutTab() {
  const [copied, setCopied] = useState(false);
  const copyIntro = async () => {
    try {
      await navigator.clipboard.writeText(PARENT_INTRO);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { /* clipboard unavailable */ }
  };

  return (
    <div className="mk-stack">
      <Card className="mk-about-hero">
        <div className="mk-about-monogram">TM</div>
        <div style={{ flex: 1 }}>
          <div className="mk-about-name">Toyyib Muhammad-Jamiu</div>
          <div className="mk-about-role">Qur’an, Tajweed &amp; Arabic Teacher &middot; qaari.net</div>
          <div className="mk-about-badges">
            <Badge tone="green">Tibyaan Qira’a &middot; Tahajji I &amp; II</Badge>
            <Badge tone="amber">Hifz coaching, Juz’ 1–25+</Badge>
            <Badge tone="default">Adult &amp; child learners</Badge>
          </div>
        </div>
      </Card>

      <div className="mk-two-col">
        <Card>
          <div className="mk-card-title" style={{ marginBottom: 12 }}>Teaching timeline</div>
          <div className="mk-timeline">
            {TEACHING_TIMELINE.map((t, i) => (
              <div key={i} className="mk-timeline-row">
                <div className="mk-timeline-years">{t.years}</div>
                <div>
                  <div className="mk-timeline-place">{t.place}</div>
                  <div className="mk-muted-tiny" style={{ marginTop: 3 }}>{t.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mk-divider" />
          <div className="mk-card-title" style={{ marginBottom: 12, fontSize: 15 }}><Award size={15} style={{ verticalAlign: -2, marginRight: 5 }} />Credentials</div>
          <div className="mk-timeline">
            {CREDENTIALS.map((c, i) => (
              <div key={i} className="mk-timeline-row">
                <div className="mk-timeline-years">{c.year}</div>
                <div>
                  <div className="mk-timeline-place">{c.title}</div>
                  <div className="mk-muted-tiny" style={{ marginTop: 3 }}>{c.place}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mk-card-title" style={{ marginBottom: 4 }}><BookMarked size={15} style={{ verticalAlign: -2, marginRight: 5 }} />Specialization</div>
          <div className="mk-muted-tiny" style={{ marginBottom: 14 }}>What to lean on when matching a student to a plan.</div>
          <ul className="mk-spec-list">
            <li><strong>Core Tajweed method:</strong> the Tibyaan Qira’a approach, using Tahajji Part 1 for first-time articulation and Part 2 as rules deepen.</li>
            <li><strong>Refinement texts:</strong> Hidayatul Mustafiid and Tuhfatul Atfaal, once a student has moved past the basics.</li>
            <li><strong>Hifz range:</strong> comfortable starting a complete beginner at Juz’u 1, or picking up a student already partway through, up to the high twenties.</li>
            <li><strong>Age range:</strong> young beginners in a structured, multi-year curriculum, and adult learners needing a flexible, individualized pace.</li>
          </ul>

          <div className="mk-divider" />
          <div className="mk-card-title" style={{ marginBottom: 8, fontSize: 14 }}>Intro for a new parent</div>
          <div className="mk-parent-intro">{PARENT_INTRO}</div>
          <Button tone="ghost" icon={copied ? Check : Copy} onClick={copyIntro} style={{ marginTop: 10 }}>
            {copied ? "Copied" : "Copy for a parent message"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------- App ---------------------------------- */

function Workspace({ userId, email, onSignOut }) {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);

  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState({});
  const [reports, setReports] = useState({});
  const [regions, setRegions] = useState(DEFAULT_REGIONS);

  useEffect(() => {
    (async () => {
      const [r, p, rep, rg] = await Promise.all([
        loadKey(userId, "roster", []),
        loadKey(userId, "plans", {}),
        loadKey(userId, "reports", {}),
        loadKey(userId, "regions", DEFAULT_REGIONS),
      ]);
      setStudents(r);
      setPlans(p);
      setReports(rep);
      setRegions(rg);
      setLoaded(true);
    })();
  }, [userId]);

  useEffect(() => { if (loaded) saveKey(userId, "roster", students); }, [students, loaded]);
  useEffect(() => { if (loaded) saveKey(userId, "plans", plans); }, [plans, loaded]);
  useEffect(() => { if (loaded) saveKey(userId, "reports", reports); }, [reports, loaded]);
  useEffect(() => { if (loaded) saveKey(userId, "regions", regions); }, [regions, loaded]);

  return (
    <div className="mk-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,500&family=Inter:wght@400;500;600;700&display=swap');

        .mk-root { --ink:#16241C; --primary:#1E3B2C; --primary-dark:#132A1E; --accent:#B8873B; --accent-soft:#FBF3E1;
          --teal:#3C7A8C; --plum:#7A4F6B; --muted:#5B6B5E; --muted2:#9AA79C; --bg:#EFF3EA; --surface:#FFFFFF;
          --border:#DCE3D4; --danger:#B3543F; --green-bg:#E3EFE3; --amber-bg:#FBF0DC; --rose-bg:#F5E6E1;
          font-family: 'Inter', sans-serif; color: var(--ink); background: var(--bg); min-height: 100vh; }
        .mk-root * { box-sizing: border-box; }
        .mk-serif { font-family: 'Newsreader', serif; }

        .mk-header { position: sticky; top: 0; z-index: 20; background: rgba(239,243,234,0.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border); }
        .mk-header-inner { max-width: 1180px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
        .mk-brand { display: flex; align-items: center; gap: 10px; }
        .mk-brand-name { font-family: 'Newsreader', serif; font-weight: 600; font-size: 20px; line-height: 1; letter-spacing: 0.2px; }
        .mk-brand-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .mk-nav { display: flex; gap: 4px; flex-wrap: wrap; }
        .mk-nav-btn { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; border: 1px solid transparent;
          background: transparent; color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; }
        .mk-nav-btn:hover { background: rgba(30,59,44,0.06); color: var(--primary); }
        .mk-nav-btn.is-active { background: var(--primary); color: #F3F6EF; }
        .mk-signout { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--border);
          background: var(--surface); color: var(--muted); font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .mk-signout:hover { color: var(--danger); border-color: var(--rose-bg); background: var(--rose-bg); }

        .mk-about-hero { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .mk-about-monogram { width: 58px; height: 58px; border-radius: 16px; background: var(--primary); color: #F3F6EF;
          font-family: 'Newsreader', serif; font-weight: 600; font-size: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mk-about-name { font-family: 'Newsreader', serif; font-weight: 600; font-size: 22px; }
        .mk-about-role { font-size: 13px; color: var(--muted); margin: 3px 0 10px; }
        .mk-about-badges { display: flex; gap: 6px; flex-wrap: wrap; }

        .mk-timeline { display: flex; flex-direction: column; gap: 16px; }
        .mk-timeline-row { display: grid; grid-template-columns: 90px 1fr; gap: 12px; }
        .mk-timeline-years { font-size: 12px; font-weight: 700; color: var(--accent); padding-top: 1px; }
        .mk-timeline-place { font-weight: 600; font-size: 13.5px; }

        .mk-spec-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--muted); }
        .mk-spec-list strong { color: var(--ink); }

        .mk-parent-intro { font-family: 'Newsreader', serif; font-size: 14px; line-height: 1.6; font-style: italic; color: var(--ink);
          background: #F6F8F2; border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }

        .mk-main { max-width: 1180px; margin: 0 auto; padding: 24px 20px 60px; }
        .mk-stack { display: flex; flex-direction: column; gap: 18px; }

        .mk-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .mk-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .mk-card-title { font-family: 'Newsreader', serif; font-weight: 600; font-size: 16.5px; }

        .mk-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .mk-stat { text-align: left; padding: 16px 18px; }
        .mk-stat-value { font-family: 'Newsreader', serif; font-size: 30px; font-weight: 600; line-height: 1; }
        .mk-stat-label { font-size: 12.5px; color: var(--muted); margin-top: 6px; }

        .mk-grid-2-wide { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mk-two-col { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; align-items: start; }
        .mk-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mk-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        .mk-muted-line { color: var(--muted); font-size: 13.5px; padding: 6px 0; }
        .mk-muted-tiny { color: var(--muted); font-size: 12px; }

        .mk-list { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
        .mk-list-row { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 10px; cursor: pointer; font-size: 13.5px; }
        .mk-list-row:hover { background: var(--accent-soft); }
        .mk-list-row span:first-child { font-weight: 500; flex: 1; }

        .mk-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
        .mk-badge-default { background: #EEF1E9; color: var(--muted); }
        .mk-badge-green { background: var(--green-bg); color: #1E3B2C; }
        .mk-badge-amber { background: var(--amber-bg); color: #8A6A25; }
        .mk-badge-rose { background: var(--rose-bg); color: #94402C; }

        .mk-btn { display: inline-flex; align-items: center; gap: 7px; border-radius: 10px; border: 1px solid transparent;
          font-size: 13px; font-weight: 600; padding: 9px 14px; cursor: pointer; transition: all .15s; font-family: 'Inter', sans-serif; }
        .mk-btn-primary { background: var(--primary); color: #F3F6EF; }
        .mk-btn-primary:hover { background: var(--primary-dark); }
        .mk-btn-ghost { background: transparent; color: var(--primary); border-color: var(--border); }
        .mk-btn-ghost:hover { background: var(--accent-soft); }
        .mk-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .mk-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid var(--border); background: var(--surface); color: var(--muted); cursor: pointer; }
        .mk-icon-btn:hover { background: var(--accent-soft); color: var(--ink); }
        .mk-icon-btn-danger:hover { background: var(--rose-bg); color: var(--danger); }

        .mk-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
        .mk-field-label { font-size: 12.5px; font-weight: 600; color: var(--ink); }
        .mk-field-hint { font-size: 11px; color: var(--muted); }
        .mk-input { border: 1px solid var(--border); border-radius: 9px; padding: 9px 11px; font-size: 13.5px; font-family: 'Inter', sans-serif;
          background: var(--surface); color: var(--ink); width: 100%; }
        .mk-input:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
        .mk-textarea { resize: vertical; }
        .mk-select { appearance: auto; }

        .mk-slider-row { margin-bottom: 12px; }
        .mk-slider-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .mk-slider-dot { width: 8px; height: 8px; border-radius: 50%; }
        .mk-slider-label { font-size: 12.5px; font-weight: 500; flex: 1; }
        .mk-slider-value { font-size: 12px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
        .mk-range { width: 100%; height: 4px; }

        .mk-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .mk-search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); background: var(--surface);
          border-radius: 10px; padding: 8px 12px; max-width: 320px; flex: 1; color: var(--muted); }
        .mk-search input { border: none; outline: none; background: transparent; font-size: 13.5px; width: 100%; color: var(--ink); }

        .mk-student-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
        .mk-student-card { display: flex; flex-direction: column; gap: 12px; }
        .mk-student-top { display: flex; align-items: center; gap: 10px; }
        .mk-student-avatar { width: 34px; height: 34px; border-radius: 10px; background: var(--accent-soft); color: var(--accent);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mk-student-name { font-weight: 600; font-size: 14.5px; }
        .mk-student-meta { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); border-top: 1px dashed var(--border); padding-top: 10px; }
        .mk-student-actions { display: flex; align-items: center; gap: 6px; }
        .mk-student-actions .mk-btn { flex: 1; padding: 7px 10px; font-size: 12px; }

        .mk-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 50px 20px;
          color: var(--muted); border: 1px dashed var(--border); border-radius: 16px; background: var(--surface); }
        .mk-empty-title { font-family: 'Newsreader', serif; font-size: 17px; font-weight: 600; color: var(--ink); margin-top: 4px; }
        .mk-empty-body { font-size: 13px; max-width: 380px; }

        .mk-modal-backdrop { position: fixed; inset: 0; background: rgba(22,36,28,0.45); display: flex; align-items: center;
          justify-content: center; z-index: 50; padding: 20px; }
        .mk-modal { background: var(--surface); border-radius: 18px; width: 100%; max-width: 540px; max-height: 88vh; overflow-y: auto; }
        .mk-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
        .mk-modal-title { font-family: 'Newsreader', serif; font-weight: 600; font-size: 17px; }
        .mk-modal-body { padding: 18px 20px; }
        .mk-modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); }

        .mk-divider { height: 1px; background: var(--border); margin: 16px 0; }

        .mk-suggest-box { display: flex; align-items: center; gap: 10px; background: var(--accent-soft); border: 1px solid #EAD8AE;
          border-radius: 12px; padding: 12px 14px; font-size: 12.5px; margin-bottom: 14px; color: #6E5225; }
        .mk-link-btn { background: none; border: none; color: var(--primary); font-weight: 700; font-size: 12px; cursor: pointer; text-decoration: underline; white-space: nowrap; }

        .mk-plan-preview { background: #F6F8F2; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; margin: 4px 0 14px; }
        .mk-plan-preview-name { font-weight: 700; font-size: 13.5px; margin-bottom: 3px; }
        .mk-plan-preview-who { font-size: 12px; font-weight: 700; color: var(--accent); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
        .mk-plan-preview-note { font-size: 12px; color: var(--muted); }
        .mk-plan-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

        .mk-bead-card { padding: 16px 20px; }
        .mk-bead-row { position: relative; display: flex; align-items: center; gap: 10px; overflow-x: auto; padding: 6px 2px 10px; }
        .mk-bead-line { position: absolute; left: 14px; right: 14px; top: 50%; height: 2px; background: var(--border); z-index: 0; }
        .mk-bead { position: relative; z-index: 1; width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--surface);
          box-shadow: 0 0 0 1px var(--border); color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; }
        .mk-bead.is-active { box-shadow: 0 0 0 2px var(--primary); transform: scale(1.12); }
        .mk-bead-new { background: var(--surface) !important; color: var(--muted) !important; display: flex; align-items: center; justify-content: center; }

        .mk-hifz-track { width: 100%; height: 10px; border-radius: 999px; background: #EDEFE6; overflow: hidden; }
        .mk-hifz-fill { height: 100%; background: linear-gradient(90deg, #B8873B, #2F6B4F); border-radius: 999px; }

        .mk-region-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .mk-region-btn { padding: 9px 16px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface);
          color: var(--ink); font-size: 13px; font-weight: 600; cursor: pointer; }
        .mk-region-btn:hover { border-color: var(--primary); }
        .mk-region-btn.is-active { background: var(--primary); color: #F3F6EF; border-color: var(--primary); }

        .mk-matrix { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .mk-matrix-head { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); background: #DCE6D6; }
        .mk-matrix-corner { padding: 12px 14px; font-size: 12.5px; font-weight: 600; color: var(--ink); grid-column: span 1; }
        .mk-matrix-col-head { padding: 12px 14px; font-size: 12.5px; font-weight: 600; text-align: center; color: var(--ink); border-left: 1px solid #C9D6C0; }
        .mk-matrix-row { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); border-top: 1px solid var(--border); }
        .mk-matrix-row:nth-child(odd) { background: #F5F8F0; }
        .mk-matrix-row-head { padding: 12px 14px; font-size: 13px; font-weight: 600; color: var(--ink); }
        .mk-matrix-cell { display: flex; align-items: center; justify-content: center; gap: 3px; padding: 8px 10px; border-left: 1px solid var(--border); }
        .mk-matrix-currency { font-size: 12.5px; color: var(--muted); font-weight: 600; }
        .mk-matrix-input { width: 64px; border: 1px solid transparent; background: transparent; border-radius: 6px; padding: 6px 4px;
          font-size: 13.5px; font-weight: 600; text-align: center; color: var(--ink); font-family: 'Inter', sans-serif; }
        .mk-matrix-input:hover { border-color: var(--border); }
        .mk-matrix-input:focus { outline: none; border-color: var(--primary); background: var(--surface); }

        @media (max-width: 860px) {
          .mk-grid-2-wide, .mk-two-col, .mk-stats-row { grid-template-columns: 1fr; }
          .mk-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <Header tab={tab} setTab={setTab} email={email} onSignOut={onSignOut} />
      <div className="mk-main">
        {!loaded ? (
          <div className="mk-muted-line">Loading your workspace...</div>
        ) : (
          <>
            {tab === "dashboard" && <Dashboard students={students} plans={plans} reports={reports} setTab={setTab} setSelectedId={setSelectedId} />}
            {tab === "students" && <StudentsTab students={students} setStudents={setStudents} plans={plans} setTab={setTab} selectedId={selectedId} setSelectedId={setSelectedId} />}
            {tab === "plan" && <StudyPlanTab students={students} plans={plans} setPlans={setPlans} regions={regions} selectedId={selectedId} setSelectedId={setSelectedId} />}
            {tab === "reports" && <WeeklyReportsTab students={students} plans={plans} reports={reports} setReports={setReports} selectedId={selectedId} setSelectedId={setSelectedId} />}
            {tab === "progress" && <ProgressTab students={students} plans={plans} reports={reports} selectedId={selectedId} setSelectedId={setSelectedId} />}
            {tab === "pricing" && <PricingTab regions={regions} setRegions={setRegions} />}
            {tab === "about" && <AboutTab />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Auth gate ---------------------------------- */

function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  const sendLink = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  if (session === undefined) {
    return (
      <div className="mk-auth-screen">
        <Loader2 size={22} className="mk-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mk-auth-screen">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600&family=Inter:wght@400;500;600&display=swap');
          .mk-auth-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #EFF3EA;
            font-family: 'Inter', sans-serif; padding: 20px; }
          .mk-spin { animation: mk-spin 1s linear infinite; color: #1E3B2C; }
          @keyframes mk-spin { to { transform: rotate(360deg); } }
          .mk-auth-card { background: #fff; border: 1px solid #DCE3D4; border-radius: 18px; padding: 32px 30px; width: 100%; max-width: 380px; text-align: center; }
          .mk-auth-title { font-family: 'Newsreader', serif; font-weight: 600; font-size: 22px; color: #16241C; margin: 14px 0 6px; }
          .mk-auth-sub { font-size: 13px; color: #5B6B5E; margin-bottom: 20px; line-height: 1.5; }
          .mk-auth-form { display: flex; flex-direction: column; gap: 10px; }
          .mk-auth-input { border: 1px solid #DCE3D4; border-radius: 9px; padding: 10px 12px; font-size: 13.5px; font-family: 'Inter', sans-serif; }
          .mk-auth-input:focus { outline: 2px solid #1E3B2C; outline-offset: 1px; }
          .mk-auth-btn { background: #1E3B2C; color: #F3F6EF; border: none; border-radius: 9px; padding: 10px 12px; font-weight: 600; font-size: 13.5px; cursor: pointer; }
          .mk-auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .mk-auth-sent { font-size: 13.5px; color: #1E3B2C; background: #E3EFE3; border-radius: 10px; padding: 12px; }
          .mk-auth-error { font-size: 12.5px; color: #B3543F; margin-top: 10px; }
        `}</style>
        <div className="mk-auth-card">
          <WorkspaceMark size={36} />
          <div className="mk-auth-title">Maktab</div>
          <div className="mk-auth-sub">Sign in with your email to open your workspace — the same sign-in works from any device, and your data stays private to you.</div>
          {sent ? (
            <div className="mk-auth-sent">Check <strong>{email}</strong> for a sign-in link, then come back to this tab.</div>
          ) : (
            <form onSubmit={sendLink} className="mk-auth-form">
              <input
                type="email" required placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} className="mk-auth-input"
              />
              <button type="submit" className="mk-auth-btn" disabled={sending}>
                {sending ? "Sending…" : "Send sign-in link"}
              </button>
            </form>
          )}
          {error && <div className="mk-auth-error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <Workspace
      userId={session.user.id}
      email={session.user.email}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

export default function App() {
  return <AuthGate />;
}
