from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.project import Project
from pydantic import BaseModel
from groq import Groq
from loguru import logger

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    mode: str = "docs"
    project_id: str
    n_results: int = 5


def web_search(query: str) -> list:
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        results = client.search(query=query, max_results=5)
        return results.get("results", [])
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return []


def docs_search(query: str, collection_name: str, n_results: int = 5) -> dict:
    try:
        from app.rag.pipeline import run_rag_pipeline
        return run_rag_pipeline(
            query=query,
            collection_name=collection_name,
            n_results=n_results,
            use_hybrid=True
        )
    except Exception as e:
        logger.error(f"Docs search failed: {e}")
        return {"answer": "", "sources": [], "tokens_used": 0, "chunks_used": 0}


def generate_web_answer(query: str, web_results: list) -> dict:
    if not web_results:
        return {
            "answer": "No web results found for your query.",
            "sources": [],
            "tokens_used": 0
        }

    client = Groq(api_key=settings.GROQ_API_KEY)

    context = "\n\n".join([
        f"[Source: {r.get('url', 'unknown')}]\n{r.get('content', '')[:500]}"
        for r in web_results[:5]
    ])

    prompt = f"""You are a helpful AI assistant. Answer the question using ONLY the web search results provided.
Always cite which URL your information comes from.

Web Search Results:
{context}

Question: {query}

Answer (cite sources):"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1000
    )

    answer = response.choices[0].message.content
    tokens_used = response.usage.total_tokens if response.usage else 0
    sources = [r.get("url", "") for r in web_results if r.get("url")]

    return {"answer": answer, "sources": sources, "tokens_used": tokens_used}


def generate_hybrid_answer(query: str, web_results: list, doc_result: dict) -> dict:
    client = Groq(api_key=settings.GROQ_API_KEY)

    web_context = "\n\n".join([
        f"[WEB - {r.get('url', 'unknown')}]\n{r.get('content', '')[:400]}"
        for r in web_results[:3]
    ])

    doc_context = f"[PRIVATE DOCUMENTS]\n{doc_result.get('answer', 'No relevant documents found')}"

    prompt = f"""You are a helpful AI assistant with access to both private documents and web search results.
Answer the question below. CLEARLY LABEL which information comes from private documents vs web sources.

Private Document Results:
{doc_context}

Web Search Results:
{web_context}

Question: {query}

Answer (clearly distinguish between private data and web sources):"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1200
    )

    answer = response.choices[0].message.content
    tokens_used = response.usage.total_tokens if response.usage else 0
    web_sources = [r.get("url", "") for r in web_results if r.get("url")]
    doc_sources = doc_result.get("sources", [])

    return {
        "answer": answer,
        "sources": doc_sources + web_sources,
        "web_sources": web_sources,
        "doc_sources": doc_sources,
        "tokens_used": tokens_used
    }


@router.post("/query")
def smart_search(
    payload: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == payload.project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.mode == "docs":
        logger.info(f"Docs-only search: {payload.query[:50]}")
        result = docs_search(payload.query, project.chroma_collection, payload.n_results)
        return {
            "answer": result["answer"],
            "sources": result["sources"],
            "tokens_used": result["tokens_used"],
            "mode": "docs",
            "web_sources": [],
            "doc_sources": result["sources"]
        }

    elif payload.mode == "web":
        logger.info(f"Web-only search: {payload.query[:50]}")
        web_results = web_search(payload.query)
        result = generate_web_answer(payload.query, web_results)
        return {
            "answer": result["answer"],
            "sources": result["sources"],
            "tokens_used": result["tokens_used"],
            "mode": "web",
            "web_sources": result["sources"],
            "doc_sources": []
        }

    elif payload.mode == "hybrid":
        logger.info(f"Hybrid search: {payload.query[:50]}")
        web_results = web_search(payload.query)
        doc_result = docs_search(payload.query, project.chroma_collection, payload.n_results)
        result = generate_hybrid_answer(payload.query, web_results, doc_result)
        return {
            "answer": result["answer"],
            "sources": result["sources"],
            "tokens_used": result["tokens_used"],
            "mode": "hybrid",
            "web_sources": result.get("web_sources", []),
            "doc_sources": result.get("doc_sources", [])
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Use: docs, web, or hybrid")