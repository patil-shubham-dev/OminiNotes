export interface DiagramResult {
  id: string;
  type: string;
  mermaidCode: string;
  title: string;
}

export async function generateDiagram(
  documentContent: string,
  diagramType: string,
  title?: string
): Promise<DiagramResult> {
  const mermaidCode = generateMermaidCode(documentContent, diagramType);
  
  return {
    id: `diagram-${Date.now()}`,
    type: diagramType,
    mermaidCode,
    title: title || `${diagramType} Diagram`,
  };
}

function generateMermaidCode(content: string, type: string): string {
  switch (type) {
    case 'flowchart':
      return 'flowchart TD\\n    A[Start] --> B[Process]\\n    B --> C[End]';
    case 'sequence':
      return 'sequenceDiagram\\n    participant A\\n    participant B\\n    A->>B: Message';
    case 'class':
      return 'classDiagram\\n    class Class1\\n    class Class2';
    case 'state':
      return 'stateDiagram-v2\\n    [*] --> State1\\n    State1 --> [*]';
    default:
      return 'graph TD\\n    A[Default]';
  }
}

export function validateMermaidCode(code: string): boolean {
  return code && code.trim().length > 0;
}
