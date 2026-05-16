"""
AI Formatting Engine for OmniNotes AI
Organizes extracted text into structured notes using LLM
"""

import os
import re
import json
from typing import Dict, List, Optional

# Try to use OpenAI API, fallback to rule-based formatting
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def format_notes_with_ai(raw_text: str, style: str = "structured", api_config: Optional[Dict] = None) -> Dict:
    """
    Format extracted text into structured notes.
    Uses user-provided API config if available, otherwise falls back to environment variables or rules.
    """
    if not raw_text or raw_text == "[No text detected in image]":
        return {
            "formatted_text": "No text could be extracted from the provided image(s).",
            "summary": "",
            "key_points": [],
            "flashcards": [],
            "quiz_questions": []
        }

    # Try AI formatting first
    try:
        return format_with_ai_provider(raw_text, style, api_config)
    except Exception as e:
        print(f"AI formatting failed: {e}, falling back to rule-based")

    # Fallback to rule-based formatting
    return format_with_rules(raw_text, style)


def format_with_ai_provider(raw_text: str, style: str, api_config: Optional[Dict]) -> Dict:
    """Use configured AI provider to format notes"""
    # Merge provided config with defaults
    config = {
        "api_key": OPENAI_API_KEY,
        "base_url": None,
        "model": "gpt-4o-mini",
        "provider": "openai"
    }
    if api_config:
        config.update({k: v for k, v in api_config.items() if v})

    if not config["api_key"] and not config["base_url"]:
        raise ValueError("No API key or base URL provided")

    client = openai.OpenAI(
        api_key=config["api_key"],
        base_url=config["base_url"]
    )

    system_prompt = """You are OmniNotes AI, an expert note-taking assistant. 
Your task is to convert messy OCR text into beautifully structured notes.

Rules:
- Identify headings, subheadings, bullet points, and numbered lists
- Format equations using LaTeX-style notation ($...$)
- Preserve all important information
- Remove OCR artifacts and fix obvious errors
- Organize content logically with clear hierarchy
- Use markdown formatting

Output a JSON object with these fields:
- formatted_text: The main structured notes in markdown
- summary: A brief 2-3 sentence summary
- key_points: Array of 3-7 key takeaways
- flashcards: Array of objects with "question" and "answer" (only if style is "flashcards")
- quiz_questions: Array of objects with "question", "options" (array), "correct_answer" (index) (only if style is "quiz")
"""

    style_instructions = {
        "structured": "Create well-structured notes with clear headings and bullet points.",
        "summary": "Focus on creating a comprehensive summary with key points.",
        "flashcards": "Create structured notes AND generate 5-10 flashcards for key concepts.",
        "quiz": "Create structured notes AND generate 5 quiz questions with multiple choice answers."
    }

    user_prompt = f"""Style: {style_instructions.get(style, style_instructions["structured"])}

Raw OCR text:
---
{raw_text}
---

Please format this into structured notes."""

    response = client.chat.completions.create(
        model=config["model"],
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_tokens=4000
    )

    result = json.loads(response.choices[0].message.content)

    # Ensure all fields exist
    return {
        "formatted_text": result.get("formatted_text", raw_text),
        "summary": result.get("summary", ""),
        "key_points": result.get("key_points", []),
        "flashcards": result.get("flashcards", []),
        "quiz_questions": result.get("quiz_questions", [])
    }


def refine_text_with_ai(original_text: str, selection: str, instruction: str, api_config: Optional[Dict] = None) -> str:
    """Refine a specific part of the text based on user instruction"""
    config = {
        "api_key": OPENAI_API_KEY,
        "base_url": None,
        "model": "gpt-4o-mini"
    }
    if api_config:
        config.update({k: v for k, v in api_config.items() if v})

    if not config["api_key"] and not config["base_url"]:
        return selection # Fallback to no change

    client = openai.OpenAI(
        api_key=config["api_key"],
        base_url=config["base_url"]
    )

    system_prompt = """You are OmniNotes AI, an expert note-taking assistant.
The user wants to refine a specific section of their notes.
Original Context: The full document content is provided for context.
Selection: The specific part the user wants to change.
Instruction: What to do with the selection.

Rules:
- ONLY output the refined version of the selection.
- Do not include explanations, prefixes, or suffixes.
- Maintain the style of the rest of the document.
- If the instruction is "remove", return an empty string or a minimal placeholder.
"""

    user_prompt = f"""Context:
{original_text}

Selection to refine:
{selection}

Instruction:
{instruction}

Refined version:"""

    try:
        response = client.chat.completions.create(
            model=config["model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Refinement error: {e}")
        return selection # Fallback to original


def test_ai_connection(api_config: Dict) -> Dict:
    """Test the connection to an AI provider"""
    config = {
        "api_key": OPENAI_API_KEY,
        "base_url": None,
        "model": "gpt-4o-mini",
        "provider": "openai"
    }
    config.update({k: v for k, v in api_config.items() if v})

    if not config["api_key"] and not config["base_url"]:
        return {"status": "error", "message": "No API key or base URL provided"}

    try:
        client = openai.OpenAI(
            api_key=config["api_key"],
            base_url=config["base_url"] or None
        )
        
        # Simple completion request to test connection
        # Using only a user message for maximum compatibility across providers
        response = client.chat.completions.create(
            model=config["model"],
            messages=[
                {"role": "user", "content": "Say 'hello' and nothing else."}
            ],
            max_tokens=10,
            temperature=0
        )
        
        if response.choices:
            return {"status": "success", "message": "Connection successful!"}
        return {"status": "error", "message": "No response from provider"}
        
    except Exception as e:
        error_msg = str(e)
        # Clean up common error messages
        if "401" in error_msg:
            error_msg = "Invalid API Key (Unauthorized)"
        elif "404" in error_msg:
            error_msg = "Model not found or invalid Base URL"
        elif "Connection error" in error_msg:
            error_msg = "Could not reach the server. Check your Base URL and internet."
            
        return {"status": "error", "message": f"Connection failed: {error_msg}"}


def format_with_rules(raw_text: str, style: str) -> Dict:
    """Rule-based formatting when AI is unavailable"""
    lines = raw_text.split('\n')
    formatted_lines = []

    # Track state
    in_list = False
    list_type = None

    for line in lines:
        line = line.strip()
        if not line:
            if in_list:
                formatted_lines.append("")
                in_list = False
                list_type = None
            continue

        # Detect headings
        if is_heading(line):
            level = detect_heading_level(line)
            clean = clean_heading(line)
            formatted_lines.append(f"{'#' * level} {clean}")
            in_list = False
            continue

        # Detect numbered lists
        if re.match(r'^\d+[.\)\-]\s', line):
            if not in_list or list_type != "numbered":
                in_list = True
                list_type = "numbered"
            num = re.match(r'^(\d+)', line).group(1)
            content = re.sub(r'^\d+[.\)\-]\s*', '', line)
            formatted_lines.append(f"{num}. {content}")
            continue

        # Detect bullet points
        if re.match(r'^[•\-\*\+►]\s', line):
            if not in_list or list_type != "bullet":
                in_list = True
                list_type = "bullet"
            content = re.sub(r'^[•\-\*\+►]\s*', '', line)
            formatted_lines.append(f"- {content}")
            continue

        # Detect equations (simple heuristic)
        if looks_like_equation(line):
            formatted_lines.append(f"$$ {line} $$")
            continue

        # Regular paragraph
        in_list = False
        list_type = None
        formatted_lines.append(line)

    formatted_text = "\n\n".join(formatted_lines)

    # Generate summary
    summary = generate_summary(formatted_text)

    # Generate key points
    key_points = extract_key_points(formatted_text)

    # Generate flashcards if requested
    flashcards = []
    if style == "flashcards":
        flashcards = generate_flashcards(formatted_text)

    # Generate quiz if requested
    quiz_questions = []
    if style == "quiz":
        quiz_questions = generate_quiz(formatted_text)

    return {
        "formatted_text": formatted_text,
        "summary": summary,
        "key_points": key_points,
        "flashcards": flashcards,
        "quiz_questions": quiz_questions
    }


def is_heading(line: str) -> bool:
    """Detect if line is a heading"""
    # All caps
    if line.isupper() and len(line) > 3 and len(line) < 100:
        return True
    # Ends with colon and is short
    if line.endswith(':') and len(line) < 80 and len(line.split()) < 10:
        return True
    # Common heading patterns
    heading_patterns = [
        r'^(Chapter|Section|Part|Unit|Module|Topic|Lesson)\s+\d+',
        r'^(Introduction|Conclusion|Summary|Overview|Background)',
        r'^(The|A|An)\s+\w+\s+(of|in|for|on)',
    ]
    for pattern in heading_patterns:
        if re.match(pattern, line, re.IGNORECASE):
            return True
    return False


def detect_heading_level(line: str) -> int:
    """Determine heading level"""
    if line.isupper():
        return 1
    if re.match(r'^(Chapter|Part|Module)\s+\d+', line, re.IGNORECASE):
        return 1
    if len(line) < 40:
        return 2
    return 3


def clean_heading(line: str) -> str:
    """Clean heading text"""
    line = line.rstrip(':')
    # Title case if all caps
    if line.isupper():
        return line.title()
    return line


def looks_like_equation(line: str) -> bool:
    """Simple heuristic for equations"""
    equation_chars = set(r'=+-*/^_{}\int\sum\prod\lim\frac\sqrt')
    if len(set(line) & equation_chars) > 2:
        return True
    if re.search(r'[a-z]\s*=\s*[^=]+', line) and len(line) < 100:
        return True
    return False


def generate_summary(text: str) -> str:
    """Generate a simple summary"""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    # Take first 2-3 substantial sentences
    summary_sentences = []
    for sent in sentences:
        if len(sent) > 30 and len(summary_sentences) < 3:
            summary_sentences.append(sent)
    return " ".join(summary_sentences) if summary_sentences else "Summary not available."


def extract_key_points(text: str) -> List[str]:
    """Extract key points from text"""
    points = []
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        # Bullet points and numbered items are likely key points
        if re.match(r'^[\-\*\d]', line) and len(line) > 20:
            clean = re.sub(r'^[\-\*\d.]+\s*', '', line)
            if len(clean) > 15 and len(clean) < 200:
                points.append(clean)
        # Short important-looking lines
        elif len(line) > 30 and len(line) < 150 and line.endswith('.'):
            if any(keyword in line.lower() for keyword in ['important', 'key', 'main', 'critical', 'essential', 'note']):
                points.append(line)

    return points[:7] if points else ["Key points extracted from document"]


def generate_flashcards(text: str) -> List[Dict]:
    """Generate simple flashcards"""
    flashcards = []
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('- ') or re.match(r'^\d+\.', line):
            clean = re.sub(r'^[\-\*\d.]+\s*', '', line)
            if ':' in clean:
                parts = clean.split(':', 1)
                flashcards.append({
                    "question": parts[0].strip() + "?",
                    "answer": parts[1].strip()
                })
            elif len(clean) > 30:
                # Create a question from the statement
                flashcards.append({
                    "question": f"What is mentioned about: {clean[:50]}...?",
                    "answer": clean
                })
        if len(flashcards) >= 10:
            break
    return flashcards


def generate_quiz(text: str) -> List[Dict]:
    """Generate simple quiz questions"""
    quiz = []
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('- ') or re.match(r'^\d+\.', line):
            clean = re.sub(r'^[\-\*\d.]+\s*', '', line)
            if len(clean) > 40:
                # Create a simple multiple choice
                words = clean.split()
                if len(words) > 5:
                    quiz.append({
                        "question": f"Which of the following describes: {clean[:60]}...?",
                        "options": [clean, "Alternative A", "Alternative B", "None of the above"],
                        "correct_answer": 0
                    })
        if len(quiz) >= 5:
            break
    return quiz
