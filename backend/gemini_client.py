"""
Gemini Client - LLM Integration with Streaming

Handles all interactions with Google's Gemini API.
Supports streaming for real-time token generation.
"""

import google.generativeai as genai
from typing import AsyncGenerator, Optional
import asyncio
from config import settings


class GeminiClient:
    """
    Wrapper for Gemini API with streaming support.

    Uses gemini-1.5-flash for fast, cost-effective generation.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        """
        Initialize Gemini client.

        Args:
            api_key: Google Gemini API key
            model_name: Model to use (default: gemini-1.5-flash)
        """
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.model_name = model_name

    async def stream_generate(
        self,
        prompt: str,
        temperature: float = 0.5,
        max_output_tokens: int = 2048
    ) -> AsyncGenerator[str, None]:
        """
        Stream tokens from Gemini API.

        Args:
            prompt: The complete prompt (system + user combined)
            temperature: Sampling temperature (0.0 to 1.0)
            max_output_tokens: Maximum tokens to generate

        Yields:
            Text chunks as they're generated
        """
        generation_config = genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            top_p=0.95,
            top_k=40,
        )

        try:
            # Gemini's generate_content with stream=True
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config,
                stream=True
            )

            # Yield chunks as they arrive
            for chunk in response:
                if chunk.text:
                    # Gemini is synchronous, but we yield in async context
                    await asyncio.sleep(0)  # Allow event loop to process
                    yield chunk.text

        except Exception as e:
            # Handle API errors gracefully
            raise Exception(f"Gemini API error: {str(e)}")

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.5,
        max_output_tokens: int = 2048
    ) -> str:
        """
        Non-streaming generation (for prompts where we need full response).

        Args:
            prompt: The complete prompt
            temperature: Sampling temperature
            max_output_tokens: Maximum tokens

        Returns:
            Complete generated text
        """
        generation_config = genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            top_p=0.95,
            top_k=40,
        )

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config,
            )
            return response.text

        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")

    async def generate_agent_config(
        self,
        user_goal: str
    ) -> dict:
        """
        Use Gemini to "dream" an agent configuration based on user goal.

        This is the "God Mode" feature - LLM generates the agent graph.

        Args:
            user_goal: User's natural language description of what they want

        Returns:
            Dictionary with agent configuration
        """
        system_prompt = """You are an AI architect that designs agent teams.

Given a user's goal, output a JSON configuration for a team of AI agents.

RULES:
1. Use 1-3 agents maximum (keep it simple)
2. Each agent should have:
   - id: unique identifier (e.g., "agent-1")
   - role: one of ["analyst", "writer", "researcher"]
   - name: descriptive name (e.g., "Market Analyst")
   - suggested_xy: recommended XY position as {x: 0.0-1.0, y: 0.0-1.0}
     - x: density (0=summary, 1=verbose)
     - y: creativity (0=factual, 1=creative)

3. Suggest appropriate connections between agents if needed

OUTPUT FORMAT (strict JSON):
{
  "agents": [
    {
      "id": "agent-1",
      "role": "researcher",
      "name": "Data Researcher",
      "suggested_xy": {"x": 0.6, "y": 0.2}
    }
  ],
  "suggested_query": "A refined version of the user's goal as a clear task"
}

IMPORTANT: Output ONLY valid JSON, no markdown, no explanation."""

        prompt = f"""{system_prompt}

USER GOAL:
{user_goal}

JSON OUTPUT:
"""

        try:
            # Use non-streaming generation for JSON response
            response_text = await self.generate(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for structured output
                max_output_tokens=1024
            )

            # Parse JSON response
            import json

            # Clean response (remove markdown code blocks if present)
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            response_text = response_text.strip()

            config = json.loads(response_text)
            return config

        except json.JSONDecodeError as e:
            # Fallback to default single agent if JSON parsing fails
            return {
                "agents": [
                    {
                        "id": "agent-1",
                        "role": "analyst",
                        "name": "General Agent",
                        "suggested_xy": {"x": 0.5, "y": 0.5}
                    }
                ],
                "suggested_query": user_goal
            }
        except Exception as e:
            raise Exception(f"Failed to generate agent config: {str(e)}")


# Global client instance
gemini_client = GeminiClient(
    api_key=settings.gemini_api_key,
    model_name=settings.gemini_model
)


# Testing
if __name__ == "__main__":
    import asyncio

    async def test_streaming():
        """Test streaming generation"""
        print("=" * 80)
        print("Testing Gemini Streaming")
        print("=" * 80)

        client = GeminiClient(
            api_key=settings.gemini_api_key,
            model_name=settings.gemini_model
        )

        prompt = """You are a helpful analyst. Provide a brief analysis of cryptocurrency market risks.

Keep it under 100 words."""

        print("\nStreaming response:")
        async for chunk in client.stream_generate(prompt, temperature=0.5):
            print(chunk, end="", flush=True)
        print("\n")

    async def test_agent_generation():
        """Test dynamic agent generation"""
        print("=" * 80)
        print("Testing Dynamic Agent Generation")
        print("=" * 80)

        client = GeminiClient(
            api_key=settings.gemini_api_key,
            model_name=settings.gemini_model
        )

        user_goal = "I need a team to research crypto stocks and write a risk report"

        print(f"\nUser Goal: {user_goal}\n")
        print("Generating agent configuration...")

        config = await client.generate_agent_config(user_goal)

        import json
        print("\nGenerated Config:")
        print(json.dumps(config, indent=2))

    # Run tests
    print("\n" + "=" * 80)
    print("GEMINI CLIENT TESTS")
    print("=" * 80 + "\n")

    asyncio.run(test_streaming())
    asyncio.run(test_agent_generation())
