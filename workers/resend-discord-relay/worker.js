/**
 * Resend -> Discord webhook relay
 *
 * Receives Resend webhook events, reshapes them into a Discord embed,
 * and forwards them to a Discord channel webhook.
 *
 * Required secret:
 *   DISCORD_WEBHOOK_URL      - your Discord channel webhook URL
 *
 * Optional secret (recommended):
 *   RESEND_WEBHOOK_SECRET    - the "Signing Secret" shown in Resend's
 *                              webhook settings (starts with "whsec_").
 *                              If set, requests are verified using
 *                              Resend's Svix-based signature scheme.
 *                              If unset, signature checking is skipped.
 */

// Map Resend event types to a label + Discord embed color (decimal)
const EVENT_STYLES = {
  "email.sent":            { label: "Email Sent",            color: 0x5865F2 }, // blurple
  "email.delivered":       { label: "Email Delivered",       color: 0x57F287 }, // green
  "email.delivery_delayed":{ label: "Delivery Delayed",      color: 0xFEE75C }, // yellow
  "email.complained":      { label: "Spam Complaint",        color: 0xED4245 }, // red
  "email.bounced":         { label: "Email Bounced",         color: 0xED4245 }, // red
  "email.opened":          { label: "Email Opened",          color: 0x57F287 }, // green
  "email.clicked":         { label: "Link Clicked",          color: 0x57F287 }, // green
  "email.failed":          { label: "Send Failed",           color: 0xED4245 }, // red
};

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!env.DISCORD_WEBHOOK_URL) {
      return new Response("Server misconfigured: DISCORD_WEBHOOK_URL not set", { status: 500 });
    }

    // Read the raw body first — signature verification needs the exact bytes,
    // not a re-serialized JSON object.
    const rawBody = await request.text();

    if (env.RESEND_WEBHOOK_SECRET) {
      const valid = await verifySvixSignature(request, rawBody, env.RESEND_WEBHOOK_SECRET);
      if (!valid) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const discordPayload = buildDiscordPayload(payload);

    const discordResp = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!discordResp.ok) {
      const text = await discordResp.text();
      return new Response(`Discord rejected the message: ${discordResp.status} ${text}`, { status: 502 });
    }

    return new Response("OK", { status: 200 });
  },
};

/**
 * Turns a Resend webhook payload into a Discord webhook body with one embed.
 */
function buildDiscordPayload(payload) {
  const { type = "unknown", data = {}, created_at } = payload;
  const style = EVENT_STYLES[type] || { label: type, color: 0x99AAB5 }; // grey fallback

  const fields = [];

  if (data.subject) {
    fields.push({ name: "Subject", value: truncate(data.subject, 256), inline: false });
  }
  if (data.from) {
    fields.push({ name: "From", value: truncate(data.from, 256), inline: true });
  }
  if (Array.isArray(data.to) && data.to.length) {
    fields.push({ name: "To", value: truncate(data.to.join(", "), 256), inline: true });
  }
  if (data.email_id) {
    fields.push({ name: "Email ID", value: `\`${data.email_id}\``, inline: false });
  }

  // Bounce-specific detail
  if (data.bounce) {
    const b = data.bounce;
    const bounceLines = [];
    if (b.type) bounceLines.push(`**Type:** ${b.type}${b.subType ? ` (${b.subType})` : ""}`);
    if (b.message) bounceLines.push(truncate(b.message, 500));
    if (bounceLines.length) {
      fields.push({ name: "Bounce Details", value: bounceLines.join("\n"), inline: false });
    }
  }

  // Click-specific detail
  if (data.click) {
    fields.push({ name: "Link Clicked", value: truncate(data.click.link || "", 256), inline: false });
  }

  return {
    username: "Resend",
    embeds: [
      {
        title: style.label,
        color: style.color,
        fields,
        timestamp: created_at || new Date().toISOString(),
        footer: { text: type },
      },
    ],
  };
}

function truncate(str, max) {
  if (!str) return str;
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

/**
 * Verifies a Svix-style webhook signature, as used by Resend.
 * Docs: https://resend.com/docs/dashboard/webhooks/verify-webhooks-signature
 *
 * Headers involved:
 *   svix-id, svix-timestamp, svix-signature
 * Signed content: `${svix-id}.${svix-timestamp}.${rawBody}`
 * Secret: base64 portion after "whsec_" prefix, HMAC-SHA256, base64-encoded.
 */
async function verifySvixSignature(request, rawBody, secret) {
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  const secretBytes = base64ToBytes(secret.replace(/^whsec_/, ""));
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expectedSig = bytesToBase64(new Uint8Array(sigBuffer));

  // svix-signature header can contain multiple space-separated "v1,<sig>" values
  const candidates = svixSignature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter(Boolean);

  return candidates.some((candidate) => timingSafeEqual(candidate, expectedSig));
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}