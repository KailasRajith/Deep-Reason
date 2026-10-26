import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet
from config import settings

def _get_fernet() -> Fernet:
    """Derive a URL-safe base64 32-byte key for Fernet from the application SECRET_KEY."""
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    url_safe_key = base64.urlsafe_b64encode(key)
    return Fernet(url_safe_key)

def encrypt_api_key(raw_key: Optional[str]) -> Optional[str]:
    """Encrypt an API key for secure persistence in database."""
    if not raw_key:
        return None
    fernet = _get_fernet()
    return fernet.encrypt(raw_key.encode()).decode()

def decrypt_api_key(encrypted_key: Optional[str]) -> Optional[str]:
    """Decrypt an API key retrieved from persistence."""
    if not encrypted_key:
        return None
    try:
        fernet = _get_fernet()
        return fernet.decrypt(encrypted_key.encode()).decode()
    except Exception:
        return None

def mask_api_key(raw_key: Optional[str]) -> Optional[str]:
    """Mask an API key so it can be safely displayed in the UI without leaking credentials."""
    if not raw_key:
        return None
    raw_key = raw_key.strip()
    if len(raw_key) <= 8:
        return "••••••••"
    prefix_len = min(6, len(raw_key) // 4)
    suffix_len = min(4, len(raw_key) // 4)
    return f"{raw_key[:prefix_len]}••••••••{raw_key[-suffix_len:]}"
