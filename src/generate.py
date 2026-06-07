"""
src/generate.py
每日自动抓取 CNN This Morning 文稿，调用 DeepSeek API 生成精读学习内容
在 GitHub Actions 中运行
"""

import os, re, json, requests, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────────────
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_URL     = 'https://api.deepseek.com/v1/chat/completions'
OUTPUT_DIR       = Path('output')
OUTPUT_DIR.mkdir(exist_ok=True)

# 北京时间
CST = timezone(timedelta(hours=8))

def get_target_date() -> str:
    """从环境变量或当前北京时间获取目标日期"""
    d = os.environ.get('TARGET_DATE', '').strip()
    if d and re.match(r'\d{4}-\d{2}-\d{2}', d):
        return d
    return datetime.now(CST).strftime('%Y-%m-%d')


# ── 抓取文稿 ──────────────────────────────────────────────────
def fetch_transcript(date_str: str) -> str:
    """
    尝试抓取 segment/01 和 segment/02，合并文本
    返回纯文字内容
    """
    combined = []
    for seg in [1, 2]:
        url = f'https://transcripts.cnn.com/show/ctmo/date/{date_str}/segment/{seg:02d}'
        print(f'  Fetching: {url}')
        try:
            r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=20)
            if r.status_code == 404:
                print(f'  Segment {seg}: 404, skipping')
                continue
            r.raise_for_status()
            # 提取 <div class="cnnTranscriptSection"> 内的文字（如存在）
            body = r.text
            section = re.search(r'<div[^>]+cnnTranscript[^>]*>(.*?)</div>', body, re.S)
            text = section.group(1) if section else body
            # 去除所有 HTML 标签
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'&nbsp;', ' ', text)
            text = re.sub(r'&amp;', '&', text)
            text = re.sub(r'&lt;', '<', text)
            text = re.sub(r'&gt;', '>', text)
            text = re.sub(r'\s+', ' ', text).strip()
            if len(text) > 500:   # 有效内容才保留
                combined.append(text)
                print(f'  Segment {seg}: OK ({len(text)} chars)')
        except Exception as e:
            print(f'  Segment {seg} error: {e}')

    if not combined:
        raise RuntimeError(f'No transcript content fetched for {date_str}')

    full = '\n\n'.join(combined)
    return full[:9000]   # DeepSeek 上下文限制


# ── DeepSeek Prompt ───────────────────────────────────────────
SYSTEM = """你是专业的英语精读教学助手，专注于新闻英语教学。
输出面向考研六级以上学习者，重点覆盖：
1. 新闻政治高频词汇
2. 含嵌套从句/插入语/习语的长难句
3. 背景知识（帮助理解新闻语境）
必须输出合法JSON，不输出任何其他内容，不使用Markdown代码块。"""

def build_prompt(transcript: str, date_str: str, source_url: str) -> str:
    return f"""以下是CNN This Morning新闻逐字稿（{date_str}）：

{transcript}

请严格按照以下JSON结构输出精读学习内容：

{{
  "date": "{date_str}",
  "source_url": "{source_url}",
  "summary": "约150字中文摘要，涵盖文稿中所有主要新闻话题，每个话题用一句话概括",

  "transcript_highlights": [
    {{
      "speaker": "说话人（如 ANCHOR/REPORTER/GUEST）",
      "text": "原文重要段落（逐字稿，保持原文）",
      "cn": "中文对照翻译",
      "note": "语境说明（可选）"
    }}
  ],

  "vocabulary": [
    {{
      "word": "单词或短语",
      "phonetic": "/音标/",
      "pos": "词性",
      "level": "考研/六级/专四/专八/时事词汇",
      "cn": "中文释义（含常用搭配）",
      "en": "英文释义",
      "example": "原文例句（完整句子，保持原文）",
      "example_cn": "例句中文翻译"
    }}
  ],

  "sentences": [
    {{
      "en": "原文长难句（完整句子）",
      "cn": "准确中文翻译",
      "structure": "句子结构标注（主句/从句/插入语/不定式等）",
      "analysis": "语法要点分析：嵌套结构/习语用法/修辞手法"
    }}
  ],

  "topics": [
    {{
      "title": "话题标题",
      "content": "约120字中文背景知识，含关键英文术语及解释",
      "keywords": "关键词1 · 关键词2 · 关键词3"
    }}
  ],

  "quiz": [
    {{
      "type": "vocab 或 sentence",
      "question": "题目（含原文引用语境）",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": 0,
      "explanation": "详细解析：正确答案原因 + 干扰项排除"
    }}
  ]
}}

严格要求：
- transcript_highlights：选取4-5段最重要的原文段落（逐字稿），含中文对照
- vocabulary：恰好12个词，优先考研六级 + 新闻政治词汇，不选基础词
- sentences：恰好5句，优先含多重从句/插入语/政治习语的复杂句
- topics：恰好4个，对应文稿中4个主要新闻话题
- quiz：恰好6道（前3道考词汇，后3道考句意/背景理解）
- 所有内容必须源自文稿原文，不得虚构"""


# ── 调用 DeepSeek ─────────────────────────────────────────────
def call_deepseek(prompt: str) -> dict:
    if not DEEPSEEK_API_KEY:
        raise RuntimeError('DEEPSEEK_API_KEY is not set. Add it in GitHub Secrets.')

    print('  Calling DeepSeek API...')
    resp = requests.post(
        DEEPSEEK_URL,
        headers={
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'model': 'deepseek-v4-flash',
            'max_tokens': 4096,
            'temperature': 0.2,
            'messages': [
                {'role': 'system', 'content': SYSTEM},
                {'role': 'user',   'content': prompt}
            ]
        },
        timeout=120
    )
    resp.raise_for_status()
    raw = resp.json()['choices'][0]['message']['content']
    clean = re.sub(r'```json|```', '', raw).strip()
    return json.loads(clean)


# ── 主流程 ────────────────────────────────────────────────────
def main():
    date_str   = get_target_date()
    out_path   = OUTPUT_DIR / f'{date_str}.json'
    source_url = f'https://transcripts.cnn.com/show/ctmo/date/{date_str}/segment/01'

    print(f'\n=== CNN精读生成器 ===')
    print(f'目标日期：{date_str}')
    print(f'输出路径：{out_path}')

    if out_path.exists():
        print(f'已存在缓存，跳过生成。如需重新生成，请删除 {out_path}')
        return

    # 1. 抓取文稿
    print('\n[1/3] 抓取CNN文稿...')
    transcript = fetch_transcript(date_str)
    print(f'      文稿长度：{len(transcript)} 字符')

    # 2. 生成内容
    print('\n[2/3] 调用 DeepSeek API 生成学习内容...')
    prompt = build_prompt(transcript, date_str, source_url)
    data   = call_deepseek(prompt)
    print('      生成成功')

    # 3. 保存
    print('\n[3/3] 保存结果...')
    out_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f'      已保存：{out_path}')
    print(f'\n✅ 完成！词汇数：{len(data.get("vocabulary",[]))}，难句数：{len(data.get("sentences",[]))}')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'\n❌ 错误：{e}', file=sys.stderr)
        sys.exit(1)
