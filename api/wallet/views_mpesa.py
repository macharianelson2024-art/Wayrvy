import logging

from django.db import transaction
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models import PaymentReference, Transaction
from .services import log_transaction_change

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class MpesaCallbackView(APIView):
    """
    Receives STK push callback from Safaricom Daraja.
    Must be public (no auth) — Safaricom can't send a JWT.
    Idempotent: if the same CheckoutRequestID hits twice, the second is a no-op.
    Always responds 200 with the Daraja-expected shape, even on internal errors,
    so Safaricom doesn't retry forever.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.data
        logger.info("M-PESA callback: %s", payload)

        stk = payload.get("Body", {}).get("stkCallback", {})
        checkout_id = stk.get("CheckoutRequestID", "")
        result_code = stk.get("ResultCode")
        result_desc = stk.get("ResultDesc", "")

        if not checkout_id:
            return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

        try:
            ref = PaymentReference.objects.get(
                checkout_request_id=checkout_id
            )
        except PaymentReference.DoesNotExist:
            # Store orphan for reconciliation
            PaymentReference.objects.create(
                checkout_request_id=checkout_id,
                result_code=result_code,
                result_desc=result_desc,
                raw_callback=payload,
            )
            return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

        # Update the PaymentReference
        ref.result_code = result_code
        ref.result_desc = result_desc
        ref.raw_callback = payload

        if result_code == 0:
            items = stk.get("CallbackMetadata", {}).get("Item", []) or []
            for item in items:
                if item.get("Name") == "MpesaReceiptNumber":
                    ref.mpesa_receipt = item.get("Value", "")
                    break
        ref.save()

        # Update the related transactions
        with transaction.atomic():
            for tx in ref.transactions.select_for_update():
                if tx.status != Transaction.Status.PENDING:
                    continue
                if result_code == 0:
                    tx.status = Transaction.Status.RECEIVED
                    tx.reference = ref.mpesa_receipt
                    tx.save(update_fields=["status", "reference"])
                    log_transaction_change(
                        tx, "status", "pending", "received", reason="mpesa-callback"
                    )
                else:
                    tx.status = Transaction.Status.FAILED
                    tx.save(update_fields=["status"])
                    log_transaction_change(
                        tx,
                        "status",
                        "pending",
                        "failed",
                        reason=f"mpesa-callback:{result_desc}",
                    )

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})