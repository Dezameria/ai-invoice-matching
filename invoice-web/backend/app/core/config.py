import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
API_PREFIX = '/api/portal/v1'
MAX_JSON_BYTES = 2 * 1024 * 1024
MAX_PDF_BYTES = 20 * 1024 * 1024


@dataclass(frozen=True)
class Settings:
    storage: Path
    read_key: str
    write_key: str
    environment: str
    allowed_hosts: tuple[str, ...]
    allowed_origins: tuple[str, ...]

    @property
    def mode(self):
        return 'secured' if self.read_key else 'local'


def load_settings(data_dir=None, portal_key=None, ingest_key=None):
    storage = Path(data_dir or os.getenv('PORTAL_DATA_DIR', ROOT / 'data')).resolve()
    read_key = portal_key if portal_key is not None else os.getenv('PORTAL_API_KEY', '')
    write_key = ingest_key if ingest_key is not None else os.getenv('PORTAL_INGEST_KEY', '')
    environment = os.getenv('PORTAL_ENV', 'development')
    if bool(read_key) != bool(write_key):
        raise RuntimeError('Set both PORTAL_API_KEY and PORTAL_INGEST_KEY, or neither for loopback development.')
    if environment != 'development' and not (read_key and write_key):
        raise RuntimeError('Non-development mode requires both API keys. Entra/RBAC is not implemented.')
    hosts = ('localhost', '127.0.0.1', 'testserver', *filter(None, os.getenv('PORTAL_ALLOWED_HOSTS', '').split(',')))
    origins = tuple(filter(None, os.getenv('PORTAL_ALLOWED_ORIGINS', '').split(',')))
    return Settings(storage, read_key, write_key, environment, hosts, origins)
