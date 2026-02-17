"""
Bootstrap module injected by `agentpulse run`.

This file is placed in a temporary directory that's prepended to PYTHONPATH.
Python loads sitecustomize.py automatically on startup, so this runs before
the user's script — patching OpenAI/Anthropic SDKs transparently.
"""
import os as _os
import sys as _sys


def _agentpulse_bootstrap():
    # Add agentpulse package to sys.path so it's importable
    _pkg_path = _os.environ.get("_AGENTPULSE_PKG_PATH", "")
    if _pkg_path and _pkg_path not in _sys.path:
        _sys.path.insert(0, _pkg_path)

    try:
        import agentpulse
        agentpulse.init()
        agentpulse.auto_instrument()
    except Exception:
        pass  # never crash the user's script


_agentpulse_bootstrap()
del _agentpulse_bootstrap
