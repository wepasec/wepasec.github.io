// Cloudflare Worker: mailing list signup -> Resend Contacts API
//
// Env vars required:
//   RESEND_API_KEY     - your Resend API key (re_xxxxxxxxx)
//   RESEND_SEGMENT_ID  - the segment UUID every website-form signup joins
//   ALLOWED_ORIGIN     - the exact origin allowed to call this worker,
//                        e.g. "http://localhost:8080" in development
//                        or "https://yourusername.github.io" in production

const RESEND_CONTACTS_URL = "https://api.resend.com/contacts";

const MAX_BODY_BYTES = 10_000;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;
const RESEND_TIMEOUT_MS = 8_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ASCII control characters plus DEL.
// These aren't useful in names or emails and can cause downstream surprises.
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;

const ALLOWED_FIELDS = new Set([
  "email",
  "firstName",
  "lastName",
]);



/**
 * Return CORS headers for the configured origin.
 */
function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}



/**
 * Create a JSON response with defensive headers.
 */
function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...corsHeaders(env),
    },
  });
}



/**
 * Check whether a value is a plain JSON object.
 */
function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}



/**
 * Validate the configured origin.
 *
 * The environment variable is the source of truth for which origin is
 * allowed. This function only verifies that it is a syntactically valid
 * HTTP(S) origin.
 *
 * Examples:
 *   http://localhost:8080              -> valid
 *   https://yourusername.github.io     -> valid
 *
 * Examples rejected:
 *   https://example.com/path            -> invalid
 *   https://example.com?foo=bar        -> invalid
 *   not-an-origin                       -> invalid
 */
function isValidOrigin(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.origin === value &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}



/**
 * Validate a name after normalization.
 */
function isValidName(value) {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_NAME_LENGTH &&
    !CONTROL_CHARS_RE.test(value)
  );
}



/**
 * Normalize a name:
 * - remove surrounding whitespace
 * - normalize Unicode to NFC
 */
function normalizeName(value) {
  return value.trim().normalize("NFC");
}



/**
 * Normalize an email:
 * - remove surrounding whitespace
 * - normalize to lowercase
 */
function normalizeEmail(value) {
  return value.trim().toLowerCase();
}



/**
 * Validate an email address.
 *
 * This intentionally uses a practical sanity check rather than attempting
 * to implement the entire RFC email grammar.
 */
function isValidEmail(email) {
  return (
    typeof email === "string" &&
    email.length >= 3 &&
    email.length <= MAX_EMAIL_LENGTH &&
    !CONTROL_CHARS_RE.test(email) &&
    EMAIL_RE.test(email)
  );
}



/**
 * Verify that the JSON object contains exactly the fields we expect.
 */
function hasOnlyAllowedFields(body) {
  const keys = Object.keys(body);

  return (
    keys.length === ALLOWED_FIELDS.size &&
    keys.every((key) => ALLOWED_FIELDS.has(key))
  );
}



export default {
  async fetch(request, env) {
    try {
      // ---------------------------------------------------------------
      // Method
      // ---------------------------------------------------------------

      if (request.method === "OPTIONS") {
        // CORS preflight.
        //
        // The actual POST is strictly origin-checked below.
        return new Response(null, {
          status: 204,
          headers: corsHeaders(env),
        });
      }

      if (request.method !== "POST") {
        return json(
          { error: "Method not allowed" },
          405,
          env
        );
      }



      // ---------------------------------------------------------------
      // Configuration
      // ---------------------------------------------------------------

      if (!env.RESEND_API_KEY || !env.RESEND_SEGMENT_ID) {
        console.error(
          "Worker misconfigured: missing required environment variable"
        );

        return json(
          { error: "Service unavailable" },
          503,
          env
        );
      }

      if (!env.ALLOWED_ORIGIN || !isValidOrigin(env.ALLOWED_ORIGIN)) {
        console.error(
          "Worker misconfigured: invalid ALLOWED_ORIGIN"
        );

        return json(
          { error: "Service unavailable" },
          503,
          env
        );
      }



      // ---------------------------------------------------------------
      // Origin
      // ---------------------------------------------------------------
      //
      // CORS response headers alone do NOT prevent someone from directly
      // calling the Worker.
      //
      // Require the browser's Origin header to exactly match the configured
      // ALLOWED_ORIGIN.
      //
      // Note: Origin is not cryptographic authentication. A non-browser
      // client can forge it. It does prevent ordinary cross-origin browser
      // requests from other origins.

      const origin = request.headers.get("Origin");

      if (origin !== env.ALLOWED_ORIGIN) {
        return json(
          { error: "Forbidden" },
          403,
          env
        );
      }



      // ---------------------------------------------------------------
      // Content-Type
      // ---------------------------------------------------------------

      const contentType = request.headers.get("Content-Type") || "";

      // Only accept application/json, optionally followed by parameters
      // such as charset=utf-8.
      if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
        return json(
          { error: "Content-Type must be application/json" },
          415,
          env
        );
      }



      // ---------------------------------------------------------------
      // Content-Length
      // ---------------------------------------------------------------
      //
      // Early rejection optimization. The actual body size is checked
      // again after reading the body.

      const contentLength = request.headers.get("Content-Length");

      if (contentLength !== null) {
        const parsedLength = Number(contentLength);

        if (
          !Number.isInteger(parsedLength) ||
          parsedLength < 0 ||
          parsedLength > MAX_BODY_BYTES
        ) {
          return json(
            { error: "Request too large" },
            413,
            env
          );
        }
      }



      // ---------------------------------------------------------------
      // Read and enforce actual body size
      // ---------------------------------------------------------------

      let rawBody;

      try {
        rawBody = await request.arrayBuffer();
      } catch {
        return json(
          { error: "Invalid request body" },
          400,
          env
        );
      }

      if (rawBody.byteLength > MAX_BODY_BYTES) {
        return json(
          { error: "Request too large" },
          413,
          env
        );
      }



      // ---------------------------------------------------------------
      // Parse JSON
      // ---------------------------------------------------------------

      let body;

      try {
        const text = new TextDecoder("utf-8", {
          fatal: true,
        }).decode(rawBody);

        body = JSON.parse(text);
      } catch {
        return json(
          { error: "Invalid JSON body" },
          400,
          env
        );
      }



      // ---------------------------------------------------------------
      // Validate request object
      // ---------------------------------------------------------------

      if (!isPlainObject(body)) {
        return json(
          { error: "Invalid request body" },
          400,
          env
        );
      }



      // ---------------------------------------------------------------
      // Reject unexpected fields
      // ---------------------------------------------------------------

      if (!hasOnlyAllowedFields(body)) {
        return json(
          { error: "Invalid request body" },
          400,
          env
        );
      }



      const { email, firstName, lastName } = body;



      // ---------------------------------------------------------------
      // Validate raw values
      // ---------------------------------------------------------------
      //
      // Validate lengths BEFORE normalization.

      if (
        typeof email !== "string" ||
        email.length > MAX_EMAIL_LENGTH
      ) {
        return json(
          { error: "Invalid email" },
          400,
          env
        );
      }

      if (
        typeof firstName !== "string" ||
        firstName.length > MAX_NAME_LENGTH
      ) {
        return json(
          { error: "Invalid first name" },
          400,
          env
        );
      }

      if (
        typeof lastName !== "string" ||
        lastName.length > MAX_NAME_LENGTH
      ) {
        return json(
          { error: "Invalid last name" },
          400,
          env
        );
      }



      // ---------------------------------------------------------------
      // Normalize
      // ---------------------------------------------------------------

      const normalizedEmail = normalizeEmail(email);
      const normalizedFirstName = normalizeName(firstName);
      const normalizedLastName = normalizeName(lastName);



      // ---------------------------------------------------------------
      // Validate normalized values
      // ---------------------------------------------------------------

      if (!isValidEmail(normalizedEmail)) {
        return json(
          { error: "Invalid email" },
          400,
          env
        );
      }

      if (!isValidName(normalizedFirstName)) {
        return json(
          { error: "Invalid first name" },
          400,
          env
        );
      }

      if (!isValidName(normalizedLastName)) {
        return json(
          { error: "Invalid last name" },
          400,
          env
        );
      }



      // ---------------------------------------------------------------
      // Resend payload
      // ---------------------------------------------------------------

      const payload = {
        email: normalizedEmail,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        unsubscribed: false,
        properties: {
          from_event: "website_form",
        },
        segments: [
          {
            id: env.RESEND_SEGMENT_ID,
          },
        ],
      };



      // ---------------------------------------------------------------
      // Resend API request
      // ---------------------------------------------------------------

      let resendResp;

      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, RESEND_TIMEOUT_MS);

      try {
        resendResp = await fetch(RESEND_CONTACTS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err) {
        console.error("Failed to reach Resend", {
          name: err instanceof Error
            ? err.name
            : "UnknownError",
        });

        return json(
          { error: "Unable to subscribe" },
          502,
          env
        );
      } finally {
        clearTimeout(timeout);
      }



      // ---------------------------------------------------------------
      // Resend response
      // ---------------------------------------------------------------
      //
      // We intentionally don't expose or log the complete upstream
      // response.

      try {
        await resendResp.arrayBuffer();
      } catch {
        // Ignore response-body read errors here. The HTTP status is
        // sufficient for deciding whether the operation succeeded.
      }



      // ---------------------------------------------------------------
      // Resend errors
      // ---------------------------------------------------------------

      if (!resendResp.ok) {
        // A 409 means the contact already exists.
        //
        // Treat it as success externally so the endpoint does not reveal
        // whether a particular email address is already subscribed.

        if (resendResp.status === 409) {
          return json(
            {
              success: true,
            },
            200,
            env
          );
        }

        console.error("Resend API error", {
          status: resendResp.status,
        });

        return json(
          { error: "Unable to subscribe" },
          502,
          env
        );
      }



      // ---------------------------------------------------------------
      // Success
      // ---------------------------------------------------------------

      return json(
        {
          success: true,
        },
        200,
        env
      );

    } catch (err) {
      // ---------------------------------------------------------------
      // Unexpected error
      // ---------------------------------------------------------------

      console.error("Unexpected Worker error", {
        name: err instanceof Error
          ? err.name
          : "UnknownError",
      });

      return json(
        { error: "Unexpected server error" },
        500,
        env
      );
    }
  },
};
