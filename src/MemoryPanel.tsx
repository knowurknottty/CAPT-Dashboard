import { Database } from 'lucide-react';
import { useMemoryObservability } from './telemetry/memory';

export function MemoryPanel() {
  const memory = useMemoryObservability();
  const aggregates = memory.aggregates;

  return (
    <section className="panel memory-panel">
      <div className="panel-heading">
        <div><span className="eyeline">Memory observatory</span><h2>Read-only inventory</h2></div>
        <span className="muted">{memory.status} · content never exposed</span>
      </div>
      {memory.status === 'available' && aggregates ? <>
        <div className="stage-detail">
          <div>
            <span className="status-chip healthy">Aggregate only</span>
            <h3>{aggregates.totalMemories} governed memories</h3>
            <p>{aggregates.namespaceCount} namespaces · {aggregates.tagCount} tag assignments · average confidence {(aggregates.averageConfidence * 100).toFixed(1)}%</p>
          </div>
          <dl>
            <div><dt>Newest update</dt><dd>{aggregates.newestUpdatedAt ? new Date(aggregates.newestUpdatedAt).toLocaleString() : 'unknown'}</dd></div>
            <div><dt>Oldest record</dt><dd>{aggregates.oldestCreatedAt ? new Date(aggregates.oldestCreatedAt).toLocaleDateString() : 'unknown'}</dd></div>
            <div><dt>Source</dt><dd>immutable SQLite</dd></div>
          </dl>
        </div>
        <div className="cluster-list">
          {aggregates.namespaces.slice(0, 8).map((row) => (
            <div key={row.namespace}><strong>{row.namespace || 'default'}</strong><span>{row.count} memories</span><em>{Math.round((row.averageConfidence ?? 0) * 100)}%</em></div>
          ))}
        </div>
        {aggregates.tags.length > 0 && <div className="cluster-list">
          {aggregates.tags.slice(0, 6).map((row) => <div key={row.tag}><strong>#{row.tag}</strong><span>{row.count} assignments</span><em>tag</em></div>)}
        </div>}
      </> : <div className="stage-detail">
        <div>
          <span className={`status-chip ${memory.status === 'error' ? 'critical' : 'offline'}`}>{memory.status}</span>
          <h3>Local memory database not observable</h3>
          <p>{memory.reason ?? 'No aggregate memory data is available.'}</p>
        </div>
        <Database size={28} />
      </div>}
    </section>
  );
}
