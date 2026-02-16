import json
import time
import logging
import urllib.request
import urllib.error
from typing import List

logger = logging.getLogger("agentpulse")


class _PostRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Follow 307/308 redirects while preserving POST method and body."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if code in (307, 308):
            # Strip Host header — carrying the old Host to the redirect
            # target causes the request to fail on different domains.
            new_headers = {
                k: v for k, v in req.header_items()
                if k.lower() not in ("host", "content-length")
            }
            new_headers["Content-length"] = str(len(req.data)) if req.data else "0"
            return urllib.request.Request(
                newurl, data=req.data,
                headers=new_headers,
                method=req.get_method(),
            )
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_PostRedirectHandler)


class EventSender:
    def __init__(self, api_key: str, endpoint: str, agent_name: str, framework: str):
        self.api_key = api_key
        self.endpoint = endpoint
        self.agent_name = agent_name
        self.framework = framework
        self.buffer: List[dict] = []
        self.last_send = time.time()
        self.events_sent = 0
        self.errors = 0

    def add_event(self, event: dict):
        self.buffer.append(event)

    def should_flush(self, batch_interval: int = 30) -> bool:
        if len(self.buffer) >= 50:
            return True
        if self.buffer and (time.time() - self.last_send) >= batch_interval:
            return True
        return False

    def flush(self) -> bool:
        if not self.buffer:
            return True

        payload = {
            "api_key": self.api_key,
            "agent_name": self.agent_name,
            "framework": self.framework,
            "events": self.buffer,
        }

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with _opener.open(req, timeout=10) as resp:
                if resp.status == 200:
                    result = json.loads(resp.read().decode())
                    self.events_sent += len(self.buffer)
                    logger.info(f"Sent {len(self.buffer)} events (total: {self.events_sent})")
                    self.buffer = []
                    self.last_send = time.time()
                    return True
                else:
                    self.errors += 1
                    logger.error(f"API returned status {resp.status}")
                    return False
        except urllib.error.HTTPError as e:
            self.errors += 1
            logger.error(f"HTTP error: {e.code} - {e.reason}")
            return False
        except Exception as e:
            self.errors += 1
            logger.error(f"Send failed: {e}")
            return False
