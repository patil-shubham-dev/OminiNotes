/**
 * Shared constants used across the application
 */

// Document styles
export const DOCUMENT_STYLES = ['structured', 'summary', 'flashcards', 'quiz'] as const;
export const DOCUMENT_STYLE_LABELS = {
  structured: 'Structured Notes',
  summary: 'Summary',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
} as const;

// Document status
export const DOCUMENT_STATUSES = ['processing', 'completed', 'failed'] as const;
export const DOCUMENT_STATUS_LABELS = {
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
} as const;

// Block types
export const BLOCK_TYPES = ['heading', 'paragraph', 'list', 'code', 'table', 'equation'] as const;

// Diagram types
export const DIAGRAM_TYPES = ['flowchart', 'sequence', 'class', 'state'] as const;
export const DIAGRAM_TYPE_LABELS = {
  flowchart: 'Flowchart',
  sequence: 'Sequence Diagram',
  class: 'Class Diagram',
  state: 'State Diagram',
} as const;

// File upload
export const MAX_FILE_SIZE = 52428800; // 50MB in bytes
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const ALLOWED_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

// Processing
export const PROCESSING_TIMEOUT = 30000; // 30 seconds
export const OCR_TIMEOUT = 30000; // 30 seconds
export const FORMATTER_TIMEOUT = 15000; // 15 seconds
export const CHAT_TIMEOUT = 10000; // 10 seconds

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Chat
export const MAX_CHAT_HISTORY = 100;
export const CHAT_MESSAGE_MAX_LENGTH = 5000;

// Export
export const EXPORT_FORMATS = ['markdown', 'pdf'] as const;

// User roles
export const USER_ROLES = ['user', 'admin'] as const;

// API paths
export const API_PATHS = {
  UPLOAD: '/api/documents/upload',
  PROCESS: '/api/documents/process',
  GET_DOCUMENT: '/api/documents/:id',
  LIST_DOCUMENTS: '/api/documents',
  DELETE_DOCUMENT: '/api/documents/:id',
  CHAT: '/api/documents/:id/chat',
  REFINE: '/api/documents/:id/refine',
  GENERATE_DIAGRAM: '/api/documents/:id/diagrams',
  EXPORT: '/api/documents/:id/export',
  GET_HISTORY: '/api/documents/history',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds maximum limit (50MB)',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload JPEG, PNG, or PDF',
  UPLOAD_FAILED: 'Failed to upload file. Please try again',
  PROCESSING_FAILED: 'Failed to process document. Please try again',
  INVALID_DOCUMENT_ID: 'Invalid document ID',
  DOCUMENT_NOT_FOUND: 'Document not found',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  SERVER_ERROR: 'An error occurred. Please try again later',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'File uploaded successfully',
  PROCESSING_COMPLETE: 'Document processed successfully',
  EXPORT_SUCCESS: 'Document exported successfully',
  CHAT_SENT: 'Message sent',
  REFINEMENT_COMPLETE: 'Content refined successfully',
  DIAGRAM_GENERATED: 'Diagram generated successfully',
} as const;

// Regex patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  URL: /^https?:\/\/.+/,
} as const;

// Animation durations (ms)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Breakpoints
export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 1024,
  DESKTOP: 1280,
} as const;
