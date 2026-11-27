import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"


def run_tool(name, *args):
    return subprocess.run([sys.executable, SCRIPTS / name, *args], capture_output=True, text=True, timeout=30)


class ReleaseToolsTest(unittest.TestCase):
    def setUp(self):
        work = tempfile.TemporaryDirectory()
        self.addCleanup(work.cleanup)
        self.root = Path(work.name)
        self.assets = self.root / "assets"
        self.assets.mkdir()

    def test_zip_contains_assets_and_private_checklist(self):
        details = self.root / "details.json"
        details.write_text(json.dumps({
            "title": "Synthetic release", "destination": "both",
            "assets_link": "https://example.invalid/private",
            "release_tracks": [{"title": "Opening", "position": 1}],
        }), encoding="utf-8")
        (self.assets / "lyrics.txt").write_text("Synthetic lyrics", encoding="utf-8")
        (self.assets / ".hidden").write_text("Hidden file", encoding="utf-8")
        output = self.root / "release.zip"
        args = (details, self.assets, output)
        result = run_tool("release_package.py", *args)
        self.assertEqual(result.returncode, 0, result.stderr)
        with ZipFile(output) as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(set(archive.namelist()), {
                "release.json", "delivery-checklist.txt", "assets/lyrics.txt",
            })
            self.assertEqual(archive.read("assets/lyrics.txt"), b"Synthetic lyrics")
            self.assertNotIn("assets_link", json.loads(archive.read("release.json")))
            checklist = archive.read("delivery-checklist.txt")
            self.assertIn(b"RouteNote", checklist)
            self.assertIn(b"Bandcamp", checklist)
        original = output.read_bytes()
        self.assertNotEqual(run_tool("release_package.py", *args).returncode, 0)
        self.assertEqual(output.read_bytes(), original)

    def test_audio_reports_signal_and_rejects_a_corrupt_file(self):
        wav = self.assets / "track.wav"
        mp3 = self.assets / "track.mp3"
        subprocess.run(["ffmpeg", "-v", "error",
                        "-f", "lavfi", "-i", "sine=frequency=440:duration=2:sample_rate=48000",
                        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono:d=4",
                        "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1",
                        "-c:a", "pcm_s24le", str(wav)], check=True, timeout=30)
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-b:a", "320k", str(mp3)],
                       check=True, timeout=30)
        corrupt = self.root / "broken.wav"
        corrupt.write_bytes(b"broken audio")
        result = run_tool("release_audio.py", wav, mp3, corrupt)
        self.assertEqual(result.returncode, 1, result.stderr)
        pcm, lossy, broken = json.loads(result.stdout)
        self.assertEqual(pcm["decode"], "passed")
        self.assertEqual(pcm["bit_depth"], 24)
        self.assertEqual(pcm["sample_rate_hz"], 48000)
        self.assertEqual(pcm["channels"], 1)
        self.assertAlmostEqual(pcm["duration_seconds"], 6)
        self.assertIsNotNone(pcm["integrated_lufs"])
        self.assertIsNotNone(pcm["sample_peak_dbfs"])
        self.assertIsNotNone(pcm["true_peak_dbtp"])
        self.assertEqual(len(pcm["silences_at_least_3s_below_minus_60db"]), 1)
        self.assertEqual(lossy["codec"], "mp3")
        self.assertEqual(lossy["stream_bitrate_bps"], 320000)
        self.assertEqual(broken["decode"], "failed")


if __name__ == "__main__":
    unittest.main()
