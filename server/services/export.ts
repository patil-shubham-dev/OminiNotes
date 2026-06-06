import { BlockContent } from '@shared/types';

export interface ExportResult {
  format: string;
  content: string;
  fileName: string;
}

export async function exportToMarkdown(
  title: string,
  blocks: BlockContent[],
  summary?: string
): Promise<ExportResult> {
  let markdown = `# ${title}\n\n`;
  
  if (summary) {
    markdown += `## Summary\n${summary}\n\n`;
  }
  
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        markdown += `## ${block.content}\n\n`;
        break;
      case 'list':
        markdown += `- ${block.content}\n`;
        break;
      default:
        markdown += `${block.content}\n\n`;
    }
  }
  
  return {
    format: 'markdown',
    content: markdown,
    fileName: `${title.toLowerCase().replace(/\s+/g, '-')}.md`,
  };
}

export async function exportToPDF(
  title: string,
  blocks: BlockContent[],
  summary?: string
): Promise<ExportResult> {
  const markdown = await exportToMarkdown(title, blocks, summary);
  
  return {
    format: 'pdf',
    content: markdown.content,
    fileName: markdown.fileName.replace('.md', '.pdf'),
  };
}

export function validateExportFormat(format: string): boolean {
  return ['markdown', 'pdf'].includes(format);
}
