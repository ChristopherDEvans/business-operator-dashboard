'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Zap,
  Flame,
  Target,
  TrendingUp,
  Plus,
  X,
  Check,
  StickyNote,
  Footprints,
  Activity,
  ArrowDownCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import DigitalClock from '@/components/DigitalClock';


/* ── Motivational Messages ── */
const MOTIVATION = [
  "Day 1 energy. Let's build something that matters. 🔥",
  "You're in the foundation phase. Consistency > intensity.",
  "Small wins compound. Keep stacking bricks. 🧱",
  "Every habit you track is a vote for who you want to become.",
  "You're past the hardest part — starting. Now sustain it.",
  "The Growth phase demands you level up. Are you ready? ⚡",
  "Momentum is your friend. Don't let go.",
  "You didn't come this far to only come this far.",
  "The Scale phase — where everything clicks. Push through. 🚀",
  "Almost there. Finish what you started. No excuses.",
];

function getMotivation(progress: number): string {
  const idx = Math.min(Math.floor(progress / 10), MOTIVATION.length - 1);
  return MOTIVATION[idx];
}

function getLocalStorageItem(key: string, defaultValue: string): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key) || defaultValue;
  }
  return defaultValue;
}

function getCurrentDay(): number {
  const startStr = getLocalStorageItem('habit_start_date', '2026-03-01');
  const start = new Date(startStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(diff, 89));
}

function getCellDate(index: number): string {
  const startStr = getLocalStorageItem('habit_start_date', '2026-03-01');
  const start = new Date(startStr);
  const d = new Date(start);
  d.setDate(d.getDate() + index);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPhase(day: number): string {
  if (day < 30) return 'Foundation';
  if (day < 60) return 'Growth';
  return 'Scale';
}

function getStreak(completed: boolean[]): number {
  let streak = 0;
  for (let i = completed.length - 1; i >= 0; i--) {
    if (completed[i]) streak++;
    else break;
  }
  return streak;
}

export default function Productivity() {
  const [loaded, setLoaded] = useState(false);
  const [completed, setCompleted] = useState<boolean[]>(Array(90).fill(false));
  const [todos, setTodos] = useState<{ text: string; done: boolean }[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [notes, setNotes] = useState({ goals: '', reflections: '', ideas: '' });
  
  // Health State
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([]);
  const [steps, setSteps] = useState<{ date: string; count: number }[]>([]);
  const [bodyFat, setBodyFat] = useState<{ date: string; percentage: number }[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');

  const currentDay = getCurrentDay();
  const daysCompleted = completed.filter(Boolean).length;
  const streak = getStreak(completed.slice(0, currentDay + 1));
  const progress = Math.round((daysCompleted / 90) * 100);
  const phase = getPhase(currentDay);
  
  const startDate = new Date(getLocalStorageItem('habit_start_date', '2026-03-01'));
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 89);
  const daysRemaining = 89 - currentDay;

  // Load from Supabase on Mount
  useEffect(() => {
    let isMounted = true;
    if (!supabase) { setLoaded(true); return; }

    const fetchData = async () => {
      if (!supabase) return;
      // Fetch scratch notes array
      const { data: noteData } = await supabase.from('scratch_notes').select('*');
      if (!isMounted) return;
      
      if (noteData) {
        noteData.forEach(row => {
           try {
             if (row.key === 'habits_array') setCompleted(JSON.parse(row.content));
             if (row.key === 'todos_array') setTodos(JSON.parse(row.content));
             if (row.key === 'notes_obj') setNotes(JSON.parse(row.content));
           } catch(e) {}
        });
      }

      // Fetch health metrics
      const { data: weightData } = await supabase.from('weight_logs').select('*').order('date', { ascending: false });
      const { data: stepsData } = await supabase.from('steps_logs').select('*').order('date', { ascending: false });
      const { data: bfData } = await supabase.from('body_fat_logs').select('*').order('date', { ascending: false });
      
      if (isMounted) {
        if (weightData) setWeights(weightData);
        if (stepsData) setSteps(stepsData);
        if (bfData) setBodyFat(bfData);
      }
      
      if (isMounted) setLoaded(true);
    };

    fetchData();

    // Subscribe to backend weight scale inputs from Gravity Claw
    if (!supabase) return;
    const healthSub = supabase.channel('health_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weight_logs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'steps_logs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'body_fat_logs' }, () => fetchData())
      .subscribe();

    return () => { isMounted = false; supabase?.removeChannel(healthSub); };
  }, []);

  // Sync helpers with debouncing so we don't spam the DB
  const saveToDb = async (key: string, data: any) => {
    if (!supabase) return;
    await supabase.from('scratch_notes').upsert({ key, content: JSON.stringify(data) });
  };

  useEffect(() => { if (loaded) { const t = setTimeout(() => saveToDb('habits_array', completed), 500); return () => clearTimeout(t); } }, [completed, loaded]);
  useEffect(() => { if (loaded) { const t = setTimeout(() => saveToDb('todos_array', todos), 500); return () => clearTimeout(t); } }, [todos, loaded]);
  useEffect(() => { if (loaded) { const t = setTimeout(() => saveToDb('notes_obj', notes), 1500); return () => clearTimeout(t); } }, [notes, loaded]);

  const toggleDay = (i: number) => {
    if (i > currentDay) return;
    const next = [...completed];
    next[i] = !next[i];
    setCompleted(next);
  };

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    
    console.log('📝 Adding todo:', text);
    setTodos(prev => [...prev, { text, done: false }]);
    setNewTodo('');
  };

  const toggleTodo = (i: number) => {
    setTodos(prev => {
      const next = [...prev];
      if (next[i]) {
        next[i] = { ...next[i], done: !next[i].done };
      }
      return next;
    });
  };

  const deleteTodo = (i: number) => {
    setTodos(prev => prev.filter((_, idx) => idx !== i));
  };

  const addWeight = async () => {
    if (!newWeight || !supabase) return;
    const val = parseFloat(newWeight);
    if (isNaN(val)) return;
    const dt = new Date().toISOString().split('T')[0];
    const newEntry = { date: dt, weight: val };
    setWeights([newEntry, ...weights.filter(w => w.date !== dt)].sort((a,b) => b.date.localeCompare(a.date)));
    setNewWeight('');
    await supabase.from('weight_logs').upsert(newEntry);
  };

  const addSteps = async () => {
    if (!newSteps || !supabase) return;
    const val = parseInt(newSteps);
    if (isNaN(val)) return;
    const dt = new Date().toISOString().split('T')[0];
    const newEntry = { date: dt, count: val };
    setSteps([newEntry, ...steps.filter(s => s.date !== dt)].sort((a,b) => b.date.localeCompare(a.date)));
    setNewSteps('');
    await supabase.from('steps_logs').upsert(newEntry);
  };

  const addBodyFat = async () => {
    if (!newBodyFat || !supabase) return;
    const val = parseFloat(newBodyFat);
    if (isNaN(val)) return;
    const dt = new Date().toISOString().split('T')[0];
    const newEntry = { date: dt, percentage: val };
    setBodyFat([newEntry, ...bodyFat.filter(b => b.date !== dt)].sort((a,b) => b.date.localeCompare(a.date)));
    setNewBodyFat('');
    await supabase.from('body_fat_logs').upsert(newEntry);
  };

  // Helper for trend chart
  const renderTrendChart = (data: any[], key: string, color: string, minPadding = 5) => {
    if (data.length === 0) return null;
    const sorted = [...data].sort((a,b) => a.date.localeCompare(b.date)).slice(-14);
    const vals = sorted.map(x => x[key]);
    const min = Math.min(...vals) - minPadding;
    const max = Math.max(...vals) + minPadding;
    
    return (
      <div style={{ 
        height: '80px', display: 'flex', alignItems: 'flex-end', gap: '4px', 
        marginBottom: '16px', background: 'rgba(255,255,255,0.02)', 
        padding: '12px 10px 0', borderRadius: '12px', overflow: 'hidden'
      }}>
        {sorted.map((d, i) => {
          const percentage = Math.max(10, ((d[key] - min) / (max - min)) * 100);
          return (
            <div 
              key={d.date} 
              title={`${d.date}: ${d[key]}`} 
              style={{ 
                flex: 1, backgroundColor: color, height: `${percentage}%`, 
                borderRadius: '4px 4px 0 0', opacity: i === sorted.length - 1 ? 1 : 0.4,
                transition: 'height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }} 
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1><Zap size={24} /> Productivity</h1>
          <p>Track habits, manage tasks, and stay accountable</p>
        </div>
        <DigitalClock />
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-label">Days Completed</div>
          <div className="stat-value">{daysCompleted}</div>
          <div className="stat-badge green">of 90 days</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Current Streak</div>
          <div className="stat-value">{streak}</div>
          <div className="stat-badge orange"><Flame size={11} /> days</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Current Phase</div>
          <div className="stat-value">{phase}</div>
          <div className="stat-badge blue"><Target size={11} /> {getCellDate(currentDay)}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Progress</div>
          <div className="stat-value">{progress}%</div>
          <div className="stat-badge green"><TrendingUp size={11} /> on track</div>
        </div>
      </div>

      {/* ── Motivation Banner ── */}
      <div className="motivation-banner">
        {getMotivation(progress)}
      </div>

      {/* ── Habit Tracker ── */}
      <div className="card" style={{ marginBottom: '20px', animationDelay: '0.3s' }}>
        <div className="card-header">
          <h2><Flame size={16} /> 90-Day Challenge Cockpit</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="card-badge" style={{ background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-blue)' }}>
               {daysRemaining} Days Left
            </span>
            <span className="card-badge">Ends {endDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
        <div className="habit-grid">
          {completed.map((done, i) => (
            <div
              key={i}
              className={`habit-cell${done ? ' completed' : ''}${i === currentDay ? ' today pulsating' : ''}${i > currentDay ? ' future' : ''}`}
              onClick={() => toggleDay(i)}
              title={`${getCellDate(i)}${i === currentDay ? ' (Today - Day ' + (i + 1) + ')' : ' (Day ' + (i + 1) + ')'}`}
            />
          ))}
        </div>
        <div className="habit-phases">
          <span>🏗️ Foundation (1–30)</span>
          <span>📈 Growth (31–60)</span>
          <span>🚀 Scale (61–90)</span>
        </div>
      </div>

      {/* ── Todos, Notes, and Weights ── */}
      <div className="sections-grid">
        {/* Quick Todos */}
        <div className="card" style={{ animationDelay: '0.4s' }}>
          <div className="card-header">
            <h2><Check size={16} /> Quick Todos</h2>
            <span className="card-badge">{todos.filter(t => !t.done).length} open</span>
          </div>
          {todos.map((t, i) => (
            <div key={i} className="todo-item">
              <div
                className={`todo-checkbox${t.done ? ' checked' : ''}`}
                onClick={() => toggleTodo(i)}
              >
                {t.done && <Check size={12} />}
              </div>
              <span className={`todo-text${t.done ? ' completed' : ''}`}>{t.text}</span>
              <button className="todo-delete" onClick={() => deleteTodo(i)}>
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="add-todo">
            <input
              placeholder="Add a task..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            />
            <button className="btn btn-primary btn-sm" onClick={addTodo}>
              <Plus size={14} />
            </button>
          </div>

          {/* Health Cockpit */}
          <div className="card" style={{ marginTop: '2rem', animationDelay: '0.45s', border: '1px solid var(--border-strong)' }}>
            <div className="card-header">
              <h2><Activity size={16} /> Health Cockpit</h2>
              <span className="card-badge">Daily Sync</span>
            </div>

            {/* Steps Section */}
            <div style={{ marginBottom: '24px' }}>
              <div className="card-header" style={{ marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><Footprints size={14} /> Daily Steps</h3>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                  {steps[0]?.count?.toLocaleString() || 0} / 20,000
                </span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'var(--bg-elevated)', borderRadius: '20px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ 
                  width: `${Math.min(100, ((steps[0]?.count || 0) / 20000) * 100)}%`, 
                  height: '100%', 
                  background: 'var(--grad-nebula)', 
                  transition: 'width 1s ease-in-out',
                  boxShadow: '0 0 15px rgba(0, 212, 255, 0.4)'
                }} />
              </div>
              {renderTrendChart(steps, 'count', 'var(--accent-blue)', 1000)}
            </div>

            {/* Weight Section */}
            <div style={{ marginBottom: '24px' }}>
              <div className="card-header" style={{ marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><TrendingUp size={14} /> Weight (lbs)</h3>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{weights[0]?.weight || '--'}</span>
              </div>
              {renderTrendChart(weights, 'weight', 'var(--accent-violet)')}
            </div>

            {/* Body Fat Section */}
            <div style={{ marginBottom: '24px' }}>
              <div className="card-header" style={{ marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><ArrowDownCircle size={14} /> Body Fat %</h3>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FF00A8' }}>{bodyFat[0]?.percentage || '--'}%</span>
              </div>
              {renderTrendChart(bodyFat, 'percentage', '#FF00A8', 1)}
            </div>

            {/* Quick Logs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div className="add-todo">
                <input type="number" placeholder="Steps..." value={newSteps} onChange={(e) => setNewSteps(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSteps()} />
                <button className="btn btn-primary btn-sm" onClick={addSteps}><Plus size={14} /></button>
              </div>
              <div className="add-todo">
                <input type="number" step="0.1" placeholder="Weight..." value={newWeight} onChange={(e) => setNewWeight(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addWeight()} />
                <button className="btn btn-primary btn-sm" onClick={addWeight}><Plus size={14} /></button>
              </div>
              <div className="add-todo">
                <input type="number" step="0.1" placeholder="Fat %..." value={newBodyFat} onChange={(e) => setNewBodyFat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBodyFat()} />
                <button className="btn btn-primary btn-sm" onClick={addBodyFat}><Plus size={14} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card" style={{ animationDelay: '0.45s' }}>
          <div className="card-header">
            <h2><StickyNote size={16} /> Notes</h2>
          </div>
          <div className="note-block">
            <label>🎯 Goals</label>
            <textarea
              value={notes.goals}
              onChange={(e) => setNotes({ ...notes, goals: e.target.value })}
              placeholder="What are you working towards?"
            />
          </div>
          <div className="note-block">
            <label>💭 Reflections</label>
            <textarea
              value={notes.reflections}
              onChange={(e) => setNotes({ ...notes, reflections: e.target.value })}
              placeholder="What went well? What didn't?"
            />
          </div>
          <div className="note-block">
            <label>💡 Ideas</label>
            <textarea
              value={notes.ideas}
              onChange={(e) => setNotes({ ...notes, ideas: e.target.value })}
              placeholder="Capture ideas before they disappear..."
            />
          </div>
        </div>
      </div>
    </>
  );
}
