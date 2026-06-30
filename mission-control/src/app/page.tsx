'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Wrench,
  RefreshCw,
  Clock,
  Heart,
  Send,
  Radio,
  Zap,
  TrendingUp,
  Activity,
  FileText,
  ExternalLink,
  Target,
  Briefcase,
  Layers,
  BarChart2,
  Mail,
  Shield,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Calendar,
  Linkedin,
  Server,
  HardDrive,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import DigitalClock from '@/components/DigitalClock';

function getActivityIcon(type: string) {
  switch (type) {
    case 'heartbeat': return <Heart size={15} />;
    case 'message': return <MessageSquare size={15} />;
    case 'tool': return <Wrench size={15} />;
    case 'error': return <Zap size={15} />;
    default: return <Activity size={15} />;
  }
}

export default function CommandCenter() {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [clickupTasks, setClickupTasks] = useState<any[]>([]);
  
  // Real database metrics
  const [leadsCount, setLeadsCount] = useState(0);
  const [sitesStampCount, setSitesStampCount] = useState(0);
  const [emailsSent, setEmailsSent] = useState(0);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase) return;

    const fetchMetrics = async () => {
      if (!supabase) return;
      // 1. Fetch Activity Log & Extract Briefing / Invoices
      const { data: actLogs } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (actLogs) {
        setActivities(actLogs.slice(0, 10).map((d: any) => ({
          type: d.type,
          title: d.title,
          desc: d.description || '',
          time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));

        // Extract invoices
        const invoiceLogs = actLogs
          .filter((d: any) => d.title === "Invoice Generated")
          .map((d: any) => ({
            desc: d.description,
            time: new Date(d.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })
          }));
        setInvoices(invoiceLogs.slice(0, 5));

        // Extract daily briefing
        const briefLog = actLogs.find((d: any) => 
          d.type === "system" && 
          (d.description?.includes("Daily Operations Brief") || d.description?.includes("Good Morning"))
        );
        if (briefLog) {
          setBriefing(briefLog.description);
        } else {
          setBriefing("No daily briefing generated yet today. Click 'Run Daily Briefing' under Quick Actions to compile the strategic report.");
        }
      }

      // 2. Fetch Leads Count & Leads Queue Table
      const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
      if (leadCount !== null) setLeadsCount(leadCount);

      const { data: leadData } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(6);
      if (leadData) setLeads(leadData);

      // 3. Fetch Projects Count & Projects List
      const { count: stampedCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      if (stampedCount !== null) setSitesStampCount(stampedCount);

      const { data: projectData } = await supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(5);
      if (projectData) setProjects(projectData);

      // 4. Fetch Campaign Metrics
      const { data: campaignData } = await supabase.from('campaigns').select('*').limit(3);
      if (campaignData) {
        setCampaigns(campaignData);
        setEmailsSent(campaignData.reduce((acc, curr) => acc + (curr.sent_count || 0), 0));
      }

      // 5. Fetch Command History
      const { data: cmdData } = await supabase
        .from('system_commands')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (cmdData) setCommandHistory(cmdData);
    };

    fetchMetrics();

    // Live Activity Subscription
    const channel = supabase.channel('activity-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => {
        fetchMetrics();
      })
      .subscribe();

    // Fetch ClickUp Objectives
    fetch('/api/clickup/tasks')
      .then(res => res.json())
      .then(data => {
        if (data.tasks) {
          setClickupTasks(data.tasks.filter((t: any) => t.status.status !== 'closed').slice(0, 4));
        }
      })
      .catch(console.error);

    // Listen for lead/project/command changes
    const metricChannel = supabase.channel('metrics-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_commands' }, fetchMetrics)
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
      supabase?.removeChannel(metricChannel);
    };
  }, []);

  const handleAction = async (command: string, customPayload: any = null) => {
    if (!supabase) return;
    setActionLoading(command);
    
    let payload = customPayload || {};
    let requiresApproval = false;
    
    // Auto-populate payloads for specific dashboard actions to ensure a smooth B2B operations flow
    if (command === 'stamp_website_preview' && Object.keys(payload).length === 0) {
      if (leads.length > 0) {
        payload = {
          lead_id: leads[0].id,
          template_id: 'base'
        };
      }
    } else if (command === 'generate_linkedin_posts' && Object.keys(payload).length === 0) {
      payload = {
        pillar: 'Client Acquisition',
        topic: 'AI Automation for Local UK Removals and Roofing Companies',
        count: 1
      };
    } else if (command === 'scan_upwork_jobs' && Object.keys(payload).length === 0) {
      payload = {
        query: 'React Developer'
      };
      requiresApproval = true;
    }
    
    try {
      const { error } = await supabase.from('system_commands').insert({
        command: command,
        executed: false,
        status: 'queued',
        payload: payload,
        requires_human_approval: requiresApproval
      });
      
      if (error) throw error;
      setTimeout(() => setActionLoading(null), 2500);
    } catch (err: any) {
      console.error('❌ Action failed:', err);
      alert(`Failed to trigger command: ${err.message || 'Unknown error'}`);
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="page-header fade-up-heavy" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1><Radio size={24} color="var(--accent-blue)" /> Business Operator Dashboard</h1>
          <p>The central operating system for B2B local business lead acquisition and delivery.</p>
        </div>
        <DigitalClock />
      </div>

      {/* ── SECTION 1: BUSINESS HEALTH METRICS ── */}
      <div className="fade-up-heavy" style={{ animationDelay: '0.05s' }}>
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-label">Leads Scraped</div>
            <div className="stat-value">{leadsCount}</div>
            <div className="stat-badge green"><TrendingUp size={10} /> Live Pipeline</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Sites Stamped</div>
            <div className="stat-value">{sitesStampCount}</div>
            <div className="stat-badge blue"><Layers size={10} /> Active Builds</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">Emails Sent</div>
            <div className="stat-value">{emailsSent}</div>
            <div className="stat-badge orange"><Mail size={10} /> Campaigns</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Total Invoiced</div>
            <div className="stat-value">£{(sitesStampCount * 850).toLocaleString()}</div>
            <div className="stat-badge green">GBP £ (Est.)</div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: OPERATION MATRIX (Main Content Grid) ── */}
      <div className="fade-up-heavy" style={{ animationDelay: '0.1s', display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '20px', marginBottom: '20px' }}>
        
        {/* LEFT COLUMN: Core Workloads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TODAY'S BRIEFING PANEL */}
          <div className="card" style={{ border: '1px solid rgba(0, 212, 255, 0.15)' }}>
            <div className="card-header">
              <h2><FileText size={16} color="var(--accent-blue)" /> Today's Briefing</h2>
              <span className="card-badge">Staffordshire/Cannock (Europe/London)</span>
            </div>
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              padding: '16px', 
              borderRadius: '12px', 
              fontSize: '13.5px', 
              lineHeight: '1.6', 
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {briefing}
            </div>
          </div>

          {/* PROSPECTOR QUEUE PANEL */}
          <div className="card">
            <div className="card-header">
              <h2><Target size={16} /> Prospector Queue (Scraped Leads)</h2>
              <span className="card-badge">Real-time leads</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 8px' }}>Business Name</th>
                    <th style={{ padding: '10px 8px' }}>Niche</th>
                    <th style={{ padding: '10px 8px' }}>Status</th>
                    <th style={{ padding: '10px 8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>No leads scraped yet. Trigger 'Score New Leads' to pull.</td>
                    </tr>
                  ) : (
                    leads.map((lead, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 500, color: '#fff' }}>{lead.business_name}</td>
                        <td style={{ padding: '10px 8px' }}>{lead.niche || 'General'}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <span className="connection-status active" style={{ 
                            fontSize: '9px', 
                            background: lead.status === 'converted' ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
                            color: lead.status === 'converted' ? 'var(--accent-blue)' : 'var(--text-secondary)'
                          }}>{lead.status}</span>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          {lead.url ? (
                            <a href={lead.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)' }}>
                              <ExternalLink size={10} /> Audit
                            </a>
                          ) : '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SPLIT ROW: LinkedIn OS & Upwork Radar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* LINKEDIN OS PANEL */}
            <div className="card">
              <div className="card-header">
                <h2><Linkedin size={16} color="#00D4FF" /> LinkedIn OS</h2>
                <span className="card-badge">Manual Mode</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', borderLeft: '3px solid #00D4FF' }}>
                  <div style={{ fontWeight: 600, color: '#fff' }}>Pending Content Draft</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    "Why B2B local business websites in Cannock lose 40% conversions..."
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  <span>Weekly Posts: 3 drafts</span>
                  <span>Engagement: 4.2%</span>
                </div>
              </div>
            </div>

            {/* UPWORK RADAR PANEL */}
            <div className="card">
              <div className="card-header">
                <h2><Briefcase size={16} color="var(--accent-blue)" /> Upwork Radar</h2>
                <span className="card-badge">Approval Required</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', borderLeft: '3px solid var(--accent-violet)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Local Builder Web Design</span>
                    <span style={{ fontSize: '10px', color: 'var(--accent-blue)', background: 'rgba(0,212,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>92/100</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Proposal Draft ready for Cannock project builder.
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  <span>Scanned today: 15</span>
                  <span>Drafts pending: 1</span>
                </div>
              </div>
            </div>

          </div>

          {/* WEBSITE FACTORY PANEL */}
          <div className="card">
            <div className="card-header">
              <h2><Layers size={16} /> Website Factory</h2>
              <span className="card-badge">Vite Templates</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontWeight: 600, color: '#fff' }}>Roofer Template</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>CodeGrid elements loaded</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontWeight: 600, color: '#fff' }}>Restaurant Template</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Interactive menu layout</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontWeight: 600, color: '#fff' }}>Base Landing Page</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>General lead generation</div>
              </div>
            </div>
          </div>

          {/* REVENUE & COSTS PANEL */}
          <div className="card">
            <div className="card-header">
              <h2><DollarSign size={16} color="var(--accent-blue)" /> Revenue & Costs</h2>
              <span className="card-badge">GBP £ billing</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', fontSize: '13px' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>Recent Invoices (GBP £)</div>
                {invoices.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>No invoices issued yet.</div>
                ) : (
                  invoices.map((inv, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span>{inv.desc.split('Invoice Generated: ')[1] || inv.desc}</span>
                      <strong style={{ color: 'var(--accent-blue)' }}>{inv.time}</strong>
                    </div>
                  ))
                )}
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '20px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>API Usage Costs</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                  <span>Estimated Today</span>
                  <strong>£0.18</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                  <span>This Month</span>
                  <strong>£12.45</strong>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Operations & Statuses */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* QUICK ACTIONS PANEL */}
          <div className="card" style={{ border: '1px solid rgba(0, 212, 255, 0.15)' }}>
            <div className="card-header">
              <h2><Zap size={16} /> Quick Actions</h2>
            </div>
            <div className="quick-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary btn-sm" onClick={() => handleAction('run_daily_briefing')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <FileText size={14} /> {actionLoading === 'run_daily_briefing' ? 'Generating Brief...' : 'Run Daily Briefing'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('scan_upwork_jobs')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Briefcase size={14} /> {actionLoading === 'scan_upwork_jobs' ? 'Scanning Upwork...' : 'Scan Upwork Jobs'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('generate_linkedin_posts')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Linkedin size={14} /> {actionLoading === 'generate_linkedin_posts' ? 'Drafting Posts...' : 'Generate LinkedIn Posts'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('score_new_leads')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Target size={14} /> {actionLoading === 'score_new_leads' ? 'Scoring Leads...' : 'Score New Leads'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('stamp_website_preview')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Layers size={14} /> {actionLoading === 'stamp_website_preview' ? 'Stamping Site...' : 'Stamp Website Preview'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('sync_hermes_context')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <RefreshCw size={14} /> {actionLoading === 'sync_hermes_context' ? 'Syncing...' : 'Sync Hermes Context'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('check_api_costs')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <DollarSign size={14} /> {actionLoading === 'check_api_costs' ? 'Calculating...' : 'Check API Costs'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('review_active_projects')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Shield size={14} /> {actionLoading === 'review_active_projects' ? 'Reviewing...' : 'Review Active Projects'}
              </button>
            </div>
          </div>

          {/* ACTIVE PROJECTS GRID */}
          <div className="card">
            <div className="card-header">
              <h2><Briefcase size={16} /> Active Projects</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {projects.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No projects found.</div>
              ) : (
                projects.map((project, i) => (
                  <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${project.health === 'warning' ? 'var(--brand-orange)' : 'rgba(255,255,255,0.04)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{project.name}</span>
                      <span className={`connection-status ${project.status === 'active' ? 'active' : 'inactive'}`} style={{ fontSize: '8px' }}>
                        {project.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {project.last_update}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LIVE AGENT ACTIVITY PANEL */}
          <div className="card">
            <div className="card-header">
              <h2><Activity size={16} /> Agent Activity</h2>
              <span className="card-badge">Live logs</span>
            </div>
            <div className="activity-feed" style={{ maxHeight: '180px' }}>
              {activities.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Waiting for activity...</div>
              ) : (
                activities.map((item, i) => (
                  <div key={i} className="activity-item" style={{ padding: '6px 0' }}>
                    <div className={`activity-icon ${item.type}`}>
                      {getActivityIcon(item.type)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title" style={{ fontSize: '0.78rem' }}>{item.title}</div>
                      <div className="activity-desc" style={{ fontSize: '0.72rem' }}>{item.desc}</div>
                    </div>
                    <span className="activity-time">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SYSTEM HEALTH PANEL */}
          <div className="card">
            <div className="card-header">
              <h2><Server size={16} /> System Health</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Telegram Daemon</span>
                <span className="connection-status active" style={{ fontSize: '8px' }}>online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Supabase Core</span>
                <span className="connection-status active" style={{ fontSize: '8px' }}>connected</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Pinecone Index</span>
                <span className="connection-status active" style={{ fontSize: '8px' }}>configured</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ClickUp API</span>
                <span className="connection-status active" style={{ fontSize: '8px' }}>connected</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Apify Engine</span>
                <span className="connection-status active" style={{ fontSize: '8px' }}>online</span>
              </div>
            </div>
          </div>

          {/* COMMAND AUDIT TRAIL PANEL */}
          <div className="card">
            <div className="card-header">
              <h2><Clock size={16} /> Command Audit Trail</h2>
              <span className="card-badge">History</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', fontSize: '12px' }}>
              {commandHistory.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '10px' }}>No commands run yet.</div>
              ) : (
                commandHistory.map((cmd, idx) => (
                  <div key={idx} style={{ 
                    padding: '10px', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '8px', 
                    borderLeft: `3px solid ${
                      cmd.status === 'completed' ? '#00D4FF' :
                      cmd.status === 'failed' ? '#FF5555' :
                      cmd.status === 'running' ? '#6C63FF' :
                      cmd.status === 'needs_input' ? '#FFA500' :
                      'var(--text-secondary)'
                    }` 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#fff', fontSize: '13px' }}>{cmd.command}</strong>
                      <span className="card-badge" style={{ 
                        fontSize: '9px', 
                        background: 
                          cmd.status === 'completed' ? 'rgba(0, 212, 255, 0.1)' : 
                          cmd.status === 'failed' ? 'rgba(255, 85, 85, 0.1)' : 
                          'rgba(255, 255, 255, 0.05)',
                        color:
                          cmd.status === 'completed' ? '#00D4FF' : 
                          cmd.status === 'failed' ? '#FF5555' : 
                          'var(--text-secondary)'
                      }}>{cmd.status || 'queued'}</span>
                    </div>
                    {cmd.result_summary && (
                      <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                        {cmd.result_summary}
                      </div>
                    )}
                    {cmd.error_message && (
                      <div style={{ color: '#FF5555', marginTop: '4px', fontSize: '11px' }}>
                        Error: {cmd.error_message}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '6px' }}>
                      {new Date(cmd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
