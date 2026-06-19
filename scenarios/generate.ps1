# encoding: UTF-8 BOM
# Generate Rebirth 2 content for wasteland

$lines = @()
$id = 6681

# =====================================
# STORY EVENTS - 500 total
# =====================================

# I'll write the content directly to the file using a here-string approach
# that avoids the encoding parsing issues

$storyContent = @"
| wasteland_e6681 | story | 1 | 0 | 1 | 是 | 2 | 发现 | 你在一片辐射尘中找到了一座半塌的机械工坊。锈蚀的机床沉默地注视着你。 |
"@

Write-Host "Generating content directly..."
