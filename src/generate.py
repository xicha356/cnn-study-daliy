"""
src/generate.py  v3
修复：CNN文稿特殊字符导致 JSON 解析失败
- 清理输入文稿中的 curly quotes / em-dash / 控制字符
- 多层 JSON 解析容错（提取最长JSON块 / 逐字段修复）
- 周末自动回退到最近工作日
"""

import os, re, json, requests, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_URL     = 'https://api.deepseek.com/v1/chat/completions'
OUTPUT_DIR       = Path('output')
OUTPUT_DIR.mkdir(exist_ok=True)
CST = timezone(timedelta(hours=8))


# ── 日期处理 ──────────────────────────────────────────────────
def get_target_date() -> str:
    d = os.environ.get('TARGET_DATE', '').strip()
    if d and re.match(r'^\d{4}-\d{2}-\d{2}$', d):
        print(f'  使用指定日期：{d}')
        return d
    today = datetime.now(CST)
    wd = today.weekday()
    if wd == 5:   today -= timedelta(days=1)   # 周六→周五
    elif wd == 6: today -= timedelta(days=2)   # 周日→周五
    result = today.strftime('%Y-%m-%d')
    if wd >= 5:
        print(f'  今天是周末，自动使用最近工作日：{result}')
    return result


def find_available_date(start_date: str, max_lookback: int = 7) -> str:
    dt = datetime.strptime(start_date, '%Y-%m-%d')
    for i in range(max_lookback):
        candidate_dt = dt - timedelta(days=i)
        candidate = candidate_dt.strftime('%Y-%m-%d')
        if candidate_dt.weekday() >= 5:
            print(f'  {candidate} 是周末，跳过')
            continue
        url = f'https://transcripts.cnn.com/show/ctmo/date/{candidate}/segment/01'
        print(f'  检查：{url}')
        try:
            r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
            if r.status_code == 200 and len(r.text) > 500:
                print(f'  ✓ 找到有效日期：{candidate}')
                return candidate
            print(f'  {candidate} 返回 {r.status_code}')
        except Exception as e:
            print(f'  {candidate} 请求失败：{e}')
    raise RuntimeError(f'回溯 {max_lookback} 天内未找到有效 CNN 文稿')


# ── 文稿抓取 & 清理 ───────────────────────────────────────────
def sanitize(text: str) -> str:
    """清理可能破坏 JSON 的特殊字符"""
    # curly quotes → straight quotes
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    # dashes
    text = text.replace('\u2014', ' -- ').replace('\u2013', '-')
    # non-breaking space, soft hyphen
    text = text.replace('\u00a0', ' ').replace('\u00ad', '')
    # 控制字符（保留 \t \n）
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # 连续空白压缩
    text = re.sub(r' {3,}', '  ', text)
    return text.strip()


def fetch_transcript(date_str: str) -> str:
    combined = []
    for seg in [1, 2, 3]:
        url = f'https://transcripts.cnn.com/show/ctmo/date/{date_str}/segment/{seg:02d}'
        print(f'  Fetching: {url}')
        try:
            r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=20)
            if r.status_code == 404:
                print(f'  Segment {seg}: 404，跳过')
                continue
            r.raise_for_status()
            body = r.text
            section = re.search(r'<div[^>]+cnnTranscript[^>]*>(.*?)</div>', body, re.S)
            text = section.group(1) if section else body
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'&nbsp;', ' ', text)
            text = re.sub(r'&amp;', '&', text)
            text = re.sub(r'&lt;', '<', text)
            text = re.sub(r'&gt;', '>', text)
            text = re.sub(r'\s+', ' ', text).strip()
            text = sanitize(text)
            if len(text) > 300:
                combined.append(text)
                print(f'  Segment {seg}: OK（{len(text)} 字符）')
            else:
                print(f'  Segment {seg}: 内容过短，跳过')
        except Exception as e:
            print(f'  Segment {seg} 错误：{e}')

    if not combined:
        return ''
    return sanitize('\n\n'.join(combined))[:9000]


# ── JSON 解析容错 ─────────────────────────────────────────────
def parse_json_robust(raw: str) -> dict:
    """
    多层容错解析 DeepSeek 返回的 JSON：
    1. 直接解析
    2. 去掉 markdown 代码块后解析
    3. 提取最长的 { } 块解析
    4. 都失败则抛出详细错误
    """
    # 第1层：直接解析
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 第2层：去掉 ```json ... ``` 包裹
    clean = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.MULTILINE)
    clean = re.sub(r'\s*```$', '', clean.strip(), flags=re.MULTILINE)
    clean = clean.strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass

    # 第3层：提取第一个 { 到最后一个 } 的内容
    start = clean.find('{')
    end   = clean.rfind('}')
    if start != -1 and end != -1 and end > start:
        chunk = clean[start:end+1]
        try:
            return json.loads(chunk)
        except json.JSONDecodeError as e:
            # 第4层：打印出错位置帮助调试，然后尝试 repair
            print(f'  JSON 解析仍失败，错误位置：line {e.lineno} col {e.colno} (char {e.pos})')
            context_start = max(0, e.pos - 80)
            context_end   = min(len(chunk), e.pos + 80)
            print(f'  出错上下文：...{repr(chunk[context_start:context_end])}...')

            # 第5层：尝试修复常见问题——末尾截断时补上 ]}}
            repaired = chunk
            if not repaired.endswith('}}'):
                # 数漏掉的括号
                open_braces   = repaired.count('{') - repaired.count('}')
                open_brackets = repaired.count('[') - repaired.count(']')
                if open_brackets > 0:
                    repaired += ']' * open_brackets
                if open_braces > 0:
                    repaired += '}' * open_braces
                try:
                    return json.loads(repaired)
                except json.JSONDecodeError:
                    pass

    raise ValueError(
        f'DeepSeek 返回的 JSON 无法解析。\n'
        f'原始内容前300字：\n{raw[:300]}'
    )


# ── Prompt ────────────────────────────────────────────────────
SYSTEM = """你是专业的英语精读教学助手，专注于新闻英语教学。
输出面向考研六级以上学习者。
【重要】JSON字符串值中不能包含未转义的双引号，必须用 \\\" 转义。
必须输出合法JSON，不使用Markdown代码块，不输出任何其他内容。"""

def build_prompt(transcript: str, date_str: str, source_url: str) -> str:
    # 额外转义文稿中残余的双引号，防止污染 prompt
    safe_transcript = transcript.replace('\\', '\\\\').replace('"', '\\"')

    return f"""以下是CNN This Morning新闻逐字稿（{date_str}）：

{safe_transcript}

请严格按以下JSON结构输出精读学习内容，所有字符串值中的双引号必须用 \\\" 转义：

{{
  "date": "{date_str}",
  "source_url": "{source_url}",
  "summary": "约150字中文摘要，涵盖文稿中所有主要新闻话题",

  "transcript_highlights": [
    {{
      "speaker": "ANCHOR",
      "text": "原文重要段落逐字稿（用单引号代替双引号）",
      "cn": "中文翻译",
      "note": "语境说明"
    }}
  ],

  "vocabulary": [
    {{
      "word": "单词",
      "phonetic": "/音标/",
      "pos": "词性",
      "level": "考研/六级/专四/专八/时事词汇",
      "cn": "中文释义",
      "en": "英文释义",
      "example": "原文例句（单引号代替双引号）",
      "example_cn": "例句中文翻译"
    }}
  ],

  "sentences": [
    {{
      "en": "原文长难句",
      "cn": "中文翻译",
      "structure": "句子结构标注",
      "analysis": "语法分析"
    }}
  ],

  "topics": [
    {{
      "title": "话题标题",
      "content": "约120字中文背景知识",
      "keywords": "关键词1 · 关键词2 · 关键词3"
    }}
  ],

  "quiz": [
    {{
      "type": "vocab",
      "question": "题目",
      "options": ["A. 选项", "B. 选项", "C. 选项", "D. 选项"],
      "answer": 0,
      "explanation": "解析"
    }}
  ]
}}

要求：
- transcript_highlights：4-5段关键原文，原文中的双引号改为单引号
- vocabulary：12个考研六级以上词汇
- sentences：5个长难句
- topics：4个话题背景
- quiz：6道题（前3词汇，后3理解）"""


# ── 调用 DeepSeek ─────────────────────────────────────────────
def call_deepseek(prompt: str) -> dict:
    if not DEEPSEEK_API_KEY:
        raise RuntimeError('DEEPSEEK_API_KEY 未设置，请在 GitHub Secrets 中添加。')

    print('  调用 DeepSeek API...')
    resp = requests.post(
        DEEPSEEK_URL,
        headers={
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'model': 'deepseek-chat',
            'max_tokens': 4096,
            'temperature': 0.1,        # 降低温度，输出更稳定
            'response_format': {'type': 'json_object'},  # 强制 JSON 模式
            'messages': [
                {'role': 'system', 'content': SYSTEM},
                {'role': 'user',   'content': prompt}
            ]
        },
        timeout=120
    )
    resp.raise_for_status()
    raw = resp.json()['choices'][0]['message']['content']
    print(f'  API 返回长度：{len(raw)} 字符')
    return parse_json_robust(raw)


# ── 主流程 ────────────────────────────────────────────────────
def main():
    print('\n=== CNN精读生成器 v3 ===')

    requested_date = get_target_date()

    out_path = OUTPUT_DIR / f'{requested_date}.json'
    if out_path.exists():
        print(f'✓ 已有缓存：{out_path}，跳过。')
        return

    print(f'\n[1/3] 查找有效文稿日期（从 {requested_date} 开始）...')
    actual_date = find_available_date(requested_date, max_lookback=7)

    out_path = OUTPUT_DIR / f'{actual_date}.json'
    if out_path.exists():
        print(f'✓ {actual_date} 已有缓存，跳过。')
        return

    source_url = f'https://transcripts.cnn.com/show/ctmo/date/{actual_date}/segment/01'
    print(f'目标日期：{actual_date}')
    print(f'输出路径：{out_path}')

    print(f'\n[2/3] 抓取 CNN 文稿...')
    transcript = fetch_transcript(actual_date)
    if not transcript:
        raise RuntimeError(f'{actual_date} 文稿抓取失败')
    print(f'      文稿长度：{len(transcript)} 字符')

    print(f'\n[3/3] 生成精读内容...')
    prompt = build_prompt(transcript, actual_date, source_url)
    data   = call_deepseek(prompt)
    print(f'      词汇：{len(data.get("vocabulary",[]))} 个，难句：{len(data.get("sentences",[]))} 个')

    out_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f'\n✅ 已保存：{out_path}')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'\n❌ 错误：{e}', file=sys.stderr)
        sys.exit(1)
