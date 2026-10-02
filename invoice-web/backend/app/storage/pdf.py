import hashlib
import io
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from pypdf import PdfReader


class PdfFileStore:
    def __init__(self, directory: Path, maximum_bytes: int):
        self.directory = directory
        self.maximum_bytes = maximum_bytes
        self.directory.mkdir(parents=True, exist_ok=True)

    def validate_and_store(self, content: bytes):
        if len(content) > self.maximum_bytes:
            raise HTTPException(413, 'PDF must be at most 20 MB.')
        if not content.startswith(b'%PDF-'):
            raise HTTPException(422, 'File is not a PDF.')
        try:
            reader = PdfReader(io.BytesIO(content))
            if reader.is_encrypted:
                raise ValueError('Encrypted PDF')
            pages = len(reader.pages)
            if not 1 <= pages <= 500:
                raise ValueError('Page count')
            root = reader.trailer['/Root']
            if '/OpenAction' in root or '/AA' in root or '/JavaScript' in root.get('/Names', {}):
                raise ValueError('Active PDF')
        except Exception:
            raise HTTPException(422, 'PDF is unreadable, encrypted, active, or outside the 1–500 page limit.')
        digest = hashlib.sha256(content).hexdigest()
        target = self.directory / (digest + '.pdf')
        if not target.exists():
            temporary = self.directory / (str(uuid4()) + '.tmp')
            temporary.write_bytes(content)
            temporary.replace(target)
        return digest, pages
