import os

files = ['src/app/checkin/page.js','src/app/heritage/page.js','src/app/myspace/page.js','src/app/page.js']
for f in files:
    if os.path.exists(f):
        content = open(f, 'r', encoding='utf-8').read()
        content = content.replace('&apos;', "'")
        open(f, 'w', encoding='utf-8').write(content)
