from backend import config
import re
import pandas as pd
from datetime import timedelta
from edgar import Company, set_identity
from edgar.entity.entity_facts import EntityFacts
from edgar.ttm import apply_split_adjustments, detect_splits


set_identity(config.EDGAR_IDENTITY)

# 6 exercices annuels = 5 intervalles, ce qu'il faut pour un CAGR sur 5 ans.
ANNUAL_PERIODS = 6
QUARTERLY_PERIODS = 8

# Définition fixe du "cash" utilisé pour la dette nette, l'EV, le DCF et le ROIC :
# cash & équivalents + placements court terme + titres négociables non courants.
# Les titres négociables (MarketableSecuritiesNoncurrent) sont liquides par définition :
# le classement "non courant" reflète l'intention de les garder > 1 an, pas leur liquidité.
# Ne sont PAS inclus : LongTermInvestments (peut contenir des participations non cotées
# ou mises en équivalence) et les restricted cash.

SHORT_TERM_INVESTMENT_CONCEPTS = [
    "us-gaap:MarketableSecuritiesCurrent",
    "us-gaap:ShortTermInvestments",
    "us-gaap:AvailableForSaleSecuritiesDebtSecuritiesCurrent",
]
LONG_TERM_SECURITY_CONCEPTS = [
    "us-gaap:MarketableSecuritiesNoncurrent",
]

# Tags a company may use for its D&A cash-flow line. First tag with a value wins per period.
# GOOGL and TSLA both use us-gaap:Depreciation, which is why your label list misses them.
DA_CONCEPTS = [
    "us-gaap:DepreciationDepletionAndAmortization",
    "us-gaap:DepreciationAmortizationAndAccretionNet",
    "us-gaap:Depreciation",
]

def _da_row(df):
    if df is None or df.empty:
        return None
    for _, row in df.iterrows():
        if row.get("abstract") or row.get("dimension"):
            continue
        if re.match(r"\s*depreciation", str(row["label"]), re.I):
            return row
    return None


def _date_cols(df):
    cols = []
    for c in df.columns:
        m = re.match(r"(\d{4}-\d{2}-\d{2})", str(c))
        if m:
            cols.append((m.group(1), c))
    return sorted(cols, reverse=True)  # newest first


def da_from_filing(filing):
    """{period_end 'YYYY-MM-DD': value} from the filing's cash-flow statement."""
    try:
        df = filing.obj().financials.cash_flow_statement().to_dataframe()
    except Exception as error:
        print(f"D&A filing read failed ({getattr(filing, 'accession_no', '?')}): {error}")
        return {}
    row = _da_row(df)
    if row is None:
        return {}
    out = {}
    for date, col in _date_cols(df):
        value = row[col]
        if pd.notna(value):
            out[date] = float(value)
    return out


def da_from_filings(company, n_annual=4):
    """Annual dict {'YYYY': value} and TTM, read from 10-K / latest 10-Q."""
    annual = {}
    ten_ks = [
        f for f in company.get_filings(form="10-K").latest(n_annual + 4)
        if str(getattr(f, "form", "")).upper() == "10-K"
    ][:n_annual]
    if not ten_ks:
        return {}, None
    for filing in ten_ks:  # newest first, so restated values win
        for date, value in da_from_filing(filing).items():
            annual.setdefault(date[:4], value)
    if not annual:
        return {}, None
    last_fy_year = max(annual)
    ttm = annual[last_fy_year]
    try:
        q = next(
            (f for f in company.get_filings(form="10-Q").latest(4)
             if str(getattr(f, "form", "")).upper() == "10-Q"),
            None,
        )
        if q is not None and str(q.filing_date) > str(ten_ks[0].filing_date):
            vals = da_from_filing(q)
            dates = sorted(vals, reverse=True)
            print("10-Q D&A columns:", {d: vals[d] for d in dates})
            if len(dates) >= 2:
                ttm = annual[last_fy_year] + vals[dates[0]] - vals[dates[1]]
    except Exception as error:
        print(f"TTM from 10-Q failed: {error}")
    return annual, ttm


def da_by_period(facts):
    """{(period_start, period_end): value}; latest filing wins, first concept wins per period."""
    out = {}
    if facts is None:
        return out

    for concept in DA_CONCEPTS:
        try:
            found = facts.query().by_concept(concept, exact=True).execute()
        except Exception as error:
            print(f"D&A query failed for {concept}: {error}")
            continue

        latest = {}
        for fact in found:
            if (
                getattr(fact, "period_type", None) != "duration"
                or fact.period_start is None
                or fact.numeric_value is None
                or getattr(fact, "unit", "USD") != "USD"
            ):
                continue

            key = (fact.period_start, fact.period_end)
            if key not in latest or fact.filing_date > latest[key].filing_date:
                latest[key] = fact

        for key, fact in latest.items():
            out.setdefault(key, fact.numeric_value)

    return out


def da_annual(by_period):
    """{"2025": value, ...} for ~12-month periods, keyed by the year of the period end."""
    return {
        str(k[1])[:4]: v
        for k, v in by_period.items()
        if 350 <= (k[1] - k[0]).days <= 380
    }


def da_ttm(by_period):
    """TTM = latest fiscal year + current YTD - same YTD one year earlier."""
    annual = {k: v for k, v in by_period.items() if 350 <= (k[1] - k[0]).days <= 380}
    if not annual:
        return None

    fy = max(annual, key=lambda k: k[1])

    newer = {
        k: v for k, v in by_period.items()
        if k[0] >= fy[1] and (k[1] - k[0]).days < 330
    }
    if not newer:
        return annual[fy]          # latest filing is the 10-K itself

    # Latest end date, longest period (the 9-month figure, not the lone Q3).
    cur = max(newer, key=lambda k: (k[1], (k[1] - k[0]).days))
    length = (cur[1] - cur[0]).days

    for k, v in by_period.items():
        if abs((cur[0] - k[0]).days - 365) <= 7 and abs((k[1] - k[0]).days - length) <= 7:
            return annual[fy] + newer[cur] - v

    return None

def get_sec_data(ticker):
    ticker = ticker.strip().upper()

    try:
        company = Company(ticker)

        filings = company.get_filings(form="10-K")
        fiscal_year_ends = {}
        for filing in filings:
            period_end = filing.period_of_report
            if period_end:
                year = str(period_end)[:4]
                fiscal_year_ends[year] = str(period_end)

        profile = extract_profile_data(company)

        split_adjusted_facts, splits = build_split_adjusted_facts(company)
        shares_outstanding_annual = extract_historical_shares(
            company,
            fiscal_year_ends,
            splits
        )

        income_annual_raw = get_income_statement(
            company, split_adjusted_facts, periods=ANNUAL_PERIODS, annual=True
        )
        income_quarter_raw = get_income_statement(
            company, split_adjusted_facts, periods=QUARTERLY_PERIODS, annual=False
        )
        balance_quarter_raw = company.balance_sheet(
            periods=QUARTERLY_PERIODS, annual=False, as_dataframe=True
        )
        balance_annual_raw = company.balance_sheet(
            periods=ANNUAL_PERIODS,
            annual=True,
            as_dataframe=True
        )
        cashflow_annual_raw = company.cash_flow_statement(
            periods=ANNUAL_PERIODS, as_dataframe=True
        )
        cashflow_quarter_raw = company.cash_flow_statement(
            periods=QUARTERLY_PERIODS, annual=False, as_dataframe=True
        )

        balance_extras = extract_balance_extras(company)

        income_annual = extract_income_data(income_annual_raw)
        income_quarter = extract_income_data(income_quarter_raw)
        balance_quarter = extract_balance_quarter(
            balance_quarter_raw,
            balance_extras
        )
        balance_annual = extract_balance_quarter(
            balance_annual_raw,
            balance_extras,
            period_prefix="FY "
        )

        
        cashflow_annual = extract_cashflow_data(cashflow_annual_raw)
        cashflow_quarter = extract_cashflow_data(cashflow_quarter_raw)

        income_ttm = extract_income_ttm(income_quarter)

        
        cashflow_ttm = extract_cashflow_ttm(
            income_quarter,
            cashflow_quarter
        )

        da = da_by_period(company.facts)
        da_year = da_annual(da)

        # 1) Filing's own cash-flow statement wins (catches company-specific tags like Tesla's).
        filing_annual, filing_ttm = da_from_filings(company)
        for row in cashflow_annual:
            v = filing_annual.get(str(row["year"])[:4])
            if v is not None:
                row["depreciation_amortization"] = v

        # 2) Company Facts only fills what is still missing.
        for row in cashflow_annual:
            if row.get("depreciation_amortization") is None:
                row["depreciation_amortization"] = da_year.get(str(row["year"])[:4])

        if cashflow_ttm:
            if filing_ttm is not None:
                cashflow_ttm[0]["depreciation_amortization"] = filing_ttm
            elif cashflow_ttm[0].get("depreciation_amortization") is None:
                cashflow_ttm[0]["depreciation_amortization"] = da_ttm(da)


        return {
            "profile": profile,
            "income": income_annual,
            "income_ttm": income_ttm,
            "cashflow": cashflow_annual,
            "cashflow_ttm": cashflow_ttm,
            "balance_quarter": balance_quarter,
            "balance_annual": balance_annual,
            "ratios_annual": [],
            "fiscal_year_ends": fiscal_year_ends,
            "splits": [
                {"date": str(split["date"]), "ratio": split["ratio"]}
                for split in splits
            ],
            "shares_outstanding_annual": shares_outstanding_annual,
        }

    except Exception as error:
        print(f"SEC data retrieval failed for {ticker}: {error}")
        return None


# ---------------------------------------------------------------------------
# Stock splits (EPS)
#
# Les splits sont détectés dans les faits XBRL (StockSplitConversionRatio) par
# edgar.ttm.detect_splits, puis apply_split_adjustments divise les montants par
# action (EPS) par le ratio cumulé des splits postérieurs à la période. Règle de
# la librairie : un fait déposé APRÈS le split est considéré déjà ajusté.
#
# Dans edgartools, company.income_statement(annual=False) passe déjà par des faits
# ajustés, mais pas la version annuelle. On construit donc un EntityFacts ajusté
# pour l'annuel. Piège : ne JAMAIS lui demander le trimestriel quand la librairie
# ajuste elle-même (les faits ajustés gardent leur date de dépôt, ils seraient
# ajustés une 2e fois). D'où LIBRARY_ADJUSTS_QUARTERLY.
#
# Limite documentée : un split non tagué en XBRL n'est pas détecté.
# ---------------------------------------------------------------------------

LIBRARY_ADJUSTS_QUARTERLY = hasattr(EntityFacts, "_get_split_adjusted_facts")


def build_split_adjusted_facts(company):
    """(EntityFacts ajusté ou None, liste des splits détectés)."""
    try:
        entity_facts = company.facts

        if not entity_facts:
            return None, []

        raw_facts = entity_facts.get_all_facts()
        splits = detect_splits_effective(raw_facts) 

        if not splits:
            return None, []

        adjusted = EntityFacts(
            cik=entity_facts.cik,
            name=entity_facts.name,
            facts=apply_split_adjustments(raw_facts, splits)
        )

        # Même chose que ce que fait la librairie quand elle copie un EntityFacts :
        # garde la résolution SIC/ticker (statements spécifiques par industrie).
        for attr in ("_sic_code", "_ticker", "_sic_resolver"):
            setattr(adjusted, attr, getattr(entity_facts, attr, None))

        return adjusted, splits

    except Exception as error:
        print(f"Split adjustment failed: {error}")
        return None, []


MAX_SPLIT_LAG_DAYS = 280        # same limits as edgartools
MAX_SPLIT_DURATION_DAYS = 31

def detect_splits_effective(raw_facts):
    """Like edgar's detect_splits, but keeps the LATEST date reported for each split
    (the effective date), not the announcement date."""
    found = set()
    for fact in raw_facts:
        if "StockSplitConversionRatio" not in fact.concept:
            continue
        if fact.numeric_value is None or fact.numeric_value <= 0 or fact.period_end is None:
            continue
        if fact.filing_date and (fact.filing_date - fact.period_end).days > MAX_SPLIT_LAG_DAYS:
            continue
        if fact.period_start is not None and (fact.period_end - fact.period_start).days > MAX_SPLIT_DURATION_DAYS:
            continue
        found.add((fact.period_end, fact.numeric_value))

    splits = []
    for end, ratio in sorted(found):
        # same ratio reported again within a year = same split: keep the later date
        if splits and splits[-1]["ratio"] == ratio and (end - splits[-1]["date"]).days <= 365:
            splits[-1]["date"] = end
        else:
            splits.append({"date": end, "ratio": ratio})
    return splits


def get_income_statement(company, split_adjusted_facts, periods, annual):
    use_adjusted = (
        split_adjusted_facts is not None
        and (annual or not LIBRARY_ADJUSTS_QUARTERLY)
    )

    source = split_adjusted_facts if use_adjusted else company

    return source.income_statement(
        periods=periods,
        annual=annual,
        as_dataframe=True
    )



def extract_historical_shares(company, fiscal_year_ends, splits):
    """Return split-adjusted balance-sheet shares outstanding by fiscal year."""
    try:
        facts = company.facts

        if not facts:
            return {}

        reported_facts = facts.query().by_concept(
            "us-gaap:CommonStockSharesOutstanding",
            exact=True
        ).execute()

        # Keep the latest reported version of each balance-sheet date.
        shares_by_date = {}

        for fact in reported_facts:
            if (
                getattr(fact, "period_type", None) != "instant"
                or getattr(fact, "unit", None) != "shares"
                or fact.numeric_value is None
                or fact.period_end is None
            ):
                continue

            period_end = pd.Timestamp(fact.period_end).date()
            filing_date = (
                pd.Timestamp(fact.filing_date).date()
                if fact.filing_date is not None
                else period_end
            )

            previous = shares_by_date.get(period_end)

            if previous is None or filing_date > previous["filing_date"]:
                shares_by_date[period_end] = {
                    "filing_date": filing_date,
                    "shares": float(fact.numeric_value)
                }

        split_events = [
            {
                "date": pd.Timestamp(split["date"]).date(),
                "ratio": float(split["ratio"])
            }
            for split in splits
            if split.get("date") is not None
            and split.get("ratio") is not None
        ]

        shares_by_year = {}

        for year, year_end in fiscal_year_ends.items():
            year_end = pd.Timestamp(year_end).date()

            # Use only shares reported for this exact balance-sheet date.
            observation = shares_by_date.get(year_end)

            if observation is None:
                continue

            shares = observation["shares"]

            # Match Finazon's split-adjusted historical prices.
            # Apply only splits occurring after this balance-sheet date.
            for split in split_events:
                if (
                    split["date"] > year_end
                    and observation["filing_date"] <= split["date"]
                ):
                    shares *= split["ratio"]

            shares_by_year[year] = shares

        return shares_by_year

    except Exception as error:
        print(f"Historical shares extraction failed: {error}")
        return {}


# ---------------------------------------------------------------------------
# CEO
#
# Le DEF 14A (proxy) est annuel : peo_name est le dirigeant de la période couverte
# par ce proxy, donc périmé après un changement de CEO. Les Form 4 (déposés dès
# qu'un dirigeant transige, souvent plusieurs fois par an) donnent la fonction
# actuelle de chaque insider (colonne "Position"). On prend la source la plus
# récente : Form 4 si plus récent que le proxy, sinon le proxy.
#
# Les noms des Form 4 sont au format SEC "Nom Prénom" (ex. "Cook Timothy D").
# Mets FORM4_NAMES_ARE_LAST_FIRST = False si le test AAPL affiche déjà "Prénom Nom".
# ---------------------------------------------------------------------------

FORM4_NAMES_ARE_LAST_FIRST = True
FORM4_LOOKBACK = 25

_CEO_TITLE = re.compile(r"chief executive officer|ceo")
_CEO_COTITLE_WORDS = re.compile(
    r"\b(and|director|chairman|chair|president|founder|co|executive|of|the|"
    r"board|interim|principal)\b"
)


def is_ceo_position(position):
    """Vrai pour "CEO", "Chairman and CEO", "Chief Executive Officer and Director"...
    Faux pour "CEO, Google Cloud" (CEO d'une filiale/division), "Former CEO", etc."""
    if not isinstance(position, str):
        return False

    text = position.lower()

    if "former" in text or "retired" in text:
        return False

    if not _CEO_TITLE.search(text):
        return False

    rest = _CEO_TITLE.sub("", text)
    rest = _CEO_COTITLE_WORDS.sub("", rest)
    rest = re.sub(r"[\s,;/&\-()]+", "", rest)

    return rest == ""


def format_insider_name(name):
    name = " ".join(str(name).split())

    if FORM4_NAMES_ARE_LAST_FIRST and "," not in name:
        parts = name.split(" ")
        if len(parts) >= 2:
            return " ".join(parts[1:] + parts[:1])

    return name


def extract_ceo_from_proxy(company):
    try:
        filing = company.get_filings(form="DEF 14A").latest()
        proxy = filing.obj()

        name = getattr(proxy, "peo_name", None)
        if isinstance(name, str) and name.strip():
            return name.strip(), filing.filing_date

    except Exception as error:
        print(f"CEO proxy extraction failed: {error}")

    return None, None


def extract_ceo_from_form4(company):
    """CEO d'après les Form 4 les plus récents : (nom, date de dépôt) ou (None, None)."""
    try:
        filings = list(company.get_filings(form="4").head(FORM4_LOOKBACK))
        filings.sort(key=lambda filing: filing.filing_date, reverse=True)

        for filing in filings:
            try:
                summary = filing.obj().get_ownership_summary()
                df = summary.to_dataframe()
            except Exception:
                continue

            if df is None or "Insider" not in df.columns or "Position" not in df.columns:
                continue

            for _, row in df.iterrows():
                if is_ceo_position(row["Position"]):
                    return format_insider_name(row["Insider"]), filing.filing_date

    except Exception as error:
        print(f"CEO Form 4 extraction failed: {error}")

    return None, None


def extract_ceo_with_source(company):
    proxy_name, proxy_date = extract_ceo_from_proxy(company)
    form4_name, form4_date = extract_ceo_from_form4(company)

    if form4_name and (proxy_date is None or str(form4_date) >= str(proxy_date)):
        return {"name": form4_name, "source": f"Form 4 ({form4_date})"}

    if proxy_name:
        return {"name": proxy_name, "source": f"DEF 14A ({proxy_date})"}

    if form4_name:
        return {"name": form4_name, "source": f"Form 4 ({form4_date})"}

    return {"name": None, "source": None}


def extract_ceo(company):
    return extract_ceo_with_source(company)["name"]


def extract_profile_data(company):
    try:
        shares_outstanding = company.shares_outstanding
    except Exception:
        shares_outstanding = None

    try:
        public_float = company.public_float
    except Exception:
        public_float = None

    ceo = extract_ceo_with_source(company)

    return {
        "name": getattr(company, "name", None),
        "price": None,
        "market_cap": None,
        "description": None,
        "ceo": ceo["name"],
        "ceo_source": ceo["source"],
        "ticker": getattr(company, "ticker", None),
        "industry": getattr(company, "industry", None),
        "shares_outstanding": shares_outstanding,
        "public_float": public_float
    }


def get_value(data, label, period):
    if data is None or period not in data.columns:
        return None

    try:
        if "label" in data.columns:
            rows = data.loc[
                data["label"].astype(str).str.strip() == label,
                period
            ]

        else:
            rows = data.loc[[label], period]

        if rows.empty:
            return None

        value = rows.iloc[0]

        if pd.isna(value):
            return None

        if hasattr(value, "item"):
            value = value.item()

        if isinstance(value, float) and value.is_integer():
            return int(value)

        return value

    except (KeyError, IndexError, TypeError, ValueError):
        return None


def get_first_value(data, labels, period):
    for label in labels:
        value = get_value(data, label, period)

        if value is not None:
            return value

    return None


def get_periods(data, prefix):
    if data is None:
        return []

    return [
        period
        for period in data.columns
        if isinstance(period, str) and period.startswith(prefix)
    ]


# ---------------------------------------------------------------------------
# Commercial paper (absent du bilan reconstruit par edgartools)
#
# On lit les faits bruts de l'API Company Facts (company.get_facts()).
# Piège : dans ces faits, fiscal_year / fiscal_period décrivent le DÉPÔT, pas la
# date du bilan. Un 10-Q reprend aussi la clôture annuelle précédente en
# comparatif, donc une même valeur apparaît sous plusieurs étiquettes de période.
# On rattache donc chaque étiquette à sa vraie date de bilan (période_end).
# ---------------------------------------------------------------------------

def get_instant_usd_facts(facts, concept):
    if facts is None:
        return []

    try:
        found = facts.query().by_concept(concept, exact=True).execute()
    except Exception as error:
        print(f"Facts query failed for {concept}: {error}")
        return []

    return [
        fact for fact in found
        if getattr(fact, "period_type", None) == "instant"
        and getattr(fact, "unit", "USD") == "USD"
        and fact.numeric_value is not None
    ]


def build_period_end_map(
    facts,
    anchors=("us-gaap:Assets", "us-gaap:LiabilitiesAndStockholdersEquity")
):
    """{"Q3 2026": date(2026, 6, 27), "FY 2025": date(2025, 9, 27), ...}

    La vraie date de bilan d'un dépôt est la plus récente de ses faits Assets
    (les autres sont des comparatifs plus anciens).
    """
    for anchor in anchors:
        own_end = {}

        for fact in get_instant_usd_facts(facts, anchor):
            label = f"{fact.fiscal_period} {fact.fiscal_year}"

            if label not in own_end or fact.period_end > own_end[label]:
                own_end[label] = fact.period_end

        if own_end:
            # Le bilan de fin d'exercice peut être étiqueté "Q4 YYYY" côté colonnes.
            for label, end in list(own_end.items()):
                if label.startswith("FY "):
                    own_end.setdefault("Q4 " + label[3:], end)

            return own_end

    return {}


def get_balance_series(facts, concept, period_end_map):
    """{"Q3 2026": valeur, ...} pour un concept de bilan, rattaché à la vraie date."""
    latest_by_end = {}

    for fact in get_instant_usd_facts(facts, concept):
        previous = latest_by_end.get(fact.period_end)

        # En cas de restatement, le dépôt le plus récent gagne.
        if previous is None or fact.filing_date > previous.filing_date:
            latest_by_end[fact.period_end] = fact

    return {
        label: latest_by_end[end].numeric_value
        for label, end in period_end_map.items()
        if end in latest_by_end
    }


def get_first_balance_series(facts, concepts, period_end_map):
    """Comme get_balance_series, mais plusieurs concepts équivalents par ordre de
    priorité : pour chaque période, le premier concept qui a une valeur gagne.
    (Pas de somme : AvailableForSaleSecurities... détaille souvent MarketableSecurities...
    en note, donc additionner compterait deux fois.)"""
    merged = {}

    for concept in concepts:
        series = get_balance_series(facts, concept, period_end_map)

        for label, value in series.items():
            merged.setdefault(label, value)

    return merged


def extract_balance_extras(company):
    """Postes de bilan absents de company.balance_sheet() : lus dans les faits bruts."""
    extras = {
        "commercial_paper": {},
        "short_term_investments": {},
        "long_term_securities": {}
    }

    try:
        facts = company.facts
        period_end_map = build_period_end_map(facts)

        extras["commercial_paper"] = get_balance_series(
            facts, "us-gaap:CommercialPaper", period_end_map
        )
        extras["short_term_investments"] = get_first_balance_series(
            facts, SHORT_TERM_INVESTMENT_CONCEPTS, period_end_map
        )
        extras["long_term_securities"] = get_first_balance_series(
            facts, LONG_TERM_SECURITY_CONCEPTS, period_end_map
        )

    except Exception as error:
        print(f"Balance extras extraction failed: {error}")

    return extras


def combine_debt(current_maturities, short_term_borrowings, commercial_paper, long_term_debt):
    """Somme de la dette sans double comptage.

    Certaines sociétés présentent "Short-term borrowings" au bilan et détaillent
    le CP en note : le CP est alors déjà inclus. Heuristique : si
    CP <= ShortTermBorrowings, on le considère inclus. Apple n'a pas de ligne
    ShortTermBorrowings, donc le CP est ajouté.
    """
    cp = commercial_paper

    if (
        cp is not None
        and short_term_borrowings is not None
        and cp <= short_term_borrowings
    ):
        cp = None

    components = [
        current_maturities,
        short_term_borrowings,
        cp,
        long_term_debt
    ]

    if all(value is None for value in components):
        return None

    return sum(value for value in components if value is not None)


def calculate_tax_rate(taxes, income_before_taxes):
    if taxes is None or income_before_taxes in (None, 0):
        return None

    return taxes / income_before_taxes * 100


def calculate_free_cash_flow(operating_cash_flow, capital_expenditure):
    if operating_cash_flow is None or capital_expenditure is None:
        return None

    return operating_cash_flow - capital_expenditure


def extract_income_period(data, period, period_key):
    income = {
        period_key: (
            period.replace("FY ", "")
            if period.startswith("FY ")
            else period
        ),
        "revenue": get_first_value(
            data,
            ["Total Revenue", "Revenue", "Sales Revenue Net"],
            period
        ),
        "cost_of_revenue": get_first_value(
            data,
            ["Cost of Revenue", "Cost of Goods and Services Sold"],
            period
        ),
        "operating_income": get_first_value(
            data,
            ["Operating Income (Loss)", "Operating Income"],
            period
        ),
        "interest_expense": get_first_value(
            data,
            [
                "Interest Expense",
                "Interest Expense, Debt",
                "Interest and Debt Expense",
                "Interest Expense (non-operating)"
            ],
            period
        ),
        "net_income": get_first_value(
            data,
            ["Net Income (Loss) Attributable to Parent",
             "Net Income (Loss) Available to Common Stockholders Basic",
             "Net Income (Loss)"],
            period
        ),
        "eps": get_first_value(
            data,
            ["Earnings Per Share, Diluted", "Diluted Earnings Per Share"],
            period
        ),
        "taxes": get_first_value(
            data,
            ["Income Tax Expense (Benefit)", "Income Tax Expense"],
            period
        ),
        "income_before_taxes": get_first_value(
            data,
            ["Income (Loss) from Continuing Operations before Income Taxes, Noncontrolling Interest",
             "Income (Loss) from Continuing Operations before Income Taxes",
             "Income Before Tax"],
            period
        )
    }

    revenue = income["revenue"]
    cost_of_revenue = income["cost_of_revenue"]

    income["gross_profit"] = (
        revenue - cost_of_revenue
        if revenue is not None and cost_of_revenue is not None
        else None
    )

    income["ebit"] = income["operating_income"]
    income["eps_diluted"] = income["eps"]
    income["tax_rate"] = calculate_tax_rate(
        income["taxes"],
        income["income_before_taxes"]
    )

    return income


def extract_income_data(data):
    if data is None:
        return []

    income = []

    for period in data.columns:
        if period.startswith("FY "):
            income.append(
                extract_income_period(data, period, "year")
            )

        elif period.startswith("Q"):
            income.append(
                extract_income_period(data, period, "period")
            )

    return income


def extract_balance_quarter(data, extras=None, period_prefix="Q"):
    if data is None:
        return []

    extras = extras or {}
    commercial_paper_by_period = extras.get("commercial_paper") or {}
    short_term_investments_by_period = extras.get("short_term_investments") or {}
    long_term_securities_by_period = extras.get("long_term_securities") or {}
    balance = []

    for period in get_periods(data, period_prefix):
        cash = get_first_value(
            data,
            [
                "Cash and Cash Equivalents, at Carrying Value",
                "Cash and Cash Equivalents",
                "Cash Cash Equivalents Restricted Cash and Restricted Cash Equivalents"
            ],
            period
        )

        current_maturities = get_first_value(
            data,
            [
                "Long-term Debt, Current Maturities",
                "Long-term Debt and Finance Lease Obligations, Current",
                "Debt, Current"
            ],
            period
        )

        short_term_borrowings = get_first_value(
            data,
            [
                "Short-term Borrowings",
                "Short-term Debt"
            ],
            period
        )

        long_term_debt = get_first_value(
            data,
            [
                "Long-term Debt, Excluding Current Maturities",
                "Long-term Debt and Finance Lease Obligations, Noncurrent",
                "Long-term Debt",
                "Long Term Debt"
            ],
            period
        )

        commercial_paper = commercial_paper_by_period.get(period)
        short_term_investments = short_term_investments_by_period.get(period)
        long_term_securities = long_term_securities_by_period.get(period)

        # "cash" = cash & équivalents + placements court terme + titres négociables
        # non courants. C'est cette valeur que main.py utilise pour net_debt,
        # EV/EBITDA, DCF et ROIC.
        cash_and_equivalents = cash

        liquid_parts = [
            cash_and_equivalents,
            short_term_investments,
            long_term_securities
        ]

        cash = (
            sum(value for value in liquid_parts if value is not None)
            if cash_and_equivalents is not None
            else None
        )

        total_debt = combine_debt(
            current_maturities,
            short_term_borrowings,
            commercial_paper,
            long_term_debt
        )

        equity = get_first_value(
            data,
            [
                "Stockholders' Equity Attributable to Parent",
                "Stockholders' Equity",
                "Stockholders' Equity Including Portion Attributable to Noncontrolling Interest"
            ],
            period
        )

        balance.append({
            "date": period,
            "year": (
                period.replace("FY ", "")
                if period.startswith("FY ")
                else None
            ),
            "cash": cash,
            "cash_and_equivalents": cash_and_equivalents,
            "short_term_investments": short_term_investments,
            "long_term_securities": long_term_securities,
            "commercial_paper": commercial_paper,
            "total_debt": total_debt,
            "net_debt": (
                total_debt - cash
                if total_debt is not None and cash is not None
                else None
            ),
            "equity": equity,
            "current_assets": get_first_value(
                data, ["Assets, Current", "Current Assets"], period
            ),
            "current_liabilities": get_first_value(
                data, ["Liabilities, Current", "Current Liabilities"], period
            )
        })

    return balance


def extract_cashflow_period(data, period, period_key):
    capital_expenditure = get_first_value(
        data,
        ["Payments to Acquire Property, Plant, and Equipment",
         "Payments to Acquire Property Plant and Equipment",
         "Payments to Acquire Productive Assets"],
        period
    )

    if capital_expenditure is not None:
        capital_expenditure = abs(capital_expenditure)

    operating_cash_flow = get_first_value(
        data,
        ["Net Cash Provided by (Used in) Operating Activities",
         "Net Cash Provided by Operating Activities"],
        period
    )

    return {
        period_key: (
            period.replace("FY ", "")
            if period.startswith("FY ")
            else period
        ),
        "operating_cash_flow": operating_cash_flow,
        "capital_expenditure": capital_expenditure,
        "free_cash_flow": calculate_free_cash_flow(
            operating_cash_flow,
            capital_expenditure
        ),
        "depreciation_amortization": get_first_value(
            data,
            ["Depreciation, Depletion and Amortization",
             "Depreciation, Depletion, and Amortization",
             "Depreciation and Amortization"],
            period
        ),
        "acquisitions": get_first_value(
            data,
            ["Payments to Acquire Businesses, Net of Cash Acquired",
             "Payments to Acquire Businesses"],
            period
        ),
        "buybacks": get_first_value(
            data,
            ["Payments for Repurchase of Common Stock",
             "Payments for Repurchase of Equity"],
            period
        ),
        "dividends": get_first_value(
            data,
            ["Dividends paid", "Payments of Dividends",
             "Payments of Dividends Common Stock"],
            period
        )
    }


def extract_cashflow_data(data):
    if data is None:
        return []

    cashflow = []

    for period in data.columns:
        if period.startswith("FY "):
            cashflow.append(
                extract_cashflow_period(data, period, "year")
            )

        elif period.startswith("Q"):
            cashflow.append(
                extract_cashflow_period(data, period, "period")
            )

    return cashflow


def build_ttm(records, fields):
    ttm_records = []

    for start in range(len(records) - 3):
        latest_four = records[start:start + 4]

        ttm = {
            "date": latest_four[0]["period"]
        }

        for field in fields:
            values = [record.get(field) for record in latest_four]

            ttm[field] = (
                sum(values)
                if all(value is not None for value in values)
                else None
            )

        ttm_records.append(ttm)

    return ttm_records


def extract_income_ttm(income_quarter):
    income_ttm = build_ttm(
        income_quarter,
        [
            "revenue",
            "gross_profit",
            "operating_income",
            "net_income",
            "eps_diluted",
            "interest_expense",
            "taxes",
            "income_before_taxes"
        ]
    )

    for record in income_ttm:
        record["ebit"] = record.pop("operating_income")

        record["tax_rate"] = calculate_tax_rate(
            record.pop("taxes"),
            record.pop("income_before_taxes")
        )

    return income_ttm


def extract_cashflow_ttm(income_quarter, cashflow_quarter):
    cashflow_ttm = build_ttm(
        cashflow_quarter,
        [
            "operating_cash_flow",
            "capital_expenditure",
            "depreciation_amortization",
            "acquisitions",
            "buybacks",
            "dividends"
        ]
    )

    for index, record in enumerate(cashflow_ttm):
        record["free_cash_flow"] = calculate_free_cash_flow(
            record["operating_cash_flow"],
            record["capital_expenditure"]
        )

        # Keep aliases used by the existing main.py calculations.
        record["cash_from_operations"] = record["operating_cash_flow"]
        record["capex"] = record["capital_expenditure"]

        # Net income is useful for cross-checking the statements.
        if index < len(income_quarter) - 3:
            quarters = income_quarter[index:index + 4]
            values = [quarter.get("net_income") for quarter in quarters]

            record["net_income"] = (
                sum(values)
                if all(value is not None for value in values)
                else None
            )
        else:
            record["net_income"] = None

        record["change_in_cash"] = None

    return cashflow_ttm


if __name__ == "__main__":
    for t in ("AAPL", "GOOGL", "TSLA"):
        d = get_sec_data(t)
        print(
            t,
            d["cashflow_ttm"][0]["depreciation_amortization"],
            [r["depreciation_amortization"] for r in d["cashflow"][:6]],
            d["balance_quarter"][0]["total_debt"],
        )