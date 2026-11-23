import base64
import logging
from datetime import datetime

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 15


class DarajaError(Exception):
    pass


def _base_url():
    env = getattr(settings, "DARAJA_ENV", "sandbox")
    if env == "production":
        return "https://api.safaricom.co.ke"
    return "https://sandbox.safaricom.co.ke"


def _auth():
    consumer_key = settings.DARAJA_CONSUMER_KEY
    consumer_secret = settings.DARAJA_CONSUMER_SECRET
    if not consumer_key or not consumer_secret:
        raise DarajaError("Daraja credentials are not configured.")

    url = f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    try:
        res = requests.get(
            url,
            auth=(consumer_key, consumer_secret),
            timeout=TIMEOUT_SECONDS,
        )
        res.raise_for_status()
        token = res.json().get("access_token")
        if not token:
            raise DarajaError("No access token in OAuth response.")
        return token
    except requests.RequestException as e:
        logger.exception("Daraja OAuth failed")
        raise DarajaError(str(e))


def _timestamp():
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _password(shortcode: str, passkey: str, timestamp: str) -> str:
    raw = f"{shortcode}{passkey}{timestamp}".encode()
    return base64.b64encode(raw).decode()


def initiate_stk_push(phone: str, amount: int, account_reference: str, description: str):
    """
    Fire an STK push. Returns the raw Daraja response dict on success.
    Raises DarajaError on failure.
    """
    shortcode = settings.DARAJA_SHORTCODE
    passkey = settings.DARAJA_PASSKEY
    callback = settings.DARAJA_CALLBACK_URL

    if not all([shortcode, passkey, callback]):
        raise DarajaError("Daraja STK push is not fully configured.")

    token = _auth()
    ts = _timestamp()
    pwd = _password(shortcode, passkey, ts)

    # Daraja requires MSISDN without leading '+'
    msisdn = phone.lstrip("+")

    payload = {
        "BusinessShortCode": shortcode,
        "Password": pwd,
        "Timestamp": ts,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": msisdn,
        "PartyB": shortcode,
        "PhoneNumber": msisdn,
        "CallBackURL": callback,
        "AccountReference": account_reference[:12],
        "TransactionDesc": description[:13],
    }

    try:
        res = requests.post(
            f"{_base_url()}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT_SECONDS,
        )
        data = res.json()
    except requests.RequestException as e:
        logger.exception("Daraja STK push request failed")
        raise DarajaError(str(e))

    if res.status_code >= 400 or data.get("ResponseCode") not in ("0", 0):
        logger.warning("Daraja STK push rejected: %s", data)
        raise DarajaError(data.get("errorMessage", "STK push rejected."))

    return data