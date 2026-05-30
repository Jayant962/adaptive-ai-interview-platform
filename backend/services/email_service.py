import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

async def send_email(to_email: str, subject: str, html_body: str):
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USERNAME,
        password=settings.SMTP_PASSWORD,
        start_tls=True,
    )

async def send_welcome_email(to_email: str, name: str):
    subject = "Welcome to AI Mock Interview Platform"
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a2e;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
            <h2 style="color: #2563eb;">Welcome to AI Mock Interview Platform!</h2>
            <p>Hi <strong>{name}</strong>,</p>
            <p>Welcome to AI Mock Interview Platform. You are now registered and can start practicing interviews.</p>
            <p>Our AI-powered platform will help you:</p>
            <ul>
                <li>Practice technical and HR interviews</li>
                <li>Get real-time feedback on grammar, fluency, and conceptual accuracy</li>
                <li>Improve with adaptive questioning based on your performance</li>
            </ul>
            <p>Login now and start your first mock interview session!</p>
            <p style="color: #666;">Best regards,<br>AI Mock Interview Team</p>
        </div>
    </body>
    </html>
    """
    await send_email(to_email, subject, html_body)

async def send_password_email(to_email: str, name: str, password: str):
    subject = "Your Password - AI Mock Interview Platform"
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a2e;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
            <h2 style="color: #2563eb;">Password Recovery</h2>
            <p>Hi <strong>{name}</strong>,</p>
            <p>As requested, here is your account password:</p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong style="font-size: 18px;">{password}</strong>
            </div>
            <p>Please keep this safe and do not share it with anyone.</p>
            <p style="color: #666;">Best regards,<br>AI Mock Interview Team</p>
        </div>
    </body>
    </html>
    """
    await send_email(to_email, subject, html_body)
 