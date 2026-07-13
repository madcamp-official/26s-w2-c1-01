import json
import os
import re
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "anthropic/claude-haiku-4.5"
DEFAULT_TIMEOUT = 30.0


class LLMError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


_JSON_FENCE_BLOCK_PATTERN = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.IGNORECASE | re.DOTALL)
_JSON_FENCE_PATTERN = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _strip_json_fence(content: str) -> str:
    content = content.strip()
    fence_match = _JSON_FENCE_BLOCK_PATTERN.search(content)
    if fence_match:
        return fence_match.group(1).strip()
    stripped = _JSON_FENCE_PATTERN.sub("", content).strip()
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start != -1 and end != -1 and end > start:
        return stripped[start : end + 1]
    return stripped


def _api_key() -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise LLMError("LLM_NOT_CONFIGURED", "OPENROUTER_API_KEY is not set.")
    return api_key


async def complete_json(
    system_prompt: str,
    user_prompt: str,
    timeout: float = DEFAULT_TIMEOUT,
    image_data_urls: list[str] | None = None,
) -> dict[str, Any]:
    api_key = _api_key()
    model = os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)

    if image_data_urls:
        user_content: Any = [{"type": "text", "text": user_prompt}] + [
            {"type": "image_url", "image_url": {"url": image_data_url}}
            for image_data_url in image_data_urls
        ]
    else:
        user_content = user_prompt

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            OPENROUTER_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            },
        )

    if response.status_code in {401, 403}:
        raise LLMError("LLM_AUTH_FAILED", "OpenRouter API key was rejected.")
    if response.status_code == 429:
        raise LLMError("LLM_RATE_LIMITED", "OpenRouter rate limit was hit.")
    if response.is_error:
        raise LLMError("LLM_REQUEST_FAILED", f"OpenRouter request failed with {response.status_code}.")

    body = response.json()
    choices = body.get("choices") or []
    if not choices:
        raise LLMError("LLM_EMPTY_RESPONSE", "OpenRouter returned no choices.")

    content = choices[0].get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise LLMError("LLM_EMPTY_RESPONSE", "OpenRouter returned an empty message.")

    try:
        return json.loads(_strip_json_fence(content))
    except json.JSONDecodeError as exc:
        raise LLMError("LLM_INVALID_JSON", "OpenRouter response was not valid JSON.") from exc
