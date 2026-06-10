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
DEEPSEEK_MAX_TOKENS = int(os.environ.get('DEEPSEEK_MAX_TOKENS', '16384'))
MAX_VOCAB_ITEMS = int(os.environ.get('MAX_VOCAB_ITEMS', '50'))
MAX_SENTENCE_ITEMS = int(os.environ.get('MAX_SENTENCE_ITEMS', '30'))
MIN_SENTENCE_ITEMS = int(os.environ.get('MIN_SENTENCE_ITEMS', '20'))
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


def should_force_regenerate() -> bool:
    return os.environ.get('FORCE_REGENERATE', '').strip().lower() in {'1', 'true', 'yes', 'y'}


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


def ensure_all_audio(data: dict, date_str: str) -> bool:
    return ensure_vocab_audio(data, date_str)


def cap_unique_items(data: dict, key: str, unique_field: str, limit: int) -> bool:
    items = data.get(key) or []
    if not isinstance(items, list):
        data[key] = []
        return True

    seen = set()
    capped = []
    for item in items:
        if not isinstance(item, dict):
            continue
        unique_value = sanitize(str(item.get(unique_field) or '')).lower()
        if not unique_value or unique_value in seen:
            continue
        seen.add(unique_value)
        capped.append(item)
        if len(capped) >= limit:
            break

    if len(capped) != len(items):
        data[key] = capped
        return True
    return False


def enforce_study_item_limits(data: dict) -> bool:
    changed = cap_unique_items(data, 'vocabulary', 'word', MAX_VOCAB_ITEMS)
    changed = cap_unique_items(data, 'sentences', 'en', MAX_SENTENCE_ITEMS) or changed
    return changed


def assert_generated_sentence_count(data: dict) -> None:
    count = len(data.get('sentences') or [])
    if count < MIN_SENTENCE_ITEMS:
        raise RuntimeError(f'长难句数量不足：{count}，需要至少 {MIN_SENTENCE_ITEMS} 个')


def generate_sentence_items(transcript: str) -> list[dict]:
    prompt = f"""请从以下 CNN 逐字稿中抽取长难句，专门用于中文母语学习者做新闻英语精读。

逐字稿：
{transcript}

只输出合法 JSON：
{{
  "sentences": [
    {{
      "en": "原文长难句（必须是逐字稿中真实存在的完整英文句子）",
      "cn": "准确自然的中文翻译",
      "structure": "句子结构分析：主句/从句/插入语/并列结构/修饰关系等",
      "analysis": "精读解析：难点词组、逻辑关系、新闻压缩表达或语法现象"
    }}
  ]
}}

要求：
- 必须返回 {MIN_SENTENCE_ITEMS}-{MAX_SENTENCE_ITEMS} 个长难句
- 优先选择从句多、插入语多、逻辑关系复杂、新闻压缩表达明显、适合精读训练的完整原句
- 不要选择短句、问候语、标题或无分析价值的简单句
- en 字段必须来自逐字稿原文，不要改写
- cn、structure、analysis 要简洁但有教学价值"""
    result = call_deepseek_messages(
        [
            {'role': 'system', 'content': '你是专业新闻英语长难句分析老师，只输出合法 JSON。'},
            {'role': 'user', 'content': prompt},
        ],
        max_tokens=DEEPSEEK_MAX_TOKENS,
    )
    items = result.get('sentences') or []
    if not isinstance(items, list):
        return []
    return items


def normalize_vocab_taxonomy(data: dict) -> bool:
    changed = False
    for item in data.get('vocabulary') or []:
        if not isinstance(item, dict):
            continue
        usage = sanitize(str(item.get('usage') or ''))
        difficulty = sanitize(str(item.get('difficulty') or ''))
        domain = sanitize(str(item.get('domain') or ''))
        level = sanitize(str(item.get('level') or ''))
        normalized_level = ' · '.join([part for part in [usage, difficulty] if part])
        if normalized_level and level != normalized_level:
            item['level'] = normalized_level
            changed = True
        if usage and item.get('usage') != usage:
            item['usage'] = usage
            changed = True
        if difficulty and item.get('difficulty') != difficulty:
            item['difficulty'] = difficulty
            changed = True
        if domain and item.get('domain') != domain:
            item['domain'] = domain
            changed = True
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


def clean_transcript_noise(text: str) -> str:
    text = sanitize(text)
    text = re.sub(r'CNN\.com\s*-\s*Transcripts.*?(?=\[\d{2}:\d{2}:\d{2}\]|[A-Z][A-Z\s\.\-]+:)', '', text, flags=re.S)
    text = re.sub(r'Transcript Providers Return to Transcripts main page', '', text, flags=re.I)
    text = re.sub(r'Aired\s+\d[^[]+?THIS IS A RUSH TRANSCRIPT\.\s*THIS COPY MAY NOT BE IN ITS FINAL FORM AND MAY BE UPDATED\.', '', text, flags=re.I)
    text = re.sub(r'\[\d{2}:\d{2}:\d{2}\]\s*', '', text)
    text = re.sub(r'\((?:BEGIN|END) VIDEO CLIP\)|\(COMMERCIAL BREAK\)', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return sanitize(text)


def normalize_speaker(label: str) -> str:
    label = re.sub(r'\s+', ' ', label or '').strip(' :')
    if not label:
        return ''
    if label in {'ANCHOR', 'REPORTER'}:
        return ''
    if any(bad in label for bad in ['CNNSTATICSECTION', 'CNNENV', 'Transcript Providers']):
        return ''
    # Keep the speaker name, drop role/channel suffixes such as ", ANCHOR, CNN THIS MORNING".
    first = label.split(',')[0].strip()
    if len(first) < 3 or len(first) > 36:
        return ''
    return first.title() if first.isupper() and first not in {'CNN', 'IDF'} else first


def chunk_paragraph_text(text: str, max_len: int = 520) -> list[str]:
    chunks = []
    text = sanitize(text)
    while len(text) > max_len:
        cut = text[:max_len].rfind('. ')
        if cut < 160:
            cut = text[:max_len].rfind(' ')
        if cut < 160:
            cut = max_len
        else:
            cut += 1
        chunks.append(text[:cut].strip())
        text = text[cut:].strip()
    if text:
        chunks.append(text)
    return chunks


SPEAKER_MARKER_RE = re.compile(
    r'(?P<speaker>[A-Z][A-Z\.\'’\-\s]{2,70}(?:,\s*[A-Z0-9\.\'’\-\s\(\)/]{2,60}){0,3}):\s*'
)


def split_transcript_text(text: str) -> list[dict]:
    text = clean_transcript_noise(text)
    paragraphs = []
    matches = list(SPEAKER_MARKER_RE.finditer(text))

    if not matches:
        return [{'speaker': '', 'text': chunk} for chunk in chunk_paragraph_text(text)]

    for i, m in enumerate(matches):
        speaker = normalize_speaker(m.group('speaker'))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = clean_transcript_noise(text[start:end])
        if not body or len(body) < 20:
            continue
        for chunk in chunk_paragraph_text(body):
            paragraphs.append({'speaker': speaker, 'text': chunk})

    return paragraphs


def normalize_paragraphs(data: dict) -> bool:
    changed = False
    paragraphs = data.get('paragraphs')

    if not paragraphs and data.get('transcript_highlights'):
        data['paragraphs'] = [
            {
                'speaker': normalize_speaker(item.get('speaker', '')),
                'text': sanitize(item.get('text', '')),
                'cn': sanitize(item.get('cn', '')),
            }
            for item in data.get('transcript_highlights', [])
            if item.get('text')
        ]
        return True

    if not paragraphs:
        return False

    combined = ' '.join(str(p.get('text', '')) for p in paragraphs if p.get('text'))
    if 'CNN.com - Transcripts' in combined or 'CNNSTATICSECTION' in combined:
        existing_cn = {
            sanitize(p.get('text', '')): sanitize(p.get('cn', ''))
            for p in paragraphs
            if p.get('text') and p.get('cn')
        }
        cleaned = split_transcript_text(combined)
        for p in cleaned:
            if p['text'] in existing_cn:
                p['cn'] = existing_cn[p['text']]
        data['paragraphs'] = cleaned
        changed = True
    else:
        for p in paragraphs:
            old_speaker = p.get('speaker', '')
            new_speaker = normalize_speaker(old_speaker)
            if old_speaker != new_speaker:
                p['speaker'] = new_speaker
                changed = True
            clean_text = clean_transcript_noise(str(p.get('text', '')))
            if p.get('text') != clean_text:
                p['text'] = clean_text
                changed = True

    return changed


def extract_paragraphs(segments_data: list[dict]) -> list[dict]:
    """
    把文稿拆成段落列表，识别说话人标签
    格式: [{"speaker": "Audie Cornish", "text": "..."}]；无可靠说话人时 speaker 为空
    """
    combined = '\n\n'.join(seg.get('text', '') for seg in segments_data)
    return split_transcript_text(combined)


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
      "usage": "日常表达/新闻常用/专业术语/固定搭配/专名背景",
      "difficulty": "基础/进阶/高阶",
      "domain": "通用/政治外交/军事安全/法律司法/经济金融/科技医疗/社会民生/文化体育/灾害环境",
      "level": "usage · difficulty，例如：新闻常用 · 进阶",
      "cn": "中文释义（含搭配）",
      "en": "英文释义",
      "excerpt": "包含该词的原文片段（10-20词，用于高亮定位，单引号代替双引号）",
      "example_cn": "该片段中文翻译"
    }}
  ],

  "sentences": [],

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
- vocabulary：按全文实际难词/重点短语抽取，不硬凑，最多{MAX_VOCAB_ITEMS}个；优先选择影响理解的新闻词、学术词、高频短语、固定搭配、熟词僻义和语境关键词；excerpt字段必须是文稿中真实存在的原文片段
- vocabulary 不要使用四级、六级、考研、专四、专八等考试标签；必须使用 usage、difficulty、domain 三类标签。difficulty 规则：基础=日常高频但在语境中值得掌握；进阶=新闻/抽象表达常见但非日常口语；高阶=专业术语、政策法律金融军事等领域词或低频高信息量表达
- sentences：本次主 JSON 固定输出空数组 []，不要在这里生成长难句
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
            'max_tokens': DEEPSEEK_MAX_TOKENS,
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


def call_deepseek_messages(messages: list[dict], max_tokens: int = 4096) -> dict:
    if not DEEPSEEK_API_KEY:
        raise RuntimeError('DEEPSEEK_API_KEY 未设置')
    resp = requests.post(
        DEEPSEEK_URL,
        headers={'Authorization': f'Bearer {DEEPSEEK_API_KEY}', 'Content-Type': 'application/json'},
        json={
            'model': 'deepseek-chat',
            'max_tokens': max_tokens,
            'temperature': 0.1,
            'response_format': {'type': 'json_object'},
            'messages': messages,
        },
        timeout=120
    )
    resp.raise_for_status()
    return parse_json_robust(resp.json()['choices'][0]['message']['content'])


def ensure_paragraph_translations(data: dict) -> bool:
    paragraphs = data.get('paragraphs') or []
    missing = [
        (i, p.get('text', '').strip())
        for i, p in enumerate(paragraphs)
        if p.get('text') and not p.get('cn')
    ]
    if not missing:
        return False
    if not DEEPSEEK_API_KEY:
        print('      DeepSeek 未配置，跳过段落翻译补齐')
        return False

    print(f'      补齐段落翻译：{len(missing)} 段')
    changed = False
    for offset in range(0, len(missing), 10):
        chunk = missing[offset:offset + 10]
        payload = [{'index': i, 'text': text} for i, text in chunk]
        prompt = (
            '请把以下 CNN 英文段落翻译成自然、准确的中文。'
            '保留新闻事实，不添加解释。只输出 JSON：{"items":[{"index":数字,"cn":"中文翻译"}]}。\n\n'
            + json.dumps(payload, ensure_ascii=False)
        )
        result = call_deepseek_messages([
            {'role': 'system', 'content': '你是严谨的新闻英语翻译助手，只输出合法 JSON。'},
            {'role': 'user', 'content': prompt},
        ])
        for item in result.get('items', []):
            try:
                idx = int(item.get('index'))
            except (TypeError, ValueError):
                continue
            cn = sanitize(item.get('cn', ''))
            if 0 <= idx < len(paragraphs) and cn:
                paragraphs[idx]['cn'] = cn
                changed = True
    return changed


def normalize_and_enrich_existing(data: dict) -> bool:
    changed = normalize_paragraphs(data)
    changed = enforce_study_item_limits(data) or changed
    changed = normalize_vocab_taxonomy(data) or changed
    changed = ensure_paragraph_translations(data) or changed
    return changed


# ── 主流程 ────────────────────────────────────────────────────
def main():
    print('\n=== CNN精读生成器 v4 ===')

    requested_date = get_target_date()
    force_regenerate = should_force_regenerate()
    if force_regenerate:
        print('  FORCE_REGENERATE 已启用，将忽略现有 JSON 缓存')

    out_path = OUTPUT_DIR / f'{requested_date}.json'
    if out_path.exists() and not force_regenerate:
        print(f'✓ 缓存已存在：{out_path}')
        data = json.loads(out_path.read_text(encoding='utf-8'))
        changed = normalize_and_enrich_existing(data)
        changed = ensure_all_audio(data, requested_date) or changed
        if changed:
            out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'✓ 已补齐缓存数据：{out_path}')
        return

    print(f'\n[1/3] 查找有效文稿（从 {requested_date} 开始）...')
    actual_date = find_available_date(requested_date, max_lookback=7)

    out_path = OUTPUT_DIR / f'{actual_date}.json'
    if out_path.exists() and not force_regenerate:
        print(f'✓ {actual_date} 缓存已存在')
        data = json.loads(out_path.read_text(encoding='utf-8'))
        changed = normalize_and_enrich_existing(data)
        changed = ensure_all_audio(data, actual_date) or changed
        if changed:
            out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'✓ 已补齐缓存数据：{out_path}')
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
    data['sentences']  = generate_sentence_items(full_text)
    enforce_study_item_limits(data)
    assert_generated_sentence_count(data)
    normalize_vocab_taxonomy(data)
    ensure_paragraph_translations(data)
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
