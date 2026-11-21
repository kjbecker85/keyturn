"""Writes synthetic rent rolls for properties the data pack has no rent roll for, the kind
of file a prior manager might send. Each one has the same mess as the data pack (mixed unit,
status, money and date formats) plus a few planted problems for the rules to catch.

Trinity Bluffs uses the data pack's own column names. Brazos Landing uses a different
prior-manager layout ("Tenant", "Unit #", "Rent"...) so the upload has to match by name.

Run: python3 scripts/make-sample-rent-roll.py
"""
import csv, datetime as dt, random
from pathlib import Path
import openpyxl

OUT = Path(__file__).resolve().parent.parent / "public" / "samples"

DATAPACK_HEAD = ["Prior Mgr Property Code", "Property", "Unit", "Floorplan", "Beds", "Sq Ft", "Unit Status",
                 "Resident Name", "Market Rent", "Lease Rent", "Lease Start", "Lease End", "Security Deposit",
                 "Current Balance", "Notes"]
OTHER_HEAD = ["Prop Code", "Property Name", "Unit #", "Unit Type", "BR", "SqFt", "Status", "Tenant", "Market",
              "Rent", "Move In", "Lease Expiration", "Deposit Held", "Balance Due", "Comments"]

FIRST = ["Marisol", "Trent", "Aaliyah", "Corbin", "Yesenia", "Dmitri", "Keisha", "Rowan", "Imani", "Gustavo",
         "Delphine", "Tobias", "Nadia", "Elias", "Ximena", "Bryce", "Soraya", "Quentin", "Lorna", "Mateo",
         "Odette", "Jalen", "Priyanka", "Casimir", "Renata", "Hollis", "Anouk", "Desmond", "Talia", "Ignacio",
         "Wren", "Faisal", "Greta", "Leandro", "Mireille", "Otis", "Zainab", "Ferris", "Beatriz", "Lucian",
         "Saoirse", "Kofi", "Ingrid", "Rafferty", "Noemi", "Callum", "Esperanza", "Torin", "Yara", "Bastian",
         "Leilani", "Osric", "Paloma", "Thaddeus", "Vivienne", "Emeka", "Rosalind", "Anders"]
LAST = ["Okonkwo", "Haldane", "Rivas", "Lindqvist", "Abernathy", "Tran", "Castellano", "Whitlock", "Nakamura",
        "Oyelaran", "Brandt", "Quiroga", "Fairweather", "Moreau", "Delacroix", "Achebe", "Sorensen", "Varga",
        "Pemberton", "Escobedo", "Kowalczyk", "Ashby", "Mbeki", "Thornbury", "Galindo", "Halvorsen", "Ibarra",
        "Lockhart", "Nwosu", "Strand", "Vasquez", "Yilmaz", "Cordero", "Eklund", "Fontaine", "Gutierrez",
        "Holloway", "Ivanova", "Jaramillo", "Kessler", "Brennan", "Adjei", "Lundgren", "Calloway", "Restrepo",
        "Dunmore", "Villanueva", "Sinclair", "Haddad", "Wexler", "Kahananui", "Pryce", "Solano", "Merriweather",
        "Beaumont", "Eze", "Ashcombe", "Nyberg"]


def build(seed, code, name, units, plans, plant, name_offset=0):
    random.seed(seed)
    names = [f"{f} {l}" for f, l in zip(FIRST[name_offset:] + FIRST, LAST[name_offset:] + LAST)]
    rows = []
    for i, unit in enumerate(units):
        plan, beds, sqft, market = plans[i % len(plans)]
        status = random.choice(["Occupied", "Occ", "O", "Occupied", "Occ"])
        start = dt.date(2025, random.randint(1, 12), random.randint(1, 28))
        rent = market + random.choice([-45, -20, 0, 15, 35, 50])
        rows.append(dict(unit=unit, plan=plan, beds=beds, sqft=sqft, status=status, name=names[i],
                         market=market, rent=rent, start=start, end=start + dt.timedelta(days=364),
                         deposit=random.choice([250, 500, market]),
                         balance=random.choice([0, 0, 0, 0, 0, 85.5, 210, 1325]), notes=None))
    plant(rows)
    return code, name, rows


def trinity(rows):
    for r in rows[5], rows[17], rows[29]:
        r.update(status=random.choice(["VR", "Vacant - Not Ready"]), name=None, rent=None, start=None, end=None, deposit=None, balance=0)
    rows[11].update(status="Notice", notes="Gave notice 10/2, moving 11/30")
    rows[3].update(rent=0, notes="comp unit?")                             # occupied at $0
    rows[8].update(rent=round(rows[8]["market"] * 0.7))                   # 30% below market
    rows[22].update(rent=round(rows[22]["market"] * 0.74), notes="staff?")
    rows[14].update(name=None)                                            # occupied, no resident
    rows[19].update(start=dt.date(2026, 3, 1), end=dt.date(2025, 2, 28))  # dates reversed
    rows[26].update(sqft=0)                                               # zero square feet
    rows[33].update(deposit=0)                                            # named resident, $0 deposit
    rows[37].update(balance=4180, notes="Payment plan per PM, not documented")
    dup = dict(rows[30]); dup.update(name="Hollis Ashby", start=dt.date(2026, 6, 1), end=dt.date(2027, 5, 31))
    rows.insert(31, dup)                                                  # same unit listed twice


def brazos(rows):
    for i in (4, 21, 38, 52):
        rows[i].update(status=random.choice(["VR", "VNR", "Vacant-Ready"]), name=None, rent=None, start=None, end=None, deposit=None, balance=0)
    for i in (9, 44):
        rows[i].update(status="Notice")
    rows[6].update(rent=0, deposit=0, notes="Courtesy officer unit")      # $0 rent, explained in a note
    rows[13].update(rent=round(rows[13]["market"] * 0.6), notes="Manager's unit?")
    rows[27].update(rent=round(rows[27]["market"] * 0.72))
    rows[31].update(rent=round(rows[31]["market"] * 0.77), notes="Legacy rate, never renewed")
    rows[18].update(name=None)                                            # occupied, no resident
    rows[35].update(name=None)
    rows[24].update(start=dt.date(2026, 9, 15), end=dt.date(2026, 3, 14)) # dates reversed
    rows[41].update(sqft=0)                                               # zero square feet
    rows[47].update(deposit=0)                                            # named resident, $0 deposit
    rows[16].update(balance=5620, notes="Eviction filed 9/30")
    rows[33].update(balance=2890)
    rows[50].update(balance=3310, notes="Skip? Not seen since August")
    dup = dict(rows[45]); dup.update(name="Callum Dunmore", start=dt.date(2026, 8, 1), end=dt.date(2027, 7, 31))
    rows.insert(46, dup)                                                  # same unit listed twice


def fmt_unit(u, i, style):
    return (["Apt " + u, "#" + u, u] if style == "datapack" else [u, "Unit " + u, u])[i % 3]


def fmt_money(v, i):
    return None if v is None else (f"${v:,.2f}" if i % 4 == 0 else v)


def fmt_date(d, i):
    return None if d is None else (d.strftime("%m/%d/%Y") if i % 3 else d.isoformat())


def write(slug, head, style, code, name, rows):
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Rent Roll"; ws.append(head)
    with open(OUT / f"{slug}-rent-roll.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(head)
        for i, r in enumerate(rows):
            base = [code, name, fmt_unit(r["unit"], i, style), r["plan"], r["beds"], r["sqft"], r["status"],
                    r["name"], fmt_money(r["market"], i), fmt_money(r["rent"], i)]
            tail = [fmt_money(r["deposit"], i + 1), r["balance"], r["notes"]]
            # The Excel file keeps some real date cells, like the data pack does.
            xl_dates = [r["start"], r["end"]] if i % 5 == 0 else [fmt_date(r["start"], i), fmt_date(r["end"], i)]
            ws.append(base + xl_dates + tail)
            w.writerow([("" if v is None else v) for v in base + [fmt_date(r["start"], i), fmt_date(r["end"], i)] + tail])
    wb.save(OUT / f"{slug}-rent-roll.xlsx")
    print(f"{slug}: {len(rows)} rows")


write("trinity-bluffs", DATAPACK_HEAD, "datapack", *build(
    24, "PM-0488", "Trinity Bluffs", [f"3{f}{n:02d}" for f in (1, 2, 3) for n in range(1, 15)][:40],
    [("A1", 1, 705, 1240), ("A2", 1, 780, 1310), ("B1", 2, 1040, 1625), ("B2", 2, 1135, 1710)], trinity))
write("brazos-landing", OTHER_HEAD, "other", *build(
    31, "BZL-07", "Brazos Landing", [f"{b}{f}{n:02d}" for b in (1, 2, 3) for f in (1, 2) for n in range(1, 11)],
    [("1x1", 1, 650, 1045), ("1x1L", 1, 720, 1115), ("2x2", 2, 980, 1395), ("3x2", 3, 1210, 1640)], brazos, 7))
