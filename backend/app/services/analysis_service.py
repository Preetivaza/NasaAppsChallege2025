# app/services/analysis_service.py

import json

def build_grok_prompt(data: dict, user_type: str) -> str:
    """
    Build a prompt for Grok based on city metrics and user type.
    """
    base_prompt = f"""
You are an expert urban planner and environmental analyst.
Given structured tile-level metrics and model outputs, produce concise, evidence-based, professional planning recommendations.
Consider the user's designation ({user_type}) while tailoring suggestions.
Output must follow the provided JSON schema exactly, be factual, cite 2–3 supporting metrics in the rationale,
and provide actionable next steps with department assignments.
Avoid speculative language and absolute commands; use measured professional phrasing (e.g., "recommend", "consider", "prioritize").
Return only valid JSON (no extra text).

Data Input:
{json.dumps(data, indent=2)}
"""
    return base_prompt


def parse_grok_output(response_text: str) -> dict:
    """
    Safely parse Grok's JSON response.
    """
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Try to clean up any stray text around JSON
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start != -1 and end != -1:
            cleaned = response_text[start:end]
            return json.loads(cleaned)
        raise ValueError("Invalid Grok response format")
