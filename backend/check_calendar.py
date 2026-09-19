from datetime import date
working_days = []
for d in range(1, 31):
    day = date(2026, 9, d)
    if day.weekday() < 5:  # Mon-Fri
        working_days.append(d)
        print(f"Sep {d}: {day.strftime('%A')}")
print(f"Total: {len(working_days)} working days")
print(f"Working day numbers: {working_days}")
