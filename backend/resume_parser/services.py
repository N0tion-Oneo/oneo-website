import json
import logging
from openai import OpenAI
from django.conf import settings
from django.core.files.base import ContentFile
from .prompts import RESUME_PARSER_PROMPT

logger = logging.getLogger(__name__)


def get_openai_client():
    """Get OpenAI client with API key from settings."""
    api_key = getattr(settings, 'OPENAI_API_KEY', None)
    if not api_key:
        raise ValueError("OPENAI_API_KEY not configured in settings")
    return OpenAI(api_key=api_key)


def parse_resume(file, candidate_profile) -> dict:
    """
    Parse a resume file using OpenAI's Files API and GPT-5-nano.

    1. Save file to candidate's profile
    2. Upload to OpenAI, parse with GPT-5-nano
    3. Delete from OpenAI (file remains on our storage)
    4. Return structured data
    """
    client = get_openai_client()

    # Read file content
    file_content = file.read()
    file_name = file.name
    content_type = getattr(file, 'content_type', 'application/octet-stream')

    # 1. Save file to candidate profile (overwrites existing)
    candidate_profile.resume_url.save(
        file_name,
        ContentFile(file_content),
        save=True
    )
    logger.info(f"Saved resume for candidate {candidate_profile.id}: {file_name}")

    uploaded_file = None
    try:
        # 2. Upload to OpenAI Files API
        uploaded_file = client.files.create(
            file=(file_name, file_content, content_type),
            purpose="assistants"
        )
        logger.info(f"Uploaded file to OpenAI: {uploaded_file.id}")

        # 3. Parse with GPT-5-nano
        response = client.chat.completions.create(
            model="gpt-5-nano",
            messages=[
                {"role": "system", "content": RESUME_PARSER_PROMPT},
                {"role": "user", "content": [
                    {
                        "type": "file",
                        "file": {"file_id": uploaded_file.id}
                    },
                    {
                        "type": "text",
                        "text": "Parse this resume and extract structured data."
                    }
                ]}
            ],
            response_format={"type": "json_object"}
        )

        parsed_data = json.loads(response.choices[0].message.content)
        logger.info(f"Successfully parsed resume for candidate {candidate_profile.id}")
        return parsed_data

    finally:
        # 4. Always delete file from OpenAI (our copy remains)
        if uploaded_file:
            try:
                client.files.delete(uploaded_file.id)
                logger.info(f"Deleted file from OpenAI: {uploaded_file.id}")
            except Exception as e:
                logger.warning(f"Failed to delete file from OpenAI: {e}")
