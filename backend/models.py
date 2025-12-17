"""
Pydantic Models - Data Validation & API Contracts

Defines the request/response schemas for all endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class XYPadPosition(BaseModel):
    """XY pad coordinates (0.0 to 1.0)"""
    x: float = Field(
        ge=0.0,
        le=1.0,
        description="Density axis (0=summary, 1=verbose)"
    )
    y: float = Field(
        ge=0.0,
        le=1.0,
        description="Creativity axis (0=factual, 1=creative)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"x": 0.3, "y": 0.7},
                {"x": 0.0, "y": 0.0},
                {"x": 1.0, "y": 1.0}
            ]
        }
    }


class AgentExecutionRequest(BaseModel):
    """Request to execute agent with dynamic prompt"""
    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User query for the agent to process"
    )
    xy_position: XYPadPosition = Field(
        ...,
        description="XY pad position for prompt steering"
    )
    agent_role: Literal["analyst", "writer", "researcher"] = Field(
        default="analyst",
        description="Agent role/persona"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "query": "Analyze Q4 crypto market risks",
                    "xy_position": {"x": 0.7, "y": 0.3},
                    "agent_role": "analyst"
                }
            ]
        }
    }


class PromptComponents(BaseModel):
    """Transparent breakdown of the system prompt"""
    base_prompt: str = Field(..., description="Base agent role prompt")
    creativity_modifier: str = Field(..., description="Creativity instruction")
    density_modifier: str = Field(..., description="Density instruction")
    final_system_prompt: str = Field(..., description="Complete assembled prompt")
    user_query: str = Field(..., description="User query")
    temperature: float = Field(..., ge=0.0, le=1.0, description="Temperature parameter")


class TokenUsage(BaseModel):
    """Token tracking for transparency"""
    prompt_tokens: int = Field(..., ge=0, description="Estimated input tokens")
    completion_tokens: int = Field(..., ge=0, description="Estimated output tokens")
    total_tokens: int = Field(..., ge=0, description="Total tokens used")
    estimated_cost: float = Field(..., ge=0.0, description="Estimated cost in USD")


class ArtifactMetadata(BaseModel):
    """Artifact metadata"""
    artifact_id: str = Field(..., description="Unique artifact identifier")
    filename: str = Field(..., description="Filename with timestamp")
    content: str = Field(..., description="Full artifact content")
    created_at: datetime = Field(..., description="Creation timestamp")
    file_type: Literal["markdown", "json", "text"] = Field(
        default="markdown",
        description="File type"
    )
    size_bytes: int = Field(..., ge=0, description="File size in bytes")
    agent_role: str = Field(..., description="Agent that created this artifact")


class AgentExecutionResponse(BaseModel):
    """Response from agent execution request"""
    execution_id: str = Field(..., description="Unique execution identifier")
    prompt_components: PromptComponents = Field(..., description="Transparent prompt breakdown")
    stream_url: str = Field(..., description="URL for SSE streaming")


class StreamTokenChunk(BaseModel):
    """Individual token chunk in SSE stream"""
    content: str = Field(..., description="Text content")


class StreamMetadataChunk(BaseModel):
    """Metadata chunk in SSE stream"""
    tokens_so_far: int = Field(..., description="Tokens generated so far")
    estimated_cost: float = Field(..., description="Cost estimate so far")


class StreamCompleteChunk(BaseModel):
    """Completion chunk in SSE stream"""
    artifact_id: str = Field(..., description="Created artifact ID")
    token_usage: TokenUsage = Field(..., description="Final token usage")


class StreamErrorChunk(BaseModel):
    """Error chunk in SSE stream"""
    error: str = Field(..., description="Error message")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Health status")
    model: str = Field(..., description="Gemini model in use")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PromptPreviewRequest(BaseModel):
    """Request for prompt preview (same as execution but no execution)"""
    query: str = Field(..., min_length=1, max_length=2000)
    xy_position: XYPadPosition
    agent_role: Literal["analyst", "writer", "researcher"] = "analyst"
