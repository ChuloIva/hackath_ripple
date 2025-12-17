"""
Prompt Engine - The Core Innovation

Maps XY pad coordinates to explicit instruction gradients.
This is linguistic steering, not fine-tuning.

X-Axis: Data Density (0 = summary, 1 = verbose)
Y-Axis: Creativity Level (0 = factual, 1 = creative)
"""

from typing import Dict


class PromptEngine:
    """Builds dynamic system prompts based on XY pad position."""

    BASE_PROMPTS: Dict[str, str] = {
        "analyst": "You are a financial analyst agent specialized in data-driven insights and market analysis.",
        "writer": "You are a creative writer agent focused on compelling narratives and engaging content.",
        "researcher": "You are a research agent that gathers, synthesizes, and analyzes information from multiple sources."
    }

    @staticmethod
    def get_density_instruction(x: float) -> str:
        """
        Map X-axis (0.0 to 1.0) to data density instructions.

        Args:
            x: Density value (0 = summary, 1 = verbose)

        Returns:
            Instruction string for output density
        """
        if x < 0.3:
            return """OUTPUT_DENSITY: EXECUTIVE_SUMMARY
- Provide only key insights and conclusions
- Maximum 3-5 bullet points or brief paragraphs
- Avoid technical details unless absolutely critical
- Focus on actionable recommendations
- Keep total response under 200 words"""

        elif x < 0.7:
            return """OUTPUT_DENSITY: DETAILED_REPORT
- Provide comprehensive analysis with supporting evidence
- Include relevant context and methodology
- Balance depth with readability
- Use structured formatting (headings, lists, paragraphs)
- Target 300-500 words with clear organization"""

        else:  # x >= 0.7
            return """OUTPUT_DENSITY: RAW_VERBOSE
- Include all relevant data points and calculations
- Show your reasoning process step-by-step
- Provide extensive context and background information
- Include data sources, assumptions, and confidence levels
- Aim for thorough coverage (500+ words if needed)"""

    @staticmethod
    def get_creativity_instruction(y: float) -> str:
        """
        Map Y-axis (0.0 to 1.0) to creativity instructions.

        Args:
            y: Creativity value (0 = factual, 1 = creative)

        Returns:
            Instruction string for creativity level
        """
        if y < 0.3:
            return """CREATIVITY_LEVEL: STRICTLY_FACTUAL
- Base all statements on verified data and established facts
- Avoid speculation or hypothetical scenarios
- Use conservative, evidence-based language (e.g., "data shows" rather than "might indicate")
- Cite sources or note data limitations when appropriate
- Maintain objectivity and avoid interpretive leaps
- Recommended Temperature: 0.2"""

        elif y < 0.7:
            return """CREATIVITY_LEVEL: BALANCED_INSIGHT
- Blend factual analysis with reasonable inferences
- Use moderate speculation, clearly labeled as such
- Consider multiple perspectives and interpretations
- Balance empirical data with thoughtful extrapolation
- Acknowledge uncertainty where it exists
- Recommended Temperature: 0.5"""

        else:  # y >= 0.7
            return """CREATIVITY_LEVEL: SPECULATIVE_CREATIVE
- Generate novel insights and unexpected connections
- Explore hypothetical scenarios and "what-if" thinking
- Use creative framing, metaphors, and analogies
- Challenge conventional interpretations
- Embrace imaginative reasoning while noting speculative elements
- Recommended Temperature: 0.9"""

    @staticmethod
    def get_temperature(y: float) -> float:
        """
        Map Y-axis to temperature parameter.

        Args:
            y: Creativity value (0 = factual, 1 = creative)

        Returns:
            Temperature value (0.2 to 0.9)
        """
        # Linear mapping: y=0 → 0.2, y=1 → 0.9
        return 0.2 + (y * 0.7)

    def build_prompt_components(
        self,
        agent_role: str,
        x: float,
        y: float,
        user_query: str
    ) -> Dict[str, str]:
        """
        Build all prompt components for transparency.

        Args:
            agent_role: The role of the agent (analyst, writer, researcher)
            x: Density axis value (0.0 to 1.0)
            y: Creativity axis value (0.0 to 1.0)
            user_query: The user's query

        Returns:
            Dictionary with all prompt components
        """
        base_prompt = self.BASE_PROMPTS.get(agent_role, self.BASE_PROMPTS["analyst"])
        creativity_modifier = self.get_creativity_instruction(y)
        density_modifier = self.get_density_instruction(x)

        # Assemble final system prompt
        final_system_prompt = f"""{base_prompt}

{creativity_modifier}

{density_modifier}

CONSTRAINTS:
- Respond in Markdown format for readability
- Be transparent about uncertainty and assumptions
- Maintain professional tone while matching the creativity level
"""

        return {
            "base_prompt": base_prompt,
            "creativity_modifier": creativity_modifier,
            "density_modifier": density_modifier,
            "final_system_prompt": final_system_prompt,
            "user_query": user_query,
            "temperature": self.get_temperature(y)
        }

    def build_full_prompt(
        self,
        agent_role: str,
        x: float,
        y: float,
        user_query: str
    ) -> str:
        """
        Build complete prompt for Gemini (system + user combined).

        Gemini doesn't have separate system/user roles,
        so we combine them into a single prompt.

        Args:
            agent_role: The role of the agent
            x: Density axis value
            y: Creativity axis value
            user_query: The user's query

        Returns:
            Complete prompt string for Gemini
        """
        components = self.build_prompt_components(agent_role, x, y, user_query)

        return f"""{components['final_system_prompt']}

---
USER QUERY:
{user_query}

---
RESPONSE:
"""


# Standalone testing
if __name__ == "__main__":
    engine = PromptEngine()

    # Test corner cases
    print("=" * 80)
    print("TEST 1: Factual + Summary (x=0, y=0)")
    print("=" * 80)
    result = engine.build_prompt_components("analyst", 0.0, 0.0, "Analyze crypto market risks")
    print(f"Temperature: {result['temperature']}")
    print(f"\n{result['final_system_prompt']}\n")

    print("=" * 80)
    print("TEST 2: Creative + Verbose (x=1, y=1)")
    print("=" * 80)
    result = engine.build_prompt_components("analyst", 1.0, 1.0, "Analyze crypto market risks")
    print(f"Temperature: {result['temperature']}")
    print(f"\n{result['final_system_prompt']}\n")

    print("=" * 80)
    print("TEST 3: Balanced (x=0.5, y=0.5)")
    print("=" * 80)
    result = engine.build_prompt_components("writer", 0.5, 0.5, "Write about AI trends")
    print(f"Temperature: {result['temperature']}")
    print(f"\n{result['final_system_prompt']}\n")
