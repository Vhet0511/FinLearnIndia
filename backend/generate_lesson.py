import requests
import json

title = input("Enter lesson title: ").strip()
summary = input("Enter lesson summary: ").strip()

prompt = f"""
Create an educational lesson.

Title: {title}
Summary: {summary}

Return a JSON object with exactly these fields:
- content: a complete lesson of approximately 2000 words, as a string
- bullet_points: an array of strings, approximately 500 words total
- notes: an array of exactly 5 important learning sentences

Return JSON only. No introduction or Markdown code fences.
"""

try:
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "qwen2.5:7b",
            "prompt": prompt,
            "format": {
                "type": "object",
                "properties": {
                    "content": {"type": "string"},
                    "bullet_points": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "notes": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": [
                    "content",
                    "bullet_points",
                    "notes"
                ]
            },
            "stream": False,
            "options": {"num_predict": 8000}
        },
        timeout=900
    )

    response.raise_for_status()

    lesson = json.loads(response.json()["response"])

    # Validate the generated structure
    assert isinstance(lesson["content"], str)
    assert isinstance(lesson["bullet_points"], list)
    assert isinstance(lesson["notes"], list)
    assert len(lesson["notes"]) == 5

    # Print valid JSON only
    print(json.dumps(lesson, indent=2, ensure_ascii=False))

except Exception as error:
    print("Error:", error)
