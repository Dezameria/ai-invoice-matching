import secrets

from fastapi import Header, HTTPException


class AccessPolicy:
    """Shared-key pilot boundary; replace here when Entra policies are introduced."""

    def __init__(self, read_key: str, write_key: str):
        self.read_key = read_key
        self.write_key = write_key

    @staticmethod
    def _token(authorization):
        return authorization[7:] if authorization and authorization.startswith('Bearer ') else ''

    def read(self, authorization: str | None = Header(default=None)):
        if self.read_key and not secrets.compare_digest(self._token(authorization), self.read_key):
            raise HTTPException(401, 'Portal access key is required.')

    def ingest(self, authorization: str | None = Header(default=None)):
        if self.write_key and not secrets.compare_digest(self._token(authorization), self.write_key):
            raise HTTPException(401, 'Integration access key is required.')

    def either(self, authorization: str | None = Header(default=None)):
        token = self._token(authorization)
        if self.read_key and not (secrets.compare_digest(token, self.read_key) or secrets.compare_digest(token, self.write_key)):
            raise HTTPException(401, 'Access key is required.')
