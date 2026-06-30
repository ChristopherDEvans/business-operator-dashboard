'use client';

import { useState, useEffect } from 'react';
import {
  CheckSquare,
  User,
  Bot,
  Heart,
  MessageSquare,
  Wrench,
  Zap,
  Clock,
  Trash2,
  LayoutDashboard,
  Terminal,
} from 'lucide-react';

/* ── Mock Agent Data (Pending DB Wiring) ── */

const AGENT_ACTIONS = [
  { type: 'heartbeat', title: 'Morning Heartbeat', time: '08:00 AM', desc: 'Sent accountability check to user' },
  { type: 'message', title: 'Message Processed', time: '08:15 AM', desc: '"Check my emails" — fetched 12 emails via Zapier' },
  { type: 'tool', title: 'remember_fact', time: '08:16 AM', desc: 'Saved: User prefers morning summary format' },
  { type: 'message', title: 'Message Processed', time: '09:30 AM', desc: '"Deploy to Railway" — triggered deployment' },
  { type: 'tool', title: 'search_facts', time: '09:31 AM', desc: 'Retrieved 8 context memories for deployment help' },
  { type: 'heartbeat', title: 'Content Sync', time: '12:00 PM', desc: 'Synced 5 new content items from YouTube' },
  { type: 'message', title: 'Message Processed', time: '02:45 PM', desc: '"Summarise today\'s meetings" — compiled 3 meetings' },
  { type: 'tool', title: 'zapier_list_calendar', time: '02:46 PM', desc: 'Fetched calendar events for today' },
  { type: 'error', title: 'Rate Limit Warning', time: '03:00 PM', desc: 'OpenRouter throttled — switched to Gemini Flash' },
  { type: 'message', title: 'Message Processed', time: '04:30 PM', desc: '"What did I work on today?" — generated daily summary' },
];

const ACTION_COUNTS = {
  heartbeat: AGENT_ACTIONS.filter(a => a.type === 'heartbeat').length,
  message: AGENT_ACTIONS.filter(a => a.type === 'message').length,
  tool: AGENT_ACTIONS.filter(a => a.type === 'tool').length,
};

function getPriorityLabel(p: string) {
  return p === 'high' ? '🔴' : p === 'medium' ? '🟠' : '🔵';
}

function getActionIcon(type: string) {
  switch (type) {
    case 'heartbeat': return <Heart size={14} />;
    case 'message': return <MessageSquare size={14} />;
    case 'tool': return <Wrench size={14} />;
    case 'error': return <Zap size={14} />;
    default: return <Clock size={14} />;
  }
}

export default function Tasks() {
  const [tab, setTab] = useState<'human' | 'agent'>('human');
  const [loading, setLoading] = useState(true);
  const [humanTasks, setHumanTasks] = useState<{
    internal: { todo: any[], inProgress: any[], complete: any[] },
    clients: { todo: any[], inProgress: any[], complete: any[] }
  }>({ 
    internal: { todo: [], inProgress: [], complete: [] },
    clients: { todo: [], inProgress: [], complete: [] }
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchTasks = () => {
      fetch('/api/clickup/tasks', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (!isMounted || !data.tasks) return;
          const mapped = { 
            internal: { todo: [] as any[], inProgress: [] as any[], complete: [] as any[] },
            clients: { todo: [] as any[], inProgress: [] as any[], complete: [] as any[] }
          };
          
          data.tasks.forEach((t: any) => {
             const s = (t.status?.status || "").toLowerCase();
             const listName = (t.list?.name || "").toLowerCase();
             const folderName = (t.folder?.name || "").toLowerCase();
             
             let pLabel = "medium";
             if (t.priority) {
                const p = t.priority.priority;
                if (p === 'urgent' || p === 'high') pLabel = 'high';
                else if (p === 'low') pLabel = 'low';
             }
             
             const taskObj = {
               id: t.id,
               title: t.name,
               priority: pLabel,
               url: t.url,
               listName: t.list?.name
             };

             const targetCategory = (folderName.includes('client') || listName.includes('build')) ? 'clients' : 'internal';

             if (s.includes('progress') || s.includes('doing')) {
               mapped[targetCategory].inProgress.push(taskObj);
             } else if (s.includes('complete') || s.includes('closed') || s.includes('done')) {
               mapped[targetCategory].complete.push(taskObj);
             } else {
               mapped[targetCategory].todo.push(taskObj);
             }
          });
          setHumanTasks(mapped);
        })
        .catch(console.error)
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    // Fetch immediately
    fetchTasks();
    
    // Then poll every 5 seconds to keep it synced
    const interval = setInterval(fetchTasks, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleDeleteTask = async (taskId: string, category: 'internal' | 'clients', column: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This will remove it from ClickUp.')) return;

    // Optimistic Update
    setHumanTasks(prev => {
      const newTasks = { ...prev };
      newTasks[category][column as 'todo' | 'inProgress' | 'complete'] = newTasks[category][column as 'todo' | 'inProgress' | 'complete'].filter((t: any) => t.id !== taskId);
      return newTasks;
    });

    try {
      const res = await fetch(`/api/clickup/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete task');
    } catch (err) {
      console.error("Failed to delete task", err);
      alert('Failed to delete task from ClickUp. Please refresh.');
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string, categoryId: string, sourceCol: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('categoryId', categoryId);
    e.dataTransfer.setData('sourceCol', sourceCol);
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: 'internal' | 'clients', targetCol: string) => {
    const taskId = e.dataTransfer.getData('taskId');
    const sourceCategory = e.dataTransfer.getData('categoryId') as 'internal' | 'clients';
    const sourceCol = e.dataTransfer.getData('sourceCol');
    
    if (!taskId || (sourceCol === targetCol && sourceCategory === targetCategory)) return;

    // Optimistic Update
    setHumanTasks(prev => {
      const newTasks = { ...prev };
      const taskIndex = newTasks[sourceCategory][sourceCol as 'todo' | 'inProgress' | 'complete'].findIndex((t: any) => t.id === taskId);
      if (taskIndex > -1) {
         const [task] = newTasks[sourceCategory][sourceCol as 'todo' | 'inProgress' | 'complete'].splice(taskIndex, 1);
         newTasks[targetCategory][targetCol as 'todo' | 'inProgress' | 'complete'].push(task);
      }
      return newTasks;
    });

    // Fire Sync
    try {
      await fetch(`/api/clickup/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetCol })
      });
    } catch (err) {
      console.error("Failed to sync drag and drop", err);
    }
  };

  const renderKanbanRow = (category: 'internal' | 'clients', title: string) => {
    const tasks = humanTasks[category];
    return (
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {category === 'internal' ? <Bot size={18} color="var(--accent-blue)" /> : <User size={18} color="var(--accent-violet)" />}
          {title}
        </h2>
        <div className="kanban-board">
          {(['todo', 'inProgress', 'complete'] as const).map((col) => {
            const labels = { todo: 'To Do', inProgress: 'In Progress', complete: 'Complete' };
            const columnTasks = tasks[col];
            return (
              <div 
                key={col} 
                className="kanban-column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, category, col)}
              >
                <div className="kanban-column-header">
                  <h3>{labels[col]}</h3>
                  <span className="count">{columnTasks.length}</span>
                </div>
                {columnTasks.map((task, i) => (
                  <div 
                    key={task.id} 
                    className="kanban-card" 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id, category, col)}
                    style={{ cursor: 'grab' }}
                  >
                    <div className="task-actions">
                      <button 
                        className="delete-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id, category, col);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className={`priority-dot ${task.priority}`} />
                      <span>{task.listName}</span>
                      <a href={task.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--accent-blue)', textDecoration: 'none' }}>Pop Out ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <h1><CheckSquare size={24} /> Tasks & Projects</h1>
        <p>Your business logic and client deliverables, side by side</p>
      </div>

      {/* ── Tab Bar ── */}
      <div className="tab-bar">
        <button className={tab === 'human' ? 'active' : ''} onClick={() => setTab('human')}>
          <LayoutDashboard size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Mission Board
        </button>
        <button className={tab === 'agent' ? 'active' : ''} onClick={() => setTab('agent')}>
          <Terminal size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Agent Actions
        </button>
      </div>

      {/* ── Human Tasks (Dual Kanban) ── */}
      {tab === 'human' && (
        <div style={{ animation: 'fadeIn 0.5s ease forwards' }}>
          {loading && <div style={{ padding: 20 }}>Syncing with ClickUp Space...</div>}
          {!loading && (
            <>
              {renderKanbanRow('internal', 'Internal AI Development')}
              {renderKanbanRow('clients', 'Active Client Projects')}
            </>
          )}
        </div>
      )}

      {/* ── Agent Actions ── */}
      {tab === 'agent' && (
        <>
          <div className="action-summary">
            <div className="action-summary-card">
              <div className="sum-value" style={{ color: 'var(--brand-green)' }}>{ACTION_COUNTS.heartbeat}</div>
              <div className="sum-label">Heartbeats</div>
            </div>
            <div className="action-summary-card">
              <div className="sum-value" style={{ color: 'var(--brand-blue)' }}>{ACTION_COUNTS.message}</div>
              <div className="sum-label">Messages</div>
            </div>
            <div className="action-summary-card">
              <div className="sum-value" style={{ color: 'var(--brand-orange)' }}>{ACTION_COUNTS.tool}</div>
              <div className="sum-label">Tool Calls</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2><Bot size={16} /> Agent Action Log</h2>
              <span className="card-badge">Today</span>
            </div>
            <div className="activity-feed">
              {AGENT_ACTIONS.map((action, i) => (
                <div key={i} className="activity-item" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className={`activity-icon ${action.type}`}>
                    {getActionIcon(action.type)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{action.title}</div>
                    <div className="activity-desc">{action.desc}</div>
                  </div>
                  <span className="activity-time">{action.time}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
