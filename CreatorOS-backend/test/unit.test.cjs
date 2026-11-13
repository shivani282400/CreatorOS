const assert = require("node:assert/strict");
const test = require("node:test");

const withEnv = (vars, fn) => {
  const previous = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
};

test("extractPartialScript streams the script field out of partial JSON", () => {
  const { extractPartialScript } = require("../dist/services/ai/aiService");

  assert.equal(extractPartialScript(""), "");
  assert.equal(extractPartialScript('{"scr'), "");
  assert.equal(extractPartialScript('{"script": "Hel'), "Hel");
  assert.equal(extractPartialScript('{"script":"Line one\\nLine two", "hooks": ["x"]}'), "Line one\nLine two");
  assert.equal(extractPartialScript('```json\n{ "script" : "Hi there'), "Hi there");
  assert.equal(extractPartialScript('{"script":"Quote: \\"yes\\" done'), 'Quote: "yes" done');
  assert.equal(extractPartialScript('{"script":"Emoji \\u2728 ok'), "Emoji \u2728 ok");
  // An escape sequence cut in half must not emit garbage.
  assert.equal(extractPartialScript('{"script":"Cut here\\'), "Cut here");
  assert.equal(extractPartialScript('{"script":"Cut here\\u26'), "Cut here");
});

test("JWT secret is required and the old default is rejected", () => {
  const { getJwtSecret } = require("../dist/config");

  withEnv({ JWT_SECRET: undefined }, () => assert.throws(() => getJwtSecret(), /JWT_SECRET is not set/));
  withEnv({ JWT_SECRET: "supersecret" }, () => assert.throws(() => getJwtSecret(), /supersecret/));
  withEnv({ JWT_SECRET: "a".repeat(40) }, () => assert.equal(getJwtSecret(), "a".repeat(40)));
});

test("CORS only allows configured origins (plus localhost outside production)", () => {
  const { isOriginAllowed } = require("../dist/config");

  withEnv({ NODE_ENV: "production", FRONTEND_URL: "https://creatoros.vercel.app/, https://other.example.com" }, () => {
    assert.equal(isOriginAllowed("https://creatoros.vercel.app"), true);
    assert.equal(isOriginAllowed("https://other.example.com"), true);
    assert.equal(isOriginAllowed("https://evil.example.com"), false);
    assert.equal(isOriginAllowed("http://localhost:5173"), false);
    assert.equal(isOriginAllowed(undefined), true); // curl / health checks
  });

  withEnv({ NODE_ENV: "development", FRONTEND_URL: undefined }, () => {
    assert.equal(isOriginAllowed("http://localhost:5173"), true);
    assert.equal(isOriginAllowed("http://127.0.0.1:3000"), true);
    assert.equal(isOriginAllowed("https://evil.example.com"), false);
  });
});

test("email provider is detected from the environment", () => {
  const { getEmailProvider, isOtpEnabled } = require("../dist/services/emailService");
  const clear = {
    EMAIL_PROVIDER: undefined, OTP_ENABLED: undefined,
    BREVO_API_KEY: undefined, BREVO_SENDER_EMAIL: undefined,
    RESEND_API_KEY: undefined, RESEND_FROM_EMAIL: undefined,
    SMTP_USER: undefined, SMTP_PASS: undefined, GMAIL_USER: undefined, GMAIL_APP_PASSWORD: undefined
  };

  withEnv(clear, () => {
    assert.equal(getEmailProvider(), null);
    assert.equal(isOtpEnabled(), false);
  });
  withEnv({ ...clear, GMAIL_USER: "me@gmail.com", GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" }, () => {
    assert.equal(getEmailProvider(), "smtp");
    assert.equal(isOtpEnabled(), true);
  });
  withEnv({ ...clear, GMAIL_USER: "me@gmail.com", GMAIL_APP_PASSWORD: "x", OTP_ENABLED: "false" }, () => {
    assert.equal(isOtpEnabled(), false); // explicit kill switch
  });
  withEnv({ ...clear, RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "a@b.dev", GMAIL_USER: "me@gmail.com", GMAIL_APP_PASSWORD: "x" }, () => {
    assert.equal(getEmailProvider(), "resend");
    assert.equal(withEnv({ EMAIL_PROVIDER: "smtp" }, () => getEmailProvider()), "smtp");
  });
  withEnv({ ...clear, BREVO_API_KEY: "k", BREVO_SENDER_EMAIL: "a@b.dev" }, () => {
    assert.equal(getEmailProvider(), "brevo");
  });
});
