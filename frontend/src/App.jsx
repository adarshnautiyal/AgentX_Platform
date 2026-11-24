import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bot, BrainCircuit, Check,
  ChevronDown, CircleHelp, Command, Cpu, Gauge, LayoutDashboard,
  MessageSquare, Plus, Radio, Send, Settings2, ShieldCheck, Sparkles,
  Workflow, Zap, Menu, X, Clock3, RefreshCw, AlertCircle, Copy,
  CheckCheck, PanelLeftClose, PanelLeftOpen
} from "lucide-react";

const API = "/api";
const agentMeta = [
  { name: "Research Agent", role: "Finds and structures relevant information", color: "violet", initials: "R" },
  { name: "Data Analyst Agent", role: "Analyses inputs and identifies patterns", color: "blue", initials: "D" },
  { name: "Writer Agent", role: "Turns structured work into clear deliverables", color: "mint", initials: "W" },
  { name: "Reviewer Agent", role: "Checks completeness and quality", color: "amber", initials: "Q" }
];

function Badge({ children, tone = "neutral", dot = false }) {
  return <span className={`badge ${tone}`}>{dot && <i />}{children}</span>;
}
function SectionTitle({ eyebrow, title, detail, action }) {
  return <div className="section-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action}</div>;
}
function App() {
  const [page, setPage] = useState("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [health, setHealth] = useState({ state: "checking", message: "Checking local services…" });
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hello. I’m AgentX, running locally through your Ollama model. What would you like to work on?" }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [planInput, setPlanInput] = useState("");
  const [plan, setPlan] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [notice, setNotice] = useState("");
  const [activityLog, setActivityLog] = useState([
    { title: "AgentX workspace opened", detail: "Local dashboard session", time: "Just now", icon: "spark" },
    { title: "Workflow planner available", detail: "Ready to generate a structured plan", time: "Ready", icon: "flow" },
    { title: "Four specialist roles configured", detail: "Research · Analysis · Writing · Review", time: "Ready", icon: "agents" }
  ]);

  const addLog = (title, detail) => setActivityLog(items => [{ title, detail, time: "Just now", icon: "spark" }, ...items].slice(0, 12));

  const checkHealth = async () => {
    setHealth({ state: "checking", message: "Checking local services…" });
    try {
      const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`Health endpoint returned ${res.status}`);
      const data = await res.json();
      setHealth({ state: "online", message: `${data.ollama || "Ollama"} connected`, model: data.model || "llama3:latest" });
    } catch (e) {
      setHealth({ state: "offline", message: "API or Ollama unavailable" });
    }
  };
  useEffect(() => { checkHealth(); }, []);

  const sendChat = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setMessages(m => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
      setMessages(m => [...m, { role: "assistant", content: data.response }]);
      addLog("Chat response received", "AgentX replied using the configured local model");
    } catch (err) {
      setMessages(m => [...m, { role: "error", content: `Could not reach AgentX: ${err.message}. Check that the FastAPI server and Ollama are running.` }]);
    } finally { setSending(false); }
  };

  const createPlan = async (e) => {
    e?.preventDefault();
    const text = planInput.trim();
    if (!text || planning) return;
    setPlanning(true); setPlan(null); setNotice("");
    try {
      const res = await fetch(`${API}/plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
      setPlan(data);
      addLog("Workflow plan generated", text);
    } catch (err) {
      setNotice(`Plan generation failed: ${err.message}`);
    } finally { setPlanning(false); }
  };

  const nav = [
    { label: "WORKSPACE", items: [
      { name: "Overview", icon: LayoutDashboard },
      { name: "AI Assistant", icon: MessageSquare },
      { name: "Workflow Planner", icon: Workflow }
    ]},
    { label: "INTELLIGENCE", items: [
      { name: "Agent Directory", icon: Bot },
      { name: "Activity", icon: Activity }
    ]}
  ];
  const navigate = (name) => { setPage(name); setMobileNav(false); };
  const statusTone = health.state === "online" ? "success" : health.state === "checking" ? "warning" : "danger";

  return <div className={`app-shell ${collapsed ? "nav-collapsed" : ""}`}>
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand-row">
        <div className="brand-mark"><BrainCircuit size={21}/></div>
        {!collapsed && <div className="brand-name">agent<span>x</span><small>AI OPERATIONS</small></div>}
        <button className="icon-button collapse-button" onClick={() => setCollapsed(!collapsed)} title="Collapse sidebar">{collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}</button>
        <button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button>
      </div>
      <div className="workspace-switch"><div className="workspace-avatar">A</div>{!collapsed && <><div className="workspace-copy"><b>Personal workspace</b><span>Local environment</span></div><ChevronDown size={15}/></>}</div>
      <nav>{nav.map(group => <div className="nav-group" key={group.label}><div className="nav-label">{!collapsed && group.label}</div>{group.items.map(item => <button key={item.name} title={collapsed ? item.name : ""} className={`nav-item ${page === item.name ? "active" : ""}`} onClick={() => navigate(item.name)}><item.icon size={18}/>{!collapsed && <span>{item.name}</span>}{item.name === "AI Assistant" && !collapsed && <span className="nav-live"/>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-health"><span className={`health-dot ${health.state}`}/>{!collapsed && <><span>{health.state === "online" ? "Systems operational" : health.state === "checking" ? "Checking systems" : "System offline"}</span><button onClick={checkHealth} title="Refresh status"><RefreshCw size={13}/></button></>}</div>
        <button className="nav-item" onClick={() => setPage("Settings")}><Settings2 size={18}/>{!collapsed && <span>Settings</span>}</button>
        <div className="profile-row"><div className="profile-avatar">AX</div>{!collapsed && <div><b>AgentX</b><span>Local instance</span></div>}</div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="top-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={19}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div></div>
        <div className="top-actions"><div className="local-pill"><span className={`health-dot ${health.state}`}/>{health.state === "online" ? "Local systems online" : health.state === "checking" ? "Checking connection" : "Connection issue"}</div><button className="icon-button help-button" title="Help"><CircleHelp size={18}/></button><div className="top-avatar">A</div></div>
      </header>

      <div className="page-content">
        {page === "Overview" && <Overview health={health} onNavigate={navigate} activityLog={activityLog} onRefresh={checkHealth}/>}
        {page === "AI Assistant" && <ChatPage messages={messages} input={input} setInput={setInput} sending={sending} onSend={sendChat}/>}
        {page === "Workflow Planner" && <Planner planInput={planInput} setPlanInput={setPlanInput} planning={planning} plan={plan} notice={notice} onSubmit={createPlan}/>}
        {page === "Agent Directory" && <AgentsPage/>}
        {page === "Activity" && <ActivityPage activityLog={activityLog}/>}
        {page === "Settings" && <SettingsPage health={health} onRefresh={checkHealth}/>}
      </div>
      <footer className="footer"><span>AGENTX <i>•</i> LOCAL AI OPERATIONS</span><span>Private by design · Powered by your local Ollama runtime</span></footer>
    </main>
  </div>;
}

function Overview({ health, onNavigate, activityLog, onRefresh }) {
  return <>
    <div className="welcome-strip"><div><span className="welcome-kicker"><Sparkles size={13}/> YOUR LOCAL AI WORKSPACE</span><h1>Good to have you here.</h1><p>Your operations workspace is ready. Give an idea to AgentX and turn it into a structured workflow.</p></div><div className="welcome-orb"><div className="orb-core"><BrainCircuit size={31}/></div><span className="orb-ring ring-a"/><span className="orb-ring ring-b"/></div></div>
    <div className="section-title overview-heading"><div><div className="eyebrow">COMMAND CENTER</div><h2>Workspace overview</h2><p>A clear view of your local AI environment.</p></div><button className="secondary-button" onClick={onRefresh}><RefreshCw size={14}/> Refresh status</button></div>
    <div className="metric-grid">
      <Metric icon={Radio} label="API STATUS" value="Online" sub="FastAPI responding" tone="mint"/>
      <Metric icon={Cpu} label="AI RUNTIME" value={health.state === "online" ? "Connected" : health.state === "checking" ? "Checking" : "Offline"} sub={health.model || "Ollama local runtime"} tone="violet"/>
      <Metric icon={Bot} label="SPECIALIST ROLES" value="04" sub="Configured in planner" tone="blue"/>
      <Metric icon={Workflow} label="WORKFLOW ENGINE" value="Ready" sub="Plan generation available" tone="amber"/>
    </div>
    <div className="content-grid">
      <section className="panel quick-panel"><div className="panel-heading"><div><div className="eyebrow">GET STARTED</div><h3>What would you like to do?</h3></div><span className="sparkle-icon"><Zap size={17}/></span></div>
        <div className="quick-actions">
          <button className="quick-card" onClick={() => onNavigate("AI Assistant")}><div className="quick-icon purple"><MessageSquare size={18}/></div><div><b>Talk to AgentX</b><span>Ask questions and explore ideas.</span></div><ArrowUpRight size={16}/></button>
          <button className="quick-card" onClick={() => onNavigate("Workflow Planner")}><div className="quick-icon blue"><Workflow size={18}/></div><div><b>Build a workflow</b><span>Turn an objective into clear steps.</span></div><ArrowUpRight size={16}/></button>
          <button className="quick-card" onClick={() => onNavigate("Agent Directory")}><div className="quick-icon green"><Bot size={18}/></div><div><b>Explore agents</b><span>See the four specialist roles.</span></div><ArrowUpRight size={16}/></button>
        </div>
      </section>
      <section className="panel status-panel"><div className="panel-heading"><div><div className="eyebrow">LIVE CONNECTION</div><h3>System health</h3></div><Badge tone={health.state === "online" ? "success" : health.state === "checking" ? "warning" : "danger"} dot>{health.state === "online" ? "Operational" : health.state === "checking" ? "Checking" : "Attention needed"}</Badge></div>
        <div className="health-visual"><div className="health-icon"><ShieldCheck size={24}/></div><div><b>{health.state === "online" ? "All checks passed" : health.state === "checking" ? "Checking local services" : "Connection unavailable"}</b><span>{health.message}</span></div></div>
        <div className="status-line"><span>FastAPI endpoint</span><Badge tone="success">Reachable</Badge></div><div className="status-line"><span>Ollama runtime</span><Badge tone={health.state === "online" ? "success" : "danger"}>{health.state === "online" ? "Connected" : "Unverified"}</Badge></div><div className="status-line"><span>Configured model</span><b className="mono">{health.model || "llama3:latest"}</b></div>
      </section>
    </div>
    <section className="panel activity-panel"><div className="panel-heading"><div><div className="eyebrow">RECENT EVENTS</div><h3>Workspace activity</h3></div><span className="subtle-label">This session</span></div>{activityLog.slice(0,3).map((item,i)=><div className="activity-row" key={i}><div className="activity-icon"><Activity size={15}/></div><div className="activity-copy"><b>{item.title}</b><span>{item.detail}</span></div><time>{item.time}</time></div>)}</section>
  </>;
}
function Metric({ icon: Icon, label, value, sub, tone }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={17}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div><div className="metric-trend"><span className="trend-dot"/> Local instance</div></div>;
}
function ChatPage({ messages, input, setInput, sending, onSend }) {
  return <><SectionTitle eyebrow="CONVERSATIONAL INTELLIGENCE" title="AI Assistant" detail="A direct conversation with your locally hosted Llama 3 model." action={<Badge tone="success" dot>Local model</Badge>}/><div className="chat-shell panel"><div className="chat-top"><div className="chat-model"><div className="chat-model-icon"><BrainCircuit size={18}/></div><div><b>AgentX Assistant</b><span><i/> llama3:latest · Ollama</span></div></div><Badge tone="success">Private session</Badge></div><div className="chat-messages">{messages.map((m,i)=><div className={`message-row ${m.role}`} key={i}><div className="message-avatar">{m.role === "assistant" ? <BrainCircuit size={16}/> : m.role === "error" ? <AlertCircle size={16}/> : "A"}</div><div className="message-body"><span className="message-author">{m.role === "user" ? "You" : m.role === "error" ? "Connection notice" : "AgentX"}</span><div className="message-bubble">{m.content}</div></div></div>)}{sending && <div className="message-row assistant"><div className="message-avatar"><BrainCircuit size={16}/></div><div className="message-body"><span className="message-author">AgentX</span><div className="message-bubble typing"><i/><i/><i/></div></div></div>}</div><form className="chat-composer" onSubmit={onSend}><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();onSend();}}} placeholder="Message AgentX… (Enter to send, Shift + Enter for a new line)" rows="2"/><div className="composer-bottom"><span><Sparkles size={13}/> Responses generated locally on your device</span><button className="primary-button" type="submit" disabled={sending || !input.trim()}>{sending ? "Thinking…" : "Send"} <Send size={14}/></button></div></form></div><p className="footnote"><ShieldCheck size={13}/> Your prompts are sent to your local FastAPI server and Ollama runtime.</p></>;
}
function Planner({ planInput, setPlanInput, planning, plan, notice, onSubmit }) {
  return <><SectionTitle eyebrow="MULTI-AGENT ORCHESTRATION" title="Workflow Planner" detail="Describe an objective. AgentX will propose a sequenced plan using its four specialist roles." action={<Badge tone="violet"><Workflow size={12}/> Planner</Badge>}/><div className="planner-layout"><section className="panel planner-form"><div className="panel-heading"><div><div className="eyebrow">NEW OBJECTIVE</div><h3>What should AgentX plan?</h3></div><div className="quick-icon blue"><Sparkles size={17}/></div></div><form onSubmit={onSubmit}><label htmlFor="objective">YOUR OBJECTIVE</label><textarea id="objective" value={planInput} onChange={e=>setPlanInput(e.target.value)} placeholder="Example: Research the Indian electric vehicle market, compare leading brands, and prepare a concise opportunity report…" rows="6"/><div className="planner-hint"><CircleHelp size={14}/> Be specific about the outcome you want.</div><button className="primary-button wide" disabled={planning || !planInput.trim()}>{planning ? <><span className="spinner"/> Generating plan…</> : <>Generate workflow plan <ArrowUpRight size={15}/></>}</button></form>{notice && <div className="notice-error"><AlertCircle size={15}/>{notice}</div>}</section><section className="panel roles-panel"><div className="eyebrow">AVAILABLE SPECIALISTS</div><h3>Four roles. One workflow.</h3><p className="muted">The planner can assign each step to one of these configured roles.</p>{agentMeta.map((a,i)=><div className="role-row" key={a.name}><div className={`agent-avatar ${a.color}`}>{a.initials}</div><div><b>{a.name}</b><span>{a.role}</span></div><span className="role-number">0{i+1}</span></div>)}</section></div>
    {plan && <section className="panel generated-plan"><div className="plan-result-head"><div><div className="eyebrow">GENERATED WORKFLOW</div><h3>{plan.objective}</h3></div><Badge tone="success" dot>Plan generated</Badge></div><div className="plan-steps">{plan.steps?.map((step,i)=><div className="plan-step" key={step.step}><div className="step-index">{String(step.step).padStart(2,"0")}</div><div className="step-content"><div className="step-top"><b>{step.task}</b><Badge tone={["violet","blue","mint","amber"][agentMeta.findIndex(a=>a.name===step.assigned_agent)] || "neutral"}>{step.assigned_agent}</Badge></div><p>{step.expected_output}</p></div></div>)}</div><div className="deliverable"><CheckCheck size={17}/><div><b>Final deliverable</b><span>{plan.final_deliverable}</span></div></div><div className="plan-disclaimer">This is a proposed plan only. The current backend generates plans; it does not yet execute the listed tasks or run agents independently.</div></section>}
  </>;
}
function AgentsPage() {
  return <><SectionTitle eyebrow="AGENT DIRECTORY" title="Specialist agents" detail="The roles currently available to the workflow planner." action={<Badge tone="neutral">4 configured roles</Badge>}/><div className="agents-grid">{agentMeta.map((a,i)=><div className="panel agent-card" key={a.name}><div className="agent-card-top"><div className={`agent-avatar large ${a.color}`}>{a.initials}</div><Badge tone="success" dot>Configured</Badge></div><div className="agent-index">SPECIALIST 0{i+1}</div><h3>{a.name}</h3><p>{a.role}.</p><div className="agent-capability"><span>Workflow assignment</span><b>Available</b></div><div className="agent-note">Role definition configured in <code>app.py</code></div></div>)}</div><div className="info-banner"><AlertCircle size={17}/><span>These are currently planner roles, not independent background workers. Task execution, tool access and inter-agent handoffs are future development steps.</span></div></>;
}
function ActivityPage({ activityLog }) {
  return <><SectionTitle eyebrow="SESSION HISTORY" title="Activity" detail="Events recorded during this dashboard session."/><section className="panel activity-full">{activityLog.map((item,i)=><div className="activity-row" key={i}><div className="activity-icon"><Activity size={15}/></div><div className="activity-copy"><b>{item.title}</b><span>{item.detail}</span></div><time>{item.time}</time></div>)}</section></>;
}
function SettingsPage({ health, onRefresh }) {
  return <><SectionTitle eyebrow="PREFERENCES & CONNECTIONS" title="Settings" detail="Local environment details and connection checks."/><section className="panel settings-panel"><div className="settings-row"><div><b>API base path</b><span>Frontend requests are proxied to the local FastAPI server.</span></div><code>/api → 127.0.0.1:8000</code></div><div className="settings-row"><div><b>AI runtime</b><span>Ollama connection status from the /health endpoint.</span></div><Badge tone={health.state === "online" ? "success" : "danger"} dot>{health.message}</Badge></div><div className="settings-row"><div><b>Configured model</b><span>Model name declared in your existing app.py.</span></div><code>{health.model || "llama3:latest"}</code></div><div className="settings-row"><div><b>Refresh connection</b><span>Run a fresh health check against your local backend.</span></div><button className="secondary-button" onClick={onRefresh}><RefreshCw size={14}/> Check now</button></div></section></>;
}

export default App;
