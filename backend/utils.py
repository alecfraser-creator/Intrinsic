def to_float(value):
    if value is None:
        return None
    return float(value)


def percent(numerator, denominator):
    if numerator is None or denominator in (None, 0):
        return None
    return numerator / denominator * 100


def fiscal_year_key(value):
    return str(value)[:4]