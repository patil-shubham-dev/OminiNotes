# OmniNotes AI 2.0 - Architecture Guide

## System Overview

OmniNotes AI 2.0 is a full-stack web application with a modern, scalable architecture.

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS 4
- Framer Motion for animations

**Backend:**
- Express 4 with Node.js
- tRPC 11 for type-safe APIs
- Drizzle ORM

**Database:**
- MySQL 8.0+ or TiDB

## Database Schema

### Tables
- `users` - User authentication and profiles
- `documents` - Processed documents
- `blocks` - Document content blocks
- `chatMessages` - Chat conversation history
- `diagrams` - Generated Mermaid diagrams
- `processingLogs` - Processing pipeline tracking

## Services

### OCR Service
- Text extraction from images/PDFs
- LLM vision integration
- Language detection

### Formatter Service
- Document structure analysis
- Block-based formatting
- Multiple output styles

### Chat Service
- Contextual AI responses
- Message history
- Response generation

### Diagram Service
- Mermaid code generation
- Multiple diagram types
- Syntax validation

### Export Service
- Markdown export
- PDF generation
- Format validation

### Storage Service
- AWS S3 integration
- File upload handling
- Signed URL generation

## API Routes

- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document
- `POST /api/documents/:id/chat` - Chat
- `POST /api/documents/:id/refine` - Refine content
- `POST /api/documents/:id/diagrams` - Generate diagram
- `POST /api/documents/:id/export` - Export document

## Security

- OAuth 2.0 authentication
- Role-based access control
- Parameterized queries
- Input validation
- File upload security

## Performance

- Database query optimization
- Caching strategies
- Lazy loading
- Code splitting

## Deployment

- Docker containerization
- Cloud-ready architecture
- Stateless design
- Load balancing support
