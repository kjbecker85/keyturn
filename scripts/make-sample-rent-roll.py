"""Writes a synthetic rent roll for Trinity Bluffs, the kind of file the prior manager
might send, with the same mess as the data pack: mixed unit, status, money and date
formats, plus a few planted problems for the rules to catch.

Run: python3 scripts/make-sample-rent-roll.py
"""
import csv, datetime as dt, random
from pathlib import Path
import openpyxl

random.seed(24)
OUT = Path(__file__).resolve().parent.parent / "public" / "samples"
HEAD = ["Prior Mgr Property Code", "Property", "Unit", "Floorplan", "Beds", "Sq Ft", "Unit Status",
        "Resident Name", "Market Rent", "Lease Rent", "Lease Start", "Lease End", "Security Deposit",
        "Current Balance", "Notes"]
PLANS = [("A1", 1, 705, 1240), ("A2", 1, 780, 1310), ("B1", 2, 1040, 1625), ("B2", 2, 1135, 1710)]
FIRST = ["Marisol", "Trent", "Aaliyah", "Corbin", "Yesenia", "Dmitri", "Keisha", "Rowan", "Imani", "Gustavo",
         "Delphine", "Tobias", "Nadia", "Elias", "Ximena", "Bryce", "Soraya", "Quentin", "Lorna", "Mateo",
         "Odette", "Jalen", "Priyanka", "Casimir", "Renata", "Hollis", "Anouk", "Desmond", "Talia", "Ignacio",
         "Wren", "Faisal", "Greta", "Leandro", "Mireille", "Otis", "Zainab", "Ferris", "Beatriz", "Lucian"]
LAST = ["Okonkwo", "Haldane", "Rivas", "Lindqvist", "Abernathy", "Tran", "Castellano", "Whitlock", "Nakamura",
        "Oyelaran", "Brandt", "Quiroga", "Fairweather", "Moreau", "Delacroix", "Achebe", "Sorensen", "Varga",
        "Pemberton", "Escobedo", "Kowalczyk", "Ashby", "Mbeki", "Thornbury", "Galindo", "Halvorsen", "Ibarra",
        "Lockhart", "Nwosu", "Strand", "Vasquez", "Yilmaz", "Cordero", "Eklund", "Fontaine", "Gutierrez",
        "Holloway", "Ivanova", "Jaramillo", "Kessler"]
names = [f"{f} {l}" for f, l in zip(FIRST, LAST)]

rows = []
units = [f"{b}{f}{n:02d}" for b in (3,) for f in (1, 2, 3) for n in range(1, 15)][:40]
for i, unit in enumerate(units):
    plan, beds, sqft, market = PLANS[i % 4]
    status = random.choice(["Occupied", "Occ", "O", "Occupied", "Occ"])
    start = dt.date(2025, random.randint(1, 12), random.randint(1, 28))
    end = start + dt.timedelta(days=364)
    rent = market + random.choice([-45, -20, 0, 15, 35, 50])
    rows.append(dict(unit=unit, plan=plan, beds=beds, sqft=sqft, status=status, name=names[i],
                     market=market, rent=rent, start=start, end=end, deposit=random.choice([250, 500, market]),
                     balance=random.choice([0, 0, 0, 0, 0, 85.5, 210, 1325]), notes=None))

# Vacant units.
for r in rows[5], rows[17], rows[29]:
    r.update(status=random.choice(["VR", "Vacant - Not Ready"]), name=None, rent=None, start=None, end=None, deposit=None, balance=0)
rows[11].update(status="Notice", notes="Gave notice 10/2, moving 11/30")
# Planted problems.
rows[3].update(rent=0, notes="comp unit?")                        # occupied at $0
rows[8].update(rent=round(rows[8]["market"] * 0.7))              # 30% below market
rows[22].update(rent=round(rows[22]["market"] * 0.74), notes="staff?")
rows[14].update(name=None)                                       # occupied, no resident
rows[19].update(start=dt.date(2026, 3, 1), end=dt.date(2025, 2, 28))  # dates reversed
rows[26].update(sqft=0)                                          # zero square feet
rows[33].update(deposit=0)                                       # named resident, $0 deposit
rows[37].update(balance=4180, notes="Payment plan per PM, not documented")
dup = dict(rows[30]); dup.update(name="Hollis Ashby", start=dt.date(2026, 6, 1), end=dt.date(2027, 5, 31))
rows.insert(31, dup)                                             # same unit listed twice

def fmt_unit(u, i): return ["Apt " + u, "#" + u, u][i % 3]
def fmt_money(v, i): return None if v is None else (f"${v:,.2f}" if i % 4 == 0 else v)
def fmt_date(d, i): return None if d is None else (d.strftime("%m/%d/%Y") if i % 3 else d.isoformat())

wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Rent Roll"; ws.append(HEAD)
with open(OUT / "trinity-bluffs-rent-roll.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(HEAD)
    for i, r in enumerate(rows):
        base = ["PM-0488", "Trinity Bluffs", fmt_unit(r["unit"], i), r["plan"], r["beds"], r["sqft"], r["status"],
                r["name"], fmt_money(r["market"], i), fmt_money(r["rent"], i)]
        tail = [fmt_money(r["deposit"], i + 1), r["balance"], r["notes"]]
        # The Excel file keeps some real date cells, like the data pack does.
        xl_dates = [r["start"], r["end"]] if i % 5 == 0 else [fmt_date(r["start"], i), fmt_date(r["end"], i)]
        ws.append(base + xl_dates + tail)
        w.writerow([("" if v is None else v) for v in base + [fmt_date(r["start"], i), fmt_date(r["end"], i)] + tail])
wb.save(OUT / "trinity-bluffs-rent-roll.xlsx")
print(len(rows), "rows written")
