"""Make an 'Added to #Synthfam' Instagram Story card (1080x1920).
Usage: python3 synthfam_card.py COVER.jpg "Artist" "Track" OUT.jpg [LOGO.png]"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
cover, artist, track, out = sys.argv[1:5]
logo = sys.argv[5] if len(sys.argv) > 5 else None
W, H = 1080, 1920
NAVY, PINK, CYAN, WHITE = (7, 6, 26), (255, 47, 168), (63, 208, 255), (255, 255, 255)
B = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
M = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
art = Image.open(cover).convert("RGB")
bg = art.resize((W, W)).resize((W, H)).filter(ImageFilter.GaussianBlur(60))
bg = Image.blend(bg, Image.new("RGB", (W, H), NAVY), 0.72)
d = ImageDraw.Draw(bg)
def c(t, y, f, col):
    d.text(((W - d.textlength(t, font=f)) / 2, y), t, font=f, fill=col)
def fit(t, size, maxw):
    while size > 30:
        f = ImageFont.truetype(B, size)
        if d.textlength(t, font=f) <= maxw: return f
        size -= 4
    return ImageFont.truetype(B, size)
c("JUST ADDED TO", 180, ImageFont.truetype(M, 46), CYAN)
c("#SYNTHFAM", 240, ImageFont.truetype(B, 150), PINK)
S = 760; x = (W - S) // 2; y = 470
d.rounded_rectangle([x - 10, y - 10, x + S + 10, y + S + 10], 28, fill=PINK)
bg.paste(art.resize((S, S)), (x, y))
c(artist, 1290, fit(artist, 84, 960), WHITE)
c(track, 1395, fit(track, 58, 960), (220, 220, 235))
d.rounded_rectangle([170, 1540, 910, 1650], 55, fill=PINK)
c("FOLLOW ON SPOTIFY", 1563, ImageFont.truetype(B, 50), WHITE)
c("Darkwave · Synthwave · Alternative Electronic", 1690, ImageFont.truetype(M, 30), CYAN)
if logo:
    L = Image.open(logo).convert("RGBA").resize((110, 110))
    bg.paste(L, ((W - 110) // 2, 1770), L)
bg.save(out, quality=92)
