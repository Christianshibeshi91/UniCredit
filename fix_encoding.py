import glob
from pathlib import Path

def run_fix():
    print("Fixing windows ascii encoding crashes...")
    for f in glob.glob('**/*.py', recursive=True):
        if "fix_encoding.py" in f:
            continue
        path = Path(f)
        if hasattr(path, 'read_text'):
            try:
                content = path.read_text(encoding='utf-8')
                content = content.replace('✓', '[+]') \
                                 .replace('🔍', '[*]') \
                                 .replace('🚀', '[>]') \
                                 .replace('✋', '[!]') \
                                 .replace('⚠️', '[!]') \
                                 .replace('✅', '[+]') \
                                 .replace('❌', '[-]')
                path.write_text(content, encoding='utf-8')
            except Exception as e:
                print(f"Skipping {f} due to error: {e}")
    print("Fixed!")

if __name__ == "__main__":
    run_fix()
