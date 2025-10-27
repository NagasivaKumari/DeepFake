# Simple wrapper for legacy compatibility
def send_email(to_email, subject, body):
    return send_email_smtp(to_email, subject, body)
import os
import ssl
import mimetypes
from dotenv import load_dotenv
from email.message import EmailMessage
import smtplib

load_dotenv()

SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
SMTP_FROM = os.getenv('SMTP_FROM', SMTP_USER)


def send_email_smtp(to_addrs, subject, body_text, html=None, cc=None, bcc=None, attachments=None, timeout=30):
    """Send an email using SMTP.

    Args:
        to_addrs (str or list): recipient email or list of emails.
        subject (str): email subject.
        body_text (str): plain-text body.
        html (str, optional): html body. If provided, message will be multipart/alternative.
        cc (str or list, optional): cc recipients.
        bcc (str or list, optional): bcc recipients.
        attachments (list[str], optional): file paths to attach.
        timeout (int, optional): socket timeout in seconds.

    Raises:
        RuntimeError on missing SMTP configuration or send errors.

    Returns:
        dict: {"sent": True, "recipients": [...]} on success.
    """
    print(f"SMTP config: SERVER={SMTP_SERVER}, PORT={SMTP_PORT}, USER={SMTP_USER}, FROM={SMTP_FROM}")
    if not SMTP_SERVER or not SMTP_USER:
        raise RuntimeError('SMTP_SERVER and SMTP_USER must be set in environment (.env)')

    print(f"Preparing recipients: to={to_addrs}, cc={cc}, bcc={bcc}")
    if isinstance(to_addrs, str):
        to_list = [to_addrs]
    else:
        to_list = list(to_addrs or [])

    cc_list = []
    if cc:
        cc_list = [cc] if isinstance(cc, str) else list(cc)

    bcc_list = []
    if bcc:
        bcc_list = [bcc] if isinstance(bcc, str) else list(bcc)

    all_recipients = to_list + cc_list + bcc_list
    print(f"All recipients: {all_recipients}")
    if not all_recipients:
        raise RuntimeError('No recipients provided')

    print(f"Composing message: subject={subject}")
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = SMTP_FROM
    msg['To'] = ', '.join(to_list)
    if cc_list:
        msg['Cc'] = ', '.join(cc_list)

    # Set plain text and optional HTML
    if html:
        msg.set_content(body_text or 'This email contains an HTML body')
        msg.add_alternative(html, subtype='html')
    else:
        msg.set_content(body_text or '')

    # Attach files if any
    if attachments:
        for path in attachments:
            if not os.path.exists(path):
                print(f"Attachment not found: {path}")
                raise RuntimeError(f'Attachment not found: {path}')
            ctype, encoding = mimetypes.guess_type(path)
            if ctype is None:
                ctype = 'application/octet-stream'
            maintype, subtype = ctype.split('/', 1)
            with open(path, 'rb') as f:
                data = f.read()
            msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=os.path.basename(path))
            print(f"Attached file: {path}")

    # Connect to SMTP and send
    try:
        context = ssl.create_default_context()
        print(f"Connecting to SMTP server {SMTP_SERVER}:{SMTP_PORT}...")
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context, timeout=timeout) as server:
                print("Connected via SSL.")
                if SMTP_USER and SMTP_PASSWORD:
                    print(f"Logging in as {SMTP_USER}...")
                    server.login(SMTP_USER, SMTP_PASSWORD)
                print("Sending message...")
                server.send_message(msg, from_addr=SMTP_FROM, to_addrs=all_recipients)
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=timeout) as server:
                print("Connected via plain SMTP.")
                server.ehlo()
                print("Starting TLS...")
                server.starttls(context=context)
                server.ehlo()
                if SMTP_USER and SMTP_PASSWORD:
                    print(f"Logging in as {SMTP_USER}...")
                    server.login(SMTP_USER, SMTP_PASSWORD)
                print("Sending message...")
                server.send_message(msg, from_addr=SMTP_FROM, to_addrs=all_recipients)
        print("Email sent successfully.")
    except Exception as e:
        print(f"Error sending email: {e}")
        raise RuntimeError(f'Failed to send email: {e}')

    return {"sent": True, "recipients": all_recipients}
