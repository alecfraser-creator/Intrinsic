import config
from providers.fmp import get_data


def get_businessquant_data(ticker):
    income_url = (
        f"https://data.businessquant.com/statements"
        f"?ticker={ticker}&statement=IS&frequency=TTM"
        f"&period=3y&api_key={config.API_KEY_QUANT}"
    )

    cashflow_url = (
        f"https://data.businessquant.com/statements"
        f"?ticker={ticker}&statement=CF&frequency=TTM"
        f"&period=3y&api_key={config.API_KEY_QUANT}"
    )

    income, _ = get_data(income_url)
    cashflow, _ = get_data(cashflow_url)

    return {
        "income_ttm": extract_income_ttm_data(income),
        "cashflow_ttm": extract_cashflow_ttm_history(cashflow)
    }


def extract_income_ttm_data(data):
    if data is None:
        return []

    sections = data.get("data", {})

    fields = {
        "revenue": ("Revenue & cost", "Revenue (TTM)"),
        "gross_profit": ("Revenue & cost", "Gross Profit (TTM)"),
        "ebit": ("Operating items", "EBIT (TTM)"),
        "net_income": (
            "Net income details",
            "Net Income towards Common Stockholders (TTM)"
        ),
        "eps_diluted": (
            "Additional items",
            "EPS (Diluted) (TTM)"
        ),
        "interest_expense": (
            "Additional items",
            "Interest Expenses (TTM)"
        ),
        "tax_rate": (
            "Additional items",
            "Tax Rate (TTM)"
        ),
        "diluted_shares": (
            "Additional items",
            "Shares Outstanding (Diluted) (TTM)"
        )
    }

    extracted = {}

    for name, (category, section) in fields.items():
        values = (
            sections
            .get(category, {})
            .get("sections", {})
            .get(section, {})
            .get("values", [])
        )

        extracted[name] = {
            item.get("date"): item.get("reportedValue", {}).get("raw")
            for item in values
        }

    dates = extracted["revenue"].keys()

    income_ttm = []

    for date in dates:
        income_ttm.append({
            "date": date,
            **{
                name: values.get(date)
                for name, values in extracted.items()
            }
        })

    return income_ttm


def extract_cashflow_ttm_history(data):
    if data is None:
        return []

    sections = data.get("data", {})

    fields = {
        "net_income": (
            "Operating Activities",
            "Net Income (TTM)"
        ),
        "cash_from_operations": (
            "Operating Activities",
            "Cash from Operations (TTM)"
        ),
        "depreciation_amortization": (
            "Operating Activities",
            "Depreciation, Depletion & Amortization",
            "Depreciation & Amortization (CF) (TTM)"
        ),
        "capex": (
            "Investing Activities",
            "Capital Expenditures (TTM)"
        ),
        "free_cash_flow": (
            "Additional items",
            "Free Cash Flow (TTM)"
        ),
        "change_in_cash": (
            "Additional items",
            "Change in Cash (TTM)"
        )
    }

    extracted = {}

    for name, path in fields.items():
        if len(path) == 2:
            category, section = path

            values = (
                sections
                .get(category, {})
                .get("sections", {})
                .get(section, {})
                .get("values", [])
            )
        else:
            category, subsection, section = path

            values = (
                sections
                .get(category, {})
                .get("sections", {})
                .get(subsection, {})
                .get("sections", {})
                .get(section, {})
                .get("values", [])
            )

        extracted[name] = {
            item.get("date"): item.get("reportedValue", {}).get("raw")
            for item in values
        }

    dates = extracted["net_income"].keys()

    cashflow_ttm = []

    for date in dates:
        cashflow_ttm.append({
            "date": date,
            **{
                name: values.get(date)
                for name, values in extracted.items()
            }
        })

    return cashflow_ttm
