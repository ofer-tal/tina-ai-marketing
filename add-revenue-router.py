#!/usr/bin/env python3
import re

file_path = "backend/server.js"

with open(file_path, 'r') as f:
    content = f.read()

# Add import after searchAdsRouter
old_import = "import searchAdsRouter from \"./api/searchAds.js\";\nimport storageService"
new_import = "import searchAdsRouter from \"./api/searchAds.js\";\nimport revenueRouter from \"./api/revenue.js\";\nimport storageService"

content = content.replace(old_import, new_import)

# Add route after searchAdsRouter
old_route = "app.use(\"/api/searchAds\", searchAdsRouter);"
new_route = "app.use(\"/api/searchAds\", searchAdsRouter);\napp.use(\"/api/revenue\", revenueRouter);"

content = content.replace(old_route, new_route)

with open(file_path, 'w') as f:
    f.write(content)

print("✅ Added revenue router to server.js")
