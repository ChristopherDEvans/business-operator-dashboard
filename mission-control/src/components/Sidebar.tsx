'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Zap,
  CheckSquare,
  MonitorPlay,
  Brain,
  Plug,
  Settings,
  Terminal,
  Radio,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard },
  { href: '/productivity', label: 'Productivity', icon: Zap },
  { href: '/tasks', label: 'Tasks & Projects', icon: CheckSquare },
  { href: '/content', label: 'Content Intel', icon: MonitorPlay },
  { href: '/brain', label: 'Second Brain', icon: Brain },
  { href: '/connections', label: 'Connections', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/logs', label: 'Live Logs', icon: Terminal },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [botStatus, setBotStatus] = useState<string>('Online (Railway)');
  const [botModel, setBotModel] = useState<string>('Claude Sonnet 4');

  useEffect(() => {
    if (!supabase) return;

    const fetchStatus = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('bot_config').select('*');
      if (data) {
        const status = data.find(it => it.key === 'bot_status')?.value;
        const model = data.find(it => it.key === 'llm_model')?.value;
        if (status) setBotStatus(status);
        if (model) setBotModel(model);
      }
    };

    fetchStatus();

    // Subscribe to changes
    const channel = supabase.channel('bot-config-sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bot_config' }, () => {
        fetchStatus();
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleNewCommand = async () => {
    if (!supabase) {
      alert("Supabase not configured. This is a demo mode.");
      return;
    }
    
    const cmd = prompt("Enter command for Gravity Claw:");
    if (!cmd || !cmd.trim()) return;

    try {
      const { error } = await supabase.from('system_commands').insert({
        command: cmd.trim(),
        executed: false
      });
      
      if (error) throw error;
      alert(`Command "${cmd}" dispatched to Gravity Claw!`);
    } catch (err: any) {
      console.error('❌ New command failed:', err);
      alert(`Failed to send command: ${err.message}`);
    }
  };

  return (
    <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}`}>
      <button className="collapse-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      {/* ── Logo & Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src="/branding/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="sidebar-brand-text">
          <span className="brand-name">EvansAiSolutions</span>
          <span className="brand-version">Nebula Dark v1.0</span>
        </div>
      </div>

      {/* ── Agent Status ── */}
      <div className="agent-status-card">
        <div className="status-row">
          <span className="pulse-dot">
            <span className="pulse-ring"></span>
          </span>
          <span className="status-text">{botStatus}</span>
        </div>
        <div className="status-detail">{botModel}</div>
      </div>

      {/* ── Quick Action ── */}
      <button 
        className="sidebar-action-btn nebula-btn"
        onClick={handleNewCommand}
      >
        <Plus size={16} />
        <span className="quick-action-text">New Command</span>
      </button>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── XP Bar ── */}
      <div className="xp-section">
        <div className="xp-header">
          <span className="xp-level">Level 7</span>
          <span className="xp-title">Field Agent</span>
        </div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: '68%' }} />
        </div>
        <div className="xp-numbers">
          <span>2,840 XP</span>
          <span>4,200 XP</span>
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: rgba(5, 5, 5, 0.8); /* OLED Black with alpha */
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid var(--border-glass);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          z-index: 100;
          overflow-y: auto;
          overflow-x: visible;
          transition: var(--transition-cinematic);
        }

        .sidebar.collapsed {
          width: var(--sidebar-collapsed-width);
          padding: 20px 10px;
        }

        .sidebar.collapsed .brand-name,
        .sidebar.collapsed .brand-version,
        .sidebar.collapsed .status-text,
        .sidebar.collapsed .status-detail,
        .sidebar.collapsed .nav-item span,
        .sidebar.collapsed .xp-header,
        .sidebar.collapsed .xp-numbers,
        .sidebar.collapsed .quick-action-text {
          display: none;
        }

        .sidebar.collapsed .sidebar-brand { justify-content: center; padding: 2px 0 18px; }
        .sidebar.collapsed .agent-status-card { padding: 12px 0; display: flex; justify-content: center; border-color: transparent; background: transparent; }
        .sidebar.collapsed .status-row { margin-bottom: 0; }
        .sidebar.collapsed .nav-item { justify-content: center; padding: 12px; }
        .sidebar.collapsed .sidebar-action-btn { padding: 12px; border-radius: 50%; width: 40px; height: 40px; margin: 0 auto 20px auto; }
        .sidebar.collapsed .xp-section { display: none; }

        .collapse-toggle {
          position: absolute;
          top: 30px;
          right: -13px;
          width: 26px;
          height: 26px;
          background: var(--bg-card);
          border: 1px solid var(--border-medium);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          z-index: 101;
          transition: all var(--transition-fast);
        }

        .collapse-toggle:hover {
          background: var(--bg-hover);
          color: #fff;
          transform: scale(1.1);
        }

        /* ── Brand ── */
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 2px 6px 18px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 24px;
        }

        .sidebar-logo {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--grad-nebula);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
        }

        .logo-icon {
          font-size: 1.25rem;
        }

        .sidebar-brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .brand-version {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* ── Agent Status ── */
        .agent-status-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          margin-bottom: 24px;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--brand-green);
          flex-shrink: 0;
          position: relative;
        }

        .pulse-ring {
          position: absolute;
          top: -4px;
          left: -4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--brand-green);
          animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulseRing {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .status-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--brand-green);
        }

        .status-detail {
          font-size: 0.7rem;
          color: var(--text-muted);
          padding-left: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Quick Action ── */
        .sidebar-action-btn {
          background: var(--grad-nebula);
          color: #fff;
          border-radius: 9999px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 600;
          font-size: 0.88rem;
          margin-bottom: 32px;
          box-shadow: 0 4px 14px rgba(0, 212, 255, 0.2);
          transition: var(--transition-cinematic);
          cursor: pointer;
          border: none;
        }

        .sidebar-action-btn:hover {
          transform: scale(0.96) translateY(-2px);
          box-shadow: 0 8px 24px rgba(108, 99, 255, 0.4);
        }

        /* ── XP Section ── */
        .xp-section {
          border-top: 1px solid var(--border-subtle);
          padding-top: 16px;
          margin-top: 8px;
        }

        .xp-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .xp-level {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .xp-title {
          font-size: 0.72rem;
          color: var(--brand-orange);
          font-weight: 500;
        }

        .xp-bar {
          width: 100%;
          height: 6px;
          background: var(--bg-card);
          border-radius: 100px;
          overflow: hidden;
        }

        .xp-fill {
          height: 100%;
          border-radius: 100px;
          background: linear-gradient(90deg, var(--brand-orange), var(--brand-blue));
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }

        .xp-numbers {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
      `}</style>
    </aside>
  );
}
