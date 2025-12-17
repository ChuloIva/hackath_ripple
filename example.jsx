import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Box, 
  Cpu, 
  FileText, 
  Globe, 
  Zap, 
  Layout, 
  Terminal, 
  Eye, 
  Search, 
  MessageSquare, 
  Move, 
  Maximize2, 
  Minimize2, 
  Play, 
  RotateCcw,
  Layers,
  Settings,
  ShieldAlert,
  Download,
  Trash2,
  User,
  Sparkles
} from 'lucide-react';

// --- Types ---

type NodeType = 'agent' | 'artifact';

interface Node {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  status?: 'idle' | 'working' | 'error';
  meta?: {
    role?: string;
    tokens?: number;
    cost?: number;
    fileType?: string;
    size?: string;
  };
}

interface Connection {
  id: string;
  from: string;
  to: string;
  active: boolean;
}

// --- Mock Data ---

const INITIAL_NODES: Node[] = [
  { 
    id: 'scraper-1', 
    type: 'agent', 
    label: 'Market Scraper', 
    x: 100, 
    y: 150, 
    status: 'working',
    meta: { role: 'Data Collection', tokens: 4520, cost: 0.12 }
  },
  { 
    id: 'analyst-1', 
    type: 'agent', 
    label: 'Lead Analyst', 
    x: 400, 
    y: 150, 
    status: 'working',
    meta: { role: 'Synthesis & Logic', tokens: 12050, cost: 0.45 }
  },
  { 
    id: 'writer-1', 
    type: 'agent', 
    label: 'Creative Writer', 
    x: 400, 
    y: 400, 
    status: 'idle',
    meta: { role: 'Content Generation', tokens: 1200, cost: 0.04 }
  },
  { 
    id: 'artifact-1', 
    type: 'artifact', 
    label: 'raw_data.json', 
    x: 250, 
    y: 150, 
    meta: { fileType: 'JSON', size: '2.4MB' }
  },
  { 
    id: 'artifact-2', 
    type: 'artifact', 
    label: 'risk_report.md', 
    x: 550, 
    y: 150, 
    meta: { fileType: 'Markdown', size: '14KB' }
  }
];

const INITIAL_CONNECTIONS: Connection[] = [
  { id: 'c1', from: 'scraper-1', to: 'artifact-1', active: true },
  { id: 'c2', from: 'artifact-1', to: 'analyst-1', active: true },
  { id: 'c3', from: 'analyst-1', to: 'artifact-2', active: true },
  { id: 'c4', from: 'artifact-2', to: 'writer-1', active: false },
];

// --- Components ---

const AgentNode = ({ node, isSelected, onClick }: { node: Node; isSelected: boolean; onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={`absolute w-32 h-32 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 z-20
      ${isSelected ? 'ring-2 ring-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]' : 'hover:scale-105'}
      ${node.status === 'working' ? 'animate-pulse bg-gray-900 border-2 border-orange-500/50' : 'bg-gray-900 border-2 border-gray-700'}
    `}
    style={{ left: node.x, top: node.y }}
  >
    {node.status === 'working' && (
      <div className="absolute inset-0 rounded-full border border-orange-500 animate-ping opacity-20"></div>
    )}
    <div className={`p-3 rounded-full mb-2 ${node.status === 'working' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400'}`}>
      <Cpu size={24} />
    </div>
    <span className="text-xs font-bold text-gray-200">{node.label}</span>
    <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{node.status}</span>
  </div>
);

const ArtifactNode = ({ node, isSelected, onClick }: { node: Node; isSelected: boolean; onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={`absolute w-28 h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 z-20
      ${isSelected ? 'ring-2 ring-purple-400 bg-gray-800' : 'bg-gray-900 hover:bg-gray-800'}
      border border-gray-700 shadow-xl
    `}
    style={{ left: node.x, top: node.y }}
  >
    <div className="p-2 bg-gray-800 rounded mb-2 border border-gray-700">
      <FileText size={20} className="text-purple-400" />
    </div>
    <span className="text-xs font-medium text-gray-300 px-2 text-center break-all">{node.label}</span>
    <span className="text-[10px] text-gray-500 mt-1">{node.meta?.size}</span>
  </div>
);

const ConnectionLine = ({ conn, nodes }: { conn: Connection; nodes: Node[] }) => {
  const from = nodes.find(n => n.id === conn.from);
  const to = nodes.find(n => n.id === conn.to);
  if (!from || !to) return null;

  // Simple coordinate math for center-to-center lines
  const startX = from.x + (from.type === 'agent' ? 64 : 56);
  const startY = from.y + (from.type === 'agent' ? 64 : 64);
  const endX = to.x + (to.type === 'agent' ? 64 : 56);
  const endY = to.y + (to.type === 'agent' ? 64 : 64);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#4B5563" />
        </marker>
      </defs>
      <path
        d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`}
        stroke={conn.active ? "#F97316" : "#4B5563"}
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
        strokeDasharray={conn.active ? "5,5" : "none"}
        className={conn.active ? "animate-[dash_1s_linear_infinite]" : ""}
      />
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </svg>
  );
};

// --- Main App Component ---

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [selectedId, setSelectedId] = useState<string>('analyst-1');
  const [consoleTab, setConsoleTab] = useState<'stream' | 'context' | 'preview'>('context');
  
  // XY Pad State
  const [xyPos, setXyPos] = useState({ x: 50, y: 50 }); // Percentage 0-100
  const xyRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedId);

  // XY Pad Interaction Logic
  const handleXYMove = (e: React.MouseEvent) => {
    if (!isDragging || !xyRef.current) return;
    const rect = xyRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setXyPos({ x, y });
  };

  // Generate dynamic system prompt based on XY values
  const getDynamicPrompt = () => {
    const creativity = xyPos.y > 70 ? "HIGHLY SPECULATIVE/CREATIVE" : xyPos.y < 30 ? "STRICTLY FACTUAL" : "BALANCED";
    const density = xyPos.x > 70 ? "RAW LOGS/VERBOSE" : xyPos.x < 30 ? "EXECUTIVE SUMMARY" : "DETAILED REPORT";
    
    return `SYSTEM_PROMPT_V4.2
-------------------
ROLE: ${selectedNode?.meta?.role || 'Agent'}
MODE: ${creativity}
OUTPUT_FORMAT: ${density}
CONSTRAINTS: 
- Budget: < $0.50
- Safety: Standard
- Recursion: Allowed
-------------------
INJECTED_CONTEXT:
${selectedNode?.type === 'agent' ? '> Previous output from [Market Scraper] loaded.\n> Knowledge Graph attached.' : 'N/A'}`;
  };

  return (
    <div className="flex h-screen w-full bg-gray-950 text-gray-200 font-sans overflow-hidden select-none"
         onMouseMove={handleXYMove}
         onMouseUp={() => setIsDragging(false)}>
      
      {/* --- LEFT SECTION: CANVAS & CONSOLE --- */}
      <section className="flex-grow flex flex-col h-full relative border-r border-gray-800">
        
        {/* TOP: CANVAS (Mission Control) */}
        <div className="relative flex-grow bg-[#09090b] overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10" 
               style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          {/* Membrane (Visual Grouping) */}
          <div className="absolute top-20 left-16 right-16 bottom-10 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm pointer-events-none z-0">
             <div className="absolute -top-3 left-6 px-2 bg-gray-900 border border-gray-700 text-xs text-gray-400 rounded">
               CONTEXT MEMBRANE: RESEARCH_TEAM_ALPHA
             </div>
          </div>

          {/* Render Connections */}
          {INITIAL_CONNECTIONS.map(conn => (
            <ConnectionLine key={conn.id} conn={conn} nodes={nodes} />
          ))}

          {/* Render Nodes */}
          {nodes.map(node => (
            node.type === 'agent' ? (
              <AgentNode 
                key={node.id} 
                node={node} 
                isSelected={selectedId === node.id} 
                onClick={() => setSelectedId(node.id)} 
              />
            ) : (
              <ArtifactNode 
                key={node.id} 
                node={node} 
                isSelected={selectedId === node.id} 
                onClick={() => setSelectedId(node.id)} 
              />
            )
          ))}

          {/* God Mode Input */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[600px] max-w-full z-30">
            <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl flex items-center p-1.5 pl-4 ring-1 ring-white/10">
              <Sparkles className="text-cyan-400 mr-3 animate-pulse" size={18} />
              <input 
                type="text" 
                placeholder="Ask the swarm to do something..." 
                className="bg-transparent border-none outline-none text-white flex-grow h-10 placeholder-gray-500 font-medium"
              />
              <div className="flex gap-2 text-[10px] text-gray-500 font-mono mr-2">
                <span className="bg-gray-800 px-2 py-1 rounded border border-gray-700">⌘ K</span>
              </div>
            </div>
          </div>

          {/* Top Left Branding */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2 text-gray-500">
            <Layers size={18} />
            <span className="font-mono text-sm tracking-widest font-bold">AGENT SYNAPSE <span className="text-orange-500">v0.9</span></span>
          </div>
        </div>

        {/* BOTTOM: OMNI-CONSOLE */}
        <div className="h-[35%] bg-gray-900 border-t border-gray-800 flex flex-col z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {/* Console Header/Tabs */}
          <div className="h-10 border-b border-gray-800 flex items-center px-4 gap-6 bg-gray-950">
            <button 
              onClick={() => setConsoleTab('stream')}
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide h-full border-b-2 transition-colors ${consoleTab === 'stream' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Activity size={14} /> Matrix Stream
            </button>
            <button 
              onClick={() => setConsoleTab('context')}
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide h-full border-b-2 transition-colors ${consoleTab === 'context' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Cpu size={14} /> Context Inspector
            </button>
            <button 
              onClick={() => setConsoleTab('preview')}
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide h-full border-b-2 transition-colors ${consoleTab === 'preview' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Eye size={14} /> Render Preview
            </button>
            <div className="flex-grow"></div>
            <div className="flex gap-2">
               <Maximize2 size={14} className="text-gray-600 hover:text-gray-400 cursor-pointer"/>
            </div>
          </div>

          {/* Console Content */}
          <div className="flex-grow p-4 font-mono text-sm overflow-auto custom-scrollbar">
            {consoleTab === 'stream' && (
              <div className="space-y-2">
                <div className="text-gray-500 border-l-2 border-gray-700 pl-3">User: "Analyze the crypto risks for Q4."</div>
                <div className="text-orange-300 border-l-2 border-orange-500/30 pl-3 animate-pulse">
                  Agent [Analyst] Thinking... <br/>
                  <span className="text-gray-500 text-xs">{'>'} Accessing Tool: GoogleSearchQuery('BTC volatility index')</span><br/>
                  <span className="text-gray-500 text-xs">{'>'} Reading Artifact: raw_data.json (2.4MB)</span>
                </div>
                <div className="text-cyan-300 border-l-2 border-cyan-500/30 pl-3">
                  Generating correlation matrix between Artifact-1 and Artifact-2...
                </div>
              </div>
            )}

            {consoleTab === 'context' && (
              <div className="h-full flex gap-4">
                 <div className="w-1/2 border-r border-gray-800 pr-4">
                    <h3 className="text-xs text-gray-500 mb-2 uppercase">System Prompt (Dynamic Injection)</h3>
                    <pre className="text-xs text-green-400/80 whitespace-pre-wrap">{getDynamicPrompt()}</pre>
                 </div>
                 <div className="w-1/2 pl-2">
                    <h3 className="text-xs text-gray-500 mb-2 uppercase">Active Tools</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {['Web Browsing', 'Code Interpreter', 'Filesystem', 'Memory Vector DB'].map(tool => (
                            <div key={tool} className="flex items-center justify-between bg-gray-950 p-2 rounded border border-gray-800 text-xs">
                                <span className="text-gray-400">{tool}</span>
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
            )}

            {consoleTab === 'preview' && (
              <div className="h-full bg-gray-800 rounded p-6 flex flex-col items-center justify-center text-gray-400 border border-gray-700">
                {selectedNode?.type === 'artifact' ? (
                   <>
                     <FileText size={48} className="mb-4 text-purple-400" />
                     <h2 className="text-xl font-bold text-gray-200">{selectedNode.label}</h2>
                     <p className="text-sm mt-2">Preview rendering engine ready.</p>
                     <div className="mt-4 p-4 bg-gray-900 rounded w-full max-w-md border border-gray-700 text-xs">
                        # Risk Assessment Report <br/>
                        ## Executive Summary <br/>
                        Market volatility has increased by 14%...
                     </div>
                   </>
                ) : (
                    <div className="text-center">
                        <Activity size={48} className="mb-4 opacity-50 mx-auto" />
                        <p>Select an Artifact Node to preview content.</p>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- RIGHT SECTION: STEERING COCKPIT --- */}
      <aside className="w-80 bg-gray-950 border-l border-gray-800 flex flex-col shadow-2xl z-40">
        
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center px-5 justify-between">
          <span className="font-bold tracking-wider text-xs text-gray-400">INSPECTOR</span>
          {selectedNode && (
             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedNode.type === 'agent' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'}`}>
               {selectedNode.type}
             </span>
          )}
        </div>

        {selectedNode?.type === 'agent' ? (
          <div className="flex-col flex h-full">
            
            {/* KAOSS PAD */}
            <div className="p-5 border-b border-gray-800">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-gray-300">STEERING AXIS</h3>
                  <RotateCcw size={12} className="text-gray-600 cursor-pointer hover:text-white" onClick={() => setXyPos({x:50, y:50})} />
               </div>
               
               <div className="relative w-full aspect-square bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-inner group"
                    ref={xyRef}
                    onMouseDown={() => setIsDragging(true)}>
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none" 
                       style={{ backgroundImage: 'linear-gradient(to right, #374151 1px, transparent 1px), linear-gradient(to bottom, #374151 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  {/* Axis Labels */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 font-mono pointer-events-none">CREATIVE</div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 font-mono pointer-events-none">FACTUAL</div>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-gray-500 font-mono pointer-events-none">SUMMARY</div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[9px] text-gray-500 font-mono pointer-events-none">VERBOSE</div>

                  {/* The Puck */}
                  <div 
                    className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.8)] cursor-grab active:cursor-grabbing transition-transform
                        ${isDragging ? 'scale-125' : ''}
                    `}
                    style={{ left: `${xyPos.x}%`, top: `${xyPos.y}%` }}
                  ></div>
                  
                  {/* Crosshair lines (visible on drag) */}
                  {isDragging && (
                    <>
                       <div className="absolute h-full w-[1px] bg-cyan-500/50 pointer-events-none" style={{ left: `${xyPos.x}%` }}></div>
                       <div className="absolute w-full h-[1px] bg-cyan-500/50 pointer-events-none" style={{ top: `${xyPos.y}%` }}></div>
                    </>
                  )}
               </div>
               <div className="mt-3 flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>X: {Math.round(xyPos.x)}</span>
                  <span>Y: {Math.round(100 - xyPos.y)}</span> {/* Invert Y for display so top is 100 */}
               </div>
            </div>

            {/* SLIDERS */}
            <div className="p-5 border-b border-gray-800 space-y-4">
              <h3 className="text-xs font-bold text-gray-300 mb-2">DRIFT CONTROLS</h3>
              
              <div className="space-y-1">
                 <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Temperature</span>
                    <span>0.7</span>
                 </div>
                 <input type="range" className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
              </div>

              <div className="space-y-1">
                 <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Max Tokens</span>
                    <span>4,096</span>
                 </div>
                 <input type="range" className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
              </div>
            </div>

            {/* VITALS */}
            <div className="p-5 flex-grow">
               <h3 className="text-xs font-bold text-gray-300 mb-3">AGENT VITALS</h3>
               
               <div className="bg-gray-900 rounded p-3 border border-gray-800 mb-3">
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-[10px] text-gray-400 uppercase">Context Window</span>
                     <span className="text-[10px] text-orange-400">72%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-orange-500 h-full w-[72%] shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                  </div>
                  <div className="text-[9px] text-gray-600 mt-1 text-right">92,100 / 128,000 tokens</div>
               </div>

               <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase">Session Cost</span>
                  <span className="text-sm font-mono text-white">${selectedNode.meta?.cost}</span>
               </div>
            </div>

          </div>
        ) : selectedNode?.type === 'artifact' ? (
          <div className="p-5">
             <div className="w-full aspect-video bg-gray-800 rounded border border-gray-700 flex items-center justify-center mb-4 relative overflow-hidden group">
                <FileText size={40} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-xs font-bold text-white">OPEN PREVIEW</span>
                </div>
             </div>
             
             <h2 className="text-lg font-bold text-white mb-1 break-all">{selectedNode.label}</h2>
             <p className="text-xs text-gray-500 mb-6">{selectedNode.meta?.fileType} • {selectedNode.meta?.size}</p>

             <div className="space-y-2">
                <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-gray-700">
                   <Download size={14} /> Download
                </button>
                <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-gray-700">
                   <Move size={14} /> Move to Pipeline
                </button>
                <button className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-900/30">
                   <Trash2 size={14} /> Delete Artifact
                </button>
             </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center flex-col text-gray-600 p-8 text-center">
             <User size={48} className="mb-4 opacity-20" />
             <p className="text-sm">Select an Agent or Artifact to access Steering Controls.</p>
          </div>
        )}

      </aside>
    </div>
  );
}