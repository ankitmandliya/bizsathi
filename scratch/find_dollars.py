import os, re

frontend_dir = r"c:\Users\User\Downloads\bizsathi\frontend\src"

for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for i, line in enumerate(lines, 1):
                    line_str = line.strip()
                    if 'DollarSign' in line_str:
                        print(f"[DollarSign ICON] {file}:{i}: {line_str}")
                    elif 'USD' in line_str:
                        print(f"[USD CURRENCY] {file}:{i}: {line_str}")
                    else:
                        cleaned = re.sub(r'\$\{[^}]*\}', '', line_str)
                        cleaned = re.sub(r'\\\$', '', cleaned)
                        cleaned = re.sub(r'//.*', '', cleaned)
                        if '$' in cleaned:
                            print(f"[DOLLAR SYMBOL] {file}:{i}: {line_str}")
