#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --test tests/release-booking.test.cjs
python3 tests/test_release_tools.py
node tests/release-form.browser.cjs
node tests/artist-profile.browser.cjs
