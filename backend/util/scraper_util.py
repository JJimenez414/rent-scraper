import re
from datetime import datetime
from util.logger import get_logger

_FEE_RE = re.compile(r"\(\$([\d,]+\.\d+)\s*fee\)", re.IGNORECASE)
logger = get_logger("PARSER")

def parse_row(row: list[str]) -> dict:
    date, charge, payer, amount, balance = row

    charge_type, _, category = charge.partition("-")
    category = category.strip().lower() # Water Receipts ex.
    charge_type = charge_type.strip().lower() # Charge

    amount_lines = amount.split("\n")
    amount = parse_money(amount_lines[0])

    fee = None
    if len(amount_lines) > 1:
        match = _FEE_RE.search(amount_lines[1])
        fee = (match.group(1).replace(",", ""))

    return {
        'date': date,
        'category': category,
        'category_type': charge_type,
        'payer': payer,
        'amount': amount,
        'fee': fee,
        'balance': parse_money(balance)
    }

def parse_money(amount_raw: str) -> float:
    amount_raw = amount_raw.strip()
    negative = amount_raw.startswith("(") and amount_raw.endswith(")")
    amount_raw = amount_raw.strip("()").replace('$', "").replace(",", "")
    amount_value = float(amount_raw)

    return -amount_value if negative else amount_value

def parse_ledger(rows: list[list[str]]) -> list[dict]:

    logger.info("Entering logger")
    return [parse_row(row) for row in rows]
