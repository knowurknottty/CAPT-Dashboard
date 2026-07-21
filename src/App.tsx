import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Database,
  GitBranch,
  Network,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Waypoints,
} from 'lucide-react';
import { agents, hypotheses, memoryClusters, pipeline, type Health } from './data';
import { useRuntimeTelemetry } from './telemetry/runtime';

function healthLabel(health: Health) {
  return health === 'healthy' ? 'Nominal' : health === 'warning' ? 'Attention' : health === 'critical' ? 'Critical' : 'Offline';
}

function Sparkline({ points }: { points: number[] }) {
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * 15} ${34 - point * 0.28}`).join(' ');
  return (
    <svg className="sparkline" viewBox="0 0 90 40" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function App() {
  const telemetry = useRuntimeTelemetry();
  const [selectedStage, setSelectedStage] = useState(pipeline[3]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [timelineMinute, setTimelineMinute] = useState(59);
  const [intervention, setIntervention] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const timelineEvents = useMemo(() => telemetry.snapshot.recentEvents.map((event) => ({
    ...event,
    minute: Math.max(0, Math.min(59, 59 - Math.floor((Date.now() - new Date(event.occurredAt).getTime()) / 60_000))),
  })), [telemetry.snapshot.recentEvents]);

  const selectedEvent = timelineEvents.find((event) => event.id === selectedEventId) ?? timelineEvents.at(-1) ?? null;
  const filteredEvents = timelineEvents.filter((event) => `${event.title} ${event.detail} ${event.type}`.toLowerCase().includes(query.toLowerCase()));
  const mission = telemetry.snapshot.mission;
  const isLive = telemetry.freshness === 'live' && !telemetry.paused;

  function toggleLive() {
    if (telemetry.paused) telemetry.resume();
    else telemetry.pause();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><BrainCircuit size={22} /></div>
          <div>
            <strong>CAPT Command Center</strong>
            <span>Cognitive observability / constellation alpha</span>
          </div>
        </div>
        <div className="top-actions">
          <div className={`connection ${isLive ? 'live' : 'stale'}`} title={telemetry.error ?? undefined}>
            <span /> {telemetry.paused ? 'Paused · last known good' : `${telemetry.freshness} · ${telemetry.adapterName}`}
          </div>
          <button className="icon-button" onClick={() => void telemetry.refresh()} aria-label="Refresh telemetry">
            <RefreshCw size={18} />
          </button>
          <button className="icon-button" onClick={toggleLive} aria-label={telemetry.paused ? 'Resume live updates' : 'Pause live updates'}>
            {telemetry.paused ? <CirclePlay size={18} /> : <CirclePause size={18} />}
          </button>
          <button className="primary-button" onClick={() => setIntervention('Snapshot current cognitive state')}>Create snapshot</button>
        </div>
      </header>

      <section className="mission-strip">
        <div>
          <span className="eyeline">Current mission</span>
          <h1>{mission.goal}</h1>
          <p>{mission.phase}</p>
        </div>
        <div className="mission-progress" aria-label={`Mission progress ${mission.progress} percent`}>
          <div className="progress-ring"><span>{mission.progress}%</span></div>
          <div><strong>{mission.blockers} blocker{mission.blockers === 1 ? '' : 's'}</strong><span>{mission.dependenciesWaiting} external dependencies waiting</span></div>
        </div>
      </section>

      <section className="metric-rail" aria-label="Executive cognitive metrics">
        {telemetry.snapshot.metrics.map((metric, index) => (
          <article key={metric.id} className="metric-cell" title={`${metric.provenance.source} · ${metric.provenance.observedAt}`}>
            <span>{metric.label}</span>
            <div><strong>{metric.value}{metric.unit}</strong><em>{metric.trend ? `${metric.trend > 0 ? '+' : ''}${metric.trend}` : '—'}</em></div>
            <Sparkline points={[40 + index * 2, 48, 44 + index, 61, 55, Math.min(100, metric.value)]} />
          </article>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel pipeline-panel">
          <div className="panel-heading">
            <div><span className="eyeline">Cognitive pipeline</span><h2>State flow</h2></div>
            <span className="muted">Fixture-backed · gateway pipeline schema pending</span>
          </div>
          <div className="pipeline-flow">
            {pipeline.map((stage, index) => (
              <div className="stage-wrap" key={stage.id}>
                <button className={`stage-node ${stage.health} ${selectedStage.id === stage.id ? 'selected' : ''}`} onClick={() => setSelectedStage(stage)}>
                  <span className="stage-index">0{index + 1}</span>
                  <strong>{stage.label}</strong>
                  <span>{stage.latency} ms</span>
                  <i aria-label={healthLabel(stage.health)} />
                </button>
                {index < pipeline.length - 1 && <ChevronRight className="stage-arrow" size={16} />}
              </div>
            ))}
          </div>
          <div className="stage-detail">
            <div>
              <span className={`status-chip ${selectedStage.health}`}>{healthLabel(selectedStage.health)}</span>
              <h3>{selectedStage.label}</h3>
              <p>{selectedStage.detail}</p>
            </div>
            <dl>
              <div><dt>Throughput</dt><dd>{selectedStage.throughput}/min</dd></div>
              <div><dt>Confidence</dt><dd>{selectedStage.confidence}%</dd></div>
              <div><dt>Queue</dt><dd>{selectedStage.queue}</dd></div>
            </dl>
          </div>
        </section>

        <section className="panel reasoning-panel">
          <div className="panel-heading">
            <div><span className="eyeline">Reasoning explorer</span><h2>Active hypotheses</h2></div>
            <GitBranch size={20} />
          </div>
          <div className="hypothesis-list">
            {hypotheses.map((hypothesis) => (
              <article className={`hypothesis ${hypothesis.status}`} key={hypothesis.name}>
                <div className="hypothesis-top"><span>{hypothesis.status}</span><strong>{hypothesis.confidence}%</strong></div>
                <h3>{hypothesis.name}</h3>
                <div className="confidence-bar"><span style={{ width: `${hypothesis.confidence}%` }} /></div>
                <p>{hypothesis.evidence} evidence nodes · {hypothesis.contradictions} contradiction{hypothesis.contradictions === 1 ? '' : 's'}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel memory-panel">
          <div className="panel-heading">
            <div><span className="eyeline">Memory observatory</span><h2>Activation field</h2></div>
            <Database size={20} />
          </div>
          <div className="memory-field" aria-label="Memory cluster activation map">
            {memoryClusters.map((cluster, index) => (
              <button key={cluster.name} className="memory-orb" style={{ '--size': `${74 + cluster.activation / 2}px`, '--x': `${8 + index * 24}%`, '--y': `${18 + (index % 2) * 34}%` } as React.CSSProperties} title={`${cluster.name}: ${cluster.activation}% activation`}>
                <span>{cluster.activation}%</span>
              </button>
            ))}
            <div className="memory-grid" />
          </div>
          <div className="cluster-list">
            {memoryClusters.map((cluster) => <div key={cluster.name}><strong>{cluster.name}</strong><span>{cluster.memories} memories</span><em className={cluster.change < 0 ? 'negative' : ''}>{cluster.change > 0 ? '+' : ''}{cluster.change}%</em></div>)}
          </div>
        </section>

        <section className="panel agents-panel">
          <div className="panel-heading">
            <div><span className="eyeline">Agent ecology</span><h2>Constellation</h2></div>
            <Network size={20} />
          </div>
          <div className="agent-list">
            {agents.map((agent) => (
              <article key={agent.name} className={`agent-row ${agent.state}`}>
                <span className="agent-avatar">{agent.name.slice(0, 2).toUpperCase()}</span>
                <div><strong>{agent.name}</strong><span>{agent.role}</span></div>
                <div className="load-meter"><span style={{ width: `${agent.load}%` }} /></div>
                <strong>{agent.trust}</strong>
                <i>{agent.state}</i>
              </article>
            ))}
          </div>
        </section>

        <section className="panel timeline-panel">
          <div className="panel-heading timeline-heading">
            <div><span className="eyeline">Unified timeline</span><h2>One hour replay window</h2></div>
            <div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter evidence" aria-label="Filter timeline evidence" /></div>
          </div>
          <div className="timeline-track">
            <input type="range" min="0" max="59" value={timelineMinute} onChange={(event) => setTimelineMinute(Number(event.target.value))} aria-label="Timeline minute" />
            <div className="ticks"><span>60m ago</span><span>30m</span><span>now</span></div>
          </div>
          <div className="event-stream">
            {filteredEvents.filter((event) => event.minute <= timelineMinute).slice(-5).reverse().map((event) => (
              <button className={`event-row ${selectedEvent?.id === event.id ? 'selected' : ''}`} key={event.id} onClick={() => setSelectedEventId(event.id)}>
                <span className={`event-icon ${event.type}`}>{event.type === 'memory' ? <Database size={15} /> : event.type === 'reasoning' ? <BrainCircuit size={15} /> : event.type === 'agent' ? <Waypoints size={15} /> : event.type === 'governance' ? <ShieldCheck size={15} /> : <Activity size={15} />}</span>
                <div><strong>{event.title}</strong><span>{event.detail}</span></div>
                <time>{Math.max(0, 59 - event.minute)}m ago</time>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel evidence-panel">
          <div className="panel-heading"><div><span className="eyeline">Evidence</span><h2>Selected event</h2></div><Sparkles size={20} /></div>
          {selectedEvent ? <div className="evidence-card">
            <span className={`event-label ${selectedEvent.type}`}>{selectedEvent.type}</span>
            <h3>{selectedEvent.title}</h3>
            <p>{selectedEvent.detail}</p>
            <dl>
              <div><dt>Confidence</dt><dd>{selectedEvent.confidence}%</dd></div>
              <div><dt>Trace</dt><dd>{selectedEvent.traceId}</dd></div>
              <div><dt>Provenance</dt><dd>{selectedEvent.provenance.source}</dd></div>
              <div><dt>Freshness</dt><dd>{telemetry.freshness}</dd></div>
            </dl>
          </div> : <div className="evidence-card"><p>No event evidence is available from the active adapter.</p></div>}
          <div className="intervention-stack">
            <button disabled={!selectedEvent} onClick={() => setIntervention('Replay selected event')}><RotateCcw size={16} /> Replay event</button>
            <button disabled={!selectedEvent} onClick={() => setIntervention('Inspect distributed trace')}><Waypoints size={16} /> Open trace</button>
            <button onClick={() => setIntervention('Create rollback checkpoint')}><TimerReset size={16} /> Checkpoint</button>
          </div>
        </aside>
      </div>

      <footer>
        <span>CAPT Dashboard · active adapter: {telemetry.adapterName}{telemetry.error ? ` · ${telemetry.error}` : ''}</span>
        <span>Observed {new Date(telemetry.snapshot.generatedAt).toLocaleTimeString()}</span>
      </footer>

      {intervention && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIntervention(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <AlertTriangle size={24} />
            <span className="eyeline">Intervention preview</span>
            <h2 id="modal-title">{intervention}</h2>
            <p>Runtime execution remains disabled by default. The gateway must preview, revalidate, confirm, and append an auditable receipt before any governed action can execute.</p>
            <div className="modal-actions"><button onClick={() => setIntervention(null)}>Cancel</button><button className="primary-button" onClick={() => setIntervention(null)}>Acknowledge preview</button></div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
