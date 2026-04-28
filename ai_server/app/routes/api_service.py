from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_service import parse_events_from_description

router = APIRouter()


class DescriptionInput(BaseModel):
    description: str


@router.post("/generate-events")
async def generate_events(body: DescriptionInput):
    events = parse_events_from_description(body.description)
    return {"events": events}