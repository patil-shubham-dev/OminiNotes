# OmniNotes AI

> Turn any image into clean, structured, searchable notes.

OmniNotes AI is a web application that converts images containing text — such as classroom board photos, handwritten notes, textbook pages, screenshots, and scanned documents — into well-structured digital notes and downloadable PDFs.

## Features

- **Multi-format Upload**: Supports JPG, PNG, and PDF files
- **OCR Extraction**: Uses EasyOCR and PaddleOCR for text extraction
- **AI Formatting**: Automatically organizes content into headings, bullet points, and summaries
- **Multiple Output Modes**: Structured notes, summary, flashcards, and quiz generation
- **PDF Generation**: Beautifully formatted PDFs with custom styling
- **Markdown Export**: Clean markdown for further editing
- **Study Tools**: Built-in flashcards and quiz modes for learning

## Architecture

```
omninotes-ai/
├── frontend/          # React application
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── index.js
│       └── index.css
├── backend/           # FastAPI application
│   ├── main.py        # API endpoints
│   ├── ocr.py         # OCR engines
│   ├── formatter.py   # AI text formatting
│   ├── pdf_generator.py # PDF generation
│   └── utils.py       # Utilities
├── uploads/           # Temporary upload storage
├── outputs/           # Generated PDFs and markdown
└── requirements.txt
```

## Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Optional: Set OpenAI API key for AI formatting
export OPENAI_API_KEY="your-key-here"

# Run server
python main.py
```

The backend will start at `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will start at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload image(s) |
| POST | `/process` | Extract and format notes |
| GET | `/download/pdf/{doc_id}` | Download generated PDF |
| GET | `/download/md/{doc_id}` | Download Markdown file |
| GET | `/status/{doc_id}` | Check processing status |
| GET | `/health` | Health check |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI formatting | No (falls back to rule-based) |
| `REACT_APP_API_URL` | Backend API URL for frontend | No (defaults to localhost) |

## OCR Engines

The application uses multiple OCR engines for best accuracy:

1. **EasyOCR** - Primary engine for printed and handwritten text
2. **PaddleOCR** - Fallback and complement for Chinese/Asian languages
3. **Tesseract** (via pytesseract) - Last resort fallback

## AI Formatting

When `OPENAI_API_KEY` is set, the application uses GPT-4o-mini to:
- Identify headings and structure
- Organize bullet points and lists
- Generate summaries and key points
- Create flashcards and quiz questions

Without an API key, it falls back to intelligent rule-based formatting.

## PDF Styling

Generated PDFs feature:
- Professional typography with custom fonts
- Color-coded heading hierarchy
- Styled code blocks and equations
- Clean bullet points and numbered lists
- Footer with generation metadata

## Deployment

### Backend (Render/Railway)

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend (Vercel)

```bash
npm run build
# Deploy the build/ folder to Vercel
```

## License

MIT
