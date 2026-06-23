"""Encrypted per-site credential store for ATS accounts."""

from __future__ import annotations

import json
import os
import secrets
import string
from urllib.parse import urlparse

from cryptography.fernet import Fernet  # pyre-ignore[21]

from LinkedinAutomation.alert_user import alert  # pyre-ignore[21]
from LinkedinAutomation.apply_security import restrict_file_permissions  # pyre-ignore[21]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
_TMP_DIR = os.path.join(BASE_DIR, ".tmp")
_KEY_PATH = os.path.join(_TMP_DIR, "credentials.key")
_DATA_PATH = os.path.join(_TMP_DIR, "credentials.enc")


class CredentialStore:
    """Fernet-encrypted JSON store keyed by normalised ATS domain."""

    def __init__(self) -> None:
        os.makedirs(_TMP_DIR, exist_ok=True)
        self._fernet = Fernet(self._load_or_create_key())
        self._data: dict[str, dict[str, str]] = self._load_data()

    # -- public API --------------------------------------------------------

    def get(self, url: str) -> dict[str, str] | None:
        """Return {email, password} for *url*'s domain, or None."""
        return self._data.get(self.extract_domain(url))

    def store(self, url: str, email: str, password: str) -> None:
        """Persist credentials for *url*'s domain."""
        domain = self.extract_domain(url)
        self._data[domain] = {"email": email, "password": password}
        self._save_data()
        alert("CredentialStore", f"Stored credentials for {domain}")

    def exists(self, url: str) -> bool:
        return self.extract_domain(url) in self._data

    # -- static helpers ----------------------------------------------------

    @staticmethod
    def generate_password(length: int = 20) -> str:
        """Generate a password with guaranteed upper+lower+digit+special."""
        if length < 4:
            raise ValueError("Password length must be >= 4")
        special = "!@#$%^&*"
        required = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice(special),
        ]
        pool = string.ascii_letters + string.digits + special
        remaining = [secrets.choice(pool) for _ in range(length - 4)]
        combined = required + remaining
        secrets.SystemRandom().shuffle(combined)
        return "".join(combined)

    @staticmethod
    def extract_domain(url: str) -> str:
        """Normalise URL to root domain (e.g. gtlaw.wd1.myworkdayjobs.com -> myworkdayjobs.com)."""
        host = urlparse(url if "://" in url else f"https://{url}").hostname or url
        parts = host.split(".")
        return ".".join(parts[-2:]) if len(parts) > 2 else host

    # -- private -----------------------------------------------------------

    def _load_or_create_key(self) -> bytes:
        if os.path.exists(_KEY_PATH):
            with open(_KEY_PATH, "rb") as fh:
                return fh.read()
        key = Fernet.generate_key()
        with open(_KEY_PATH, "wb") as fh:
            fh.write(key)
        restrict_file_permissions(_KEY_PATH)
        alert("CredentialStore", "Created new encryption key")
        return key

    def _load_data(self) -> dict[str, dict[str, str]]:
        if not os.path.exists(_DATA_PATH):
            return {}
        with open(_DATA_PATH, "rb") as fh:
            return json.loads(self._fernet.decrypt(fh.read()))

    def _save_data(self) -> None:
        with open(_DATA_PATH, "wb") as fh:
            fh.write(self._fernet.encrypt(json.dumps(self._data).encode()))
        restrict_file_permissions(_DATA_PATH)
