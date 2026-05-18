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
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", os.getenv("OPENAI_API_BASE", ""))



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


def call_anthropic_api(raw_text: str, style: str, config: Dict) -> Dict:
    """Use Anthropic API to format notes using urllib.request"""
    import urllib.request
    import urllib.error
    import json
    
    api_key = config.get("api_key")
    if not api_key:
        raise ValueError("No Anthropic API key provided")
        
    model = config.get("model") or "claude-3-5-sonnet-latest"
    
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

Please format this into structured notes. Your entire response MUST be a valid JSON object. Do not wrap it in markdown code blocks."""

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    payload = {
        "model": model,
        "max_tokens": 4000,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            resp_data = json.loads(response.read().decode("utf-8"))
            raw_content = resp_data["content"][0]["text"].strip()
    except urllib.error.HTTPError as e:
        error_content = e.read().decode("utf-8")
        print(f"Anthropic API Error: {error_content}")
        raise ValueError(f"Anthropic API error: {e.code} - {error_content}")
    except Exception as e:
        print(f"Anthropic Request Error: {e}")
        raise e

    # Strip markdown code blocks if the model wrapped the JSON
    if raw_content.startswith("```json"):
        raw_content = raw_content[7:]
    elif raw_content.startswith("```"):
        raw_content = raw_content[3:]
    if raw_content.endswith("```"):
        raw_content = raw_content[:-3]
    raw_content = raw_content.strip()

    try:
        result = json.loads(raw_content)
    except Exception as e:
        print(f"Failed to parse JSON: {raw_content[:200]}... Error: {e}")
        result = {"formatted_text": raw_content}

    return {
        "formatted_text": result.get("formatted_text", raw_text),
        "summary": result.get("summary", ""),
        "key_points": result.get("key_points", []),
        "flashcards": result.get("flashcards", []),
        "quiz_questions": result.get("quiz_questions", [])
    }


def format_with_ai_provider(raw_text: str, style: str, api_config: Optional[Dict]) -> Dict:
    """Use configured AI provider to format notes"""
    # Merge provided config with defaults
    provider = api_config.get("provider", "openai") if api_config else "openai"
    
    config = {
        "api_key": OPENAI_API_KEY if provider == "openai" else None,
        "base_url": OPENAI_BASE_URL if provider == "openai" else None,
        "model": "gpt-4o-mini",
        "provider": provider
    }
    if api_config:
        config.update({k: v for k, v in api_config.items() if v})

    # If Anthropic provider
    if provider == "anthropic":
        return call_anthropic_api(raw_text, style, config)

    # Configure defaults for standard OpenAI-compatible providers
    if provider == "openrouter":
        config["base_url"] = config.get("base_url") or "https://openrouter.ai/api/v1"
        config["model"] = config.get("model") or "google/gemini-2.5-flash"
    elif provider == "nvidia":
        config["base_url"] = config.get("base_url") or "https://integrate.api.nvidia.com/v1"
        config["model"] = config.get("model") or "meta/llama-3.1-8b-instruct"
    elif provider == "openai":
        config["base_url"] = config.get("base_url") or "https://api.openai.com/v1"
        config["model"] = config.get("model") or "gpt-4o-mini"

    if not config["api_key"] and not config["base_url"]:
        raise ValueError("No API key or base URL provided")

    client = openai.OpenAI(
        api_key=config["api_key"] or "dummy-key",
        base_url=config["base_url"] or None
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

    kwargs = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 4000
    }

    # Some OpenAI-compatible APIs (like Nvidia/OpenRouter) do not support response_format
    if provider == "openai":
        kwargs["response_format"] = {"type": "json_object"}

    try:
        response = client.chat.completions.create(**kwargs)
    except Exception as e:
        if "response_format" in kwargs:
            print(f"Retrying without response_format due to error: {e}")
            del kwargs["response_format"]
            response = client.chat.completions.create(**kwargs)
        else:
            raise e

    raw_content = response.choices[0].message.content.strip()
    
    # Strip markdown code blocks if the model wrapped the JSON
    if raw_content.startswith("```json"):
        raw_content = raw_content[7:]
    elif raw_content.startswith("```"):
        raw_content = raw_content[3:]
    if raw_content.endswith("```"):
        raw_content = raw_content[:-3]
    raw_content = raw_content.strip()

    try:
        result = json.loads(raw_content)
    except Exception as e:
        print(f"Failed to parse JSON: {raw_content[:200]}... Error: {e}")
        result = {"formatted_text": raw_content}

    # Ensure all fields exist
    return {
        "formatted_text": result.get("formatted_text", raw_text),
        "summary": result.get("summary", ""),
        "key_points": result.get("key_points", []),
        "flashcards": result.get("flashcards", []),
        "quiz_questions": result.get("quiz_questions", [])
    }


def refine_text_with_anthropic(original_text: str, selection: str, instruction: str, config: Dict) -> str:
    """Refine a selection of text using Anthropic Claude"""
    import urllib.request
    import json
    
    api_key = config.get("api_key")
    if not api_key:
        return selection
        
    model = config.get("model") or "claude-3-5-sonnet-latest"
    
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

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    payload = {
        "model": model,
        "max_tokens": 2000,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            resp_data = json.loads(response.read().decode("utf-8"))
            return resp_data["content"][0]["text"].strip()
    except Exception as e:
        print(f"Anthropic refine error: {e}")
        return selection


def refine_text_with_ai(original_text: str, selection: str, instruction: str, api_config: Optional[Dict] = None) -> str:
    """Refine a specific part of the text based on user instruction"""
    provider = api_config.get("provider", "openai") if api_config else "openai"
    
    config = {
        "api_key": OPENAI_API_KEY if provider == "openai" else None,
        "base_url": OPENAI_BASE_URL if provider == "openai" else None,
        "model": "gpt-4o-mini",
        "provider": provider
    }
    if api_config:
        config.update({k: v for k, v in api_config.items() if v})

    if provider == "anthropic":
        return refine_text_with_anthropic(original_text, selection, instruction, config)

    # OpenAI-compatible setup
    if provider == "openrouter":
        config["base_url"] = config.get("base_url") or "https://openrouter.ai/api/v1"
        config["model"] = config.get("model") or "google/gemini-2.5-flash"
    elif provider == "nvidia":
        config["base_url"] = config.get("base_url") or "https://integrate.api.nvidia.com/v1"
        config["model"] = config.get("model") or "meta/llama-3.1-8b-instruct"
    elif provider == "openai":
        config["base_url"] = config.get("base_url") or "https://api.openai.com/v1"
        config["model"] = config.get("model") or "gpt-4o-mini"

    if not config["api_key"] and not config["base_url"]:
        return selection # Fallback to no change

    client = openai.OpenAI(
        api_key=config["api_key"],
        base_url=config["base_url"] or None
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
    provider = api_config.get("provider", "openai") if api_config else "openai"
    
    config = {
        "api_key": OPENAI_API_KEY if provider == "openai" else None,
        "base_url": OPENAI_BASE_URL if provider == "openai" else None,
        "model": "gpt-4o-mini",
        "provider": provider
    }
    config.update({k: v for k, v in api_config.items() if v})

    # If Anthropic provider
    if provider == "anthropic":
        import urllib.request
        import json
        
        api_key = config.get("api_key")
        if not api_key:
            return {"status": "error", "message": "No Anthropic API key provided"}
            
        model = config.get("model") or "claude-3-5-sonnet-latest"
        
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": model,
            "max_tokens": 10,
            "messages": [
                {"role": "user", "content": "Say 'hello'"}
            ],
            "temperature": 0
        }
        
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=data,
            headers=headers,
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                if resp_data.get("content"):
                    return {"status": "success", "message": "Connection successful!"}
                return {"status": "error", "message": "No response content from Anthropic"}
        except urllib.error.HTTPError as e:
            try:
                error_msg = e.read().decode("utf-8")
                error_data = json.loads(error_msg)
                error_detail = error_data.get("error", {}).get("message", "API Key verification failed")
            except Exception:
                error_detail = f"HTTP Error {e.code}"
            return {"status": "error", "message": f"Connection failed: {error_detail}"}
        except Exception as e:
            return {"status": "error", "message": f"Connection failed: {str(e)[:100]}"}

    # Configure defaults for OpenAI-compatible providers
    if provider == "openrouter":
        config["base_url"] = config.get("base_url") or "https://openrouter.ai/api/v1"
        config["model"] = config.get("model") or "google/gemini-2.5-flash"
    elif provider == "nvidia":
        config["base_url"] = config.get("base_url") or "https://integrate.api.nvidia.com/v1"
        config["model"] = config.get("model") or "meta/llama-3.1-8b-instruct"
    elif provider == "openai":
        config["base_url"] = config.get("base_url") or "https://api.openai.com/v1"
        config["model"] = config.get("model") or "gpt-4o-mini"

    if not config["api_key"] and not config["base_url"]:
        return {"status": "error", "message": "No API key or base URL provided"}

    try:
        client = openai.OpenAI(
            api_key=config["api_key"] or "dummy-key",
            base_url=config["base_url"] or None
        )
        
        # Simple completion request to test connection
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
        if "401" in error_msg:
            error_msg = "Invalid API Key (Unauthorized)"
        elif "404" in error_msg:
            error_msg = "Model not found or invalid Base URL"
        elif "Connection error" in error_msg:
            error_msg = "Could not reach the server. Check your Base URL and internet."
            
        return {"status": "error", "message": f"Connection failed: {error_msg[:120]}"}


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
