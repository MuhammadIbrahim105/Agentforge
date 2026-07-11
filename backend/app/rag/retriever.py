from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from rank_bm25 import BM25Okapi
from app.rag.embedder import embed_query, embed_texts
from loguru import logger


def get_chroma_client():
    return chromadb.Client(Settings(anonymized_telemetry=False))


_chroma_client = None
_collections = {}


def get_collection(collection_name: str):
    global _chroma_client, _collections
    if _chroma_client is None:
        _chroma_client = chromadb.Client(Settings(anonymized_telemetry=False))
    if collection_name not in _collections:
        _collections[collection_name] = _chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
    return _collections[collection_name]


def add_chunks_to_collection(
    collection_name: str,
    chunks: List[Dict[str, Any]],
    doc_id: str
):
    collection = get_collection(collection_name)
    texts = [c["content"] for c in chunks]
    embeddings = embed_texts(texts)
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [c["metadata"] for c in chunks]

    collection.add(
        documents=texts,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas
    )
    logger.info(f"Added {len(chunks)} chunks to collection '{collection_name}'")
    return len(chunks)


def semantic_search(
    collection_name: str,
    query: str,
    n_results: int = 5
) -> List[Dict[str, Any]]:
    collection = get_collection(collection_name)
    query_embedding = embed_query(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count() or 1)
    )

    if not results["documents"][0]:
        return []

    return [
        {
            "content": doc,
            "source": meta.get("source", "unknown"),
            "score": 1 - dist,
            "metadata": meta
        }
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        )
    ]


def hybrid_search(
    collection_name: str,
    query: str,
    n_results: int = 5
) -> List[Dict[str, Any]]:
    semantic_results = semantic_search(collection_name, query, n_results * 2)

    if not semantic_results:
        return []

    corpus = [r["content"] for r in semantic_results]
    tokenized_corpus = [doc.lower().split() for doc in corpus]
    bm25 = BM25Okapi(tokenized_corpus)
    tokenized_query = query.lower().split()
    bm25_scores = bm25.get_scores(tokenized_query)

    for i, result in enumerate(semantic_results):
        semantic_score = result["score"]
        bm25_score = float(bm25_scores[i])
        bm25_normalized = bm25_score / (max(bm25_scores) + 1e-9)
        result["score"] = 0.7 * semantic_score + 0.3 * bm25_normalized

    semantic_results.sort(key=lambda x: x["score"], reverse=True)
    return semantic_results[:n_results]


def delete_document_chunks(collection_name: str, doc_id: str):
    collection = get_collection(collection_name)
    results = collection.get(where={"source": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
        logger.info(f"Deleted {len(results['ids'])} chunks for doc {doc_id}")