// Cloudflare Worker: mailing list signup -> Resend Contacts API
// (uses Resend's newer no-audience Contacts model)
//
// Env vars required (set as secrets, see README):
//   RESEND_API_KEY     - your Resend API key (re_xxxxxxxxx)
//   RESEND_SEGMENT_ID  - the segment UUID every website-form signup joins
//   ALLOWED_ORIGIN     - the origin allowed to call this worker,
//                        e.g. "https://yourusername.github.io"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(env),
    },
  });
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(env) });
      }

      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405, env);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400, env);
      }

      const { email, firstName, lastName } = body || {};

      if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
        return json({ error: "Invalid email" }, 400, env);
      }

      if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
        return json({ error: "First name is required" }, 400, env);
      }

      if (!lastName || typeof lastName !== "string" || !lastName.trim()) {
        return json({ error: "Last name is required" }, 400, env);
      }

      if (!env.RESEND_API_KEY) {
        return json({ error: "Server misconfigured: missing RESEND_API_KEY" }, 500, env);
      }

      if (!env.RESEND_SEGMENT_ID) {
        return json({ error: "Server misconfigured: missing RESEND_SEGMENT_ID" }, 500, env);
      }

      // --- Resend REST call ---
      // Swap this block out for the official Resend SDK if/when you add it
      // as a dependency (see README for the SDK-compatible version).
      const payload = {
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        unsubscribed: false,
        properties: { from_event: "website_form" },
        segments: [{ id: env.RESEND_SEGMENT_ID }],
      };

      let resendResp;
      try {
        resendResp = await fetch("https://api.resend.com/contacts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        return json({ error: "Failed to reach Resend" }, 502, env);
      }

      const data = await resendResp.json().catch(() => ({}));

      if (!resendResp.ok) {
        // Resend returns 409 if the contact already exists — treat that as
        // a soft success so repeat signups don't show an error to the user.
        if (resendResp.status === 409) {
          return json({ success: true, alreadySubscribed: true }, 200, env);
        }
        return json({ error: data.message || "Resend error" }, 400, env);
      }

      return json({ success: true, data }, 200, env);
    } catch (err) {
      // Catch-all so unexpected errors still return CORS-safe JSON
      // instead of an opaque failure the browser can't read.
      return json({ error: "Unexpected server error", detail: String(err) }, 500, env);
    }
  },
};