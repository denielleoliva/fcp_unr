import React from 'react';

export default function RangeControl({ label, value, onChange, min = 0, max = 1, step = .01, disabled = false, compact = false, format = v => `${Math.round(v * 100)}%` }) {
  const progress = Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
  return <label className={`range-control ${compact ? 'range-compact' : ''}`}>
    <span className="range-heading"><span>{label}</span><output aria-hidden="true">{format(value)}</output></span>
    <input type="range" aria-label={label} aria-valuetext={format(value)} min={min} max={max} step={step} value={value} disabled={disabled} style={{ '--range-progress': `${progress}%` }} onChange={e => onChange(Number(e.target.value))} />
    <span className="range-limits" aria-hidden="true"><span>{format(min)}</span><span>{format(max)}</span></span>
  </label>;
}
