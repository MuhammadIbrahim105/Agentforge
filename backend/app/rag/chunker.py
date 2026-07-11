from typing import List, Dict, Any
from langchain.text_splitter import RecursiveCharacterTextSplitter
from loguru import logger


def chunk_text(
    text: str,
    filename: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50
) -> List[Dict[str, Any]]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    chunks = splitter.split_text(text)
    logger.info(f"Split '{filename}' into {len(chunks)} chunks")

    return [
        {
            "content": chunk,
            "metadata": {
                "source": filename,
                "chunk_index": i,
                "total_chunks": len(chunks)
            }
        }
        for i, chunk in enumerate(chunks)
    ]


def extract_text_from_file(file_path: str, file_type: str) -> str:
    if file_type == "txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    elif file_type == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text

    elif file_type == "docx":
        from docx import Document
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])

    elif file_type == "csv":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    elif file_type == "html":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        import re
        clean = re.sub(r'<[^>]+>', ' ', content)
        return ' '.join(clean.split())

    else:
        raise ValueError(f"Unsupported file type: {file_type}")