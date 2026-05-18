#!/usr/bin/env python3
"""Generate and send test emails to mailserver container."""

import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from email.utils import formatdate

# Configuration
MAILSERVER_HOST = "localhost"
MAILSERVER_PORT = 25  # docker-mailserver SMTP port
RECIPIENT = "jasper@mail.local"

# Sample email content templates
SUBJECTS = [
    "Hello from {sender}",
    "Test email #{n}",
    "Report: {date}",
    "Update: New message",
    "Notification from {sender}",
    "Weekly digest",
    "Action required",
    "Feedback on your request",
]

BODY_TEMPLATES = [
    "This is a test email from {sender}. Generated at {time}.",
    "Hello,\n\nThis is a message containing some test content.\n\nBest regards,\n{sender}",
    "Test content #{n}:\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nSender: {sender}",
    "Hi there!\n\nJust a quick test message. Reply to {sender} if needed.",
    "Automated test message\nTimestamp: {time}\nFrom: {sender}",
    "This email contains important test data.\n\nContent generated: {time}\nSource: {sender}",
]


def generate_random_email():
    """Generate a random email address."""
    return "jasper@mail.local"


def generate_email_content(sender: str, num: int):
    """Generate random email subject and body."""
    subject_template = random.choice(SUBJECTS)
    body_template = random.choice(BODY_TEMPLATES)
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    subject = subject_template.format(sender=sender.split("@")[0], n=num, date=now.split()[0])
    body = body_template.format(sender=sender, time=now, n=num)
    
    return subject, body


def send_email(sender: str, recipient: str, subject: str, body: str):
    """Send an email via SMTP."""
    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg.attach(MIMEText(body, "plain"))
    
    try:
        with smtplib.SMTP(MAILSERVER_HOST, MAILSERVER_PORT) as server:
            server.send_message(msg)
            print(f"✓ Sent from {sender} to {recipient}")
            return True
    except Exception as e:
        print(f"✗ Failed to send from {sender}: {e}")
        return False


def main():
    """Generate and send test emails."""
    num_emails = 10
    print(f"Generating {num_emails} test emails...\n")
    
    sent_count = 0
    for i in range(num_emails):
        sender = generate_random_email()
        subject, body = generate_email_content(sender, i + 1)
        
        if send_email(sender, RECIPIENT, subject, body):
            sent_count += 1
        
        # Small delay between sends
        if i < num_emails - 1:
            import time
            time.sleep(0.5)
    
    print(f"\n✓ Successfully sent {sent_count}/{num_emails} emails to {RECIPIENT}")


if __name__ == "__main__":
    main()
