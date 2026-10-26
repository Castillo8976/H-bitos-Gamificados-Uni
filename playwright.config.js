'use strict';
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  outputDir: 'test-results/e2e',
  use: {
    channel: 'chrome', headless: true,
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  webServer: [
    {
      command: 'node tests/e2e/servidor-e2e.js',
      url: 'http://127.0.0.1:3950/api/health', reuseExistingServer: false,
      timeout: 60_000,
      env: { PORT: '3950', NODE_ENV: 'test', AUTH_EMAIL_VERIFICATION: 'false', AUTH_EMAIL_MFA: 'off', MAIL_TRANSPORT: 'memoria' },
    },
    {
      command: 'node tests/e2e/servidor-e2e.js',
      url: 'http://127.0.0.1:3951/api/health', reuseExistingServer: false,
      timeout: 60_000,
      env: { PORT: '3951', NODE_ENV: 'test', AUTH_EMAIL_VERIFICATION: 'true', AUTH_EMAIL_MFA: 'optional', MAIL_TRANSPORT: 'memoria', AUTH_CODE_RESEND_COOLDOWN_SECONDS: '1' },
    },
  ],
  projects: [
    { name: 'principal', testIgnore: '**/correo.spec.js', use: { baseURL: 'http://127.0.0.1:3950' } },
    { name: 'correo', testMatch: '**/correo.spec.js', use: { baseURL: 'http://127.0.0.1:3951' } },
  ],
});
