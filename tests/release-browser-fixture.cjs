const { chromium } = require('playwright');
const { existsSync, readFileSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const root = join(__dirname, '..');
const fixtureOrigin = 'http://localhost:9137';

function openBrowser() {
  return chromium.launch({ executablePath: process.env.RRR_CHROMIUM || undefined });
}

function routeSite(url, route) {
  if (url.origin !== fixtureOrigin) return route.abort();
  const file = join(root, decodeURIComponent(url.pathname));
  if (relative(root, file).startsWith('..') || !existsSync(file) || !statSync(file).isFile()) return route.abort();
  if (url.pathname === '/assets/config.js') {
    return route.fulfill({ contentType: 'text/javascript', body: readFileSync(file, 'utf8') + `
      RRR_CONFIG.automationUrl = location.origin + "/mock";
      RRR_CONFIG.paypal.clientId = "";
      RRR_CONFIG.payments.paypalEmail = "sandbox@example.invalid";` });
  }
  return route.fulfill({ path: file });
}

module.exports = { openBrowser, routeSite };
