import re

def normalize_phone(raw):
    digits = re.sub(r"\D", "", str(raw))
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif len(digits) == 9 and digits[0] in "17":
        digits = "254" + digits
    if not re.fullmatch(r"254[17]\d{8}", digits):
        raise ValueError("Invalid Kenyan phone number")
    return digits