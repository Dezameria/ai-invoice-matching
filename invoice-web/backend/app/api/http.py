from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from ..core.config import MAX_JSON_BYTES, MAX_PDF_BYTES


def install_http_boundaries(app: FastAPI, settings):
    @app.middleware('http')
    async def boundaries(request: Request, call_next):
        if not settings.read_key and request.client and request.client.host not in ('127.0.0.1', '::1', 'localhost', 'testclient'):
            return JSONResponse({'detail': 'Local mode accepts loopback clients only.'}, status_code=403)
        if request.method in ('POST', 'PUT', 'PATCH'):
            origin = request.headers.get('origin')
            allowed = {f'http://{host}:{port}' for host in ('localhost', '127.0.0.1') for port in (5173, 8010)}
            allowed.add(str(request.base_url).rstrip('/'))
            allowed.update(settings.allowed_origins)
            if origin and origin not in allowed:
                return JSONResponse({'detail': 'Origin is not allowed.'}, status_code=403)
            limit = MAX_PDF_BYTES + 1024 * 1024 if request.url.path.endswith('/pdf') else MAX_JSON_BYTES
            length = request.headers.get('content-length')
            if length is None:
                return JSONResponse({'detail': 'Content-Length is required.'}, status_code=411)
            if not length.isdigit() or int(length) > limit:
                return JSONResponse({'detail': 'Request exceeds size limit.'}, status_code=413)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Cache-Control'] = 'no-store'
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request, exc):
        detail = [{'loc': error['loc'], 'msg': error['msg'], 'type': error['type']} for error in exc.errors()]
        return JSONResponse({'detail': detail}, status_code=422)
