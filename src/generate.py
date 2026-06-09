"""
src/generate.py  v4
新增：
- 保存完整原始文稿到 JSON（full_transcript 字段）
- 词汇标注包含 excerpt（原文片段）用于前端高亮匹配
- 周末自动回退 / HEAD→GET 修复 / JSON 多层容错
"""

import os, re, json, requests, sys, hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path

DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_URL     = 'https://api.deepseek.com/v1/chat/completions'
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY', '')
DEFAULT_ELEVENLABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'  # Adam, American male
ELEVENLABS_VOICE_ID = os.environ.get('ELEVENLABS_VOICE_ID', DEFAULT_ELEVENLABS_VOICE_ID)
ELEVENLABS_MODEL_ID = os.environ.get('ELEVENLABS_MODEL_ID', 'eleven_flash_v2_5')
ELEVENLABS_OUTPUT_FORMAT = os.environ.get('ELEVENLABS_OUTPUT_FORMAT', 'mp3_44100_128')
OUTPUT_DIR       = Path('output')
AUDIO_DIR        = OUTPUT_DIR / 'audio'
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
    if wd == 5:   today -= timedelta(days=1)
    elif wd == 6: today -= timedelta(days=2)
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
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2014', ' -- ').replace('\u2013', '-')
    text = text.replace('\u00a0', ' ').replace('\u00ad', '')
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r' {3,}', '  ', text)
    return text.strip()


def audio_slug(text: str) -> str:
    base = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    base = base[:60].strip('-') or 'audio'
    digest = hashlib.sha1(text.encode('utf-8')).hexdigest()[:8]
    return f'{base}-{digest}.mp3'


def audio_path(kind: str, date_str: str, text: str) -> Path:
    return AUDIO_DIR / kind / date_str / audio_slug(text)


def audio_url(kind: str, date_str: str, text: str) -> str:
    return f'output/audio/{kind}/{date_str}/{audio_slug(text)}'


def synthesize_audio(text: str, out_path: Path) -> bool:
    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        return False
    if out_path.exists() and out_path.stat().st_size > 0:
        return True

    out_path.parent.mkdir(parents=True, exist_ok=True)
    url = (
        f'https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}'
        f'?output_format={ELEVENLABS_OUTPUT_FORMAT}'
    )
    payload = {
        'text': text,
        'model_id': ELEVENLABS_MODEL_ID,
        'language_code': 'en',
        'voice_settings': {
            'stability': 0.45,
            'similarity_boost': 0.75,
            'style': 0.1,
            'use_speaker_boost': True,
        },
    }
    try:
        resp = requests.post(
            url,
            headers={
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        out_path.write_bytes(resp.content)
        print(f'      audio: {text} -> {out_path}')
        return True
    except Exception as e:
        print(f'      ⚠ ElevenLabs 生成失败：{text} ({e})')
        return False


def ensure_audio_for_items(data: dict, date_str: str, key: str, text_field: str, audio_field: str, kind: str) -> bool:
    items = data.get(key) or []
    if not items:
        return False
    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        print(f'      ElevenLabs 未配置，跳过 {kind} 音频生成')
        return False

    changed = False
    print(f'      生成/补齐 {kind} 音频...')
    for idx, item in enumerate(items, start=1):
        text = str(item.get(text_field) or '').strip()
        if not text:
            continue
        out_path = audio_path(kind, date_str, text)
        label = text if kind == 'vocab' else f'sentence {idx}'
        if synthesize_audio(text, out_path):
            url = audio_url(kind, date_str, text)
            if item.get(audio_field) != url:
                item[audio_field] = url
                changed = True
        else:
            print(f'      ⚠ 未生成 {label}')
    return changed


def ensure_vocab_audio(data: dict, date_str: str) -> bool:
    return ensure_audio_for_items(data, date_str, 'vocabulary', 'word', 'audio_url', 'vocab')


def ensure_sentence_audio(data: dict, date_str: str) -> bool:
    return ensure_audio_for_items(data, date_str, 'sentences', 'en', 'audio_url', 'sentences')


def ensure_all_audio(data: dict, date_str: str) -> bool:
    changed = ensure_vocab_audio(data, date_str)
    changed = ensure_sentence_audio(data, date_str) or changed
    return changed


def fetch_transcript(date_str: str) -> tuple[str, list[dict]]:
    """
    返回 (合并后全文, 各segment原始段落列表)
    segments 格式: [{"seg": 1, "url": "...", "text": "..."}]
    """
    segments_data = []
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

            # 提取说话人段落：格式通常是 SPEAKER NAME: text
            # 先提取纯文本
            section = re.search(r'<div[^>]+cnnTranscript[^>]*>(.*?)</div>', body, re.S)
            raw = section.group(1) if section else body
            raw = re.sub(r'<[^>]+>', ' ', raw)
            raw = re.sub(r'&nbsp;', ' ', raw)
            raw = re.sub(r'&amp;', '&', raw)
            raw = re.sub(r'&lt;', '<', raw)
            raw = re.sub(r'&gt;', '>', raw)
            raw = re.sub(r'\s+', ' ', raw).strip()
            raw = sanitize(raw)

            if len(raw) > 300:
                segments_data.append({'seg': seg, 'url': url, 'text': raw})
                print(f'  Segment {seg}: OK（{len(raw)} 字符）')
            else:
                print(f'  Segment {seg}: 内容过短，跳过')
        except Exception as e:
            print(f'  Segment {seg} 错误：{e}')

    if not segments_data:
        return '', []

    full = sanitize('\n\n'.join(s['text'] for s in segments_data))
    return full[:9000], segments_data


def extract_paragraphs(segments_data: list[dict]) -> list[dict]:
    """
    把文稿拆成段落列表，识别说话人标签
    格式: [{"speaker": "ANCHOR", "text": "..."}]
    """
    paragraphs = []
    # CNN 文稿格式：SPEAKER NAME (AFFILIATION): text 或 全大写开头
    speaker_re = re.compile(r'^([A-Z][A-Z\s\.\-]{2,40}):\s*(.+)', re.S)

    for seg in segments_data:
        # 按句号+空格或换行分段
        raw = seg['text']
        # 先按换行分
        chunks = re.split(r'\n{1,}', raw)
        current_speaker = 'ANCHOR'
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk:
                continue
            m = speaker_re.match(chunk)
            if m:
                current_speaker = m.group(1).strip()
                text = m.group(2).strip()
            else:
                text = chunk
            if text:
                # 长段拆成≤400字的小段
                while len(text) > 400:
                    cut = text[:400].rfind('. ')
                    if cut < 100:
                        cut = 400
                    else:
                        cut += 1
                    paragraphs.append({'speaker': current_speaker, 'text': text[:cut].strip()})
                    text = text[cut:].strip()
                if text:
                    paragraphs.append({'speaker': current_speaker, 'text': text})

    return paragraphs


# ── JSON 解析容错 ─────────────────────────────────────────────
def parse_json_robust(raw: str) -> dict:
    for attempt in [
        lambda s: json.loads(s),
        lambda s: json.loads(re.sub(r'^```(?:json)?\s*|\s*```$', '', s.strip(), flags=re.MULTILINE).strip()),
    ]:
        try:
            return attempt(raw)
        except (json.JSONDecodeError, Exception):
            pass

    start = raw.find('{')
    end   = raw.rfind('}')
    if start != -1 and end > start:
        chunk = raw[start:end+1]
        try:
            return json.loads(chunk)
        except json.JSONDecodeError as e:
            print(f'  JSON错误 line {e.lineno} col {e.colno}：{repr(raw[max(0,e.pos-60):e.pos+60])}')
            ob = chunk.count('{') - chunk.count('}')
            ob2 = chunk.count('[') - chunk.count(']')
            repaired = chunk + (']' * max(0, ob2)) + ('}' * max(0, ob))
            try:
                return json.loads(repaired)
            except Exception:
                pass

    raise ValueError(f'JSON 解析失败，原始内容前200字：\n{raw[:200]}')


# ── Prompt ────────────────────────────────────────────────────
SYSTEM = """你是专业英语精读教学助手，专注新闻英语。
目标学习者：考研六级以上。
输出规则：
1. 必须输出合法JSON，不使用Markdown代码块
2. JSON字符串中的双引号用 \\\" 转义
3. 例句中的双引号改为单引号"""

def build_prompt(transcript: str, date_str: str, source_url: str) -> str:
    safe = transcript.replace('\\', '\\\\').replace('"', '\\"')
    return f"""CNN This Morning 逐字稿（{date_str}）：

{safe}

输出以下JSON（所有字段必须存在）：

{{
  "date": "{date_str}",
  "source_url": "{source_url}",
  "summary": "150字中文摘要，涵盖所有主要话题",

  "vocabulary": [
    {{
      "word": "单词或短语",
      "phonetic": "/音标/",
      "pos": "词性",
      "level": "考研/六级/专四/专八/时事词汇",
      "cn": "中文释义（含搭配）",
      "en": "英文释义",
      "excerpt": "包含该词的原文片段（10-20词，用于高亮定位，单引号代替双引号）",
      "example_cn": "该片段中文翻译"
    }}
  ],

  "sentences": [
    {{
      "en": "原文长难句（完整句子）",
      "cn": "准确中文翻译",
      "structure": "句子结构（主句/从句/插入语等）",
      "analysis": "语法要点/习语/修辞分析"
    }}
  ],

  "topics": [
    {{
      "title": "话题标题",
      "content": "120字中文背景知识，含关键英文术语",
      "keywords": "词1 · 词2 · 词3"
    }}
  ],

  "quiz": [
    {{
      "type": "vocab",
      "question": "题目（含原文语境）",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": 0,
      "explanation": "详细解析"
    }}
  ]
}}

严格要求：
- vocabulary：12个，excerpt字段必须是文稿中真实存在的原文片段
- sentences：5个长难句
- topics：4个话题
- quiz：6道（前3词汇，后3理解）"""


# ── 调用 DeepSeek ─────────────────────────────────────────────
def call_deepseek(prompt: str) -> dict:
    if not DEEPSEEK_API_KEY:
        raise RuntimeError('DEEPSEEK_API_KEY 未设置')
    print('  调用 DeepSeek API...')
    resp = requests.post(
        DEEPSEEK_URL,
        headers={'Authorization': f'Bearer {DEEPSEEK_API_KEY}', 'Content-Type': 'application/json'},
        json={
            'model': 'deepseek-chat',
            'max_tokens': 4096,
            'temperature': 0.1,
            'response_format': {'type': 'json_object'},
            'messages': [
                {'role': 'system', 'content': SYSTEM},
                {'role': 'user',   'content': prompt}
            ]
        },
        timeout=120
    )
    resp.raise_for_status()
    raw = resp.json()['choices'][0]['message']['content']
    print(f'  API返回：{len(raw)} 字符')
    return parse_json_robust(raw)


# ── 主流程 ────────────────────────────────────────────────────
def main():
    print('\n=== CNN精读生成器 v4 ===')

    requested_date = get_target_date()
    out_path = OUTPUT_DIR / f'{requested_date}.json'
    if out_path.exists():
        print(f'✓ 缓存已存在：{out_path}')
        data = json.loads(out_path.read_text(encoding='utf-8'))
        if ensure_all_audio(data, requested_date):
            out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'✓ 已补齐音频字段：{out_path}')
        return

    print(f'\n[1/3] 查找有效文稿（从 {requested_date} 开始）...')
    actual_date = find_available_date(requested_date, max_lookback=7)

    out_path = OUTPUT_DIR / f'{actual_date}.json'
    if out_path.exists():
        print(f'✓ {actual_date} 缓存已存在')
        data = json.loads(out_path.read_text(encoding='utf-8'))
        if ensure_all_audio(data, actual_date):
            out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'✓ 已补齐音频字段：{out_path}')
        return

    source_url = f'https://transcripts.cnn.com/show/ctmo/date/{actual_date}/segment/01'
    print(f'目标日期：{actual_date}  输出：{out_path}')

    print(f'\n[2/3] 抓取文稿...')
    full_text, segments_data = fetch_transcript(actual_date)
    if not full_text:
        raise RuntimeError(f'{actual_date} 文稿抓取失败')
    print(f'      文稿长度：{len(full_text)} 字符')

    # 拆分段落（用于前端全文显示）
    paragraphs = extract_paragraphs(segments_data)
    print(f'      段落数：{len(paragraphs)}')

    print(f'\n[3/3] 生成精读内容...')
    prompt = build_prompt(full_text, actual_date, source_url)
    data   = call_deepseek(prompt)

    # 注入完整段落数据
    data['paragraphs'] = paragraphs
    data['date']       = actual_date
    data['source_url'] = source_url
    ensure_all_audio(data, actual_date)

    print(f'      词汇：{len(data.get("vocabulary",[]))} 难句：{len(data.get("sentences",[]))}')

    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\n✅ 已保存：{out_path}')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'\n❌ {e}', file=sys.stderr)
        sys.exit(1)
