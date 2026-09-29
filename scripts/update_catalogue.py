"""Reads the RRR Bandcamp label page and writes assets/catalogue.json:
latest releases (with cover art) and physical merch in stock (with photos, prices).
Runs daily on GitHub (see .github/workflows/catalogue.yml). No keys needed."""
import html, json, re, sys, urllib.request, datetime, os

LABEL = "https://retroreverbrecords.bandcamp.com"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "catalogue.json")
UA = {"User-Agent": "Mozilla/5.0 (RRR catalogue updater; +https://retroreverbrecords.github.io/)"}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "replace")

def absolute(u):
    u = html.unescape(u or "")
    return u if u.startswith("http") else LABEL + u

def text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def img_size(u, size):
    return re.sub(r"_\d+\.(jpg|png)$", f"_{size}.jpg", u) if u else ""

def releases():
    page = get(LABEL + "/music")
    out = []
    # Items beyond the first screen are listed as JSON on the grid
    m = re.search(r'data-client-items="([^"]+)"', page)
    extra = json.loads(html.unescape(m.group(1))) if m else []
    for li in re.findall(r'<li[^>]*class="[^"]*music-grid-item[^"]*"[^>]*>(.*?)</li>', page, re.S):
        a = re.search(r'<a href="([^"]+)"', li)
        img = re.search(r'<img[^>]+(?:data-original|src)="(https://f4\.bcbits\.com/img/[^"]+)"', li)
        t = re.search(r'<p class="title">(.*?)</p>', li, re.S)
        if not (a and t):
            continue
        art = re.search(r'<span class="artist-override">(.*?)</span>', t.group(1), re.S)
        title = text(re.sub(r'<span class="artist-override">.*?</span>', "", t.group(1), flags=re.S))
        out.append({"title": title, "artist": text(art.group(1)) if art else "Retro Reverb Records",
                    "url": absolute(a.group(1)).split("?")[0], "image": img_size(img.group(1), 16) if img else ""})
    for it in extra:
        url = absolute(it.get("page_url", "")).split("?")[0]
        if any(r["url"] == url for r in out):
            continue
        art_id = it.get("art_id")
        out.append({"title": it.get("title", ""), "artist": it.get("artist") or it.get("band_name") or "Retro Reverb Records",
                    "url": url, "image": f"https://f4.bcbits.com/img/a{art_id:010d}_16.jpg" if art_id else ""})
    return out[:24]

TYPES = [("minidisc", "MiniDisc"), ("vinyl", "Vinyl"), ("lp", "Vinyl"), ("cassette", "Cassette"), ("tape", "Cassette"),
         ("cd", "CD"), ("t-shirt", "T-shirt"), ("shirt", "T-shirt"), ("hoodie", "Hoodie"), ("bundle", "Bundle"),
         ("poster", "Poster"), ("sticker", "Stickers"), ("pin", "Pin"), ("booklet", "Booklet")]

def guess_type(t):
    low = " " + t.lower() + " "
    for key, name in TYPES:
        if re.search(r"[^a-z]" + re.escape(key) + r"[^a-z]", low):
            return name
    return "Merch"

def clean_title(t):
    # Bandcamp merch titles look like "Release – Artist – Item description"; keep the release name
    first = re.split(r"\s+[–-]\s+", t)[0].strip()
    return first or t

def merch():
    page = get(LABEL + "/merch")
    out = []
    for li in re.findall(r'<li[^>]*class="[^"]*merch-grid-item[^"]*"[^>]*>(.*?)</li>', page, re.S):
        if re.search(r'sold[- ]out', li, re.I):
            continue
        a = re.search(r'<a href="([^"]+)"', li)
        img = re.search(r'<img[^>]+(?:data-original|src)="(https://f4\.bcbits\.com/img/[^"]+)"', li)
        t = re.search(r'<p class="title[^"]*">(.*?)</p>', li, re.S)
        price = re.search(r'<span class="price[^"]*">(.*?)</span>', li, re.S)
        kind = re.search(r'<span class="merchtype[^"]*">(.*?)</span>', li, re.S)
        if not (a and t):
            continue
        full = text(t.group(1))
        out.append({"title": clean_title(full), "type": text(kind.group(1)) if kind else guess_type(full),
                    "price": text(price.group(1)) if price else "", "url": absolute(a.group(1)).split("?")[0],
                    "image": img_size(img.group(1), 16) if img else ""})
    return out[:24]

def main():
    old = {}
    if os.path.exists(OUT):
        with open(OUT) as f:
            old = json.load(f)
    data = {"updated": datetime.date.today().isoformat(), "source": LABEL, "releases": [], "merch": []}
    for key, fn in (("releases", releases), ("merch", merch)):
        try:
            data[key] = fn()
        except Exception as e:  # keep yesterday's data if Bandcamp is unreachable
            print(f"{key}: {e}", file=sys.stderr)
            data[key] = old.get(key, [])
    if not data["releases"] and not data["merch"]:
        print("Nothing found; leaving catalogue unchanged", file=sys.stderr)
        return
    with open(OUT, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"{len(data['releases'])} releases, {len(data['merch'])} merch items")

if __name__ == "__main__":
    main()
