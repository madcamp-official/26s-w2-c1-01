import os

import httpx

OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings"
EMBEDDING_MODEL = "openai/text-embedding-3-small"


class EmbeddingError(Exception):
    pass


def create_embedding(text: str) -> list[float]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise EmbeddingError("OPENROUTER_API_KEY is not set.")

    response = httpx.post(
        OPENROUTER_EMBEDDINGS_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={"model": EMBEDDING_MODEL, "input": text},
        timeout=30.0,
    )
    response.raise_for_status()
    body = response.json()
    return body["data"][0]["embedding"]


async def create_embedding_async(text: str) -> list[float]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise EmbeddingError("OPENROUTER_API_KEY is not set.")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            OPENROUTER_EMBEDDINGS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"model": EMBEDDING_MODEL, "input": text},
        )
    response.raise_for_status()
    body = response.json()
    return body["data"][0]["embedding"]
