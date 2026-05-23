from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.document import Document, DocumentType, DocumentStatus
from app.schemas.document import DocumentResponse, SearchRequest, SearchResult
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
def get_documents(project_id: str, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Document).filter(Document.project_id == project_id).all()


@router.delete("/{project_id}/documents/{doc_id}", status_code=204)
def delete_document(project_id: str, doc_id: str,
                    db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
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