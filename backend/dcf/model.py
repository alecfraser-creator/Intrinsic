from ..utils import to_float


DCF_DEFAULTS = {
    "wacc": 0.10,
    "terminal_growth": 0.025,
    "cash": 0,
    "total_debt": 0
}


def calculate_dcf(
    forecast,
    wacc,
    cash,
    total_debt,
    shares_outstanding,
    terminal_growth=0.025,
    forecast_assumptions=None,
    wacc_details=None
):
    assumptions = {
        "wacc": wacc,
        "terminal_growth": terminal_growth,
        "cash": cash,
        "total_debt": total_debt,
        "shares_outstanding": shares_outstanding
    }

    defaults_used = {}

    for key, default in DCF_DEFAULTS.items():
        if assumptions.get(key) is None:
            assumptions[key] = default
            defaults_used[key] = default

    wacc = to_float(assumptions["wacc"])
    terminal_growth = to_float(assumptions["terminal_growth"])
    cash = to_float(assumptions["cash"])
    total_debt = to_float(assumptions["total_debt"])
    shares_outstanding = to_float(assumptions["shares_outstanding"])

    if (
        not forecast
        or shares_outstanding is None
        or shares_outstanding <= 0
    ):
        return None

    if any(value is None for value in [
        wacc, terminal_growth, cash, total_debt
    ]):
        return None

    if wacc <= terminal_growth or wacc <= -1:
        return None

    # =========================
    # PRESENT VALUE OF FORECAST
    # =========================

    present_values = []

    for year, item in enumerate(forecast, start=1):

        fcff = to_float(item.get("fcff"))

        if fcff is None:
            return None

        discount_factor = 1 / (1 + wacc) ** year
        present_value = fcff * discount_factor

        present_values.append({
            **item,
            "discount_period": year,
            "discount_factor": discount_factor,
            "present_value": present_value
        })

    pv_forecast = sum(
        item["present_value"]
        for item in present_values
    )

    # =========================
    # TERMINAL VALUE
    # =========================

    terminal_fcff = (
        to_float(forecast[-1]["fcff"])
        * (1 + terminal_growth)
    )

    terminal_value = terminal_fcff / (wacc - terminal_growth)

    pv_terminal_value = (
        terminal_value / (1 + wacc) ** len(forecast)
    )

    # =========================
    # ENTERPRISE AND EQUITY VALUE
    # =========================

    enterprise_value = pv_forecast + pv_terminal_value

    net_cash = cash - total_debt

    equity_value = enterprise_value + net_cash

    intrinsic_value_per_share = equity_value / shares_outstanding

    terminal_value_percentage = (
        pv_terminal_value / enterprise_value
        if enterprise_value > 0 else None
    )

    # =========================
    # SENSITIVITY ANALYSIS
    # =========================

    wacc_values = [
        wacc - 0.02,
        wacc - 0.01,
        wacc,
        wacc + 0.01,
        wacc + 0.02
    ]

    growth_values = [
        terminal_growth - 0.01,
        terminal_growth - 0.005,
        terminal_growth,
        terminal_growth + 0.005,
        terminal_growth + 0.01
    ]

    # =========================
    # RETURN
    # =========================

    return {
        "forecast": forecast,
        "present_values": present_values,

        "pv_forecast": pv_forecast,
        "terminal_fcff": terminal_fcff,
        "terminal_value": terminal_value,
        "pv_terminal_value": pv_terminal_value,
        "terminal_value_percentage": terminal_value_percentage,

        "enterprise_value": enterprise_value,
        "equity_value": equity_value,
        "net_cash": net_cash,

        "intrinsic_value_per_share": intrinsic_value_per_share,

        "assumptions": {
            **assumptions,
            "forecast_assumptions": forecast_assumptions,
            "wacc_details": wacc_details
        },

        "defaults_used": defaults_used
    }