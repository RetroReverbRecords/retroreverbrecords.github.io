const { openBrowser, routeSite } = require('./release-browser-fixture.cjs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await openBrowser();
  try {
    const page = await browser.newPage();
    const token = 'a'.repeat(64);
    const profile = { artist: 'Original', email: 'artist@example.invalid', bandcamp: 'https://artist.bandcamp.com', routenote_account: '00057' };
    const calls = [];
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://localhost:9137') return route.abort();
      if (url.pathname === '/mock') {
        if (route.request().method() === 'GET') return route.fulfill({ json: { ok: true, free: true, full: [], member: true, memberFree: true } });
        const params = new URLSearchParams(route.request().postData());
        const action = params.get('form');
        calls.push(action);
        if (action === 'artist-profile-link') return route.fulfill({ json: { ok: true } });
        if (params.get('token') !== token) return route.fulfill({ json: { ok: false, error: 'This link has expired.' } });
        if (action === 'artist-profile-read') return route.fulfill({ json: { ok: true, profile } });
        profile.artist = params.get('artist');
        assert.equal(params.has('email'), false);
        return route.fulfill({ json: { ok: true } });
      }
      return routeSite(url, route);
    });
    await page.goto('http://localhost:9137/artist-profile.html');
    await page.locator('#profile-link [name=email]').fill(profile.email);
    await page.getByRole('button', { name: 'Email my profile link' }).click();
    await page.getByText(/If this email is registered/).waitFor();
    await page.goto('http://localhost:9137/artist-profile.html#invalid');
    await page.reload();
    await page.getByText('This link has expired.').waitFor();
    assert.equal(await page.locator('#profile-edit').isVisible(), false);
    await page.goto('http://localhost:9137/artist-profile.html#' + token);
    await page.reload();
    await page.locator('#profile-edit').waitFor();
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(await page.locator('#profile-edit [name=email]').getAttribute('readonly'), '');
    await page.locator('#profile-edit [name=artist]').fill('Updated Artist');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await page.getByText('Artist profile saved.').waitFor();
    await page.getByRole('button', { name: 'Use saved details for a release' }).click();
    await page.getByText('Saved artist details loaded.').waitFor();
    assert.equal(await page.locator('[data-release-intake] [name=artist]').inputValue(), 'Updated Artist');
    assert.equal(await page.locator('[data-release-intake] [name=email]').inputValue(), profile.email);
    assert.equal(await page.locator('[data-release-intake] [name=bandcamp]').inputValue(), profile.bandcamp);
    await page.locator('[data-release-intake] [name=destination]').selectOption('streaming');
    assert.equal(await page.locator('[data-release-intake] [name=routenote_account]').inputValue(), '00057');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('rrr-release-profile-once')), null);
    assert.deepEqual(calls, ['artist-profile-link', 'artist-profile-read', 'artist-profile-read', 'artist-profile-save', 'artist-profile-read']);
    console.log('Profile request, expiry, edit, and booking prefill browser checks passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
