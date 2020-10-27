import {Browser, Page, Response} from 'puppeteer';
import {StatusCodeRangeArray, Store} from './store/model';
import {config} from './config';
import {disableBlockerInPage} from './adblocker';
import {logger} from './logger';

export function getSleepTime(store: Store) {
	const minSleep = store.minPageSleep as number;
	return minSleep + (Math.random() * ((store.maxPageSleep as number) - minSleep));
}

export async function delay(ms: number) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

export function isStatusCodeInRange(statusCode: number, range: StatusCodeRangeArray) {
	for (const value of range) {
		let min: number;
		let max: number;
		if (typeof value === 'number') {
			min = value;
			max = value;
		} else {
			[min, max] = value;
		}

		if (min <= statusCode && statusCode <= max) {
			return true;
		}
	}

	return false;
}

export async function usingResponse<T>(
	browser: Browser,
	url: string,
	cb: (response: (Response | null), page: Page, browser: Browser) => Promise<T>
): Promise<T> {
	return usingPage(browser, async (page, browser) => {
		const response = await page.goto(url, {waitUntil: 'domcontentloaded'});

		return cb(response, page, browser);
	});
}

export async function usingPage<T>(browser: Browser, cb: (page: Page, browser: Browser) => Promise<T>): Promise<T> {
	const page = await browser.newPage();
	page.setDefaultNavigationTimeout(config.page.timeout);
	await page.setUserAgent(getRandomUserAgent());

	try {
		return await cb(page, browser);
	} finally {
		try {
			await closePage(page);
		} catch (error) {
			logger.error(error);
		}
	}
}

export async function closePage(page: Page) {
	if (!config.browser.lowBandwidth) {
		await disableBlockerInPage(page);
	}

	await page.close();
}

export function getRandomUserAgent(): string {
	return config.page.userAgents[Math.floor(Math.random() * config.page.userAgents.length)];
}

// Currently only military time supported, should support both
export function isBreakTime(): boolean {
	if (config.browser.breakTimeStop.length === 0 || config.browser.breakTimeBegin.length === 0) {
		return false;
	}

	const [beginHours, beginMinutes] = config.browser.breakTimeBegin.split(':');
	const [endHours, endMinutes] = config.browser.breakTimeStop.split(':');
	const beginTime = (new Date()).setHours(Number.parseInt(beginHours, 10) ?? 0, Number.parseInt(beginMinutes, 10) ?? 0, 0, 0);
	const endTime = (new Date()).setHours(Number.parseInt(endHours, 10) ?? 0, Number.parseInt(endMinutes, 10) ?? 0, 0, 0);
	const now = Date.now();

	return now >= beginTime && now <= endTime;
}

export function getSleepTimeUntilBreakTimeEnd(): number {
	const [endHours, endMinutes] = config.browser.breakTimeStop.split(':');
	const endTime = (new Date()).setHours(Number.parseInt(endHours, 10) ?? 0, Number.parseInt(endMinutes, 10) ?? 0, 0, 0);
	const now = Date.now();

	return endTime - now;
}
