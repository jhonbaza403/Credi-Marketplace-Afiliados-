from __future__ import annotations
from dataclasses import dataclass
from typing import Any
from urllib.request import Request, urlopen
import json

@dataclass
class CrediClient:
    base_url: str
    api_key: str

    def _request(self, path: str, method: str = 'GET', body: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = None if body is None else json.dumps(body).encode('utf-8')
        req = Request(self.base_url.rstrip('/') + path, data=payload, method=method, headers={'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'})
        with urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode('utf-8'))

    def catalog(self, q: str = '') -> dict[str, Any]:
        return self._request('/api/v1/catalog' + (f'?q={q}' if q else ''))

    def checkout_intent(self, **kwargs: Any) -> dict[str, Any]:
        return self._request('/api/v1/checkout/intent', method='POST', body=kwargs)
