import { describe, it, expect } from 'vitest';
import { formatDocument, generateSummary, extractKeyPoints } from '../server/services/formatter';
import { exportToMarkdown } from '../server/services/export';
import { validateMermaidCode } from '../server/services/diagram';
import { validateChatMessage } from '../server/services/chat';

describe('Formatter Service', () => {
  it('should format document with structured style', async () => {
    const result = await formatDocument('Test content', 'structured');
    expect(result.blocks).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.keyPoints).toBeDefined();
  });

  it('should generate summary', async () => {
    const summary = await generateSummary('This is a test. This is another test.');
    expect(summary).toBeTruthy();
  });

  it('should extract key points', async () => {
    const points = await extractKeyPoints('Key point one. Key point two.');
    expect(Array.isArray(points)).toBe(true);
  });
});

describe('Export Service', () => {
  it('should export to markdown', async () => {
    const result = await exportToMarkdown('Test', [], 'Summary');
    expect(result.format).toBe('markdown');
    expect(result.fileName).toContain('.md');
  });
});

describe('Diagram Service', () => {
  it('should validate mermaid code', () => {
    expect(validateMermaidCode('graph TD')).toBe(true);
    expect(validateMermaidCode('')).toBe(false);
  });
});

describe('Chat Service', () => {
  it('should validate chat message', () => {
    expect(validateChatMessage('Hello')).toBe(true);
    expect(validateChatMessage('')).toBe(false);
  });
});
