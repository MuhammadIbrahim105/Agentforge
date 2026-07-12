from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.document import Document, DocumentType, DocumentStatus
from app.schemas.document import DocumentResponse, SearchRequest
import uuid
import os

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{project_id}/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "txt", "docx", "csv", "html"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    doc_id = str(uuid.uuid4())
    local_path = f"{UPLOAD_DIR}/{doc_id}_{file.filename}"

    contents = await file.read()
    with open(local_path, "wb") as f:
        f.write(contents)

    doc = Document(
        id=doc_id,
        project_id=project_id,
        user_id=current_user.id,
        filename=file.filename,
        file_type=DocumentType(ext),
        file_size=len(contents),
        local_path=local_path,
        status=DocumentStatus.pending
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{project_id}/documents", response_model=List[DocumentResponse])
def get_documents(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Document).filter(Document.project_id == project_id).all()


@router.delete("/{project_id}/documents/{doc_id}", status_code=204)
def delete_document(
    project_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.project_id == project_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.local_path and os.path.exists(doc.local_path):
        os.remove(doc.local_path)
    db.delete(doc)
    db.commit()
    return None


@router.post("/{project_id}/process/{doc_id}")
def process_document(
    project_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.rag.chunker import extract_text_from_file, chunk_text
    from app.rag.retriever import add_chunks_to_collection

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.project_id == project_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        doc.status = DocumentStatus.processing
        db.commit()

        text = extract_text_from_file(doc.local_path, doc.file_type.value)
        chunks = chunk_text(text, doc.filename)
        count = add_chunks_to_collection(
            project.chroma_collection, chunks, doc.id
        )

        doc.status = DocumentStatus.completed
        doc.chunk_count = count
        doc.embedding_count = count
        db.commit()

        return {
            "message": "Document processed successfully",
            "chunks_created": count,
            "document_id": doc_id
        }
    except Exception as e:
        doc.status = DocumentStatus.failed
        doc.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/search")
def search_knowledge(
    project_id: str,
    payload: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.rag.pipeline import run_rag_pipeline

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.chroma_collection:
        raise HTTPException(status_code=400, detail="Project has no knowledge base")

    result = run_rag_pipeline(
        query=payload.query,
        collection_name=project.chroma_collection,
        use_hybrid=payload.use_hybrid,
        n_results=payload.n_results
    )
    return result


@router.post("/{project_id}/analyze-image")
async def analyze_image_endpoint(
    project_id: str,
    question: str = "Describe this image in detail. Extract ALL text, numbers, data, and information visible.",
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.agents.vision_agent import analyze_image
    from app.rag.chunker import chunk_text
    from app.rag.retriever import add_chunks_to_collection

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    image_id = str(uuid.uuid4())
    image_path = f"{UPLOAD_DIR}/{image_id}_{file.filename}"

    contents = await file.read()
    with open(image_path, "wb") as f:
        f.write(contents)

    try:
        result = analyze_image(image_path=image_path, question=question)

        extracted_text = f"""IMAGE ANALYSIS: {file.filename}

{result['answer']}

Confidence Score: {result['confidence_score']}%
Source: {file.filename} (image)"""

        doc_id = str(uuid.uuid4())
        chunks = chunk_text(extracted_text, f"[IMAGE] {file.filename}")
        count = add_chunks_to_collection(
            project.chroma_collection,
            chunks,
            doc_id
        )

        doc = Document(
            id=doc_id,
            project_id=project_id,
            user_id=current_user.id,
            filename=f"[IMAGE] {file.filename}",
            file_type=DocumentType("txt"),
            file_size=len(contents),
            local_path=image_path,
            status=DocumentStatus.completed,
            chunk_count=count,
            embedding_count=count
        )
        db.add(doc)
        db.commit()

        return {
            "answer": result["answer"],
            "tokens_used": result["tokens_used"],
            "model": result["model"],
            "filename": file.filename,
            "confidence_score": result["confidence_score"],
            "stored_in_knowledge_base": True,
            "chunks_created": count
        }
    except Exception as e:
        if os.path.exists(image_path):
            os.remove(image_path)
        raise HTTPException(status_code=500, detail=str(e))