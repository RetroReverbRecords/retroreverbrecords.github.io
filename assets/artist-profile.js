(function () {
  'use strict';
  const config = window.RRR_CONFIG || {};
  const endpoint = config.automationUrl || config.formEndpoint;
  const sessionKey = 'rrr-release-profile-once';

  async function profileRequest(action, fields) {
    if (!endpoint) throw new Error('Profile service is unavailable.');
    const body = new URLSearchParams(fields);
    body.set('form', 'artist-profile-' + action);
    const response = await fetch(endpoint, { method: 'POST', body, cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Profile service is unavailable. Please try again.');
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Please try again.');
    return result;
  }

  const link = document.getElementById('profile-link');
  if (!link) {
    const release = document.querySelector('[data-release-intake]');
    if (!release || location.hash !== '#release') return;
    let token;
    try {
      token = sessionStorage.getItem(sessionKey);
      sessionStorage.removeItem(sessionKey);
    } catch { return; }
    if (!token) return;
    const status = document.getElementById('release-profile-status');
    const edited = new Set();
    release.addEventListener('input', event => { if (event.isTrusted) edited.add(event.target.name); });
    profileRequest('read', { token }).then(({ profile }) => {
      for (const key of ['artist', 'email', 'bandcamp', 'routenote_account']) {
        const field = release.elements.namedItem(key);
        if (!edited.has(key)) {
          field.value = profile[key] || '';
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      status.textContent = 'Saved artist details loaded. Review them before submitting.';
    }).catch(error => { status.textContent = error.message; });
    return;
  }

  const edit = document.getElementById('profile-edit');
  const status = document.getElementById('profile-status');
  let token = location.hash.slice(1);
  if (token) history.replaceState(null, '', location.pathname + location.search);

  link.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    status.textContent = 'Requesting your link…';
    try {
      await profileRequest('link', { email: link.elements.email.value.trim() });
      status.textContent = 'If this email is registered to an RRR artist, a private profile link will arrive by email.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });

  edit.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    status.textContent = 'Saving…';
    const fields = new FormData(edit);
    fields.delete('email');
    fields.set('token', token);
    try {
      await profileRequest('save', fields);
      status.textContent = 'Artist profile saved.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });

  document.getElementById('profile-book').addEventListener('click', () => {
    try {
      sessionStorage.setItem(sessionKey, token);
      location.href = 'book.html#release';
    } catch { status.textContent = 'Your browser blocked profile transfer. You can enter the details on the Book page.'; }
  });

  document.getElementById('profile-close').addEventListener('click', () => {
    token = '';
    edit.reset();
    edit.hidden = true;
    link.hidden = false;
    status.textContent = 'Profile closed.';
  });

  if (token) {
    link.hidden = true;
    status.textContent = 'Opening your artist profile…';
    profileRequest('read', { token }).then(({ profile }) => {
      for (const [key, value] of Object.entries(profile)) {
        const field = edit.elements.namedItem(key);
        if (field) field.value = value;
      }
      status.textContent = '';
      edit.hidden = false;
    }).catch(error => {
      token = '';
      link.hidden = false;
      status.textContent = error.message;
    });
  }
})();
