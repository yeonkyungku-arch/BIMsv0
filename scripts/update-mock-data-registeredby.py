import re

# Read the mock-data.tsx file using relative path
mock_data_path = '../lib/mock-data.tsx'

print(f"[v0] Reading from: {mock_data_path}")

# Read the mock-data.tsx file
with open(mock_data_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"[v0] File read successfully, size: {len(content)} bytes")

# Pattern to find Asset objects - look for lines with createdAt that don't have registeredBy
# Replace pattern: look for createdAt line and insert registeredBy before it
pattern = r'(\s+)inspectionStatus: "passed",\n(\s+)createdAt:'
replacement = r'\1inspectionStatus: "passed",\n\1registeredBy: "partner", registeredByName: "김입고",\n\2createdAt:'

new_content = re.sub(pattern, replacement, content)
replacements = content.count('inspectionStatus: "passed",') - new_content.count('inspectionStatus: "passed",')

print(f"[v0] Made {replacements} replacements for pattern 1")

content = new_content

# Also handle cases without inspectionStatus
pattern2 = r'(\s+)inspectionNotes: ([^,]+),\n(\s+)createdAt:'
replacement2 = r'\1inspectionNotes: \2,\n\1registeredBy: "partner", registeredByName: "김입고",\n\3createdAt:'

new_content = re.sub(pattern2, replacement2, content)
replacements2 = content.count('inspectionNotes:') - new_content.count('inspectionNotes:')

print(f"[v0] Made {replacements2} replacements for pattern 2")

content = new_content

# Write back to file
with open(mock_data_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Successfully updated mock-data.tsx with registeredBy fields")
print("✓ All assets now have registeredBy: 'partner' and registeredByName fields")
