'use client';

import { useState, useEffect } from 'react';
import {
  Plug,
  Check,
  X,
  MessageSquare,
  Bot,
  Database,
  Cpu,
  Mic,
  Globe,
  Mail,
  Calendar,
  FileText,
  Zap as ZapIcon,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

/* ── Connections Data ── */
interface Connection {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
}

function getIconFor(name: string) {
  if (name.includes('Telegram')) return <MessageSquare size={20} />;
  if (name.includes('Claude') || name.includes('LLM')) return <Bot size={20} />;
  if (name.includes('Pinecone') || name.includes('Supabase')) return <Database size={20} />;
  if (name.includes('Railway') || name.includes('Analytics')) return <Globe size={20} />;
  if (name.includes('ElevenLabs')) return <Mic size={20} />;
  if (name.includes('Groq') || name.includes('Whisper')) return <Cpu size={20} />;
  if (name.includes('Gmail')) return <Mail size={20} />;
  if (name.includes('Calendar')) return <Calendar size={20} />;
  if (name.includes('Notion')) return <FileText size={20} />;
  if (name.includes('ClickUp')) return <Check size={20} />;
  return <Plug size={20} />;
}

export default function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.from('agent_connections').select('*').order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && isMounted) setConnections(data as Connection[]);
        if (isMounted) setLoading(false);
      });

    const channel = supabase.channel('connections-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_connections' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setConnections(prev => prev.map(c => c.id === payload.new.id ? payload.new as Connection : c));
        } else if (payload.eventType === 'INSERT') {
          setConnections(prev => [...prev, payload.new as Connection]);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const activeCount = connections.filter(c => c.status === 'active').length;
  const totalCount = connections.length || 1; // Prevent div by zero
  const progressPct = Math.round((activeCount / totalCount) * 100);

  const toggleConnection = async (index: number) => {
    if (!supabase) return;
    
    const conn = connections[index];
    const nextStatus = conn.status === 'active' ? 'inactive' : 'active';
    
    // Optimistic Update
    const next = [...connections];
    next[index] = { ...conn, status: nextStatus };
    setConnections(next);

    // Sync to DB
    await supabase.from('agent_connections').update({ status: nextStatus }).eq('id', conn.id);
  };

  return (
    <>
      <div className="page-header">
        <h1><Plug size={24} /> Connections</h1>
        <p>Manage your agent&apos;s integrations and external services</p>
      </div>

      {/* ── Progress Bar ── */}
      <div className="progress-container">
        <div className="progress-label">
          <span>Connected Integrations</span>
          <span>{activeCount} / {totalCount}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* ── Connections Grid ── */}
      <div className="connections-grid">
        {connections.map((conn, i) => (
          <div
            key={conn.name}
            className={`connection-card${conn.status === 'inactive' ? ' inactive' : ''}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {conn.status === 'active' && (
              <button
                className="disconnect-btn"
                onClick={() => toggleConnection(i)}
                title="Disconnect"
              >
                <X size={14} />
              </button>
            )}

            <div className="connection-logo">
              {getIconFor(conn.name)}
            </div>

            <div className="connection-info">
              <div className="conn-name">
                {conn.name}
                {conn.provider === 'zapier' && <span className="zapier-badge">via Zapier</span>}
              </div>
              <div className="conn-desc">{conn.provider !== 'zapier' ? conn.provider : (conn.name === 'Gmail' ? 'Email integration' : 'Calendar events')}</div>
            </div>

            {conn.status === 'active' ? (
              <span className="connection-status active">Active</span>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => toggleConnection(i)}
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
