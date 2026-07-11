from typing import List, Dict, Any, Optional
from groq import Groq
from app.core.config import settings
from app.rag.retriever import hybrid_search, semantic_search
from loguru import logger


def get_groq_client():
    return Groq(api_key=settings.GROQ_API_KEY)


def generate_answer(
    query: str,
    context_chunks: List[Dict[str, Any]],
    model: str = "llama-3.3-70b-versatile"
) -> Dict[str, Any]:
    if not context_chunks:
        return {
            "answer": "I could not find relevant information in the knowledge base to answer your question.",
            "sources": [],
            "tokens_used": 0
        }

    context = "\n\n".join([
        f"[Source: {chunk['source']}, Score: {chunk['score']:.2f}]\n{chunk['content']}"
        for chunk in context_chunks
    ])

    prompt = f"""You are an expert AI assistant. Answer the user's question based ONLY on the provided context.
If the context doesn't contain enough information, say so clearly.
Always cite which source your answer comes from.

Context:
{context}

Question: {query}

Answer (be concise and cite sources):"""

    client = get_groq_client()
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1000
    )

    answer = response.choices[0].message.content
    tokens_used = response.usage.total_tokens if response.usage else 0

    sources = list(set([chunk["source"] for chunk in context_chunks]))

    return {
        "answer": answer,
        "sources": sources,
        "tokens_used": tokens_used,
        "chunks_used": len(context_chunks)
    }


def run_rag_pipeline(
    query: str,
    collection_name: str,
    model: str = "llama-3.3-70b-versatile",
    n_results: int = 5,
    use_hybrid: bool = True
) -> Dict[str, Any]:
    logger.info(f"Running RAG pipeline for query: '{query[:50]}...'")

    if use_hybrid:
        chunks = hybrid_search(collection_name, query, n_results)
    else:
        chunks = semantic_search(collection_name, query, n_results)

    if not chunks:
        return {
            "answer": "No documents found in the knowledge base. Please upload some documents first.",
            "sources": [],
            "tokens_used": 0,
            "chunks_used": 0
        }

    result = generate_answer(query, chunks, model)
    logger.info(f"RAG pipeline complete. Tokens used: {result['tokens_used']}")
    return result