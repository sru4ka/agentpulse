import os
import time
import glob
import logging
from datetime import datetime

from .config import load_config
from .parser import parse_line
from .sender import EventSender

logger = logging.getLogger("agentpulse")

class AgentPulseDaemon:
    def __init__(self, config_path: str = None):
        self.config = load_config(config_path) if config_path else load_config()
        self.sender = EventSender(
            api_key=self.config["api_key"],
            endpoint=self.config["endpoint"],
            agent_name=self.config["agent_name"],
            framework=self.config["framework"],
        )
        self.running = False
        self.file_positions: dict[str, int] = {}

    def get_latest_log_file(self) -> str | None:
        log_path = self.config["log_path"]
        today = datetime.now().strftime("%Y-%m-%d")

        # Try exact today's file first
        today_file = os.path.join(log_path, f"openclaw-{today}.log")
        if os.path.exists(today_file):
            return today_file

        # Fall back to most recent log file
        pattern = os.path.join(log_path, "openclaw-*.log")
        files = sorted(glob.glob(pattern), reverse=True)
        return files[0] if files else None

    def tail_file(self, filepath: str) -> list[str]:
        """Read new lines from file since last position."""
        if filepath not in self.file_positions:
            # Start from end of file on first read (don't replay history)
            size = os.path.getsize(filepath)
            self.file_positions[filepath] = size
            return []

        try:
            with open(filepath, "r") as f:
                f.seek(self.file_positions[filepath])
                new_lines = f.readlines()
                self.file_positions[filepath] = f.tell()
                return new_lines
        except Exception as e:
            logger.error(f"Error reading {filepath}: {e}")
            return []

    def process_lines(self, lines: list[str]):
        """Parse log lines and buffer events."""
        for line in lines:
            event = parse_line(line)
            if event:
                self.sender.add_event(event)
                logger.debug(f"Parsed event: {event['model']} ({event['status']})")

    def run(self):
        """Main daemon loop."""
        if not self.config.get("api_key"):
            logger.error("No API key configured. Run 'agentpulse init' first.")
            return

        self.running = True
        poll_interval = self.config.get("poll_interval", 5)
        batch_interval = self.config.get("batch_interval", 30)

        logger.info(f"AgentPulse daemon started")
        logger.info(f"Watching: {self.config['log_path']}")
        logger.info(f"Agent: {self.config['agent_name']} ({self.config['framework']})")
        logger.info(f"Endpoint: {self.config['endpoint']}")
        logger.info(f"Poll interval: {poll_interval}s, Batch interval: {batch_interval}s")

        while self.running:
            try:
                log_file = self.get_latest_log_file()
                if log_file:
                    new_lines = self.tail_file(log_file)
                    if new_lines:
                        self.process_lines(new_lines)

                if self.sender.should_flush(batch_interval):
                    self.sender.flush()

                time.sleep(poll_interval)

            except KeyboardInterrupt:
                logger.info("Shutting down...")
                self.running = False
                self.sender.flush()
                break
            except Exception as e:
                logger.error(f"Daemon error: {e}")
                time.sleep(poll_interval)

    def stop(self):
        self.running = False
        self.sender.flush()
