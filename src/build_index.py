"""
src/build_index.py  v2
读取 output/*.json，重建 index.html（GitHub Pages 静态前端）
"""

import json
from pathlib import Path

OUTPUT_DIR = Path('output')
TEMPLATE   = Path('src/template.html').read_text(encoding='utf-8')

def main():
    dates = sorted(
        [f.stem for f in OUTPUT_DIR.glob('*.json')],
        reverse=True
    )

    if not dates:
        print('No output files found, skipping index rebuild.')
        return

    latest_date = dates[0]
    print(f'Found {len(dates)} date(s). Latest: {latest_date}')

    # 左侧历史列表（sidebar）
    history_html = '\n'.join(
        f'<div class="hist-item{" active" if d == latest_date else ""}" '
        f'data-date="{d}" title="{d}" onclick="loadDate(\'{d}\')">'
        f'<span class="dot"></span>'
        f'<span class="date">{d}</span>'
        f'</div>'
        for d in dates[:60]
    )

    # 嵌入所有 JSON 数据为 JS 变量（纯静态，无需后端）
    all_data = {}
    for d in dates[:60]:
        try:
            all_data[d] = json.loads(
                (OUTPUT_DIR / f'{d}.json').read_text(encoding='utf-8')
            )
        except Exception as e:
            print(f'  跳过损坏文件 {d}.json: {e}')

    all_data_js = 'const ALL_DATA = ' + json.dumps(
        all_data, ensure_ascii=False, separators=(',', ':')
    ) + ';'

    html = TEMPLATE \
        .replace('<!-- HISTORY_ITEMS -->', history_html) \
        .replace('/* ALL_DATA_PLACEHOLDER */', all_data_js) \
        .replace('<!-- LATEST_DATE -->', latest_date)

    Path('index.html').write_text(html, encoding='utf-8')
    print(f'✅ index.html rebuilt ({len(dates)} dates)')

if __name__ == '__main__':
    main()
