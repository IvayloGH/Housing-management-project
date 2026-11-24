"""Encryption of face templates - ESZTER'S FILE.

The design says face templates are biometric data and are only stored encrypted.
routers/face_login.py only uses the two names below. Until Eszter fills them in, they raise
NotImplementedError and the face endpoints answer "Face login is not available yet" (503).

    encrypt_template(template: list[float]) -> bytes
        What gets saved in face_login.template (VARBINARY(MAX)).

    decrypt_template(data: bytes) -> list[float]
        Gives the template back when someone tries to log in with their face.
"""


def encrypt_template(template: list[float]) -> bytes:
    raise NotImplementedError("Face template encryption is not added yet (Eszter)")


def decrypt_template(data: bytes) -> list[float]:
    raise NotImplementedError("Face template encryption is not added yet (Eszter)")
