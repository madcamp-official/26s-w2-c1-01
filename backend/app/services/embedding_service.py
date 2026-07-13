from functools import lru_cache

from openai import OpenAI

EMBEDDING_MODEL = "text-embedding-3-small"


@lru_cache
def get_openai_client() -> OpenAI:
    return OpenAI()


def create_embedding(text: str) -> list[float]:
    response = get_openai_client().embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding
