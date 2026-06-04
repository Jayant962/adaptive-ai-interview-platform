import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.config import settings

logger = logging.getLogger("app.email")

def send_welcome_email(to_email: str, name: str):
    """
    Send a welcome email to the user.
    If SMTP settings are not configured or set to mock, it will simulate the sending.
    """
    subject = "Welcome to AI Interviewer! 🎙️"
    
    # Custom HTML message
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to AI Interviewer</title>
      <style>
        body {{
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }}
        .container {{
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }}
        .header {{
          background-color: #6d5fe8;
          padding: 40px 20px;
          text-align: center;
          color: #ffffff;
        }}
        .header h1 {{
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }}
        .content {{
          padding: 40px 30px;
          color: #334155;
          line-height: 1.7;
        }}
        .content p {{
          margin: 0 0 20px 0;
          font-size: 16px;
        }}
        .content ul {{
          padding-left: 20px;
          margin: 0 0 30px 0;
        }}
        .content li {{
          margin-bottom: 12px;
          font-size: 15px;
        }}
        .btn-wrapper {{
          text-align: center;
          margin: 35px 0;
        }}
        .btn {{
          background-color: #6d5fe8;
          color: #ffffff !important;
          padding: 14px 32px;
          text-decoration: none;
          font-weight: 700;
          border-radius: 12px;
          display: inline-block;
          box-shadow: 0 4px 12px rgba(109, 95, 232, 0.2);
          transition: background-color 0.2s;
        }}
        .footer {{
          background-color: #f8fafc;
          padding: 24px 30px;
          text-align: center;
          font-size: 13px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to AI Interviewer! 🎙️</h1>
        </div>
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
            <a href="{settings.FRONTEND_URL}/dashboard" class="btn" target="_blank">Start Your First Interview</a>
          </div>
          <p>If you have any questions or feedback, feel free to reach out to us. Good luck with your preparation!</p>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>The AI Interviewer Team</strong></p>
        </div>
      </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Hi {name},
    
    Welcome to AI Interviewer!
    
    We are thrilled to welcome you to our platform. AI Interviewer is designed to help you practice and hone your technical and communication skills with adaptive, oral-focused mock interviews.
    
    Start your first interview by logging in to your dashboard here:
    {settings.FRONTEND_URL}/dashboard
    
    Best regards,
    The AI Interviewer Team
    """

    # Check if SMTP configuration exists and is active
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USERNAME
    smtp_pass = settings.SMTP_PASSWORD
    smtp_from = settings.SMTP_FROM_EMAIL

    if not smtp_host or smtp_host == "mock" or not smtp_user or smtp_user == "mock":
        logger.info(f"Simulating Welcome Email: To={to_email}, Name={name}")
        # Print simulated output to stdout for clear developer review
        print("\n" + "="*50)
        print(f"📧 [MOCK EMAIL SENT]")
        print(f"To: {to_email}")
        print(f"From: {smtp_from}")
        print(f"Subject: {subject}")
        print(f"Body:\n{text_content.strip()}")
        print("="*50 + "\n")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_from
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)

        # Select correct SMTP class based on port (e.g. port 465 requires SSL, 587/25 use STARTTLS)
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            
        with server:
            if smtp_port != 465:
                server.ehlo()
                try:
                    server.starttls()
                    server.ehlo()
                except Exception as tls_err:
                    logger.warning(f"STARTTLS failed or not supported by server: {tls_err}")
            
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
                
            server.sendmail(smtp_from, to_email, msg.as_string())
            
        logger.info(f"Welcome email successfully sent to {to_email}")
        print(f"📧 [EMAIL SENT SUCCESS] Welcome email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {str(e)}")
        print(f"❌ [EMAIL SEND ERROR] Failed to send to {to_email}: {str(e)}")
