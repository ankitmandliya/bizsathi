from typing import Any


def process_communication_task(channel: str, recipient: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "processed",
        "channel": channel,
        "recipient": recipient,
    }
