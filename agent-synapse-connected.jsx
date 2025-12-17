import React, { useState, useRef, useCallback, useEffect } from 'react';

// Backend API URL
const API_BASE_URL = 'http://localhost:8000';

// Initial state (minimal for MVP - start with one agent)
const initialAgents = [
  { id: 'agent-1', type: 'agent', name: 'Analyst', status: 'idle', x: 400, y: 200, zone: null, creativity: 0.5, density: 0.5 }
];

export default function AgentSynapse() {
  // UI State
  const [agents, setAgents] = useState(initialAgents);
  const [artifacts, setArtifacts] = useState([]);
  const [zones, setZones] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(agents[0]); // Select first agent by default
  const [commandInput, setCommandInput] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [bottomTab, setBottomTab] = useState('context');
  const [bottomExpanded, setBottomExpanded] = useState(true);
  const [xyPosition, setXyPosition] = useState({ x: 0.5, y: 0.5 });

  // Backend State
  const [promptPreview, setPromptPreview] = useState(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [logs, setLogs] = useState([]);
  const [currentArtifactId, setCurrentArtifactId] = useState(null);
  const [tokenUsage, setTokenUsage] = useState(null);

  const canvasRef = useRef(null);
  const xyPadRef = useRef(null);
  const eventSourceRef = useRef(null);

  // 🔥 FEATURE 1: Fetch Prompt Preview when XY changes
  useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'agent') return;

    const fetchPromptPreview = async () => {
      setIsLoadingPrompt(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/prompt/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: queryInput || "Analyze the current situation",
            xy_position: { x: xyPosition.x, y: xyPosition.y },
            agent_role: "analyst"
          })
        });

        if (response.ok) {
          const data = await response.json();
          setPromptPreview(data);
        }
      } catch (error) {
        console.error('Failed to fetch prompt preview:', error);
      } finally {
        setIsLoadingPrompt(false);
      }
    };

    // Debounce the API call
    const timer = setTimeout(fetchPromptPreview, 300);
    return () => clearTimeout(timer);
  }, [xyPosition, queryInput, selectedNode]);

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

  // 🔥 FEATURE 2: GOD MODE - Generate Agent Config from Command
  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    try {
      setLogs(prev => [...prev, { type: 'system', text: `GOD MODE: "${commandInput}"` }]);

      const response = await fetch(`${API_BASE_URL}/api/v1/agent/generate-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: commandInput })
      });

      if (response.ok) {
        const config = await response.json();

        setLogs(prev => [...prev, {
          type: 'system',
          text: `Generated ${config.agents.length} agents: ${config.agents.map(a => a.name).join(', ')}`
        }]);

        // Spawn agents on canvas
        const newAgents = config.agents.map((agentConfig, i) => ({
          id: agentConfig.id,
          type: 'agent',
          name: agentConfig.name,
          status: 'idle',
          x: 200 + (i * 250),
          y: 200,
          zone: null,
          creativity: 1 - agentConfig.suggested_xy.y,
          density: agentConfig.suggested_xy.x
        }));

        setAgents(newAgents);
        setQueryInput(config.suggested_query);
        setSelectedNode(newAgents[0]);
        setCommandInput('');
      }
    } catch (error) {
      setLogs(prev => [...prev, { type: 'error', text: `Failed: ${error.message}` }]);
    }
  };

  // 🔥 FEATURE 3: Execute Agent with Streaming
  const handleExecute = async () => {
    if (!queryInput.trim() || !selectedNode || selectedNode.type !== 'agent') {
      alert('Please enter a query and select an agent');
      return;
    }

    setIsExecuting(true);
    setStreamedContent('');
    setLogs([]);
    setBottomTab('stream');
    setTokenUsage(null);
    setCurrentArtifactId(null);

    // Update agent status
    setAgents(prev => prev.map(agent =>
      agent.id === selectedNode.id ? { ...agent, status: 'working' } : agent
    ));

    try {
      // Step 1: Create execution
      const execResponse = await fetch(`${API_BASE_URL}/api/v1/agent/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryInput,
          xy_position: { x: xyPosition.x, y: xyPosition.y },
          agent_role: "analyst"
        })
      });

      if (!execResponse.ok) {
        throw new Error('Failed to create execution');
      }

      const execData = await execResponse.json();
      setExecutionId(execData.execution_id);

      setLogs(prev => [...prev, {
        type: 'system',
        text: `Execution started: ${execData.execution_id}`
      }]);

      // Step 2: Connect to SSE stream
      const eventSource = new EventSource(
        `${API_BASE_URL}/api/v1/agent/stream/${execData.execution_id}`
      );
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (event.lastEventId === 'token' || !event.lastEventId) {
          // Token event
          if (data.content) {
            setStreamedContent(prev => prev + data.content);
          }
        }
      };

      eventSource.addEventListener('token', (event) => {
        const data = JSON.parse(event.data);
        setStreamedContent(prev => prev + data.content);
      });

      eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data);

        setLogs(prev => [...prev, {
          type: 'system',
          text: `✓ Complete! Artifact: ${data.artifact_id}`
        }]);

        setTokenUsage(data.token_usage);
        setCurrentArtifactId(data.artifact_id);

        // Create artifact node
        const newArtifact = {
          id: data.artifact_id,
          type: 'artifact',
          name: `${data.artifact_id}.md`,
          parentAgent: selectedNode.id,
          x: selectedNode.x + 200,
          y: selectedNode.y + 100
        };
        setArtifacts(prev => [...prev, newArtifact]);

        // Update agent status
        setAgents(prev => prev.map(agent =>
          agent.id === selectedNode.id ? { ...agent, status: 'idle' } : agent
        ));

        setIsExecuting(false);
        eventSource.close();
      });

      eventSource.addEventListener('error', (event) => {
        const data = JSON.parse(event.data);
        setLogs(prev => [...prev, { type: 'error', text: `Error: ${data.error}` }]);
        setIsExecuting(false);
        setAgents(prev => prev.map(agent =>
          agent.id === selectedNode.id ? { ...agent, status: 'error' } : agent
        ));
        eventSource.close();
      });

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setLogs(prev => [...prev, { type: 'error', text: 'Stream connection lost' }]);
        setIsExecuting(false);
        setAgents(prev => prev.map(agent =>
          agent.id === selectedNode.id ? { ...agent, status: 'error' } : agent
        ));
        eventSource.close();
      };

    } catch (error) {
      setLogs(prev => [...prev, { type: 'error', text: `Failed: ${error.message}` }]);
      setIsExecuting(false);
      setAgents(prev => prev.map(agent =>
        agent.id === selectedNode.id ? { ...agent, status: 'error' } : agent
      ));
    }
  };

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

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
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            background: 'rgba(34, 197, 94, 0.2)',
            color: '#22c55e',
            borderRadius: '4px',
            fontWeight: '600',
          }}>CONNECTED</span>
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
            <span>{agents.length} Agents</span>
          </div>
          {tokenUsage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#6366f1' }}>${tokenUsage.estimated_cost.toFixed(6)}</span>
              <span>({tokenUsage.total_tokens} tokens)</span>
            </div>
          )}
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
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
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

            {/* Command Palette (GOD MODE) */}
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '600px',
              background: 'rgba(15, 15, 20, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)',
              padding: '4px',
            }}>
              <form onSubmit={handleCommandSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>
                </svg>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="🎯 GOD MODE: 'I need a team to research crypto trends and write a report'"
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
                }}>Enter</kbd>
              </form>
            </div>

            {/* Query Input & Execute */}
            <div style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '400px',
            }}>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Enter your query..."
                style={{
                  padding: '12px 16px',
                  background: 'rgba(15, 15, 20, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  color: '#e4e4e7',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleExecute}
                disabled={isExecuting || !queryInput.trim()}
                style={{
                  padding: '12px 24px',
                  background: isExecuting
                    ? 'rgba(99, 102, 241, 0.5)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'inherit',
                  cursor: isExecuting ? 'not-allowed' : 'pointer',
                  boxShadow: isExecuting ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isExecuting ? '⏳ Executing...' : '▶ Execute Agent'}
              </button>
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
                    {tab === 'context' && '◈ Context (Transparency)'}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                            : log.type === 'error' ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(34, 197, 94, 0.1)',
                        }}
                      >
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          color: log.type === 'system' ? '#818cf8'
                            : log.type === 'error' ? '#ef4444'
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
                    {streamedContent && (
                      <div style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '12px',
                        border: '1px solid rgba(99, 102, 241, 0.1)',
                      }}>
                        <pre style={{
                          fontSize: '12px',
                          color: '#e4e4e7',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                        }}>
                          {streamedContent}
                        </pre>
                      </div>
                    )}
                    {isExecuting && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        color: '#6366f1',
                        fontSize: '12px',
                      }}>
                        <span style={{ animation: 'blink 1s infinite' }}>▊</span>
                        Streaming response...
                      </div>
                    )}
                  </div>
                )}

                {bottomTab === 'context' && (
                  <div style={{
                    fontFamily: '"Fira Code", monospace',
                    fontSize: '11px',
                    lineHeight: 1.8,
                    color: '#a1a1aa',
                  }}>
                    <div style={{ color: '#6366f1', marginBottom: '12px', fontSize: '12px', fontWeight: '600' }}>
                      🔍 TRANSPARENCY: Actual System Prompt
                    </div>
                    {isLoadingPrompt && (
                      <div style={{ color: '#71717a' }}>Loading prompt preview...</div>
                    )}
                    {promptPreview && (
                      <>
                        <div style={{ color: '#22c55e', marginBottom: '8px' }}>
                          TEMPERATURE: {promptPreview.temperature.toFixed(2)}
                        </div>
                        <div style={{ color: '#f59e0b', marginBottom: '12px' }}>
                          XY_POSITION: x={xyPosition.x.toFixed(2)} (density), y={(1-xyPosition.y).toFixed(2)} (creativity)
                        </div>
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          marginTop: '12px'
                        }}>
                          <pre style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            fontSize: '10px',
                            color: '#d4d4d8'
                          }}>
                            {promptPreview.final_system_prompt}
                          </pre>
                        </div>
                      </>
                    )}
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
                        <div style={{ fontSize: '12px', color: '#71717a' }}>
                          Artifact preview - Click to view full content
                        </div>
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

              {/* Temperature Display */}
              <div style={{ padding: '0 20px 20px' }}>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '10px', color: '#71717a', marginBottom: '4px' }}>
                    TEMPERATURE
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1' }}>
                    {promptPreview ? promptPreview.temperature.toFixed(2) : '0.50'}
                  </div>
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
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Markdown Document</div>
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
                  <span style={{ color: '#71717a' }}>Artifact ID:</span>{' '}
                  <span style={{ color: '#e4e4e7', fontSize: '10px', fontFamily: 'monospace' }}>{selectedArtifact.id}</span>
                </div>
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
                Click on an agent to inspect and control it
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
