'use client';

import { useState, useEffect } from 'react';
import {
  MonitorPlay,
  Eye,
  TrendingUp,
  BarChart3,
  Sparkles,
  ExternalLink,
  Youtube,
  Loader2,
} from 'lucide-react';

interface Video {
  title: string;
  link: string;
  published: string;
  videoId: string;
  thumbnail: string;
}

interface YouTuber {
  name: string;
  channelId: string;
  handle: string;
  videos: Video[];
}

function formatViews(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ContentIntel() {
  const [youtubers, setYoutubers] = useState<YouTuber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/youtube')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setYoutubers(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching YouTuber data:', err);
        setLoading(false);
      });
  }, []);

  const totalVideos = youtubers.reduce((sum, yt) => sum + yt.videos.length, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '20px' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-blue)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fetching latest intelligence...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1><MonitorPlay size={24} /> Content Intel</h1>
        <p>Tracking high-performance YouTubers for strategic insights</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">Channels Tracked</div>
          <div className="stat-value">{youtubers.length}</div>
          <div className="stat-badge blue">Competitor Set</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Recent Videos</div>
          <div className="stat-value">{totalVideos}</div>
          <div className="stat-badge green"><TrendingUp size={11} /> active tracking</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Intel Source</div>
          <div className="stat-value">YouTube</div>
          <div className="stat-badge orange"><Youtube size={11} /> RSS Feed</div>
        </div>
      </div>

      {/* ── YouTuber Sections ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {youtubers.map((yt, ytIdx) => (
          <div key={yt.channelId} className="youtuber-section fade-up-heavy" style={{ animationDelay: `${ytIdx * 0.1}s` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'var(--grad-nebula)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  {yt.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{yt.name}</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{yt.handle}</p>
                </div>
              </div>
              <a 
                href={`https://www.youtube.com/channel/${yt.channelId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '6px 16px', fontSize: '0.75rem' }}
              >
                View Channel <ExternalLink size={12} style={{ marginLeft: '6px' }} />
              </a>
            </div>

            <div className="content-grid">
              {yt.videos.map((video, i) => (
                <a
                  key={video.videoId}
                  href={video.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="content-item"
                  style={{ animationDelay: `${(ytIdx * 3 + i) * 0.06}s`, textDecoration: 'none', display: 'block' }}
                >
                  <div className="content-thumbnail">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span className="outlier-badge viral">
                      RECENT
                    </span>
                  </div>
                  <div className="content-info">
                    <h4 style={{ 
                      fontSize: '0.9rem', 
                      lineHeight: '1.4', 
                      height: '2.8rem', 
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {video.title}
                    </h4>
                    <div className="content-meta">
                      <span>{formatDate(video.published)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={11} color="var(--accent-blue)" /> Auto-Intel
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .youtuber-section {
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-lg);
          padding: 24px;
          border: 1px solid var(--border-subtle);
        }
        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .content-item {
          background: var(--bg-card);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: var(--transition-cinematic);
        }
        .content-item:hover {
          transform: translateY(-4px);
          border-color: var(--accent-blue);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .content-thumbnail {
          aspect-ratio: 16 / 9;
          position: relative;
          background: #000;
        }
        .outlier-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .outlier-badge.viral {
          background: var(--accent-blue);
          color: #000;
        }
        .content-info {
          padding: 16px;
        }
        .content-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
      `}</style>
    </>
  );
}
