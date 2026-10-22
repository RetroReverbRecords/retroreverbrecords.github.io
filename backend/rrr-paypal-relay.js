// RRR PayPal relay (Cloudflare Worker).
// PayPal sends payment messages here. We answer "OK" straight away (what PayPal wants),
// then pass the message on to the RRR Apps Script, exactly as PayPal sent it.
const RRR = 'https://script.google.com/macros/s/AKfycbxuMic9BC8cBEvKvUcND7f5n364jceS0Ev2WUmDBmsshuorqFIcYokUsigfns0S2WHP/exec';

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') return new Response('RRR PayPal relay is running.', { status: 200 });
    const body = await request.text();
    ctx.waitUntil(fetch(RRR, {
      method: 'POST',
      headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/x-www-form-urlencoded' },
      body,
      redirect: 'follow'
    }).catch(() => {}));
    return new Response('OK', { status: 200 });
  }
};
