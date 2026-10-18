# Per-page SEO: description + canonical + Open Graph/Twitter. Used by build.py and for index.html.
BASE = 'https://retroreverbrecords.com/'
DESC = {
 'index': 'Retro Reverb Records: synthwave, darksynth and retrowave label and artist community since 2018. Release on Bandcamp and streaming, keep 100% of your royalties.',
 'agreement': 'The RRR Member Agreement: what Retro Reverb Records members agree to, in one place, with links to the full terms and policies.',
 'book': 'Book a Bandcamp or streaming release, social media post, YouTube premiere, merch listing or radio slot with Retro Reverb Records.',
 'card-maker': 'Make your own Synth Stars card: the RRR collectable tarot-style card for synthwave artists.',
 'cards': 'Synth Stars: collectable tarot-style cards of Retro Reverb Records artists, released in seasons of 52. Every artist member gets a free digital card.',
 'code-of-conduct': 'The Retro Reverb Records Code of Conduct: how members treat each other, and what happens if someone breaks the rules.',
 'dispute': 'Think your release was wrongly flagged as AI-generated? Ask Retro Reverb Records for a human review here.',
 'editorial': 'RRR editorial guides: how to get Bandcamp and streaming editorial attention for your synthwave release, with real deadlines.',
 'feedback': 'Tell Retro Reverb Records what works, what is broken and what you would like next. Every message is read.',
 'history': 'The story of Retro Reverb Records since 2018: synthwave releases, cassettes, vinyl, The Bandcamp Hour and the artists who built it.',
 'how-it-works': 'How RRR works: join, release on Bandcamp and streaming under the Retro Reverb Records name, promote with the community and keep 100% of your royalties.',
 'levels': 'RRR Levels: earn points and karate-style belts for supporting other synthwave artists, coming to live shows and growing the community.',
 'live': 'The Bandcamp Hour: new synthwave and electronic music from Bandcamp, hosted by Cybertronix and Eden Future on Spectrum On Air. Sundays 3pm UK.',
 'member': 'Your Retro Reverb Records member dashboard: releases, bookings, points and deadlines.',
 'press': 'Reviews, interviews and features about Retro Reverb Records artists, approved and collected on the RRR press wall.',
 'privacy': 'Retro Reverb Records privacy policy: what data we keep, why, for how long, and your rights under UK and EU law.',
 'refunds': 'Retro Reverb Records refund policy: membership, bookings and RRR Submit, including your 14-day right to withdraw.',
 'release-policy': 'The RRR release policy: deadlines, assets, Bandcamp and streaming rules, exclusivity and AI-generated music.',
 'series': 'RRR Series: hand-picked synthwave, darksynth and retrowave releases selected by Retro Reverb Records. Submit yours.',
 'services': 'Find mixing, mastering, production and artwork pros for your synthwave release, with reviews from real customers. Free listings for providers.',
 'submit': 'RRR Submit: send your synthwave track to radio shows, playlists and blogs. €1.50 per curator, a real listen and written feedback within 14 days.',
 'terms': 'Retro Reverb Records membership terms: prices, what is included, your rights, and how to cancel.',
 'together': 'Stronger Together: how Retro Reverb Records artists and fans support each other on Bandcamp, YouTube, Discord and live shows.',
 'news': 'What\'s on at Retro Reverb Records: open calls like the free Halloween compilation, new releases, premieres and community news.',
 'giveaway': 'Win 6 months of free Retro Reverb Records membership. Free to enter, winner spun live on The Bandcamp Hour on Sunday 25 October 2026.',
 'contact': 'Contact Retro Reverb Records, or request a refund: what can and can\'t be refunded, and a simple form.',
 'withdraw': 'Withdraw from your Retro Reverb Records contract within 14 days for a full refund, using this simple form.',
}
NOINDEX = {'member', 'body', 'hq', 'mod', 'linked', 'curator'}
def esc(s): return s.replace('&', '&amp;').replace('"', '&quot;')
def tags(name, title):
    d = DESC.get(name, DESC['index'])
    url = BASE + ('' if name == 'index' else name + '.html')
    t = esc(title)
    out = [f'<meta name="description" content="{esc(d)}">', f'<link rel="canonical" href="{url}">',
           '<meta property="og:type" content="website">', '<meta property="og:site_name" content="Retro Reverb Records">',
           f'<meta property="og:title" content="{t}">', f'<meta property="og:description" content="{esc(d)}">',
           f'<meta property="og:url" content="{url}">', f'<meta property="og:image" content="{BASE}assets/og-image.jpg">',
           '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
           '<meta name="twitter:card" content="summary_large_image">', '<meta name="twitter:site" content="@Reverb_Record">',
           f'<meta name="twitter:title" content="{t}">', f'<meta name="twitter:description" content="{esc(d)}">',
           f'<meta name="twitter:image" content="{BASE}assets/og-image.jpg">']
    return '\n'.join(out)
