# whisper_service.py
# ── REMOVED: local Whisper + Torch completely ──────────────────────────────
# Speech-to-text is now handled in the browser via the Web Speech API.
# This file is kept as a stub so no import errors occur in case it's referenced.

def transcribe_audio(audio_bytes: bytes, file_extension: str = ".webm") -> str:
    """Stub — browser handles STT. Should never be called."""
    raise NotImplementedError(
        "Local Whisper has been removed. "
        "Speech-to-text is handled client-side via the Web Speech API."
    )
