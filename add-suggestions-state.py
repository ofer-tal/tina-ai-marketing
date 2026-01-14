#!/usr/bin/env python3
import sys

# Read the file
with open('frontend/src/pages/StrategicDashboard.jsx', 'r') as f:
    lines = f.readlines()

# Find line 574 (0-indexed: 573) and insert after it
insert_at = 574  # Line number to insert after (1-indexed)
lines.insert(insert_at, '  const [suggestionsData, setSuggestionsData] = useState(null);\n')

# Write back
with open('frontend/src/pages/StrategicDashboard.jsx', 'w') as f:
    f.writelines(lines)

print(f"Added suggestions state at line {insert_at + 1}")
