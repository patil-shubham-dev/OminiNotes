import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { eq, desc, and, like } from 'drizzle-orm';

let db: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize database connection
 */
export async function initializeDb() {
  if (db) return db;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'omninotes',
  });

  db = drizzle(connection, { schema });
  return db;
}

/**
 * Get database instance
 */
export async function getDb() {
  if (!db) {
    await initializeDb();
  }
  return db!;
}

/**
 * User queries
 */
export async function getUserById(id: number) {
  const database = await getDb();
  const result = await database.select().from(schema.users).where(eq(schema.users.id, id));
  return result[0];
}

export async function getUserByOpenId(openId: string) {
  const database = await getDb();
  const result = await database
    .select()
    .from(schema.users)
    .where(eq(schema.users.openId, openId));
  return result[0];
}

export async function createUser(user: schema.InsertUser) {
  const database = await getDb();
  await database.insert(schema.users).values(user);
}

export async function updateUser(id: number, updates: Partial<schema.InsertUser>) {
  const database = await getDb();
  await database.update(schema.users).set(updates).where(eq(schema.users.id, id));
}

/**
 * Document queries
 */
export async function getDocumentById(id: string) {
  const database = await getDb();
  const result = await database
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id));
  return result[0];
}

export async function getUserDocuments(userId: number, limit = 20, offset = 0) {
  const database = await getDb();
  return await database
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.userId, userId))
    .orderBy(desc(schema.documents.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createDocument(doc: schema.InsertDocument) {
  const database = await getDb();
  await database.insert(schema.documents).values(doc);
}

export async function updateDocument(id: string, updates: Partial<schema.InsertDocument>) {
  const database = await getDb();
  await database.update(schema.documents).set(updates).where(eq(schema.documents.id, id));
}

export async function deleteDocument(id: string) {
  const database = await getDb();
  await database.delete(schema.documents).where(eq(schema.documents.id, id));
}

/**
 * Block queries
 */
export async function getDocumentBlocks(documentId: string) {
  const database = await getDb();
  return await database
    .select()
    .from(schema.blocks)
    .where(eq(schema.blocks.documentId, documentId))
    .orderBy(schema.blocks.blockIndex);
}

export async function createBlock(block: schema.InsertBlock) {
  const database = await getDb();
  await database.insert(schema.blocks).values(block);
}

export async function updateBlock(id: string, updates: Partial<schema.InsertBlock>) {
  const database = await getDb();
  await database.update(schema.blocks).set(updates).where(eq(schema.blocks.id, id));
}

export async function deleteBlock(id: string) {
  const database = await getDb();
  await database.delete(schema.blocks).where(eq(schema.blocks.id, id));
}

/**
 * Chat message queries
 */
export async function getDocumentChatHistory(documentId: string, limit = 50) {
  const database = await getDb();
  return await database
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.documentId, documentId))
    .orderBy(desc(schema.chatMessages.createdAt))
    .limit(limit);
}

export async function createChatMessage(message: schema.InsertChatMessage) {
  const database = await getDb();
  await database.insert(schema.chatMessages).values(message);
}

/**
 * Diagram queries
 */
export async function getDocumentDiagrams(documentId: string) {
  const database = await getDb();
  return await database
    .select()
    .from(schema.diagrams)
    .where(eq(schema.diagrams.documentId, documentId));
}

export async function createDiagram(diagram: schema.InsertDiagram) {
  const database = await getDb();
  await database.insert(schema.diagrams).values(diagram);
}

export async function updateDiagram(id: string, updates: Partial<schema.InsertDiagram>) {
  const database = await getDb();
  await database.update(schema.diagrams).set(updates).where(eq(schema.diagrams.id, id));
}

/**
 * Processing log queries
 */
export async function createProcessingLog(log: schema.InsertProcessingLog) {
  const database = await getDb();
  await database.insert(schema.processingLogs).values(log);
}

export async function getDocumentProcessingLogs(documentId: string) {
  const database = await getDb();
  return await database
    .select()
    .from(schema.processingLogs)
    .where(eq(schema.processingLogs.documentId, documentId))
    .orderBy(schema.processingLogs.createdAt);
}
