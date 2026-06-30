'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Brain as BrainIcon,
  Search,
  StickyNote,
  Link2,
  Upload,
  Plus,
  Database,
  Tag,
  Clock,
  FileText,
  Trash2,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ── Mock Memory Data ── */
const MOCK_FACTS = [
  { text: 'User\'s name is Jack (CEvns on Telegram)', category: 'identity', time: '2 days ago' },
  { text: 'Lives in Staffordshire, UK', category: 'identity', time: '2 days ago' },
  { text: 'Building Gravity Claw — a personal AI agent via Telegram', category: 'fact', time: '1 day ago' },
  { text: 'Prefers morning accountability check format for heartbeats', category: 'preference', time: '1 day ago' },
  { text: 'Uses Railway for deployment, Supabase for DB', category: 'fact', time: '1 day ago' },
  { text: 'Goal: Build and monetise AI agent workflows', category: 'goal', time: '12h ago' },
  { text: 'Likes concise, no-BS communication style', category: 'preference', time: '12h ago' },
  { text: 'Interested in content creation and YouTube growth', category: 'fact', time: '8h ago' },
  { text: 'Tracks weight daily as part of accountability habit', category: 'fact', time: '6h ago' },
  { text: 'Runs a roofing company website building side project', category: 'fact', time: '4h ago' },
  { text: 'Wants to add Notion integration next', category: 'goal', time: '3h ago' },
  { text: 'Timezone: Europe/London (GMT)', category: 'identity', time: '2h ago' },
];

export default function SecondBrain() {
  const [activeType, setActiveType] = useState<'note' | 'url' | 'file'>('note');
  const [searchQuery, setSearchQuery] = useState('');
  const [input, setInput] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [facts, setFacts] = useState<{id: string, text: string, category: string, time: string}[]>([]);
  const [queuedItems, setQueuedItems] = useState<any[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const fetchMemories = () => {
    if (!supabase) return;
    const targetUserId = process.env.NEXT_PUBLIC_USER_ID ? parseInt(process.env.NEXT_PUBLIC_USER_ID) : 1;
    supabase.from('memories').select('*').order('created_at', { ascending: false }).limit(60).then((res: any) => {
      const { data } = res;
      if (data && data.length > 0) {
        setFacts(data.map((d: any) => ({
          id: d.id,
          text: d.fact,
          category: d.metadata?.category || d.metadata?.type || 'fact',
          time: new Date(d.created_at).toLocaleDateString()
        })));
      }
    });
  };

  const fetchQueue = async () => {
    const res = await fetch('/api/brain/queue');
    const data = await res.json();
    if (Array.isArray(data)) setQueuedItems(data);
  };

  useEffect(() => {
    fetchMemories();
    fetchQueue();
  }, []);

  const handleAdd = async () => {
    if (!input.trim() || isIngesting) return;
    setIsIngesting(true);
    
    try {
      // If it's a URL, add to queue first
      if (activeType === 'url') {
        const res = await fetch('/api/brain/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input, type: 'url' })
        });
        if (res.ok) {
          fetchQueue();
          setInput('');
          setIsIngesting(false);
          return;
        }
      }

      // Quick note: Direct ingest
      const res = await fetch('/api/brain/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          content: input,
          bulkMode
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Ingestion failed');
      } else {
        fetchMemories();
        setInput('');
      }
    } catch (e: any) {
      alert("Failed to reach ingestion API.");
    }
    
    setIsIngesting(false);
  };

  const handleVectorize = async (id: string) => {
    setIsIngesting(true);
    try {
      const res = await fetch('/api/brain/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: id })
      });
      const data = await res.json();
      if (data.success) {
        fetchQueue();
        fetchMemories();
      } else {
        alert(data.errors?.[0] || 'Vectorization failed');
      }
    } catch (e) {
      alert("Vectorization error.");
    }
    setIsIngesting(false);
  };

  const handleDeleteQueue = async (id: string) => {
    await fetch('/api/brain/queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchQueue();
  };

  const handleDeleteMemory = async (id: string) => {
    if (!supabase || !confirm('Are you sure you want to delete this memory?')) return;
    
    // Optimistic Update
    setFacts(prev => prev.filter(f => f.id !== id));
    
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) {
      alert('Failed to delete memory: ' + error.message);
      fetchMemories();
    }
  };

  const handleStartEdit = (fact: any) => {
    setEditingId(fact.id);
    setEditingText(fact.text);
  };

  const handleUpdateMemory = async () => {
    if (!supabase || !editingId) return;
    
    const { error } = await supabase.from('memories').update({ fact: editingText }).eq('id', editingId);
    if (error) {
      alert('Failed to update memory: ' + error.message);
    } else {
      setFacts(prev => prev.map(f => f.id === editingId ? { ...f, text: editingText } : f));
      setEditingId(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsIngesting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/brain/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        fetchMemories();
        // alert(`Successfully ingested ${data.savedCount} facts from ${file.name}`);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (e) {
      alert("Upload error.");
    }
    setIsIngesting(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const filteredFacts = facts.filter(f =>
    f.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryCounts: Record<string, number> = {};
  facts.forEach(f => {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
  });

  return (
    <>
      <div className="page-header">
        <h1><BrainIcon size={24} /> Second Brain</h1>
        <p>Your agent&apos;s knowledge base — stored memories and learned facts</p>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">Stored Facts</div>
          <div className="stat-value">{facts.length}</div>
          <div className="stat-badge blue"><Database size={11} /> in memory</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Categories</div>
          <div className="stat-value">{Object.keys(categoryCounts).length}</div>
          <div className="stat-badge orange"><Tag size={11} /> types</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Queued Items</div>
          <div className="stat-value">{queuedItems.length}</div>
          <div className="stat-badge green"><Clock size={11} /> pending</div>
        </div>
      </div>

      {/* ── Type Selector ── */}
      <div className="type-tabs">
        <button
          className={`type-tab${activeType === 'note' ? ' active-note' : ''}`}
          onClick={() => setActiveType('note')}
        >
          <StickyNote size={15} /> Quick Note
        </button>
        <button
          className={`type-tab${activeType === 'url' ? ' active-url' : ''}`}
          onClick={() => setActiveType('url')}
        >
          <Link2 size={15} /> URL
        </button>
        <button
          className={`type-tab${activeType === 'file' ? ' active-file' : ''}`}
          onClick={() => setActiveType('file')}
        >
          <Upload size={15} /> File Upload
        </button>
      </div>

      {/* ── Input Area ── */}
      {activeType !== 'file' ? (
        <div className="card" style={{ marginBottom: '20px', animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {bulkMode ? 'Bulk Add (one item per line)' : activeType === 'url' ? 'Paste a URL' : 'Type a note'}
            </label>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setBulkMode(!bulkMode)}
              style={{ fontSize: '0.72rem' }}
            >
              {bulkMode ? 'Single Mode' : 'Bulk Mode'}
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              bulkMode
                ? 'Paste multiple items, one per line...\nhttps://example.com\nA fact about the user\nhttps://another-url.com'
                : activeType === 'url'
                ? 'https://example.com/video-to-ingest'
                : 'Something worth remembering...'
            }
            style={{ width: '100%', minHeight: bulkMode ? '120px' : '70px' }}
          />
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={isIngesting}>
              {isIngesting ? 'Ingesting...' : <><Plus size={14} /> {activeType === 'url' ? 'Add to Queue' : 'Add to Brain'}</>}
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`drop-zone${dragOver ? ' dragover' : ''}`}
          style={{ marginBottom: '20px', cursor: 'pointer' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            accept=".pdf,.txt,.md,.json"
          />
          <Upload size={32} style={{ marginBottom: '8px', color: dragOver ? 'var(--accent-blue)' : 'inherit' }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            {isIngesting ? 'Ingesting File...' : 'Drop files here or click to upload'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            PDF, TXT, MD, JSON — Max 10MB
          </div>
        </div>
      )}

      {/* ── Ingestion Queue (NEW) ── */}
      {queuedItems.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--accent-green)' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} /> Pending Ingestion
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {queuedItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.url}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Added {new Date(item.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => handleVectorize(item.id)}
                    disabled={isIngesting}
                    style={{ background: 'var(--accent-green)', borderColor: 'var(--accent-green)', padding: '4px 12px', fontSize: '0.75rem' }}
                  >
                    {isIngesting ? 'Vectorizing...' : 'Vectorize one item'}
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => handleDeleteQueue(item.id)}
                    style={{ color: '#ff4444' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ── Memory Cards ── */}
      <div className="memory-grid">
        {filteredFacts.map((fact, i) => (
          <div key={fact.id} className="memory-card" style={{ animationDelay: `${i * 0.04}s`, position: 'relative' }}>
            {editingId === fact.id ? (
              <div className="edit-mode">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  style={{ width: '100%', minHeight: '80px', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}><X size={14} /></button>
                  <button className="btn btn-primary btn-sm" onClick={handleUpdateMemory}><Check size={14} /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="memory-actions">
                  <button onClick={() => handleStartEdit(fact)} title="Edit"><Edit3 size={13} /></button>
                  <button onClick={() => handleDeleteMemory(fact.id)} title="Delete"><Trash2 size={13} /></button>
                </div>
                <div className="memory-text">{fact.text}</div>
                <div className="memory-footer">
                  <span className={`category-tag ${fact.category}`}>{fact.category}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fact.time}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
