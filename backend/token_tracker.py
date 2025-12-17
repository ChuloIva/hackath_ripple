"""
Token Tracker - Cost Calculation

Estimates token usage and costs for transparency.
Uses rough approximation (4 chars per token).
"""


class TokenTracker:
    """
    Tracks token usage and calculates costs.

    Gemini 1.5 Flash pricing (as of Dec 2024):
    - Input: $0.075 per 1M tokens
    - Output: $0.30 per 1M tokens
    """

    # Gemini 1.5 Flash pricing
    COST_PER_1K_INPUT = 0.000075  # $0.075 per 1M tokens
    COST_PER_1K_OUTPUT = 0.0003   # $0.30 per 1M tokens

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """
        Rough estimation: ~4 characters per token.

        This is an approximation. For exact counts, we'd need
        the actual tokenizer, but this is sufficient for MVP.

        Args:
            text: Text to estimate tokens for

        Returns:
            Estimated token count
        """
        return len(text) // 4

    @staticmethod
    def calculate_cost(input_tokens: int, output_tokens: int) -> float:
        """
        Calculate cost in USD.

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Cost in USD (6 decimal places)
        """
        input_cost = (input_tokens / 1000) * TokenTracker.COST_PER_1K_INPUT
        output_cost = (output_tokens / 1000) * TokenTracker.COST_PER_1K_OUTPUT
        return round(input_cost + output_cost, 6)

    @staticmethod
    def get_usage_summary(input_text: str, output_text: str) -> dict:
        """
        Get complete usage summary.

        Args:
            input_text: Input/prompt text
            output_text: Generated output text

        Returns:
            Dictionary with token counts and cost
        """
        input_tokens = TokenTracker.estimate_tokens(input_text)
        output_tokens = TokenTracker.estimate_tokens(output_text)
        total_tokens = input_tokens + output_tokens
        cost = TokenTracker.calculate_cost(input_tokens, output_tokens)

        return {
            "prompt_tokens": input_tokens,
            "completion_tokens": output_tokens,
            "total_tokens": total_tokens,
            "estimated_cost": cost
        }


# Testing
if __name__ == "__main__":
    tracker = TokenTracker()

    # Test case
    input_text = "You are an analyst. Analyze crypto risks." * 10  # ~100 chars
    output_text = "Crypto markets show high volatility..." * 50     # ~500 chars

    usage = tracker.get_usage_summary(input_text, output_text)

    print("Token Usage Summary:")
    print(f"  Input tokens: {usage['prompt_tokens']}")
    print(f"  Output tokens: {usage['completion_tokens']}")
    print(f"  Total tokens: {usage['total_tokens']}")
    print(f"  Estimated cost: ${usage['estimated_cost']:.6f}")
