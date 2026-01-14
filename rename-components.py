#!/usr/bin/env python3
import re

# Read the file
with open('frontend/src/pages/StrategicDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Rename the competitor keyword monitoring components (only the ones I added starting around line 1999)
replacements = [
    # Component declarations (my new components only)
    (r'(1999:)(const CompetitorCard = styled\.div`)', r'\1const CompetitorKeywordCard = styled.div`'),
    (r'(2012:)(const CompetitorCardHeader = styled\.div`)', r'\1const CompetitorKeywordCardHeader = styled.div`'),
    (r'(2019:)(const CompetitorName = styled\.h4`)', r'\1const CompetitorKeywordName = styled.h4`'),
    (r'(2025:)(const CompetitorBadge = styled\.span`)', r'\1const CompetitorKeywordBadge = styled.span`'),
    (r'(2038:)(const CompetitorMetric = styled\.div`)', r'\1const CompetitorKeywordMetric = styled.div`'),
    (r'(2049:)(const CompetitorMetricLabel = styled\.span`)', r'\1const CompetitorKeywordMetricLabel = styled.span`'),
    (r'(2054:)(const CompetitorMetricValue = styled\.span`)', r'\1const CompetitorKeywordMetricValue = styled.span`'),
]

# Apply replacements
content_new = content
for pattern, replacement in replacements:
    content_new = re.sub(pattern, replacement, content_new, flags=re.MULTILINE)

# Also replace in JSX usage
content_new = re.sub(r'<CompetitorCard([^>]*key={index}', '<CompetitorKeywordCard\1', content_new)
content_new = re.sub(r'</CompetitorCard>', '</CompetitorKeywordCard>', content_new)
content_new = re.sub(r'<CompetitorCardHeader>', '<CompetitorKeywordCardHeader>', content_new)
content_new = re.sub(r'</CompetitorCardHeader>', '</CompetitorKeywordCardHeader>', content_new)
content_new = re.sub(r'<CompetitorName>', '<CompetitorKeywordName>', content_new)
content_new = re.sub(r'</CompetitorName>', '</CompetitorKeywordName>', content_new)
content_new = re.sub(r'<CompetitorBadge([^>]*>)', '<CompetitorKeywordBadge\1', content_new)
content_new = re.sub(r'</CompetitorBadge>', '</CompetitorKeywordBadge>', content_new)
content_new = re.sub(r'<CompetitorMetric>', '<CompetitorKeywordMetric>', content_new)
content_new = re.sub(r'</CompetitorMetric>', '</CompetitorKeywordMetric>', content_new)
content_new = re.sub(r'<CompetitorMetricLabel([^>]*)>', '<CompetitorKeywordMetricLabel\1>', content_new)
content_new = re.sub(r'</CompetitorMetricLabel>', '</CompetitorKeywordMetricLabel>', content_new)
content_new = re.sub(r'<CompetitorMetricValue([^>]*)>', '<CompetitorKeywordMetricValue\1>', content_new)
content_new = re.sub(r'</CompetitorMetricValue>', '</CompetitorKeywordMetricValue>', content_new)

# Write back
with open('frontend/src/pages/StrategicDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content_new)

print("Components renamed successfully!")
