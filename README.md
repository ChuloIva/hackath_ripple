# Agent Synapse - Linguistic Steering Interface

**A visual control system for multi-agent LLM workflows that makes prompt steering, context routing, and cost visible and manipulable.**

> "Linguistic steering, not fine-tuning. Transparency over magic."

---

## 🎯 What This Is

Agent Synapse proves that **XY pad controls can directly modify LLM behavior** through dynamic prompt injection, without retraining or fine-tuning. It's a demonstration of **language-first modularity** where the interface itself becomes a control plane for AI systems.

### Core Innovation

**The XY Pad** → Maps directly to prompt instructions:
- **X-Axis**: Data Density (0 = summary, 1 = verbose)
- **Y-Axis**: Creativity Level (0 = factual, 1 = creative)
- **Temperature**: Automatically mapped from Y-axis (0.2 → 0.9)

Move the pad → Prompt changes → LLM behavior changes. **No retraining. Pure linguistic steering.**

---

## ✨ Features

### 1. 🔍 Epistemic Transparency
- **Context Tab** shows the **actual system prompt** being sent to Gemini
- Move the XY pad → Watch the prompt update in real-time
- No hidden magic, full visibility

### 2. 🎯 GOD MODE - Dynamic Agent Generation
- Type: *"I need a team to research crypto stocks and write a risk report"*
- **LLM generates agent configurations** with suggested XY positions
- Agents spawn on the canvas automatically

### 3. ⚡ Real-Time Streaming
- Execute queries with selected agent + XY position
- Token-by-token streaming via Server-Sent Events (SSE)
- Watch responses generate live

### 4. 💰 Token Tracking & Cost Estimation
- Transparent usage metrics after each execution
- Estimated cost per query

### 5. 📦 Artifact Management
- Generated outputs become draggable "artifact nodes"
- Saved to disk with metadata

---

## 🚀 Quick Start

### 1. Start the Backend

```bash
cd /Users/ivanculo/Desktop/Projects/Hackathon

# Activate virtual environment
source .venv/bin/activate

# Start FastAPI server
python backend/main.py
```

Server starts on: **http://localhost:8000**

API Docs: **http://localhost:8000/docs**

### 2. Open the Frontend

**Option A: Simple HTML (Recommended for Demo)**

```bash
# Open in browser
open demo.html

# OR use Python HTTP server
python -m http.server 3000
# Then visit: http://localhost:3000/demo.html
```

**Option B: Integrate into Next.js/React project**

Copy `agent-synapse-connected.jsx` into your project and import it.

---

## 🎬 Demo Flow (The Killer Demo)

### Part 1: Prove Linguistic Steering

1. **Select the Analyst agent** (click the circular node)
2. **Enter a query**: "Analyze Q4 2024 crypto market risks"
3. **Position XY pad at (0, 0)** - Factual + Summary
4. **Click "Execute Agent"**
5. **Observe**: Terse, conservative, bullet-point response

6. **Now move XY pad to (1, 1)** - Creative + Verbose
7. **Execute the SAME query again**
8. **Observe**: Expansive, speculative, detailed analysis

**Point to Context Tab**: "See? Same model, different prompts. That's linguistic steering."

### Part 2: GOD MODE - Dynamic Agents

1. **Type in Command Palette** (bottom):
   ```
   I need a team to research crypto trends, analyze risks, and write a professional report
   ```
2. **Press Enter**
3. **Watch**: 3 agents spawn on canvas:
   - Crypto Market Researcher (verbose + factual)
   - Financial Risk Analyst (detailed + factual)
   - Technical Report Writer (balanced)
4. **Query auto-populated** with refined task description

5. **Select any generated agent** and execute

---

## 🏗️ Architecture

### Backend (`/backend`)

```
backend/
├── main.py                 # FastAPI app (all endpoints)
├── prompt_engine.py        # ⭐⭐ THE CORE: XY → prompt mapping
├── gemini_client.py        # Gemini API + GOD MODE
├── artifact_manager.py     # File-based storage
├── token_tracker.py        # Cost calculation
├── models.py               # Pydantic schemas
└── config.py               # Environment settings
```

### Frontend

- **agent-synapse-connected.jsx** - Full React component with backend integration
- **demo.html** - Standalone HTML for testing

---

## 📡 API Endpoints

### Base URL: `http://localhost:8000`

#### 1. Health Check
```bash
GET /health
```

#### 2. Prompt Preview (TRANSPARENCY)
```bash
POST /api/v1/prompt/preview
{
  "query": "Analyze crypto risks",
  "xy_position": {"x": 0.0, "y": 0.0},
  "agent_role": "analyst"
}
```

Returns the **actual system prompt** that will be sent to Gemini.

#### 3. GOD MODE - Generate Agent Config
```bash
POST /api/v1/agent/generate-config
{
  "goal": "I need a team to research crypto stocks and write a report"
}
```

Returns agent configurations with suggested XY positions.

#### 4. Execute Agent
```bash
POST /api/v1/agent/execute
{
  "query": "Analyze Q4 crypto market risks",
  "xy_position": {"x": 0.7, "y": 0.3},
  "agent_role": "analyst"
}
```

Returns `execution_id` and `stream_url`.

#### 5. Stream Response (SSE)
```bash
GET /api/v1/agent/stream/{execution_id}
```

Server-Sent Events stream with:
- `event: token` - Individual tokens
- `event: complete` - Final artifact + token usage
- `event: error` - Errors

#### 6. Get Artifact
```bash
GET /api/v1/artifacts/{artifact_id}
```

#### 7. List Artifacts
```bash
GET /api/v1/artifacts?limit=20
```

---

## 🧪 Manual Testing

### Test 1: Prompt Transparency

```bash
curl -X POST 'http://localhost:8000/api/v1/prompt/preview' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "Analyze crypto risks",
    "xy_position": {"x": 0.0, "y": 0.0},
    "agent_role": "analyst"
  }' | python -m json.tool
```

**Expected**: JSON with `final_system_prompt` showing FACTUAL + SUMMARY instructions.

### Test 2: GOD MODE

```bash
curl -X POST 'http://localhost:8000/api/v1/agent/generate-config' \
  -H 'Content-Type: application/json' \
  -d '{"goal": "I need a team to research crypto and write a report"}' \
  | python -m json.tool
```

**Expected**: JSON with 2-3 agents with roles and suggested XY positions.

### Test 3: Full Execution with Streaming

```bash
# Step 1: Create execution
EXEC_RESPONSE=$(curl -s -X POST 'http://localhost:8000/api/v1/agent/execute' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "Analyze crypto risks in 3 bullets",
    "xy_position": {"x": 0.2, "y": 0.1},
    "agent_role": "analyst"
  }')

# Extract execution_id
EXEC_ID=$(echo $EXEC_RESPONSE | python -c "import sys, json; print(json.load(sys.stdin)['execution_id'])")

# Step 2: Stream response
curl -N "http://localhost:8000/api/v1/agent/stream/$EXEC_ID"
```

**Expected**: SSE stream with tokens flowing in real-time, ending with artifact ID.

---

## 🎨 UI Features Explained

### Canvas (Left)
- **Agent Nodes**: Circular, drag-able, pulse when working
- **Artifact Nodes**: Rectangular, spawned after execution
- **Connections**: Animated lines showing data flow
- **Command Palette** (bottom): GOD MODE input
- **Query Input** (top right): Task for selected agent

### Console (Bottom)
- **Stream Tab**: Live token-by-token output
- **Context Tab**: 🔍 **TRANSPARENCY** - Shows actual prompt
- **Preview Tab**: Artifact preview

### Inspector (Right)
- **XY Pad**: 2D control surface (Kaoss Pad style)
- **Corner Labels**: CREATIVE/FACTUAL, VERBOSE/SUMMARY
- **Live Values**: Creativity %, Density %
- **Temperature**: Mapped from Y-axis

---

## 💡 Key Concepts (from critique.md)

### What This IS
- ✅ **Prompt orchestration IDE** with visual controls
- ✅ **Language-first modularity** (not weight-first)
- ✅ **Transparent linguistic steering**
- ✅ **Control plane for LLM workflows**

### What This IS NOT
- ❌ "Sentient agents"
- ❌ "Learning" or "memory"
- ❌ New AI cognition
- ❌ Fine-tuning or training

**Honest framing**: *"A visual control system that makes prompt steering explicit — the same control space LPCI theorizes, but implemented as UX."*

---

## 🏆 Demo Tips for Judges

### Opening Statement
*"This isn't a chatbot. It's a control surface. Watch how the same model produces radically different outputs by changing the prompt structure."*

### The Money Shot
1. Execute query at (0,0)
2. Show Context tab: "This is the ACTUAL prompt."
3. Execute at (1,1): "Same query, different instructions."
4. Point to results: "No retraining. Pure prompt engineering made visible."

### Judge Questions

**Q: "How is this different from ChatGPT?"**
A: "We expose the control layer. You see and manipulate the actual prompts. Language becomes the API."

**Q: "Are these agents actually intelligent?"**
A: "No. They're prompt templates with dynamic instruction injection. That's the point—transparency."

**Q: "What about memory?"**
A: "Out of scope for MVP. This proves linguistic steering works first. Memory is a natural next step."

---

## 📊 Token Costs (Gemini 1.5 Flash)

- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens

**Example execution**:
- Input: ~245 tokens
- Output: ~350 tokens
- Cost: **~$0.000123** per query

---

## 🔥 Extending This

### Near-Term Additions (Post-Hackathon)
1. **Persistent Storage**: SQLite for executions/artifacts
2. **Multi-Agent Orchestration**: Actual agent-to-agent communication
3. **Context Membranes**: Shared memory zones
4. **Drag-to-Connect**: Wire artifacts as context visually
5. **Preset Patterns**: Save XY configurations

### Research Directions (LPCI Integration)
1. **Linguistic Print Inference**: Track agent "personalities" across sessions
2. **Attractor Persistence**: Remember preferred XY positions per task type
3. **Semantic Anchoring**: Cross-agent knowledge sharing
4. **Drift Tracking**: Monitor prompt effectiveness over time

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i:8000

# Kill existing process
lsof -ti:8000 | xargs kill -9

# Restart
python backend/main.py
```

### CORS errors in browser
- Make sure backend is running on `localhost:8000`
- Check `config.py` has your frontend URL in `cors_origins`

### Gemini API errors
- Verify your `GEMINI_API_KEY` in `.env`
- Check you're using `gemini-1.5-flash` or `gemini-1.5-pro`

### Streaming not working
- SSE requires browser support (all modern browsers)
- Check browser console for EventSource errors
- Verify `/api/v1/agent/stream/{id}` returns valid SSE

---

## 📝 File Structure

```
/Users/ivanculo/Desktop/Projects/Hackathon/
├── backend/
│   ├── main.py                          # FastAPI app
│   ├── prompt_engine.py                 # XY → prompt mapping ⭐⭐
│   ├── gemini_client.py                 # Gemini + GOD MODE
│   ├── artifact_manager.py              # Storage
│   ├── token_tracker.py                 # Costs
│   ├── models.py                        # Schemas
│   ├── config.py                        # Settings
│   └── storage/artifacts/               # Saved outputs
├── agent-synapse-connected.jsx          # Connected frontend
├── agent-synapse.jsx                    # Original mockup
├── example.jsx                          # Alternative UI
├── demo.html                            # Standalone demo
├── requirements.txt                     # Python deps
├── .env                                 # API keys
├── what_to_build.md                     # Design spec
├── critique.md                          # Technical analysis
└── README.md                            # This file
```

---

## 🎯 Success Criteria

### Technical
- [x] XY pad changes prompt demonstrably
- [x] Same query + different XY = different outputs
- [x] Streaming works smoothly without lag
- [x] System prompt visible in UI at all times
- [x] Artifacts save and retrieve correctly
- [x] GOD MODE generates agent configs
- [x] Frontend fully connected to backend

### Demonstration
- [x] Can explain "linguistic steering" in 30 seconds
- [x] Can show prompt transparency live
- [x] Can prove no retraining/fine-tuning needed
- [x] Judge understands this is orchestration, not magic

### Epistemic Honesty
- [x] Never claim "sentient agents"
- [x] Never claim "learning" or "memory"
- [x] Always show actual prompts
- [x] Describe as "prompt-modular agent IDE"

---

## 📜 License & Credits

**Built for Hackathon**
- Backend: Python + FastAPI + Gemini API
- Frontend: React (vanilla JS via CDN)
- Design Philosophy: From LPCI theory + critique.md principles

**Core Innovation**: @prompt_engine.py - The XY pad → prompt mapping logic

---

## 🚀 Next Steps

1. **Run the demo**: `python backend/main.py` → `open demo.html`
2. **Test linguistic steering**: Execute at (0,0) vs (1,1)
3. **Try GOD MODE**: Generate agent team from natural language
4. **Check Context tab**: See transparent prompt updates
5. **Win the hackathon**: Show judges the linguistic steering proof

---

**Remember**: This is about **transparency and control**, not magic. The power is in making prompt engineering **visible and manipulable** through a spatial interface.

**Philosophy**: "Linguistic steering, not fine-tuning. Transparency over magic."
