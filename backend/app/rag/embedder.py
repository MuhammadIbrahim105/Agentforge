from typing import List
import math
from collections import Counter
from loguru import logger

VOCAB_SIZE = 384

FIXED_VOCAB = [
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "not",
    "only", "same", "so", "than", "too", "very", "just", "but", "and",
    "or", "because", "if", "while", "although", "though", "unless", "until",
    "since", "about", "against", "among", "around", "without", "within",
    "along", "following", "across", "behind", "beyond", "plus", "except",
    "up", "down", "agent", "forge", "agentforge", "ai", "artificial",
    "intelligence", "machine", "learning", "model", "models", "data",
    "pipeline", "pipelines", "rag", "retrieval", "augmented", "generation",
    "vector", "database", "embedding", "embeddings", "search", "semantic",
    "hybrid", "keyword", "document", "documents", "upload", "process",
    "chunk", "chunks", "collection", "index", "query", "answer", "response",
    "user", "users", "platform", "system", "api", "endpoint", "request",
    "project", "projects", "knowledge", "base", "workflow", "workflows",
    "orchestration", "multi", "agent", "agents", "llm", "groq", "openai",
    "chromadb", "chroma", "pinecone", "langchain", "langgraph", "fastapi",
    "python", "react", "typescript", "docker", "aws", "deployment", "build",
    "production", "inference", "fine", "tuning", "lora", "qlora", "hugging",
    "face", "transformer", "transformers", "sentence", "text", "token",
    "tokens", "context", "prompt", "completion", "chat", "message", "input",
    "output", "result", "results", "score", "scores", "rank", "ranking",
    "bm25", "cosine", "similarity", "distance", "dimension", "dimensions",
    "support", "supports", "use", "uses", "used", "using", "create", "created",
    "build", "built", "deploy", "deployed", "run", "running", "process",
    "processing", "upload", "uploading", "download", "store", "storage",
    "retrieve", "retrieval", "generate", "generation", "analyze", "analysis",
    "train", "training", "test", "testing", "evaluate", "evaluation",
    "multimodal", "image", "audio", "video", "vision", "speech", "whisper",
    "clip", "format", "pdf", "txt", "docx", "csv", "html", "file", "files",
    "Muhammad", "Ibrahim", "engineer", "engineering", "developer", "skills",
    "this", "that", "these", "those", "it", "its", "which", "who", "what",
    "combine", "combines", "combined", "combining", "connect", "connects",
    "demonstrate", "demonstrates", "demonstrated", "allow", "allows",
    "enable", "enables", "provide", "provides", "include", "includes",
    "contain", "contains", "perform", "performs", "complete", "completes",
    "new", "old", "first", "last", "next", "previous", "current", "latest",
    "high", "low", "large", "small", "fast", "slow", "good", "bad",
    "free", "open", "source", "local", "remote", "cloud", "server", "client",
    "one", "two", "three", "four", "five", "many", "several", "multiple",
    "single", "full", "complete", "partial", "main", "primary", "secondary",
]

while len(FIXED_VOCAB) < VOCAB_SIZE:
    FIXED_VOCAB.append(f"token_{len(FIXED_VOCAB)}")

FIXED_VOCAB = FIXED_VOCAB[:VOCAB_SIZE]


def _tfidf_vector(text: str) -> List[float]:
    tokens = text.lower().split()
    tf = Counter(tokens)
    total = len(tokens) + 1
    vector = [tf.get(word, 0) / total for word in FIXED_VOCAB]
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


def embed_texts(texts: List[str]) -> List[List[float]]:
    embeddings = [_tfidf_vector(text) for text in texts]
    logger.info(f"Generated {len(embeddings)} embeddings of dimension {VOCAB_SIZE}")
    return embeddings


def embed_query(query: str) -> List[float]:
    return _tfidf_vector(query)