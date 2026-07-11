import base64
import os
import re
from groq import Groq
from app.core.config import settings
from loguru import logger


def encode_image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def get_image_mime_type(image_path: str) -> str:
    ext = image_path.lower().split(".")[-1]
    mime_types = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp"
    }
    return mime_types.get(ext, "image/jpeg")


def analyze_image(
    image_path: str,
    question: str = "Describe this image in detail.",
    model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
) -> dict:
    logger.info(f"Analyzing image: {image_path}")

    client = Groq(api_key=settings.GROQ_API_KEY)

    image_data = encode_image_to_base64(image_path)
    mime_type = get_image_mime_type(image_path)

    system_prompt = """You are an expert Vision AI analyst. When analyzing images:

1. Extract ALL visible information accurately — text, numbers, labels, values
2. Structure your response clearly with sections
3. For financial documents, forms, or data: extract exact values and organize them in a table format
4. Always end your response with a confidence assessment

Format your response like this:

## Analysis
[Your detailed analysis here]

## Key Information Extracted
[Bullet points or table of key data found]

## Confidence Score
[Score from 0-100]% — [Brief reason for this confidence level]

Be precise. Never guess or hallucinate values you cannot clearly see."""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}"
                        }
                    },
                    {
                        "type": "text",
                        "text": question
                    }
                ]
            }
        ],
        max_tokens=2000,
        temperature=0.1
    )

    answer = response.choices[0].message.content
    tokens_used = response.usage.total_tokens if response.usage else 0

    confidence_score = 85
    try:
        confidence_section = answer.split("Confidence Score")[-1][:100]
        match = re.search(r'(\d+)%', confidence_section)
        if match:
            confidence_score = int(match.group(1))
    except:
        confidence_score = 85

    logger.info(f"Image analysis complete. Tokens: {tokens_used}, Confidence: {confidence_score}%")

    return {
        "answer": answer,
        "tokens_used": tokens_used,
        "model": model,
        "image_path": image_path,
        "confidence_score": confidence_score
    }