#!/usr/bin/env python3
"""Measure local release audio without network access or AI classification."""
import argparse
import json
import re
import subprocess
from pathlib import Path

AUDIO_FORMATS = "wav,mp3,flac,aiff,ogg,mov,m4a,aac,matroska,webm,caf,w64,opus"


def inspect_audio(path):
    path = path.resolve(strict=True)
    if not path.is_file():
        raise ValueError("Choose a local audio file.")
    # The protocol whitelist also prevents demuxers from fetching network references.
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-protocol_whitelist", "file", "-format_whitelist", AUDIO_FORMATS, "-select_streams", "a:0",
         "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True, check=True, timeout=60,
    )
    info = json.loads(probe.stdout)
    streams = info.get("streams", [])
    if not streams:
        raise ValueError("No audio stream found.")
    stream = streams[0]
    container = info.get("format", {})
    analysis = subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-loglevel", "info",
         "-xerror", "-protocol_whitelist", "file", "-format_whitelist", AUDIO_FORMATS, "-err_detect", "explode", "-i", str(path), "-map", "0:a:0",
         "-af", "ebur128=framelog=verbose:peak=sample+true,silencedetect=n=-60dB:d=3", "-f", "null", "-"],
        capture_output=True, text=True, check=True, timeout=600,
    ).stderr

    def metric(pattern):
        match = re.search(pattern, analysis.rsplit("Summary:", 1)[-1])
        if not match:
            return None
        return float(match[1])

    def positive_int(value):
        try:
            return int(value) if int(value) > 0 else None
        except (TypeError, ValueError):
            return None

    sample_peak = metric(r"Sample peak:\s*Peak:\s*(-?[\d.]+) dBFS")
    true_peak = metric(r"True peak:\s*Peak:\s*(-?[\d.]+) dBFS")
    duration = stream.get("duration") or container.get("duration")
    return {
        "decode": "passed",
        "container": container.get("format_name"),
        "codec": stream.get("codec_name"),
        "sample_rate_hz": positive_int(stream.get("sample_rate")),
        "stream_bitrate_bps": positive_int(stream.get("bit_rate")),
        "bit_depth": positive_int(stream.get("bits_per_raw_sample")) or positive_int(stream.get("bits_per_sample")),
        "duration_seconds": float(duration) if duration and duration != "N/A" else None,
        "channels": stream.get("channels"),
        "channel_layout": stream.get("channel_layout"),
        "integrated_lufs": metric(r"\bI:\s*(-?[\d.]+) LUFS"),
        "sample_peak_dbfs": sample_peak,
        "true_peak_dbtp": true_peak,
        "full_scale_or_overs": (sample_peak is not None and sample_peak >= 0) or
                               (true_peak is not None and true_peak >= 0),
        "silences_at_least_3s_below_minus_60db": [
            float(value) for value in re.findall(r"silence_duration: ([\d.]+)", analysis)
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", nargs="+", type=Path)
    args = parser.parse_args()
    reports = []
    for path in args.audio:
        try:
            reports.append({"file": path.name, **inspect_audio(path)})
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            reports.append({"file": path.name, "decode": "failed", "error": type(error).__name__})
    print(json.dumps(reports, indent=2))
    return int(any(report["decode"] == "failed" for report in reports))


if __name__ == "__main__":
    raise SystemExit(main())
