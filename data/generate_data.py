import csv
import random
from datetime import date, timedelta

random.seed(42)

PRODUCTS = {
    "Laptop":    {"base_price": 70000, "base_qty": 5},
    "Mouse":     {"base_price": 500,   "base_qty": 30},
    "Keyboard":  {"base_price": 1500,  "base_qty": 20},
    "Monitor":   {"base_price": 15000, "base_qty": 8},
    "Headphones":{"base_price": 3000,  "base_qty": 15},
    "Webcam":    {"base_price": 2500,  "base_qty": 12},
}

REGIONS = ["North", "South", "East", "West"]

# Regional multipliers — some products sell better in certain regions
REGION_BIAS = {
    ("Laptop",     "North"): 1.4,
    ("Laptop",     "South"): 0.8,
    ("Monitor",    "East"):  1.3,
    ("Headphones", "West"):  1.5,
    ("Webcam",     "North"): 1.2,
}

START = date(2024, 1, 1)
END   = date(2024, 6, 30)

sales_rows   = []
targets_rows = []

# --- sales_data ---
current = START
while current <= END:
    # Fewer transactions on weekends
    n_transactions = random.randint(2, 5) if current.weekday() < 5 else random.randint(0, 2)

    for _ in range(n_transactions):
        product = random.choice(list(PRODUCTS.keys()))
        region  = random.choice(REGIONS)
        p       = PRODUCTS[product]

        # Seasonal uplift: Q1 slightly slower, pick up in Q2
        season  = 1.15 if current.month >= 4 else 1.0
        bias    = REGION_BIAS.get((product, region), 1.0)

        qty     = max(1, int(p["base_qty"] * bias * season * random.uniform(0.6, 1.6)))
        price   = p["base_price"] * random.uniform(0.92, 1.08)  # ±8% price variance
        revenue = round(qty * price, 2)

        sales_rows.append({
            "date":     current.isoformat(),
            "product":  product,
            "region":   region,
            "quantity": qty,
            "revenue":  revenue,
        })

    current += timedelta(days=1)

# --- targets ---
for month_num in range(1, 7):
    month_str = f"2024-{month_num:02d}"
    for product, p in PRODUCTS.items():
        # Target = rough expected monthly revenue * 1.1 (stretch target)
        expected = p["base_price"] * p["base_qty"] * 22 * 1.1  # ~22 working days
        targets_rows.append({
            "month":          month_str,
            "product":        product,
            "target_revenue": round(expected),
        })

# --- write CSVs ---
with open("sales_data.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["date","product","region","quantity","revenue"])
    writer.writeheader()
    writer.writerows(sales_rows)

with open("targets.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["month","product","target_revenue"])
    writer.writeheader()
    writer.writerows(targets_rows)

print(f"sales_data.csv  → {len(sales_rows)} rows")
print(f"targets.csv     → {len(targets_rows)} rows")

# Quick sanity check
total_rev = sum(r["revenue"] for r in sales_rows)
print(f"Total revenue across 6 months: ₹{total_rev:,.0f}")
