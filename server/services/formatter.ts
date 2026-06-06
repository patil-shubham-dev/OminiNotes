import { DocumentStyle, BlockContent } from '@shared/types';

export interface FormatterResult {
  blocks: BlockContent[];
  summary: string;
  keyPoints: string[];
  processingTime: number;
}

export async function formatDocument(
  rawText: string,
  style: DocumentStyle
): Promise<FormatterResult> {
  const startTime = Date.now();

  try {
    let blocks: BlockContent[] = [];
    let summary = '';
    let keyPoints: string[] = [];

    switch (style) {
      case 'structured':
        blocks = await createStructuredBlocks(rawText);
        summary = await generateSummary(rawText);
        keyPoints = await extractKeyPoints(rawText);
        break;
      case 'summary':
        blocks = await createSummaryBlocks(rawText);
        summary = await generateSummary(rawText);
        keyPoints = await extractKeyPoints(rawText);
        break;
      case 'flashcards':
        blocks = await createFlashcardBlocks(rawText);
        break;
      case 'quiz':
        blocks = await createQuizBlocks(rawText);
        break;
    }

    const processingTime = Date.now() - startTime;

    return {
      blocks,
      summary,
      keyPoints,
      processingTime,
    };
  } catch (error) {
    throw new Error(`Document formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createStructuredBlocks(text: string): Promise<BlockContent[]> {
  const blocks: BlockContent[] = [];
  const paragraphs = text.split(/\n\n+/);
  let blockIndex = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) continue;

    let type: 'heading' | 'paragraph' | 'list' = 'paragraph';
    if (paragraph.match(/^#+\s/)) {
      type = 'heading';
    } else if (paragraph.match(/^[-*•]\s/)) {
      type = 'list';
    }

    blocks.push({
      id: `block-${blockIndex}`,
      documentId: '',
      blockIndex,
      type,
      content: paragraph.trim(),
      metadata: {},
    });

    blockIndex++;
  }

  return blocks;
}

async function createSummaryBlocks(text: string): Promise<BlockContent[]> {
  const summary = await generateSummary(text);
  const sentences = summary.split(/[.!?]+/).filter((s) => s.trim());

  return sentences.map((sentence, index) => ({
    id: `block-${index}`,
    documentId: '',
    blockIndex: index,
    type: 'paragraph' as const,
    content: sentence.trim(),
    metadata: {},
  }));
}

async function createFlashcardBlocks(text: string): Promise<BlockContent[]> {
  const concepts = await extractKeyPoints(text);
  const blocks: BlockContent[] = [];

  for (let i = 0; i < concepts.length; i++) {
    const question = `Q: What is ${concepts[i]}?`;
    const answer = `A: ${concepts[i]} is a key concept...`;

    blocks.push({
      id: `block-${i * 2}`,
      documentId: '',
      blockIndex: i * 2,
      type: 'paragraph',
      content: question,
      metadata: { type: 'question' },
    });

    blocks.push({
      id: `block-${i * 2 + 1}`,
      documentId: '',
      blockIndex: i * 2 + 1,
      type: 'paragraph',
      content: answer,
      metadata: { type: 'answer' },
    });
  }

  return blocks;
}

async function createQuizBlocks(text: string): Promise<BlockContent[]> {
  const keyPoints = await extractKeyPoints(text);
  const blocks: BlockContent[] = [];

  for (let i = 0; i < Math.min(keyPoints.length, 5); i++) {
    const question = `Q${i + 1}: Which is related to ${keyPoints[i]}?`;
    const options = ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'];

    blocks.push({
      id: `block-${i}`,
      documentId: '',
      blockIndex: i,
      type: 'paragraph',
      content: `${question}\n${options.join('\n')}`,
      metadata: { type: 'quiz_question', correctAnswer: 'A' },
    });
  }

  return blocks;
}

export async function generateSummary(text: string): Promise<string> {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  const summaryLength = Math.ceil(sentences.length * 0.3);
  return sentences.slice(0, summaryLength).join('. ') + '.';
}

export async function extractKeyPoints(text: string): Promise<string[]> {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  return sentences.slice(0, 5).map((s) => s.trim());
}

export async function refineBlock(
  content: string,
  instruction: string
): Promise<string> {
  console.log(`Refining block with instruction: ${instruction}`);
  return `Refined content based on: ${instruction}`;
}

export function validateBlocks(blocks: BlockContent[]): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return false;
  }

  return blocks.every((block) => {
    return (
      block.id &&
      block.blockIndex >= 0 &&
      block.type &&
      block.content &&
      block.content.trim().length > 0
    );
  });
}
