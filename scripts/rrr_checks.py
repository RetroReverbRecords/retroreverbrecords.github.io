#!/usr/bin/env python3
"""
RRR robot checks for release submissions: AI flag + basic sound checks.

Runs on GitHub Actions (free for this public repo). It:
  1. asks the RRR automation (Apps Script) for submissions that still need checking,
  2. downloads a preview of the audio (Bandcamp stream, Google Drive, Dropbox or a direct link),
  3. runs the open-source AI music detector (MIT licence, github.com/lofcz/ai-music-detector:
     Suno <= v5 / Udio <= v1.5 "fakeprint" model) and ffmpeg sound checks,
  4. sends the results back to the Sheet.

The AI result is only a FLAG. A human decides, or the artist declares AI use.
Nothing personal (names, links) is printed, because Actions logs of a public repo are public.

Env: AUTOMATION_URL, AI_CHECK_KEY (GitHub secret; same value as the Apps Script property AI_CHECK_KEY).
Local test: python scripts/rrr_checks.py --file song.mp3
"""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request
import numpy as np
from scipy.ndimage import minimum_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, 'models', 'ai_music_detector.onnx')
SR, N_FFT, MAX_SECONDS = 16000, 8192, 300
F_MIN, F_MAX, HULL, MAX_DB, MIN_DB = 1000, 8000, 10, 5, -45
UA = {'User-Agent': 'Mozilla/5.0 (RRR release checker)'}


# ---------- audio fetching ----------
def http_get(url, binary=True, limit=60_000_000):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read(limit)
    return data if binary else data.decode('utf-8', 'replace')


def resolve_audio_url(url):
    """Turn a submission link into a direct audio URL."""
    u = url.strip()
    if re.match(r'^https://[a-z0-9-]+\.bandcamp\.com/(album|track)/', u):
        html = http_get(u, binary=False)
        m = re.search(r'data-tralbum="([^"]+)"', html)
        if not m:
            raise ValueError('no streamable tracks on the Bandcamp page')
        tralbum = json.loads(m.group(1).replace('&quot;', '"').replace('&amp;', '&'))
        for t in tralbum.get('trackinfo', []):
            f = (t.get('file') or {}).get('mp3-128')
            if f:
                return f
        raise ValueError('Bandcamp page has no streaming preview (pre-order without preview?)')
    m = re.search(r'drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([A-Za-z0-9_-]+)', u)
    if m:
        return f'https://drive.usercontent.google.com/download?id={m.group(1)}&export=download&confirm=t'
    if 'dropbox.com' in u:
        return re.sub(r'([?&])dl=0', r'\1dl=1', u) if 'dl=0' in u else u + ('&' if '?' in u else '?') + 'dl=1'
    return u


def fetch_audio(url, folder):
    path = os.path.join(folder, 'audio')
    with open(path, 'wb') as f:
        f.write(http_get(resolve_audio_url(url)))
    return path


# ---------- decoding + checks ----------
def decode_16k_mono(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-t', str(MAX_SECONDS), '-ac', '1',
                          '-af', 'aresample=16000:resampler=soxr', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def fakeprint(x):
    """Same features as the detector's training (torchaudio Spectrogram: hann, hop n_fft//2, centre + reflect pad)."""
    pad = N_FFT // 2
    x = np.pad(x, (pad, pad), mode='reflect')
    hop = N_FFT // 2
    win = np.hanning(N_FFT + 1)[:-1].astype(np.float32)  # periodic Hann, like torch
    n = 1 + (len(x) - N_FFT) // hop
    frames = np.lib.stride_tricks.as_strided(x, shape=(n, N_FFT), strides=(x.strides[0] * hop, x.strides[0]))
    spec = np.abs(np.fft.rfft(frames * win, axis=1)) ** 2
    spec_db = 10 * np.log10(np.clip(spec, 1e-10, 1e6))
    mean = spec_db.mean(axis=0)
    freqs = np.linspace(0, SR / 2, N_FFT // 2 + 1)
    band = mean[(freqs >= F_MIN) & (freqs <= F_MAX)]
    hull = np.clip(minimum_filter1d(band, size=HULL, mode='nearest'), MIN_DB, None)
    res = np.clip(np.clip(band - hull, 0, None), 0, MAX_DB)
    return (res / (res.max() + 1e-6)).astype(np.float32)


_session = None
def ai_probability(x):
    global _session
    import onnxruntime as ort
    if _session is None:
        _session = ort.InferenceSession(MODEL)
    inp = _session.get_inputs()[0]
    fp = fakeprint(x)
    want = inp.shape[1]
    if len(fp) != want:
        fp = np.interp(np.linspace(0, 1, want), np.linspace(0, 1, len(fp)), fp).astype(np.float32)
    return float(_session.run(None, {inp.name: fp.reshape(1, -1)})[0][0, 0])


def sound_checks(path):
    """Loudness (LUFS), true peak, clipping and silence, from ffmpeg."""
    r = subprocess.run(['ffmpeg', '-v', 'info', '-nostats', '-i', path, '-t', str(MAX_SECONDS),
                        '-af', 'ebur128=peak=true,astats=metadata=0,silencedetect=n=-60dB:d=3', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    lufs = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)
    clips = [int(c) for c in re.findall(r'Number of samples clipped:\s*(\d+)', r)] if 'clipped' in r else []
    silences = re.findall(r'silence_duration: ([\d.]+)', r)
    out = {'lufs': float(lufs[-1]) if lufs else None, 'true_peak': float(tp[-1]) if tp else None,
           'long_silences': len(silences)}
    notes = []
    if out['lufs'] is not None:
        if out['lufs'] > -7: notes.append('very loud (over -7 LUFS)')
        elif out['lufs'] < -20: notes.append('very quiet (under -20 LUFS)')
    if out['true_peak'] is not None and out['true_peak'] > -0.1: notes.append('peaks at 0 dB: clipping risk')
    if silences: notes.append(f'{len(silences)} silence(s) over 3 s')
    out['notes'] = '; '.join(notes) or 'OK'
    return out


def check(url_or_path, is_file=False):
    with tempfile.TemporaryDirectory() as d:
        path = url_or_path if is_file else fetch_audio(url_or_path, d)
        x = decode_16k_mono(path)
        if len(x) < SR * 10:
            raise ValueError('audio shorter than 10 seconds')
        p = ai_probability(x)
        s = sound_checks(path)
    label = 'likely AI' if p >= 0.8 else 'possible AI' if p >= 0.5 else 'likely human'
    return {'ai_score': round(p, 3), 'ai_result': label, 'sound': s['notes'], 'lufs': s['lufs'], 'true_peak': s['true_peak']}


# ---------- talking to the RRR automation ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file'); ap.add_argument('--url')
    a = ap.parse_args()
    if a.file or a.url:
        print(json.dumps(check(a.file or a.url, is_file=bool(a.file)), indent=1)); return
    base, key = os.environ.get('AUTOMATION_URL', ''), os.environ.get('AI_CHECK_KEY', '')
    if not base or not key:
        print('AUTOMATION_URL or AI_CHECK_KEY not set: nothing to do.'); return
    sep = '&' if '?' in base else '?'
    queue = json.loads(http_get(f'{base}{sep}aiqueue=1&key={urllib.parse.quote(key)}', binary=False))
    items = queue.get('items', []) if queue.get('ok') else []
    print(f'{len(items)} submission(s) to check')
    done = 0
    for it in items:
        try:
            res = check(it['url'])
        except Exception as e:
            res = {'ai_score': '', 'ai_result': 'could not check: ' + str(e)[:120], 'sound': ''}
        body = urllib.parse.urlencode({'form': 'ai-result', 'key': key, 'sheet': it.get('sheet', 'Releases'), 'id': it['id'], **{k: '' if v is None else v for k, v in res.items()}}).encode()
        req = urllib.request.Request(base, data=body, headers=UA)
        urllib.request.urlopen(req, timeout=60).read()
        done += 1
    print(f'{done} result(s) sent')


if __name__ == '__main__':
    main()
