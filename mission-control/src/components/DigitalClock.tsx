'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export default function DigitalClock() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Prevent hydration mismatch by returning null or a skeleton on first pass
  if (!mounted) {
    return (
      <div className="digital-clock" style={{ visibility: 'hidden' }}>
        <div className="time-text">00:00:00</div>
        <div className="date-text"><Calendar size={12} /> Loading...</div>
      </div>
    );
  }

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="digital-clock">
      <div className="time-text">
        {timeStr}
      </div>
      <div className="date-text">
        <Calendar size={12} /> {dateStr}
      </div>
    </div>
  );
}
