"""AgentPulse — AI Agent Observability Plugin

Usage:
    import agentpulse

    agentpulse.init(api_key="ap_...", agent_name="my-bot")
    agentpulse.auto_instrument()

    # All OpenAI / Anthropic / MiniMax calls are now tracked automatically.
    # Or use agentpulse.track(response) for manual tracking.
"""
__version__ = "0.3.0"

from .sdk import init, auto_instrument, track, shutdown, set_user, set_context
