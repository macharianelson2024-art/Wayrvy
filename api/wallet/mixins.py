from rest_framework import status
from rest_framework.response import Response

from .services import (
    get_cached_idempotent_response,
    cache_idempotent_response,
)


class IdempotentMixin:
    """
    Enforces idempotency for money-movement endpoints.

    Client sends `Idempotency-Key` header (or `idempotency_key` body field).
    If the key was already used by this user:
      - returns the cached response unchanged (same status, same body)
      - never re-executes the business logic
    If new:
      - runs the handler, then caches the response

    Usage:
        class DepositView(IdempotentMixin, APIView):
            def post(self, request):
                return self.run_idempotent(request, self._do_deposit)

            def _do_deposit(self, request):
                ...
                return Response(data, status=201)
    """

    IDEMPOTENCY_HEADER = "Idempotency-Key"

    def _get_idempotency_key(self, request):
        key = request.headers.get(self.IDEMPOTENCY_HEADER) or request.data.get(
            "idempotency_key"
        )
        return key.strip() if key else None

    def run_idempotent(self, request, handler):
        key = self._get_idempotency_key(request)
        if not key:
            return handler(request)

        cached = get_cached_idempotent_response(request.user, key)
        if cached is not None:
            status_code, body = cached
            return Response(body, status=status_code)

        response = handler(request)

        if response.status_code < 500:
            try:
                body = response.data if hasattr(response, "data") else None
                cache_idempotent_response(
                    request.user, key, response.status_code, body
                )
            except Exception:
                # caching failure should never break the actual request
                pass

        return response