# Fix Story categories in test file
with open('run-mongodb-integration-tests.mjs', 'r') as f:
    content = f.read()

# Replace all invalid category values
content = content.replace("category: 'romance'", "category: 'Contemporary'")
content = content.replace("category: 'drama'", "category: 'Billionaire'")

with open('run-mongodb-integration-tests.mjs', 'w') as f:
    f.write(content)

print("✅ Fixed all category values")
