import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.utils.email import send_contact_email

logger = logging.getLogger("app.api.contact")

router = APIRouter(prefix="/api/contact", tags=["Contact"])

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

@router.post("")
async def receive_contact_message(
    request: ContactRequest,
    background_tasks: BackgroundTasks
):
    """
    Submit a message to the developer via the contact form.
    Sends an email to the configured CONTACT_EMAIL.
    """
    name = request.name.strip()
    email = request.email.strip()
    message = request.message.strip()

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="All fields (name, email, message) are required")
        
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Invalid email address format")

    # Send email in background to ensure fast response times
    background_tasks.add_task(
        send_contact_email,
        name=name,
        contact_email=email,
        message=message
    )

    return {"status": "success", "message": "Your message has been sent successfully!"}
