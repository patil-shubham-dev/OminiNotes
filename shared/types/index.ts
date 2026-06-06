/**
 * Shared TypeScript types used across frontend and backend
 */

export type DocumentStyle = 'structured' | 'summary' | 'flashcards' | 'quiz';
export type DocumentStatus = 'processing' | 'completed' | 'failed';
export type BlockType = 'heading' | 'paragraph' | 'list' | 'code' | 'table' | 'equation';
export type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state';
export type ProcessingStage = 'upload' | 'extraction' | 'formatting' | 'validation' | 'completion';
export type ProcessingStatus = 'started' | 'completed' | 'failed';
export type UserRole = 'user' | 'admin';
export type ChatRole = 'user' | 'assistant';

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Document Types
 */
export interface DocumentMetadata {
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  processingTime: number;
}

export interface DocumentContent {
  id: string;
  title: string;
  description?: string;
  style: DocumentStyle;
  status: DocumentStatus;
  blocks: BlockContent[];
  summary?: string;
  keyPoints?: string[];
  metadata: DocumentMetadata;
}

/**
 * Block Types
 */
export interface BlockContent {
  id: string;
  documentId: string;
  blockIndex: number;
  type: BlockType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface BlockMetadata {
  level?: number;
  language?: string;
  columns?: number;
  rows?: number;
}

/**
 * Chat Types
 */
export interface ChatMessage {
  id: string;
  documentId: string;
  userId: number;
  role: ChatRole;
  content: string;
  tokens?: number;
  createdAt: Date;
}

export interface ChatRequest {
  documentId: string;
  message: string;
}

export interface ChatResponse {
  id: string;
  message: string;
  tokens: number;
}

/**
 * Diagram Types
 */
export interface DiagramContent {
  id: string;
  documentId: string;
  type: DiagramType;
  title?: string;
  mermaidCode: string;
  description?: string;
}

export interface DiagramRequest {
  documentId: string;
  type: DiagramType;
  title?: string;
}

/**
 * Upload Types
 */
export interface UploadRequest {
  file: File;
  style: DocumentStyle;
}

export interface UploadResponse {
  documentId: string;
  status: DocumentStatus;
  message: string;
}

/**
 * Export Types
 */
export interface ExportRequest {
  documentId: string;
  format: 'markdown' | 'pdf';
}

export interface ExportResponse {
  url: string;
  fileName: string;
  contentType: string;
}

/**
 * Refinement Types
 */
export interface RefinementRequest {
  documentId: string;
  blockId: string;
  instruction: string;
}

export interface RefinementResponse {
  blockId: string;
  originalContent: string;
  refinedContent: string;
}

/**
 * Processing Log Types
 */
export interface ProcessingLogEntry {
  id: string;
  documentId: string;
  stage: ProcessingStage;
  status: ProcessingStatus;
  message?: string;
  duration?: number;
  createdAt: Date;
}

/**
 * User Types
 */
export interface UserProfile {
  id: number;
  openId: string;
  email?: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  lastSignedIn: Date;
}

/**
 * Error Types
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Validation Types
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
