# # # from fastapi import APIRouter, HTTPException
# # # from pydantic import BaseModel
# # # from app.services.grok_client import call_grok
# # # from app.services.analysis_service import build_grok_prompt, parse_grok_output

# # # router = APIRouter()

# # # class InputMetrics(BaseModel):
# # #     user_type: str
# # #     AOI: str
# # #     population_density: float
# # #     ndvi_mean: float
# # #     lst_mean_celsius: float
# # #     air_quality_index: float
# # #     land_use_dominant: str
# # #     flood_risk_score: float
# # #     slope_avg: float
# # #     nightlight_index: float
# # #     recommendations: dict

# # # @router.post("/grok-analyze")
# # # def grok_analyze(inp: InputMetrics):
# # #     prompt = build_grok_prompt(inp.user_type, inp.dict())
# # #     try:
# # #         grok_resp = call_grok(prompt)
# # #         output = parse_grok_output(grok_resp)
# # #         return output
# # #     except Exception as e:
# # #         raise HTTPException(status_code=500, detail=str(e))


# # from fastapi import APIRouter, HTTPException
# # import os
# # from app.services.analysis_service import build_grok_prompt, parse_grok_output
# # import requests

# # router = APIRouter()

# # XAI_API_KEY = os.getenv("XAI_API_KEY")

# # @router.post("/grok")
# # def grok_analysis(data: dict):
# #     prompt = build_grok_prompt(data)
# #     response = requests.post(
# #         "https://api.x.ai/v1/chat/completions",
# #         headers={"Authorization": f"Bearer {XAI_API_KEY}", "Content-Type": "application/json"},
# #         json={
# #             "model": "grok-4",
# #             "messages": [{"role": "user", "content": prompt}],
# #             "temperature": 0.3
# #         }
# #     )
# #     if response.status_code != 200:
# #         raise HTTPException(status_code=500, detail=response.text)
# #     return parse_grok_output(response.json())
# from fastapi import APIRouter, HTTPException
# import os
# import requests

# router = APIRouter()

# # Load API key from environment
# XAI_API_KEY = os.getenv("XAI_API_KEY")

# @router.post("/grok")
# def grok_analysis(data: dict):
#     if not XAI_API_KEY:
#         raise HTTPException(status_code=500, detail="API Key not set")

#     # Call Grok API
#     response = requests.post(
#         "https://api.x.ai/v1/chat/completions",
#         headers={
#             "Authorization": f"Bearer {XAI_API_KEY}",
#             "Content-Type": "application/json"
#         },
#         json={
#             "model": "grok-4",
#             "messages": [{"role": "user", "content": f"{data}"}],
#             "temperature": 0.3
#         }
#     )

#     if response.status_code != 200:
#         raise HTTPException(status_code=response.status_code, detail=response.text)

#     return response.json()
from fastapi import APIRouter, HTTPException
import os
import requests
import json

router = APIRouter()

XAI_API_KEY = os.getenv("XAI_API_KEY")

@router.post("/grok")
def grok_analysis(data: dict):
    if not XAI_API_KEY:
        raise HTTPException(status_code=500, detail="API Key not set")

    payload = {
        "model": "grok-4",
        "messages": [{"role": "user", "content": json.dumps(data)}],
        "temperature": 0.3
    }

    try:
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {XAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=15
        )
        response.raise_for_status()  # <-- this will raise for HTTP errors
        return response.json()

    except requests.exceptions.HTTPError as e:
        # log error details
        raise HTTPException(status_code=response.status_code, detail=response.text)
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))
