"""
Agent Synapse Backend - FastAPI Application

Provides API endpoints for linguistic steering via XY pad control.
Priority: Epistemic transparency - show actual prompts before execution.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from datetime import datetime
import uuid
import json
from typing import AsyncGenerator

from config import settings
from models import (
    AgentExecutionRequest,
    AgentExecutionResponse,
    PromptPreviewRequest,
    PromptComponents,
    HealthResponse,
    StreamTokenChunk,
    StreamCompleteChunk,
    StreamErrorChunk,
    TokenUsage
)
from prompt_engine import PromptEngine
from gemini_client import gemini_client
from artifact_manager import artifact_manager
from token_tracker import TokenTracker

# Initialize FastAPI app
app = FastAPI(
    title="Agent Synapse Backend",
    version="0.1.0",
    description="Linguistic steering interface for multi-agent orchestration"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize prompt engine
prompt_engine = PromptEngine()

# In-memory execution tracking (for MVP; use Redis for production)
executions = {}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        model=settings.gemini_model,
        timestamp=datetime.utcnow()
    )


@app.post("/api/v1/prompt/preview", response_model=PromptComponents)
async def preview_prompt(request: PromptPreviewRequest):
    """
    Preview system prompt WITHOUT executing.

    This is the TRANSPARENCY feature - shows exactly what prompt
    will be sent to the model based on XY pad position.

    PRIORITY ENDPOINT: Build this first to prove linguistic steering works.
    """
    try:
        # Build prompt components
        components = prompt_engine.build_prompt_components(
            agent_role=request.agent_role,
            x=request.xy_position.x,
            y=request.xy_position.y,
            user_query=request.query
        )

        return PromptComponents(**components)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate prompt preview: {str(e)}"
        )


@app.post("/api/v1/agent/execute", response_model=AgentExecutionResponse)
async def execute_agent(request: AgentExecutionRequest):
    """
    Execute agent with dynamic prompt based on XY position.

    Returns execution_id and prompt_components for transparency,
    plus a stream_url for real-time output.
    """
    try:
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"

        # Build transparent prompt components
        components = prompt_engine.build_prompt_components(
            agent_role=request.agent_role,
            x=request.xy_position.x,
            y=request.xy_position.y,
            user_query=request.query
        )

        # Store execution for streaming endpoint
        executions[execution_id] = {
            "request": request,
            "prompt_components": components,
            "status": "pending",
            "created_at": datetime.utcnow()
        }

        return AgentExecutionResponse(
            execution_id=execution_id,
            prompt_components=PromptComponents(**components),
            stream_url=f"/api/v1/agent/stream/{execution_id}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create execution: {str(e)}"
        )


@app.get("/api/v1/agent/stream/{execution_id}")
async def stream_agent_response(execution_id: str):
    """
    Stream Gemini response as Server-Sent Events.

    Connects to Gemini API and streams tokens in real-time.
    """
    if execution_id not in executions:
        raise HTTPException(status_code=404, detail="Execution not found")

    execution = executions[execution_id]
    request = execution["request"]
    prompt_components = execution["prompt_components"]

    async def event_generator() -> AsyncGenerator[str, None]:
        """
        SSE event generator.
        Format: event: <type>\ndata: <json>\n\n
        """
        accumulated_content = ""

        try:
            # Update status
            executions[execution_id]["status"] = "streaming"

            # Build full prompt for Gemini
            full_prompt = prompt_engine.build_full_prompt(
                agent_role=request.agent_role,
                x=request.xy_position.x,
                y=request.xy_position.y,
                user_query=request.query
            )

            # Get temperature from prompt components
            temperature = prompt_components["temperature"]

            # Stream tokens from Gemini
            async for token in gemini_client.stream_generate(
                prompt=full_prompt,
                temperature=temperature,
                max_output_tokens=settings.max_output_tokens
            ):
                accumulated_content += token
                yield f"event: token\ndata: {json.dumps({'content': token})}\n\n"

            # Save artifact
            artifact = await artifact_manager.save_artifact(
                content=accumulated_content,
                agent_role=request.agent_role,
                file_type="markdown"
            )

            # Calculate token usage
            usage = TokenTracker.get_usage_summary(
                input_text=full_prompt,
                output_text=accumulated_content
            )

            token_usage = TokenUsage(**usage)

            # Update execution status
            executions[execution_id]["status"] = "completed"
            executions[execution_id]["artifact_id"] = artifact.artifact_id

            # Send completion event
            yield f"event: complete\ndata: {json.dumps({
                'artifact_id': artifact.artifact_id,
                'token_usage': token_usage.model_dump()
            })}\n\n"

        except Exception as e:
            executions[execution_id]["status"] = "error"
            executions[execution_id]["error"] = str(e)
            error_data = json.dumps({'error': str(e)})
            yield f"event: error\ndata: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@app.get("/api/v1/artifacts/{artifact_id}")
async def get_artifact(artifact_id: str):
    """
    Retrieve artifact by ID.

    Returns the full artifact with content and metadata.
    """
    try:
        artifact = await artifact_manager.get_artifact(artifact_id)
        return artifact.model_dump()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Artifact not found")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve artifact: {str(e)}"
        )


@app.get("/api/v1/artifacts")
async def list_artifacts(limit: int = 20):
    """List recent artifacts."""
    try:
        artifacts = await artifact_manager.list_artifacts(limit=limit)
        return {
            "total": len(artifacts),
            "artifacts": [a.model_dump() for a in artifacts]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list artifacts: {str(e)}"
        )


@app.post("/api/v1/agent/generate-config")
async def generate_agent_config(request: dict):
    """
    🎯 GOD MODE: Generate agent configuration from natural language.

    This is the "dream" feature - LLM generates the agent graph.

    Request body:
    {
        "goal": "I need a team to research crypto stocks and write a risk report"
    }

    Returns:
    {
        "agents": [
            {
                "id": "agent-1",
                "role": "researcher",
                "name": "Crypto Researcher",
                "suggested_xy": {"x": 0.6, "y": 0.2}
            },
            ...
        ],
        "suggested_query": "Refined task description"
    }
    """
    try:
        user_goal = request.get("goal")
        if not user_goal:
            raise HTTPException(status_code=400, detail="Missing 'goal' field")

        # Use Gemini to generate agent configuration
        config = await gemini_client.generate_agent_config(user_goal)

        return config

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate agent config: {str(e)}"
        )


@app.get("/api/v1/executions")
async def list_executions():
    """List all executions (for debugging)."""
    return {
        "total": len(executions),
        "executions": [
            {
                "execution_id": exec_id,
                "status": exec_data["status"],
                "created_at": exec_data["created_at"].isoformat(),
                "agent_role": exec_data["request"].agent_role,
                "xy_position": exec_data["request"].xy_position.model_dump()
            }
            for exec_id, exec_data in executions.items()
        ]
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Agent Synapse Backend",
        "version": "0.1.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "prompt_preview": "/api/v1/prompt/preview",
            "execute_agent": "/api/v1/agent/execute",
            "stream_response": "/api/v1/agent/stream/{execution_id}",
            "generate_config": "/api/v1/agent/generate-config (GOD MODE 🎯)",
            "get_artifact": "/api/v1/artifacts/{artifact_id}",
            "list_artifacts": "/api/v1/artifacts",
            "list_executions": "/api/v1/executions",
            "docs": "/docs"
        },
        "features": {
            "linguistic_steering": "XY pad controls prompt parameters",
            "transparency": "View actual system prompts before execution",
            "dynamic_agents": "LLM generates agent configurations from natural language",
            "streaming": "Real-time token-by-token generation"
        },
        "philosophy": "Linguistic steering, not fine-tuning. Transparency over magic."
    }


if __name__ == "__main__":
    import uvicorn

    print("=" * 80)
    print("Agent Synapse Backend - Starting")
    print("=" * 80)
    print(f"Model: {settings.gemini_model}")
    print(f"Server: http://{settings.host}:{settings.port}")
    print(f"Docs: http://{settings.host}:{settings.port}/docs")
    print("=" * 80)

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )
