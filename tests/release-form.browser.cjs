const { openBrowser, routeSite } = require('./release-browser-fixture.cjs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await openBrowser();
  try {
    for (const destination of ['bandcamp', 'streaming', 'both']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 840 } });
      const submissions = [];
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'http://localhost:9137') return route.abort();
        if (url.pathname === '/mock') {
          const q = url.searchParams;
          if (route.request().method() === 'POST') {
            submissions.push(new URLSearchParams(route.request().postData()));
            return route.fulfill({ body: 'ok' });
          }
          if (q.has('release_checkout')) {
            return route.fulfill({ json: { ready: submissions.at(-1)?.get('booking_id') === q.get('release_checkout') &&
              q.get('amount') === '5.5' } });
          }
          if (q.has('isfounder')) {
            assert.ok(['bandcamp-release', 'streaming-release'].includes(q.get('kind')));
            return route.fulfill({ json: { member: destination === 'streaming', memberFree: destination === 'streaming' } });
          }
          return route.fulfill({ json: { ok: true, free: true, full: [] } });
        }
        return routeSite(url, route);
      });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://localhost:9137/book.html#' + (destination === 'streaming' ? 'streaming' : 'bandcamp'), { waitUntil: 'domcontentloaded' });
      const form = page.locator('[data-release-intake]');
      await form.waitFor();
      const fill = (name, value) => form.locator('[name=' + name + ']').fill(value);
      const select = (name, value) => form.locator('[name=' + name + ']').selectOption(value);
      const date = new Date(Date.now() + 70 * 86400000).toISOString().slice(0, 10);
      assert.equal(await form.locator('[name=destination]').inputValue(), destination === 'streaming' ? 'streaming' : 'bandcamp');
      await fill('artist', 'Staging Artist');
      await select('destination', 'both');
      await fill('routenote_account', 'RN-TEST');
      await fill('bandcamp_tags', 'synthwave');
      await select('destination', destination);
      assert.equal(await form.locator('[name=artist]').inputValue(), 'Staging Artist');
      assert.equal(await form.locator('[data-bandcamp-fields]').isVisible(), destination !== 'streaming');
      assert.equal(await form.locator('[data-streaming-fields]').isVisible(), destination !== 'bandcamp');
      await fill('email', 'artist@example.invalid');
      await fill('title', 'Test release');
      await form.locator('[name=genre]').selectOption({ index: 1 });
      await select('format', 'ep');
      await fill('release_date', date);
      await fill('copyright_owner', 'Staging Artist');
      await fill('copyright_year', '2026');
      await select('previously_released', 'yes');
      await fill('upc', '012345678905');
      await fill('assets_link', 'https://example.invalid/private-review');

      const track = index => form.locator('.release-track').nth(index);
      const trackField = (index, name) => track(index).locator('[data-track-field=' + name + ']');
      await trackField(0, 'title').fill('First');
      await trackField(0, 'language').fill('English');
      await trackField(0, 'explicit').selectOption('no');
      await trackField(0, 'isrc').fill('GBTEST000001');
      await form.getByRole('button', { name: 'Add track' }).click();
      await trackField(1, 'title').fill('Second');
      await trackField(1, 'language').fill('Instrumental');
      await trackField(1, 'explicit').selectOption('no');
      await track(1).getByRole('button', { name: 'Move up' }).click();
      assert.equal(await trackField(0, 'title').inputValue(), 'Second');
      if (destination !== 'streaming') {
        await form.locator('[name=upload_by][value=rrr]').check();
        await form.locator('[name=agree]').check();
      }
      if (destination !== 'bandcamp') {
        await select('artwork_logo', 'no');
        await form.locator('[name=streaming_agree]').check();
      }
      for (const name of ['collaborators_agreed', 'start_now']) await form.locator('[name=' + name + ']').check();
      await form.locator('[name=ai_use][value=assisted]').check();
      await form.locator('[data-ai-details]').waitFor();
      await fill('ai_tools', 'Synthetic tool');
      await fill('ai_elements', 'Helped with arrangement');
      await fill('ai_artist_work', 'Wrote and recorded the track');
      if (destination !== 'both') {
        await form.locator('[name=ai_use][value=none]').check();
        assert.equal(await form.locator('[data-ai-details]').isVisible(), false);
      }
      if (destination !== 'streaming') await form.locator('[name=payg_terms]').check();
      await form.getByRole('button', { name: 'Submit release request' }).click();
      await form.getByText('Release request sent').waitFor({ timeout: 10000 });
      assert.equal(submissions.length, 1);
      const data = submissions[0];
      assert.equal(data.get('ai_declaration_version'), '2');
      assert.equal(data.has('ai_tools'), destination === 'both');
      const sent = JSON.parse(data.get('release_tracks'));
      assert.deepEqual(sent.map(track => track.title), ['Second', 'First']);
      assert.equal(sent[1].isrc, 'GBTEST000001');
      assert.equal(data.get('form'), destination === 'streaming' ? 'streaming-release' : 'bandcamp-release');
      assert.equal(data.has('bandcamp_tags'), destination !== 'streaming');
      assert.equal(data.has('routenote_account'), destination !== 'bandcamp');
      assert.equal(data.has('also_streaming'), destination === 'both');
      assert.equal(data.has('booking_id'), destination !== 'streaming');
      assert.equal(data.has('member_free'), destination === 'streaming');
      if (destination !== 'streaming') await form.getByRole('link', { name: /Pay €5.50/ }).waitFor();
      assert.deepEqual(errors, []);
      await form.getByRole('button', { name: 'Book something else' }).click();
      assert.equal(await form.locator('.release-track').count(), 1);
      await page.locator('[role=tab][data-panel=social]').click();
      await page.locator('form[data-kind=social-post]').waitFor();
      console.log(destination + ' browser check passed');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
