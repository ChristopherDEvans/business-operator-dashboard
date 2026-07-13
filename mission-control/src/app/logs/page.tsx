'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal, Trash2, StopCircle, PlayCircle } from 'lucide-react';

interface LogEntry {
  type: 'stdout' | 'stderr' | 'error';
  text: string;
  time: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isActive, setIsActive] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (isActive) {
      const es = new EventSource('/api/logs');
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.type === 'done') {
            es.close();
            setIsActive(false);
            return;
          }
          const newLog: LogEntry = {
            ...raw,
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
          setLogs(prev => [...prev, newLog].slice(-500)); // Keep last 500 lines
        } catch (err) {
          console.error('Failed to parse log record:', err);
        }
      };

      es.onerror = (err) => {
        console.error('EventSource failed:', err);
        const errorLog: LogEntry = {
          type: 'error',
          text: '📡 Log stream disconnected. This may be due to a CLI error or the service being offline.',
          time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setLogs(prev => [...prev.slice(-499), errorLog]);
        es.close();
        setIsActive(false);
      };

      return () => {
        es.close();
      };
    } else if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, [isActive]);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = () => setLogs([]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Terminal size={24} /> Live Logs</h1>
          <p>Real-time stdout/stderr stream from your Railway service</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary btn-sm" onClick={clearLogs}>
            <Trash2 size={14} /> Clear
          </button>
          <button 
            className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`} 
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? <><StopCircle size={14} /> Stop Stream</> : <><PlayCircle size={14} /> Start Stream</>}
          </button>
        </div>
      </div>

      <div className="terminal-container fade-up-heavy">
        <div className="terminal-header">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
          <span className="terminal-title">gravity-claw-bot — railway-logs</span>
        </div>
        <div className="terminal-body" ref={scrollRef}>
          {logs.length === 0 && (
            <div className="terminal-placeholder">
              {isActive ? '📡 Waiting for logs from Railway...' : '⏹️ Stream stopped.'}
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className={`log-line ${log.type}`}>
              <span className="log-time">[{log.time}]</span>
              <span className="log-text">{log.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .terminal-container {
          background: #0D0D0D;
          border-radius: 12px;
          border: 1px solid var(--border-strong);
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 220px);
        }

        .terminal-header {
          background: #1A1A1A;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .dot { width: 10px; height: 10px; border-radius: 50%; opacity: 0.8; }
        .dot.red { background: #FF5F56; }
        .dot.yellow { background: #FFBD2E; }
        .dot.green { background: #27C93F; }

        .terminal-title {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-family: 'SF Mono', 'Fira Code', monospace;
          margin-left: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .terminal-body {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
          font-size: 0.82rem;
          line-height: 1.6;
          scrollbar-width: thin;
          scrollbar-color: #222 transparent;
        }

        .terminal-body::-webkit-scrollbar { width: 6px; }
        .terminal-body::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }

        .log-line {
          display: flex;
          gap: 12px;
          white-space: pre-wrap;
          word-break: break-all;
          margin-bottom: 2px;
        }

        .log-line.stderr { color: #FFBD2E; opacity: 0.9; }
        .log-line.error { color: #FF5F56; font-weight: 600; }

        .log-time {
          color: #555;
          flex-shrink: 0;
          user-select: none;
        }

        .log-text {
          color: #D1D1D1;
        }

        .terminal-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #444;
          font-style: italic;
        }

        :global(.btn-sm) {
          padding: 6px 14px !important;
          font-size: 0.75rem !important;
        }
      `}</style>
    </>
  );
}
