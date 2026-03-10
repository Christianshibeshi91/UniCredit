"""Vector store for semantic search over research results.

Uses Qdrant for storage and sentence-transformers for embeddings.
Configured for minimal RAM: on-disk payloads, memory-mapped vectors.
"""

import hashlib
import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    HnswConfigDiff,
    OptimizersConfigDiff,
    PointStruct,
    VectorParams,
)

from cluster_config import QdrantConfig

logger = logging.getLogger(__name__)

# Lazy-load embedding model to avoid import cost
_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model loaded (all-MiniLM-L6-v2, 384d)")
    return _model


def _embed(texts: list[str]) -> list[list[float]]:
    model = _get_model()
    return model.encode(texts, show_progress_bar=False).tolist()


class VectorStore:
    """Qdrant-backed vector store with semantic search."""

    def __init__(self, config: QdrantConfig = None):
        self.config = config or QdrantConfig()
        self.client: Optional[QdrantClient] = None

    async def start(self):
        self.client = QdrantClient(
            host=self.config.host,
            port=self.config.port,
        )
        self._ensure_collection()
        logger.info("Vector store connected at %s:%d",
                     self.config.host, self.config.port)

    def _ensure_collection(self):
        """Create collection if it doesn't exist."""
        collections = [c.name for c in self.client.get_collections().collections]
        if self.config.collection not in collections:
            self.client.create_collection(
                collection_name=self.config.collection,
                vectors_config=VectorParams(
                    size=self.config.embedding_dim,
                    distance=Distance.COSINE,
                    on_disk=True,
                ),
                hnsw_config=HnswConfigDiff(
                    m=8,              # Lower than default 16 to save RAM
                    ef_construct=64,  # Lower than default 100
                    on_disk=True,
                ),
                optimizers_config=OptimizersConfigDiff(
                    memmap_threshold=1000,  # Memory-map segments > 1000 vectors
                ),
                on_disk_payload=True,
            )
            logger.info("Created collection '%s'", self.config.collection)

    async def store(self, items: list[dict]) -> int:
        """Store research results with vector embeddings.

        Each item should have at minimum: title, url, summary.
        Returns number of items stored.
        """
        if not items:
            return 0

        texts = [
            f"{item.get('title', '')} {item.get('summary', '')}"
            for item in items
        ]
        vectors = _embed(texts)

        points = []
        for item, vector in zip(items, vectors):
            point_id = hashlib.md5(
                (item.get("url", "") + item.get("title", "")).encode()
            ).hexdigest()
            points.append(PointStruct(
                id=point_id,
                vector=vector,
                payload=item,
            ))

        self.client.upsert(
            collection_name=self.config.collection,
            points=points,
        )
        logger.info("Stored %d items in vector store", len(points))
        return len(points)

    async def search(self, query: str, top_k: int = 10) -> list[dict]:
        """Semantic search over stored results."""
        query_vector = _embed([query])[0]

        results = self.client.search(
            collection_name=self.config.collection,
            query_vector=query_vector,
            limit=top_k,
        )

        return [
            {**hit.payload, "_score": hit.score}
            for hit in results
        ]

    async def count(self) -> int:
        info = self.client.get_collection(self.config.collection)
        return info.points_count

    async def delete_collection(self):
        self.client.delete_collection(self.config.collection)
        logger.info("Deleted collection '%s'", self.config.collection)

    async def stop(self):
        if self.client:
            self.client.close()
