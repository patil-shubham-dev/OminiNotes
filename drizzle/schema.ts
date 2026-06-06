import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  bigint,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

/**
 * Users table - Core authentication and user management
 */
export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  openId: varchar('openId', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 320 }),
  name: text('name'),
  loginMethod: varchar('loginMethod', { length: 64 }),
  role: mysqlEnum('role', ['user', 'admin']).default('user').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp('lastSignedIn').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Documents table - Processed documents with metadata
 */
export const documents = mysqlTable('documents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('userId').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  style: mysqlEnum('style', ['structured', 'summary', 'flashcards', 'quiz']).notNull(),
  status: mysqlEnum('status', ['processing', 'completed', 'failed']).default('processing'),
  originalFileName: varchar('originalFileName', { length: 255 }),
  fileSize: bigint('fileSize'),
  mimeType: varchar('mimeType', { length: 100 }),
  storageKey: varchar('storageKey', { length: 255 }),
  rawText: text('rawText'),
  processedAt: timestamp('processedAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Blocks table - Document content blocks
 */
export const blocks = mysqlTable('blocks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('documentId', { length: 36 }).notNull(),
  blockIndex: int('blockIndex').notNull(),
  type: mysqlEnum('type', ['heading', 'paragraph', 'list', 'code', 'table', 'equation']).notNull(),
  content: text('content').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = typeof blocks.$inferInsert;

/**
 * Chat messages table - Document Q&A conversation history
 */
export const chatMessages = mysqlTable('chatMessages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('documentId', { length: 36 }).notNull(),
  userId: int('userId').notNull(),
  role: mysqlEnum('role', ['user', 'assistant']).notNull(),
  content: text('content').notNull(),
  tokens: int('tokens'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Diagrams table - Generated Mermaid diagrams
 */
export const diagrams = mysqlTable('diagrams', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('documentId', { length: 36 }).notNull(),
  type: mysqlEnum('type', ['flowchart', 'sequence', 'class', 'state']).notNull(),
  title: varchar('title', { length: 255 }),
  mermaidCode: text('mermaidCode').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type Diagram = typeof diagrams.$inferSelect;
export type InsertDiagram = typeof diagrams.$inferInsert;

/**
 * Processing logs table - Document processing pipeline tracking
 */
export const processingLogs = mysqlTable('processingLogs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('documentId', { length: 36 }).notNull(),
  stage: mysqlEnum('stage', ['upload', 'extraction', 'formatting', 'validation', 'completion']).notNull(),
  status: mysqlEnum('status', ['started', 'completed', 'failed']).notNull(),
  message: text('message'),
  duration: int('duration'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type ProcessingLog = typeof processingLogs.$inferSelect;
export type InsertProcessingLog = typeof processingLogs.$inferInsert;

/**
 * Relations
 */
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  chatMessages: many(chatMessages),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  blocks: many(blocks),
  chatMessages: many(chatMessages),
  diagrams: many(diagrams),
  processingLogs: many(processingLogs),
}));

export const blocksRelations = relations(blocks, ({ one }) => ({
  document: one(documents, {
    fields: [blocks.documentId],
    references: [documents.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  document: one(documents, {
    fields: [chatMessages.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const diagramsRelations = relations(diagrams, ({ one }) => ({
  document: one(documents, {
    fields: [diagrams.documentId],
    references: [documents.id],
  }),
}));

export const processingLogsRelations = relations(processingLogs, ({ one }) => ({
  document: one(documents, {
    fields: [processingLogs.documentId],
    references: [documents.id],
  }),
}));
