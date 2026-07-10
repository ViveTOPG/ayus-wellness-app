/**
 * Visual + interaction QA for Āyus SPA (Playwright).
 * Writes screenshots + JSON report to %TEMP%/ayus-qa/
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

const BASE = process.env.AYUS_URL || 'http://localhost:5500/';
const OUT = path.join(os.tmpdir(), 'ayus-qa');
fs.mkdirSync(OUT, { recursive: true });

const report = {
  url: BASE,
  startedAt: new Date().toISOString(),
  viewports: {},
  console: [],
  pageErrors: [],
  interactions: [],
  failures: [],
};

function log(msg) {
  console.log(msg);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  log(`  screenshot: ${file}`);
  return file;
}

/** Prefer visible control — desktop nav is display:none on mobile */
function visible(page, selector) {
  return page.locator(`${selector} >> visible=true`).first();
}

async function runViewport(browser, label, size) {
  log(`\n=== Viewport ${label} ${size.width}x${size.height} ===`);
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const consoleMsgs = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMsgs.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  // Clear once after first paint (not via addInitScript — that wipes reloads too)
  await page.evaluate(() => {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('ayus.')) localStorage.removeItem(k);
      });
    } catch (_) {}
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const title = await page.title();
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const notBlank = bodyText.length > 80 && !bodyText.includes('Unable to load wellness data');

  report.viewports[label] = {
    size,
    title,
    notBlank,
    screenshots: {},
    console: consoleMsgs,
    pageErrors,
  };

  if (!notBlank) {
    report.failures.push(`${label}: blank or data-load failure`);
  }

  // Guest home
  report.viewports[label].screenshots.home_guest = await shot(page, `${label}-01-home-guest`);

  // Dismiss onboarding if present (force-hide for guest shot already taken)
  await page.evaluate(() => {
    const ob = document.getElementById('onboarding');
    if (ob) ob.classList.add('hidden');
    document.body.style.overflow = '';
  });
  await page.waitForTimeout(200);

  // Seed a profile for Today dashboard (persists across reload)
  await page.evaluate(() => {
    localStorage.setItem('ayus.onboarded', JSON.stringify(true));
    localStorage.setItem(
      'ayus.profile',
      JSON.stringify({
        name: 'Priya',
        goals: ['sleep', 'stress', 'energy'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    localStorage.setItem(
      'ayus.streak',
      JSON.stringify({ count: 3, lastDay: new Date().toISOString().slice(0, 10), best: 5 })
    );
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  // Ensure overlay gone
  await page.evaluate(() => {
    const ob = document.getElementById('onboarding');
    if (ob) ob.classList.add('hidden');
    document.body.style.overflow = '';
  });
  report.viewports[label].screenshots.home_member = await shot(page, `${label}-02-today`);

  // Check-in (use visible control — bottom nav on mobile)
  await visible(page, '[data-action="startCheckin"]').click({ timeout: 10000 });
  await page.waitForTimeout(500);
  report.viewports[label].screenshots.checkin = await shot(page, `${label}-03-checkin`);
  report.interactions.push(`${label}: opened check-in`);

  // Pick first category tile if present
  const tile = page.locator('#catGrid .tile').first();
  if (await tile.count()) {
    await tile.click();
    await page.waitForTimeout(300);
    const concern = page.locator('#concernGrid .tile').first();
    if (await concern.count()) {
      await concern.click();
      await page.waitForTimeout(400);
      report.viewports[label].screenshots.checkin_step2 = await shot(page, `${label}-04-checkin-duration`);
      // duration
      const dur = page.locator('#durationChips .chip').first();
      if (await dur.count()) await dur.click();
      await visible(page, '[data-action="toStep:3"]').click();
      await page.waitForTimeout(300);
      const inten = page.locator('#intensityChips .chip').first();
      if (await inten.count()) await inten.click();
      await visible(page, '[data-action="analyze"]').click();
      await page.waitForTimeout(3200);
      report.viewports[label].screenshots.result = await shot(page, `${label}-05-result`);
      report.interactions.push(`${label}: completed check-in → result`);
    }
  }

  // Library
  await visible(page, '[data-action="go:library"]').click({ timeout: 10000 });
  await page.waitForTimeout(500);
  report.viewports[label].screenshots.library = await shot(page, `${label}-06-library`);
  const herb = page.locator('#libGrid .lib-card').first();
  if (await herb.count()) {
    await herb.click();
    await page.waitForTimeout(500);
    report.viewports[label].screenshots.herb_modal = await shot(page, `${label}-07-herb-modal`);
    // Prefer X button — mobile bottom sheet covers backdrop
    const closeX = page.locator('#modalCard .modal-close, #modalCard [data-action="closeModal"]').first();
    if (await closeX.count()) {
      await closeX.click({ force: true });
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);
    // Ensure closed
    await page.evaluate(() => {
      const m = document.getElementById('modal');
      if (m) {
        m.classList.remove('open');
        m.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = '';
    });
  }

  // Quiz — may only be in hamburger / desktop nav
  const quizBtn = page.locator('[data-action="openQuiz"] >> visible=true').first();
  if (await quizBtn.count()) {
    await quizBtn.click();
  } else {
    // open hamburger then quiz
    const ham = page.locator('#hamburgerBtn >> visible=true');
    if (await ham.count()) {
      await ham.click();
      await page.waitForTimeout(300);
      await page.locator('.mobile-nav-panel [data-action="openQuiz"]').click();
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(400);
  report.viewports[label].screenshots.quiz = await shot(page, `${label}-08-quiz`);

  // Journal
  await visible(page, '[data-action="go:journal"]').click({ timeout: 10000 });
  await page.waitForTimeout(400);
  report.viewports[label].screenshots.journal = await shot(page, `${label}-09-journal`);

  // Profile
  await visible(page, '[data-action="openMySpace"]').click({ timeout: 10000 });
  await page.waitForTimeout(500);
  report.viewports[label].screenshots.profile = await shot(page, `${label}-10-profile`);

  // Heritage via menu if needed
  const heritageBtn = page.locator('[data-action="go:heritage"] >> visible=true').first();
  if (await heritageBtn.count()) {
    await heritageBtn.click();
  } else {
    const ham2 = page.locator('#hamburgerBtn >> visible=true');
    if (await ham2.count()) {
      await ham2.click();
      await page.waitForTimeout(300);
      await page.locator('.mobile-nav-panel [data-action="go:heritage"]').click();
    }
  }
  await page.waitForTimeout(500);
  report.viewports[label].screenshots.heritage = await shot(page, `${label}-11-heritage`);

  // Overflow check on today (prefer bottom nav / brand — not skip-link)
  const homeNav = page.locator('.bottom-nav [data-action="go:home"], .brand[data-action="go:home"], .nav [data-action="go:home"]').filter({ visible: true }).first();
  if (await homeNav.count()) await homeNav.click({ timeout: 10000 });
  else await page.evaluate(() => document.querySelector('.brand')?.click());
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 2,
    };
  });
  report.viewports[label].overflowX = overflow;
  if (overflow.overflowX) {
    report.failures.push(`${label}: horizontal overflow (${overflow.scrollWidth} > ${overflow.clientWidth})`);
  }

  // Collect remaining console
  report.console.push(...consoleMsgs.map((m) => ({ viewport: label, ...m })));
  report.pageErrors.push(...pageErrors.map((e) => ({ viewport: label, error: e })));
  if (pageErrors.length) {
    report.failures.push(`${label}: ${pageErrors.length} page error(s)`);
  }

  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runViewport(browser, 'mobile', { width: 390, height: 844 });
  await runViewport(browser, 'desktop', { width: 1280, height: 800 });
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.ok = report.failures.length === 0;
const reportPath = path.join(OUT, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
log(`\n=== REPORT ${report.ok ? 'PASS' : 'FAIL'} ===`);
log(`failures: ${report.failures.length ? report.failures.join(' | ') : 'none'}`);
log(`console entries: ${report.console.length}`);
log(`page errors: ${report.pageErrors.length}`);
log(`report: ${reportPath}`);
log(`shots dir: ${OUT}`);
process.exit(report.ok ? 0 : 1);
