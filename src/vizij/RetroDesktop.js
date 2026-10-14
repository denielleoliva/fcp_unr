import React, { useEffect, useState } from 'react';
import { Monitor, Pencil, HelpCircle, FolderOpen, Volume2 } from 'lucide-react';

export function RetroWindow({ title, icon = '▧', children, className = '' }) {
  const [collapsed, setCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!maximized) return;
    const escape = event => { if (event.key === 'Escape') setMaximized(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [maximized]);
  return <section className={`studio-panel retro-window ${className} ${maximized ? 'is-maximized' : ''}`}>
    <div className="retro-titlebar"><h3><span aria-hidden="true">{icon}</span>{title}</h3><div className="window-actions"><button aria-label={`${collapsed ? 'Restore' : 'Minimize'} ${title}`} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '▣' : '▁'}</button><button aria-label={`${maximized ? 'Restore size of' : 'Maximize'} ${title}`} aria-pressed={maximized} onClick={() => { setCollapsed(false); setMaximized(!maximized); }}>{maximized ? '❐' : '□'}</button></div></div>
    <div className="retro-window-body" hidden={collapsed}>{children}</div>
    {collapsed && <button className="restore-window" onClick={() => setCollapsed(false)}>Restore window</button>}
  </section>;
}
export default function RetroDesktop({ workspace, setWorkspace, children }) {
  const [startOpen, setStartOpen] = useState(false), [help, setHelp] = useState(false), [now, setNow] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(timer); }, []);
  useEffect(() => { const close = e => { if (e.key === 'Escape') { setStartOpen(false); setHelp(false); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  const go = page => { setWorkspace(page); setStartOpen(false); };
  return <div className="retro-desktop">
    <aside className="desktop-shortcuts" aria-label="Desktop shortcuts">
      <button onClick={() => go('vizij')}><span className="desktop-icon monitor-icon"><Monitor size={32} strokeWidth={1.5}/></span><span>My Face</span></button>
      <button onClick={() => go('drawing')}><span className="desktop-icon paint-icon"><Pencil size={32} strokeWidth={1.5}/></span><span>Paint</span></button>
      <button onClick={() => { go('vizij'); document.querySelector('.controls-panel')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="desktop-icon folder-icon"><FolderOpen size={34} strokeWidth={1.5}/></span><span>Face Exports</span></button>
      <button onClick={() => setHelp(true)}><span className="desktop-icon help-icon"><HelpCircle size={32} strokeWidth={1.5}/></span><span>Getting Started</span></button>
    </aside>
    <main className="desktop-workspace"><div className="desktop-heading"><h1>Face Studio <b>95</b></h1><span>A little drawing. A lot of personality.</span></div>{children}</main>
    {help && <div className="retro-dialog-backdrop"><section className="retro-dialog" role="dialog" aria-modal="true" aria-labelledby="retro-help-title"><div className="retro-titlebar"><h2 id="retro-help-title">Welcome to Face Studio</h2><button aria-label="Close help" onClick={() => setHelp(false)}>×</button></div><div className="help-content"><Monitor size={40}/><div><p><b>Your drawing, brought to life.</b></p><ol><li>Open Paint to draw, or upload a picture in My Face.</li><li>For a photograph of paper, enable Photo cleanup before importing.</li><li>Review the eye, brow, and mouth labels.</li><li>Build your face, try speaking, and export a Vizij GLB.</li></ol><p>Your edits stay in memory. Export before refreshing.</p></div></div><button className="help-ok" autoFocus onClick={() => setHelp(false)}>OK</button></section></div>}
    {startOpen && <><button className="start-dismiss" aria-label="Dismiss Start menu" onClick={() => setStartOpen(false)} /><nav className="start-menu" aria-label="Start menu"><div className="start-brand">Face Studio <b>95</b></div><div><button onClick={() => go('vizij')}><Monitor size={22}/> My Face</button><button onClick={() => go('drawing')}><Pencil size={22}/> Paint</button><hr/><button onClick={() => { setHelp(true); setStartOpen(false); }}><HelpCircle size={22}/> Getting Started</button></div></nav></>}
    <nav className="retro-taskbar" aria-label="Workspace"><button className="start-button" aria-expanded={startOpen} onClick={() => setStartOpen(!startOpen)}><span className="start-logo" aria-hidden="true"><i/><i/><i/><i/></span>Start</button><span className="taskbar-separator"/><button className="task-button" aria-pressed={workspace === 'vizij'} onClick={() => go('vizij')}><Monitor size={16}/>Drawing to Vizij</button><button className="task-button" aria-pressed={workspace === 'drawing'} onClick={() => go('drawing')}><Pencil size={16}/>Drawing canvas</button><div className="system-tray"><Volume2 size={16}/><time>{now.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</time></div></nav>
  </div>;
}
