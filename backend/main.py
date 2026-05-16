"""
OmniNotes AI - FastAPI Backend
Converts images to structured notes and PDFs using OCR + AI formatting
"""

import os
import uuid
import shutil
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ocr import extract_text_from_image
from formatter import format_notes_with_ai, refine_text_with_ai, test_ai_connection
from pdf_generator import generate_pdf
from utils import save_upload, cleanup_files
import database as db

# Configuration
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI(
    title="OmniNotes AI",
    description="Convert any image into structured notes and PDFs",
    version="1.1.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class APIConfig(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = "openai"


class ProcessRequest(BaseModel):
    doc_id: str
    style: str = "structured"
    api_config: Optional[APIConfig] = None


class UpdateRequest(BaseModel):
    doc_id: str
    formatted_text: str


class RefineRequest(BaseModel):
    doc_id: str
    selection: str
    instruction: str
    api_config: Optional[APIConfig] = None


@app.post("/upload")
async def upload_images(files: List[UploadFile] = File(...), session: Session = Depends(db.get_db)):
    """Upload one or more images/PDFs"""
    doc_id = str(uuid.uuid4())
    uploaded_paths = []
    filenames = []

    for file in files:
        # Validate file type
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.pdf'}
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(400, f"Unsupported file type: {ext}")

        # Save file
        file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_paths.append(file_path)
        filenames.append(file.filename)

    # Save to DB
    new_doc = db.Document(
        id=doc_id,
        filenames=filenames,
        paths=uploaded_paths,
        status="uploaded"
    )
    session.add(new_doc)
    session.commit()

    return {"doc_id": doc_id, "files_uploaded": len(files), "status": "uploaded"}


@app.post("/process")
async def process_document(request: ProcessRequest, session: Session = Depends(db.get_db)):
    """Extract and format notes from uploaded images"""
    doc_id = request.doc_id

    doc = session.query(db.Document).filter(db.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    doc.status = "processing"
    session.commit()

    # Step 1: OCR Extraction
    all_text = []
    for path in doc.paths:
        try:
            text = extract_text_from_image(path)
            all_text.append(text)
        except Exception as e:
            print(f"OCR error for {path}: {e}")
            all_text.append(f"[Error processing {os.path.basename(path)}]")

    combined_text = "\n\n---\n\n".join(all_text)
    doc.extracted_text = combined_text

    # Step 2: AI Formatting
    try:
        api_dict = request.api_config.dict() if request.api_config else None
        formatted = format_notes_with_ai(combined_text, style=request.style, api_config=api_dict)
        doc.formatted_text = formatted["formatted_text"]
        doc.summary = formatted.get("summary", "")
        doc.key_points = formatted.get("key_points", [])
        doc.flashcards = formatted.get("flashcards", [])
        doc.quiz_questions = formatted.get("quiz_questions", [])
        doc.style = request.style
    except Exception as e:
        print(f"Formatting error: {e}")
        doc.formatted_text = combined_text  # Fallback to raw text

    # Step 3: Generate outputs
    try:
        # Generate PDF
        pdf_path = os.path.join(OUTPUT_DIR, f"{doc_id}.pdf")
        generate_pdf(doc.formatted_text, pdf_path, title="OmniNotes AI - Generated Notes")
        doc.pdf_path = pdf_path

        # Generate Markdown
        md_path = os.path.join(OUTPUT_DIR, f"{doc_id}.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(doc.formatted_text)
        doc.md_path = md_path
        
        doc.status = "processed"
    except Exception as e:
        print(f"Generation error: {e}")
        doc.status = "error"
        doc.error_message = str(e)

    session.commit()

    return {
        "doc_id": doc_id,
        "extracted_text": doc.extracted_text,
        "formatted_text": doc.formatted_text,
        "summary": doc.summary,
        "key_points": doc.key_points,
        "flashcards": doc.flashcards,
        "quiz_questions": doc.quiz_questions,
        "status": doc.status,
        "created_at": doc.created_at.isoformat()
    }


@app.post("/refine")
async def refine_document(request: RefineRequest, session: Session = Depends(db.get_db)):
    """Refine a selection of text using AI instructions"""
    doc = session.query(db.Document).filter(db.Document.id == request.doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    api_dict = request.api_config.dict() if request.api_config else None
    
    refined_text = refine_text_with_ai(
        original_text=doc.formatted_text,
        selection=request.selection,
        instruction=request.instruction,
        api_config=api_dict
    )

    # Replace the selection in the original text (simple replacement for now)
    # In a more advanced version, we would use indices for precise replacement
    if request.selection in doc.formatted_text:
        doc.formatted_text = doc.formatted_text.replace(request.selection, refined_text)
        
        # Regenerate outputs
        try:
            if doc.pdf_path:
                generate_pdf(doc.formatted_text, doc.pdf_path, title="OmniNotes AI - Generated Notes")
            if doc.md_path:
                with open(doc.md_path, "w", encoding="utf-8") as f:
                    f.write(doc.formatted_text)
        except Exception as e:
            print(f"Refine generation error: {e}")
            
        session.commit()
        return {"refined_text": refined_text, "full_text": doc.formatted_text}
    else:
        raise HTTPException(400, "Selection not found in original text")


@app.post("/update")
async def update_document(request: UpdateRequest, session: Session = Depends(db.get_db)):
    """Update formatted text and regenerate outputs"""
    doc = session.query(db.Document).filter(db.Document.id == request.doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    doc.formatted_text = request.formatted_text

    # Regenerate outputs
    try:
        if doc.pdf_path:
            generate_pdf(doc.formatted_text, doc.pdf_path, title="OmniNotes AI - Generated Notes")
        
        if doc.md_path:
            with open(doc.md_path, "w", encoding="utf-8") as f:
                f.write(doc.formatted_text)
    except Exception as e:
        print(f"Update generation error: {e}")

    session.commit()
    return {"status": "updated"}


@app.get("/history")
async def get_history(limit: int = 20, session: Session = Depends(db.get_db)):
    """Get history of processed documents"""
    docs = session.query(db.Document).order_by(db.Document.created_at.desc()).limit(limit).all()
    return [{
        "id": d.id,
        "filenames": d.filenames,
        "status": d.status,
        "created_at": d.created_at.isoformat(),
        "style": d.style
    } for d in docs]


@app.get("/document/{doc_id}")
async def get_document(doc_id: str, session: Session = Depends(db.get_db)):
    """Get full document details"""
    doc = session.query(db.Document).filter(db.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    return {
        "doc_id": doc.id,
        "extracted_text": doc.extracted_text,
        "formatted_text": doc.formatted_text,
        "summary": doc.summary,
        "key_points": doc.key_points,
        "flashcards": doc.flashcards,
        "quiz_questions": doc.quiz_questions,
        "status": doc.status,
        "created_at": doc.created_at.isoformat(),
        "style": doc.style
    }


@app.get("/download/pdf/{doc_id}")
async def download_pdf(doc_id: str, session: Session = Depends(db.get_db)):
    """Download generated PDF"""
    doc = session.query(db.Document).filter(db.Document.id == doc_id).first()
    if not doc or not doc.pdf_path:
        raise HTTPException(404, "PDF not found")

    if not os.path.exists(doc.pdf_path):
        raise HTTPException(404, "PDF file missing")

    return FileResponse(
        doc.pdf_path,
        media_type="application/pdf",
        filename=f"omninotes_{doc_id[:8]}.pdf"
    )


@app.get("/download/md/{doc_id}")
async def download_md(doc_id: str, session: Session = Depends(db.get_db)):
    """Download Markdown file"""
    doc = session.query(db.Document).filter(db.Document.id == doc_id).first()
    if not doc or not doc.md_path:
        raise HTTPException(404, "Markdown not found")

    if not os.path.exists(doc.md_path):
        raise HTTPException(404, "Markdown file missing")

    return FileResponse(
        doc.md_path,
        media_type="text/markdown",
        filename=f"omninotes_{doc_id[:8]}.md"
    )


@app.get("/status/{doc_id}")
async def get_status(doc_id: str, session: Session = Depends(db.get_db)):
    """Get document processing status"""
    doc = session.query(db.Document).filter(db.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    return {
        "doc_id": doc_id,
        "status": doc.status,
        "has_extracted_text": bool(doc.extracted_text),
        "has_pdf": bool(doc.pdf_path and os.path.exists(doc.pdf_path)),
        "has_md": bool(doc.md_path and os.path.exists(doc.md_path)),
        "created_at": doc.created_at.isoformat()
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OmniNotes AI"}


@app.post("/test-connection")
async def test_connection(config: APIConfig):
    """Test AI connection with provided config"""
    return test_ai_connection(config.dict())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
