import React, { useState, useRef, useCallback, useEffect } from 'react';

// Mock data for agents and artifacts
const initialAgents = [
  { id: 'agent-1', type: 'agent', name: 'Researcher', status: 'working', x: 120, y: 180, zone: 'zone-1', creativity: 0.3, density: 0.7 },
  { id: 'agent-2', type: 'agent', name: 'Analyst', status: 'idle', x: 380, y: 160, zone: 'zone-1', creativity: 0.2, density: 0.8 },
  { id: 'agent-3', type: 'agent', name: 'Writer', status: 'idle', x: 620, y: 200, zone: null, creativity: 0.7, density: 0.5 },
];

const initialArtifacts = [
  { id: 'artifact-1', type: 'artifact', name: 'trends_data.json', parentAgent: 'agent-1', x: 250, y: 320 },
];

const initialZones = [
  { id: 'zone-1', name: 'Research Team', x: 60, y: 100, width: 400, height: 200 },
];

const initialConnections = [
  { from: 'agent-1', to: 'artifact-1' },
  { from: 'artifact-1', to: 'agent-2' },
];

// Streaming log messages
const mockLogs = [
  { type: 'system', text: 'Initializing Research Agent...' },
  { type: 'thought', text: 'Analyzing query parameters for crypto market data...' },
  { type: 'tool', text: '→ Executing: web_search("crypto market trends 2024")' },
  { type: 'thought', text: 'Found 47 relevant sources. Filtering by relevance score...' },
  { type: 'tool', text: '→ Executing: extract_data(sources, schema="market_analysis")' },
  { type: 'output', text: 'Generated structured dataset with 156 entries' },
  { type: 'system', text: 'Spawning artifact: trends_data.json' },
];

export default function AgentSynapse() {
  const [agents, setAgents] = useState(initialAgents);
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [zones, setZones] = useState(initialZones);
  const [connections] = useState(initialConnections);
  const [selectedNode, setSelectedNode] = useState(null);
  const [commandInput, setCommandInput] = useState('');
  const [bottomTab, setBottomTab] = useState('stream');
  const [bottomExpanded, setBottomExpanded] = useState(true);
  const [logs, setLogs] = useState(mockLogs.slice(0, 3));
  const [xyPosition, setXyPosition] = useState({ x: 0.3, y: 0.7 });
  const [draggingNode, setDraggingNode] = useState(null);
  const canvasRef = useRef(null);
  const xyPadRef = useRef(null);

  // Simulate streaming logs
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => {
        if (prev.length < mockLogs.length) {
          return [...prev, mockLogs[prev.length]];
        }
        return prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update agent pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        pulse: agent.status === 'working' ? !agent.pulse : false
      })));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (node.type === 'agent') {
      setXyPosition({ x: node.density, y: 1 - node.creativity });
    }
  };

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
    }
  };

  const handleXYPadMove = (e) => {
    if (!xyPadRef.current) return;
    const rect = xyPadRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setXyPosition({ x, y });
    
    if (selectedNode?.type === 'agent') {
      setAgents(prev => prev.map(agent => 
        agent.id === selectedNode.id 
          ? { ...agent, density: x, creativity: 1 - y }
          : agent
      ));
    }
  };

  const handleNodeDrag = (e, nodeId, nodeType) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 40;
    const y = e.clientY - rect.top - 40;
    
    if (nodeType === 'agent') {
      setAgents(prev => prev.map(agent => 
        agent.id === nodeId ? { ...agent, x, y } : agent
      ));
    } else {
      setArtifacts(prev => prev.map(artifact => 
        artifact.id === nodeId ? { ...artifact, x, y } : artifact
      ));
    }
  };

  const getNodePosition = (nodeId) => {
    const agent = agents.find(a => a.id === nodeId);
    if (agent) return { x: agent.x + 40, y: agent.y + 40 };
    const artifact = artifacts.find(a => a.id === nodeId);
    if (artifact) return { x: artifact.x + 30, y: artifact.y + 20 };
    return { x: 0, y: 0 };
  };

  const selectedAgent = selectedNode?.type === 'agent' ? agents.find(a => a.id === selectedNode.id) : null;
  const selectedArtifact = selectedNode?.type === 'artifact' ? artifacts.find(a => a.id === selectedNode.id) : null;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%)',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      color: '#e4e4e7',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        height: '56px',
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
              <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <span style={{
            fontSize: '18px',
            fontWeight: '600',
            background: 'linear-gradient(90deg, #e4e4e7 0%, #a1a1aa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>Agent Synapse</span>
        </div>
        
        <div style={{ flex: 1 }} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '12px',
          color: '#71717a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span>3 Agents Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#6366f1' }}>$0.047</span>
            <span>spent</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Panel - Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(99, 102, 241, 0.15)' }}>
          
          {/* Canvas Area */}
          <div 
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              flex: bottomExpanded ? 0.65 : 1,
              position: 'relative',
              background: `
                radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 60%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
                linear-gradient(180deg, rgba(10, 10, 15, 0) 0%, rgba(10, 10, 15, 0.5) 100%)
              `,
              overflow: 'hidden',
            }}
          >
            {/* Grid Pattern */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.3 }}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Zones (Membranes) */}
            {zones.map(zone => (
              <div
                key={zone.id}
                style={{
                  position: 'absolute',
                  left: zone.x,
                  top: zone.y,
                  width: zone.width,
                  height: zone.height,
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'inset 0 0 60px rgba(99, 102, 241, 0.05)',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '20px',
                  padding: '4px 12px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#a5b4fc',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {zone.name}
                </div>
              </div>
            ))}

            {/* Connections */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {connections.map((conn, i) => {
                const from = getNodePosition(conn.from);
                const to = getNodePosition(conn.to);
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2 - 30;
                return (
                  <g key={i}>
                    <path
                      d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                      fill="none"
                      stroke="url(#connectionGradient)"
                      strokeWidth="2"
                      filter="url(#glow)"
                      strokeDasharray="8 4"
                      style={{
                        animation: 'dash 1s linear infinite',
                      }}
                    />
                    {/* Data particles */}
                    <circle r="4" fill="#8b5cf6" filter="url(#glow)">
                      <animateMotion
                        dur="2s"
                        repeatCount="indefinite"
                        path={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                      />
                    </circle>
                  </g>
                );
              })}
            </svg>

            {/* Agent Nodes */}
            {agents.map(agent => (
              <div
                key={agent.id}
                onClick={(e) => { e.stopPropagation(); handleNodeClick({ ...agent, type: 'agent' }); }}
                draggable
                onDrag={(e) => e.clientX && handleNodeDrag(e, agent.id, 'agent')}
                style={{
                  position: 'absolute',
                  left: agent.x,
                  top: agent.y,
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: selectedNode?.id === agent.id 
                    ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                  border: `2px solid ${selectedNode?.id === agent.id ? '#818cf8' : 'rgba(99, 102, 241, 0.4)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: agent.status === 'working' 
                    ? `0 0 ${agent.pulse ? '30px' : '20px'} rgba(99, 102, 241, ${agent.pulse ? 0.6 : 0.4})`
                    : '0 4px 20px rgba(0, 0, 0, 0.3)',
                  transform: selectedNode?.id === agent.id ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {/* Status indicator */}
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: agent.status === 'working' ? '#f59e0b' : '#22c55e',
                  boxShadow: `0 0 8px ${agent.status === 'working' ? '#f59e0b' : '#22c55e'}`,
                  animation: agent.status === 'working' ? 'pulse 1s ease-in-out infinite' : 'none',
                }} />
                
                {/* Icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e4e4e7" strokeWidth="1.5">
                  {agent.name === 'Researcher' && (
                    <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>
                  )}
                  {agent.name === 'Analyst' && (
                    <><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></>
                  )}
                  {agent.name === 'Writer' && (
                    <><path d="M12 19l7-7 3 3-7 7H12v-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></>
                  )}
                </svg>
                
                {/* Name */}
                <span style={{
                  fontSize: '9px',
                  fontWeight: '600',
                  marginTop: '4px',
                  color: '#c7d2fe',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {agent.name}
                </span>
              </div>
            ))}

            {/* Artifact Nodes */}
            {artifacts.map(artifact => (
              <div
                key={artifact.id}
                onClick={(e) => { e.stopPropagation(); handleNodeClick({ ...artifact, type: 'artifact' }); }}
                draggable
                onDrag={(e) => e.clientX && handleNodeDrag(e, artifact.id, 'artifact')}
                style={{
                  position: 'absolute',
                  left: artifact.x,
                  top: artifact.y,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: selectedNode?.id === artifact.id 
                    ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)'
                    : 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                  border: `1px solid ${selectedNode?.id === artifact.id ? '#34d399' : 'rgba(52, 211, 153, 0.4)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transform: selectedNode?.id === artifact.id ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#a7f3d0',
                }}>
                  {artifact.name}
                </span>
              </div>
            ))}

            {/* Command Palette */}
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '500px',
              background: 'rgba(15, 15, 20, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)',
              padding: '4px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>
                </svg>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Describe your agent team... (e.g., 'Research crypto trends and write a report')"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e4e4e7',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
                <kbd style={{
                  padding: '4px 8px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#a5b4fc',
                }}>⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Bottom Panel - Console */}
          {bottomExpanded && (
            <div style={{
              flex: 0.35,
              borderTop: '1px solid rgba(99, 102, 241, 0.2)',
              background: 'rgba(5, 5, 10, 0.8)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Tabs */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
                padding: '0 16px',
              }}>
                {['stream', 'context', 'preview'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setBottomTab(tab)}
                    style={{
                      padding: '12px 20px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: bottomTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                      color: bottomTab === tab ? '#e4e4e7' : '#71717a',
                      fontSize: '12px',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tab === 'stream' && '◉ Live Stream'}
                    {tab === 'context' && '◈ Context'}
                    {tab === 'preview' && '◇ Preview'}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setBottomExpanded(false)}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 15l-6-6-6 6"/>
                  </svg>
                </button>
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {bottomTab === 'stream' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {logs.map((log, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: log.type === 'system' ? 'rgba(99, 102, 241, 0.1)' 
                            : log.type === 'thought' ? 'rgba(113, 113, 122, 0.1)'
                            : log.type === 'tool' ? 'rgba(59, 130, 246, 0.1)'
                            : 'rgba(34, 197, 94, 0.1)',
                          animation: i === logs.length - 1 ? 'fadeIn 0.3s ease' : 'none',
                        }}
                      >
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          color: log.type === 'system' ? '#818cf8' 
                            : log.type === 'thought' ? '#a1a1aa'
                            : log.type === 'tool' ? '#60a5fa'
                            : '#4ade80',
                          minWidth: '50px',
                        }}>
                          {log.type}
                        </span>
                        <span style={{ fontSize: '12px', color: '#d4d4d8', lineHeight: 1.5 }}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      color: '#6366f1',
                      fontSize: '12px',
                    }}>
                      <span style={{ animation: 'blink 1s infinite' }}>▊</span>
                      Awaiting next action...
                    </div>
                  </div>
                )}

                {bottomTab === 'context' && (
                  <div style={{
                    fontFamily: '"Fira Code", monospace',
                    fontSize: '11px',
                    lineHeight: 1.8,
                    color: '#a1a1aa',
                  }}>
                    <div style={{ color: '#6366f1', marginBottom: '12px' }}>
                      // System Prompt for: {selectedAgent?.name || 'No agent selected'}
                    </div>
                    <div style={{ color: '#22c55e' }}>
                      ROLE: "You are a {selectedAgent?.name?.toLowerCase() || 'specialized'} agent."
                    </div>
                    <div style={{ color: '#f59e0b', marginTop: '8px' }}>
                      CREATIVITY_WEIGHT: {selectedAgent ? selectedAgent.creativity.toFixed(2) : '0.50'}
                    </div>
                    <div style={{ color: '#f59e0b' }}>
                      DATA_DENSITY: {selectedAgent ? selectedAgent.density.toFixed(2) : '0.50'}
                    </div>
                    <div style={{ color: '#71717a', marginTop: '12px' }}>
                      {selectedAgent?.creativity > 0.7 
                        ? '→ "Be highly speculative and creative in your analysis."'
                        : selectedAgent?.creativity < 0.3
                        ? '→ "Stick strictly to proven facts and verified data."'
                        : '→ "Balance factual analysis with creative insights."'}
                    </div>
                  </div>
                )}

                {bottomTab === 'preview' && (
                  <div style={{
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.1)',
                  }}>
                    {selectedArtifact ? (
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '16px',
                          paddingBottom: '12px',
                          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                          <span style={{ fontWeight: '600', color: '#e4e4e7' }}>{selectedArtifact.name}</span>
                        </div>
                        <pre style={{
                          fontSize: '11px',
                          color: '#a1a1aa',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                        }}>
{`{
  "market_trends": [
    { "sector": "DeFi", "growth": "+47%", "risk": "high" },
    { "sector": "Layer2", "growth": "+89%", "risk": "medium" },
    { "sector": "NFT", "growth": "-12%", "risk": "high" }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "confidence": 0.87
}`}
                        </pre>
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        color: '#52525b',
                        padding: '40px',
                      }}>
                        Select an artifact to preview its contents
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsed bottom bar */}
          {!bottomExpanded && (
            <button
              onClick={() => setBottomExpanded(true)}
              style={{
                padding: '8px 16px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: 'none',
                borderTop: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#71717a',
                fontSize: '11px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
              Show Console
            </button>
          )}
        </div>

        {/* Right Panel - Inspector */}
        <aside style={{
          width: '320px',
          background: 'rgba(5, 5, 10, 0.6)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {selectedAgent ? (
            <>
              {/* Agent Header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{selectedAgent.name}</div>
                    <div style={{
                      fontSize: '11px',
                      color: selectedAgent.status === 'working' ? '#f59e0b' : '#22c55e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      ● {selectedAgent.status}
                    </div>
                  </div>
                </div>
              </div>

              {/* XY Pad - Kaoss Pad */}
              <div style={{ padding: '20px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#71717a',
                  marginBottom: '12px',
                }}>
                  Steering Control
                </div>
                
                <div style={{ position: 'relative' }}>
                  {/* Y-axis label */}
                  <div style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%) rotate(-90deg)',
                    fontSize: '9px',
                    color: '#52525b',
                    whiteSpace: 'nowrap',
                  }}>
                    CREATIVITY
                  </div>
                  
                  {/* X-axis label */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '9px',
                    color: '#52525b',
                  }}>
                    DATA DENSITY
                  </div>
                  
                  {/* The Pad */}
                  <div
                    ref={xyPadRef}
                    onMouseDown={(e) => {
                      handleXYPadMove(e);
                      const handleMove = (e) => handleXYPadMove(e);
                      const handleUp = () => {
                        window.removeEventListener('mousemove', handleMove);
                        window.removeEventListener('mouseup', handleUp);
                      };
                      window.addEventListener('mousemove', handleMove);
                      window.addEventListener('mouseup', handleUp);
                    }}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: `
                        linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(59, 130, 246, 0.3) 100%)
                      `,
                      borderRadius: '16px',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      position: 'relative',
                      cursor: 'crosshair',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Grid lines */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.3 }}>
                      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
                    </svg>
                    
                    {/* Corner labels */}
                    <span style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '8px', color: '#818cf8' }}>CREATIVE</span>
                    <span style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '8px', color: '#818cf8' }}>FACTUAL</span>
                    <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '8px', color: '#818cf8' }}>VERBOSE</span>
                    <span style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '8px', color: '#818cf8' }}>SUMMARY</span>
                    
                    {/* The Puck */}
                    <div style={{
                      position: 'absolute',
                      left: `${xyPosition.x * 100}%`,
                      top: `${xyPosition.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                      border: '3px solid #e4e4e7',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.3)',
                      transition: 'box-shadow 0.2s ease',
                    }} />
                  </div>
                </div>

                {/* XY Values */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginTop: '24px',
                }}>
                  <div style={{
                    padding: '12px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '10px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#a5b4fc' }}>
                      {Math.round((1 - xyPosition.y) * 100)}%
                    </div>
                    <div style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase' }}>
                      Creativity
                    </div>
                  </div>
                  <div style={{
                    padding: '12px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '10px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#a5b4fc' }}>
                      {Math.round(xyPosition.x * 100)}%
                    </div>
                    <div style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase' }}>
                      Density
                    </div>
                  </div>
                </div>
              </div>

              {/* Drift Sliders */}
              <div style={{ padding: '0 20px 20px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#71717a',
                  marginBottom: '12px',
                }}>
                  Constraints
                </div>
                
                {[
                  { label: 'Speed vs Cost', value: 65, color: '#f59e0b' },
                  { label: 'Safety Filters', value: 80, color: '#22c55e' },
                  { label: 'Recursion Depth', value: 40, color: '#6366f1' },
                ].map((slider, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      fontSize: '11px',
                    }}>
                      <span style={{ color: '#a1a1aa' }}>{slider.label}</span>
                      <span style={{ color: slider.color }}>{slider.value}%</span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: 'rgba(39, 39, 42, 0.8)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${slider.value}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${slider.color}88, ${slider.color})`,
                        borderRadius: '3px',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Vitals */}
              <div style={{
                marginTop: 'auto',
                padding: '20px',
                borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                background: 'rgba(0, 0, 0, 0.2)',
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#71717a',
                  marginBottom: '12px',
                }}>
                  Agent Vitals
                </div>
                
                {/* Context Gauge */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '11px',
                  }}>
                    <span style={{ color: '#a1a1aa' }}>Context Window</span>
                    <span style={{ color: '#22c55e' }}>12,000 / 128k</span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: 'rgba(39, 39, 42, 0.8)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: '9%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                      borderRadius: '4px',
                    }} />
                  </div>
                </div>

                {/* Cost */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                }}>
                  <span style={{ color: '#a1a1aa' }}>Session Cost</span>
                  <span style={{ color: '#6366f1', fontWeight: '600' }}>$0.023</span>
                </div>
              </div>

              {/* Tools */}
              <div style={{
                padding: '20px',
                borderTop: '1px solid rgba(99, 102, 241, 0.15)',
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#71717a',
                  marginBottom: '12px',
                }}>
                  Available Tools
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['Web Search', 'Python', 'File System'].map((tool, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '500',
                        color: '#a5b4fc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#22c55e',
                      }} />
                      {tool}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : selectedArtifact ? (
            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{selectedArtifact.name}</div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>JSON Document</div>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '8px' }}>Metadata</div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#71717a' }}>Created by:</span>{' '}
                  <span style={{ color: '#e4e4e7' }}>Researcher</span>
                </div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#71717a' }}>Size:</span>{' '}
                  <span style={{ color: '#e4e4e7' }}>2.4 KB</span>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: '#71717a' }}>Tokens:</span>{' '}
                  <span style={{ color: '#e4e4e7' }}>847</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}>
                  Download
                </button>
                <button style={{
                  padding: '12px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '10px',
                  color: '#a5b4fc',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}>
                  Send to Human
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              color: '#52525b',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>No Selection</div>
              <div style={{ fontSize: '11px', lineHeight: 1.5 }}>
                Click on an agent or artifact on the canvas to inspect and control it
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes dash {
          to { stroke-dashoffset: -12; }
        }
      `}</style>
    </div>
  );
}
