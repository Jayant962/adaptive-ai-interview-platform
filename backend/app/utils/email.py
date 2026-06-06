import httpx
import logging
from app.config import settings

logger = logging.getLogger("app.email")


def _get_smtp_from() -> str:
    return getattr(settings, 'SMTP_FROM_EMAIL', '') or ''


def _get_resend_key() -> str:
    return getattr(settings, 'RESEND_API_KEY', '') or ''


def _is_mock() -> bool:
    key = _get_resend_key()
    return not key or key == 'mock'


async def _send_via_resend(to_email: str, subject: str, html_content: str, text_content: str, reply_to: str = None) -> bool:
    """Core Resend HTTP API sender — works on Render free tier (HTTPS port 443)."""
    payload = {
        "from": f"AI Interviewer <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {_get_resend_key()}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10.0,
            )
        if response.status_code in (200, 201):
            logger.info(f"Email sent to {to_email}")
            print(f"📧 [EMAIL SENT SUCCESS] Email sent to {to_email}")
            return True
        else:
            logger.error(f"Resend API error: {response.status_code} - {response.text}")
            print(f"❌ [EMAIL SEND ERROR] {response.status_code}: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        print(f"❌ [EMAIL SEND ERROR] Failed to send to {to_email}: {str(e)}")
        return False


async def send_welcome_email(to_email: str, name: str) -> bool:
    """
    Send a welcome email to a new user.
    Uses Resend HTTP API (works on Render free tier).
    Falls back to mock logging if RESEND_API_KEY is not set.
    """
    subject = "Welcome to AI Interviewer! 🎙️"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to AI Interviewer</title>
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }}
        .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(15,23,42,0.05); border: 1px solid #e2e8f0; overflow: hidden; }}
        .header {{ background-color: #6d5fe8; padding: 40px 20px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }}
        .content {{ padding: 40px 30px; color: #334155; line-height: 1.7; }}
        .content p {{ margin: 0 0 20px 0; font-size: 16px; }}
        .content ul {{ padding-left: 20px; margin: 0 0 30px 0; }}
        .content li {{ margin-bottom: 12px; font-size: 15px; }}
        .btn-wrapper {{ text-align: center; margin: 35px 0; }}
        .btn {{ background-color: #6d5fe8; color: #ffffff !important; padding: 14px 32px; text-decoration: none; font-weight: 700; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(109,95,232,0.2); }}
        .footer {{ background-color: #f8fafc; padding: 24px 30px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Welcome to AI Interviewer! 🎙️</h1></div>
        <div class="content">
          <p>Hi <strong>{name}</strong>,</p>
          <p>We are thrilled to welcome you to our platform! AI Interviewer is designed to help you ace your next interview through realistic, adaptive, and oral-focused mock interviews.</p>
          <p>Here is what you can accomplish with us:</p>
          <ul>
            <li><strong>Practice Speaking Orally:</strong> Speak your answers out loud and let our avatar guide you through the process naturally.</li>
            <li><strong>Adaptive Follow-up Questions:</strong> Get evaluated on how well you respond to real-time, personalized follow-ups.</li>
            <li><strong>Technical and Communication Scoring:</strong> Receive detailed reports showing score breakdowns (grammar, flow, and concepts) and customized suggestions.</li>
          </ul>
          <div class="btn-wrapper">
            <a href="{settings.FRONTEND_URL}/interview/setup" class="btn" target="_blank">Start Your First Interview</a>
          </div>
          <p>If you have any questions or feedback, feel free to reach out. Good luck with your preparation!</p>
        </div>
        <div class="footer"><p>Best regards,<br><strong>The AI Interviewer Team</strong></p></div>
      </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {name},

Welcome to AI Interviewer!

We are thrilled to welcome you to our platform. AI Interviewer is designed to help you practice
and hone your technical and communication skills with adaptive, oral-focused mock interviews.

Start your first interview here:
{settings.FRONTEND_URL}/interview/setup

Best regards,
The AI Interviewer Team
    """.strip()

    if _is_mock():
        print("\n" + "=" * 50)
        print(f"📧 [MOCK EMAIL SENT]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{text_content}")
        print("=" * 50 + "\n")
        return True

    return await _send_via_resend(to_email, subject, html_content, text_content)


async def send_contact_email(name: str, contact_email: str, message: str) -> bool:
    """
    Send a contact form submission email to the developer.
    Uses Resend HTTP API (works on Render free tier).
    Falls back to mock logging if RESEND_API_KEY is not set.
    """
    subject = f"New Contact Message from {name}"
    to_email = getattr(settings, 'CONTACT_EMAIL', '') or _get_smtp_from()

    text_content = f"""
New Contact Form Submission:

Name: {name}
Email: {contact_email}

Message:
{message}
    """.strip()

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(15,23,42,0.05); border: 1px solid #e2e8f0; overflow: hidden; }}
        .header {{ background-color: #6d5fe8; padding: 30px 20px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; }}
        .content {{ padding: 40px 30px; color: #334155; line-height: 1.7; }}
        .field {{ margin-bottom: 20px; }}
        .label {{ font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 12px; margin-bottom: 5px; }}
        .value {{ font-size: 16px; background-color: #f1f5f9; padding: 12px; border-radius: 8px; white-space: pre-wrap; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>New Contact Submission! 📧</h1></div>
        <div class="content">
          <div class="field"><div class="label">Name</div><div class="value">{name}</div></div>
          <div class="field"><div class="label">Email</div><div class="value">{contact_email}</div></div>
          <div class="field"><div class="label">Message</div><div class="value">{message}</div></div>
        </div>
      </div>
    </body>
    </html>
    """

    if _is_mock():
        print("\n" + "=" * 50)
        print(f"📧 [MOCK CONTACT EMAIL SENT]")
        print(f"To: {to_email}")
        print(f"From (form): {name} <{contact_email}>")
        print(f"Subject: {subject}")
        print(f"Body:\n{text_content}")
        print("=" * 50 + "\n")
        return True

    return await _send_via_resend(to_email, subject, html_content, text_content, reply_to=contact_email)