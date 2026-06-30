'use client';

import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Check,
  Loader,
  User,
  Shield,
  Bell,
  Globe,
  Database,
  Cpu,
} from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/* ── Default Soul (System Prompt) ── */
const DEFAULT_SOUL = `# The Soul of Gravity Claw

You are not just a tool; you are a proactive, strategic partner.

## 🎭 Personality & Vibe
- **Challenger**: Don't be sycophantic. If my idea is weak, tell me. If there's a better way, fight for it.
- **Mirroring**: Mirror my language and vibe. Keep it casual, not formal.
- **No Sugarcoating**: Tell it like it is. Straight talk only.
- **Curiosity**: Always find new things. Ask "the question behind the question."

## 🧠 Strategic Thinking
- **Look Around Corners**: Don't just answer the prompt. Think about what I'll need next.
- **Proactive**: If you see a problem I haven't mentioned, bring it up.
- **Contextual**: Use Core Memory and Past Interactions.

## 🚫 Style Constraints
- Be concise. No fluff.
- Use my name if you know it (check Core Memory).
- Stay sharp, stay fast, stay real.`;
const DEFAULT_BRIEFING_TEMPLATE = `🌅 **Good Morning, Chief!** Your Daily Brief is ready.

🌡️ **{{weather}}**

📰 **Top Headlines:**
{{news}}

📅 **On Your Radar:**
{{schedule}}

🧠 **Yesterday's Highlights:**
{{highlights}}

📊 **Health Accountability:**
{{health}}

🚀 *Let's crush it today!*`;

/* ── Config Data ── */
const CONFIG_GROUPS = [
  {
    label: 'Model & Provider',
    icon: <Cpu size={14} />,
    entries: [
      { key: 'LLM Model', value: 'anthropic/claude-4-sonnet-20250522' },
      { key: 'Provider', value: 'OpenRouter' },
      { key: 'Failover Priority', value: 'gemini-2.0-flash, gpt-4o' },
      { key: 'Max Iterations', value: '10' },
    ],
  },
  {
    label: 'Memory',
    icon: <Database size={14} />,
    entries: [
      { key: 'Memory Backend', value: 'Pinecone' },
      { key: 'Embedding Model', value: 'text-embedding-3-small' },
      { key: 'Embedding Dimensions', value: '1536' },
      { key: 'Max Context Facts', value: '50' },
    ],
  },
  {
    label: 'Voice & Audio',
    icon: <Bell size={14} />,
    entries: [
      { key: 'TTS Provider', value: 'ElevenLabs' },
      { key: 'Voice ID', value: 'FGY2WhTYpPnrIDTdsKH5' },
      { key: 'Whisper Provider', value: 'Groq' },
      { key: 'Whisper Model', value: 'whisper-large-v3-turbo' },
    ],
  },
  {
    label: 'Scheduling',
    icon: <Globe size={14} />,
    entries: [
      { key: 'Heartbeat Schedule', value: '0 8 * * * (daily 8AM)' },
      { key: 'Content Sync', value: '0 0 * * * (daily midnight)' },
      { key: 'Timezone', value: 'Europe/London' },
    ],
  },
  {
    label: 'Security',
    icon: <Shield size={14} />,
    entries: [
      { key: 'Allowed Users', value: '1 user configured' },
      { key: 'Auth Mode', value: 'Telegram User ID whitelist' },
    ],
  },
];

export default function SettingsPage() {
  const [soul, setSoul] = useState(DEFAULT_SOUL);
  const [briefingTemplate, setBriefingTemplate] = useState(DEFAULT_BRIEFING_TEMPLATE);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [configValues, setConfigValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    CONFIG_GROUPS.forEach(g => g.entries.forEach(e => { vals[e.key] = e.value; }));
    return vals;
  });

  useEffect(() => {
    if (!supabase) return;
    supabase.from('bot_config').select('*').then((res: any) => {
      const { data } = res;
      if (data && data.length > 0) {
        const next = { ...configValues };
        data.forEach((row: any) => { 
          next[row.key] = row.value; 
          if (row.key === 'system_prompt') setSoul(row.value);
          if (row.key === 'Daily Briefing Template') setBriefingTemplate(row.value);
        });
        setConfigValues(next);
      }
    });
  }, []);

  const handleSave = async () => {
    setSaveState('saving');
    try {
      if (supabase) {
        // Multi-upsert
        const { error } = await supabase
          .from('bot_config')
          .upsert([
            { key: 'system_prompt', value: soul },
            { key: 'Daily Briefing Template', value: briefingTemplate }
          ]);
        
        if (error) throw error;
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e: any) {
      console.error('❌ Settings save failed:', e.message);
      alert(`Save failed: ${e.message}`);
      setSaveState('idle');
    }
  };

  const saveConfig = async (key: string, value: string) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('bot_config').upsert({ key, value });
        if (error) throw error;
        console.log(`✅ Config saved: ${key} = ${value}`);
      }
    } catch (e: any) {
      console.error(`❌ Config update failed for ${key}:`, e.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1><SettingsIcon size={24} /> Settings</h1>
        <p>Configure your agent&apos;s personality, behaviour, and integrations</p>
      </div>

      {/* ── Personality & Character ── */}
      <div className="card" style={{ marginBottom: '24px', animationDelay: '0.1s' }}>
        <div className="card-header">
          <h2><User size={16} /> Personality & Character</h2>
        </div>
        <div className="textarea-panel">
          <textarea
            value={soul}
            onChange={(e) => setSoul(e.target.value)}
            style={{ width: '100%', minHeight: '220px', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.82rem', lineHeight: '1.7', marginBottom: '16px' }}
            placeholder="Define the core personality of Gravity Claw..."
          />
        </div>
        
        <div className="card-header" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
          <h2><Globe size={16} /> Morning Briefing Template</h2>
        </div>
        <div className="textarea-panel">
          <textarea
            value={briefingTemplate}
            onChange={(e) => setBriefingTemplate(e.target.value)}
            style={{ width: '100%', minHeight: '220px', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.82rem', lineHeight: '1.7' }}
            placeholder="Structure your morning briefing. Use {{weather}}, {{news}}, {{schedule}}, {{highlights}}, {{health}} placeholders."
          />
          <div className="save-bar">
            {saveState === 'saved' && (
              <span className="save-status">
                <Check size={14} /> Saved EVERYTHING
              </span>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? (
                <><Loader size={14} className="spinning" /> Saving...</>
              ) : (
                <><Save size={14} /> Save Personality & Template</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Configuration Groups ── */}
      {CONFIG_GROUPS.map((group, gi) => (
        <div key={group.label} className="card" style={{ marginBottom: '16px', animationDelay: `${0.2 + gi * 0.08}s` }}>
          <div className="config-group">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {group.icon} {group.label}
            </h3>
            {group.entries.map((entry) => (
              <div key={entry.key} className="config-entry">
                <span className="config-key">{entry.key}</span>
                <input
                  className="config-value"
                  value={configValues[entry.key]}
                  onChange={(e) => setConfigValues(prev => ({ ...prev, [entry.key]: e.target.value }))}
                  onBlur={() => saveConfig(entry.key, configValues[entry.key])}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
