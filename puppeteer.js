const puppeteer = require("puppeteer");
const path = require("path");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .command("$0 <url> <region>", "Данные о продукте", (yargs) => {
    yargs
      .positional("url", {
        description: "URL продукта",
        type: "string",
        demandOption: true,
      })
      .positional("region", {
        description: "Регион",
        type: "string",
        demandOption: true,
      });
  })
  .help().argv;

async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: 'new', // Запускаем браузер в видимом режиме
    defaultViewport: { width: 1920, height: 1080 }, // Устанавливаем размер окна
  });
  return browser;
}

async function setupPage(page) {
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
  await page.setRequestInterception(true);

  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
  });

  page.on("request", (request) => {
    request.continue();
  });
}

async function navigateToProductPage(page, url) {
  await page.goto(url, { waitUntil: "networkidle0" }); // Ждем полной загрузки страницы
  await page.waitForSelector("footer", { timeout: 30000 }); // Ждем футер
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Добавляем задержку
}

async function selectRegion(page, region) {
  const url =
    '[class^="Modal_modal"] [class^="UiRegionListBase_listWrapper"] ul';
  await page.click('[class^="Region_region"]'); // Кликаем по кнопке выбора региона
  await page.waitForSelector(url, { timeout: 30000 }); // Ждем модальное окно
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const numOfRegion = await page.evaluate(
    (values) => {
      let i = 1;
      const regions = document.querySelector(values.url).children;
      for (const reg of regions) {
        if (reg.textContent === values.region) {
          return i; // Возвращаем класс найденного региона
        }
        i++;
      }
      return 2; // Если регион не найден, выбираем второй элемент
    },
    { region, url },
  );
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click(`${url} li:nth-child(${numOfRegion})`),
  ]);
}

async function takeScreenshot(page) {
  const screenshotPath = path.join(__dirname, "screenshots", `screenshot.jpg`);
  await page.screenshot({ path: screenshotPath, fullPage: true }); // Делаем скриншот всей страницы
}

async function parseProductInfo(page) {
  const productInfo = await page.evaluate(() => {
    const result = {
      currentPrice: null,
      oldPrice: null,
      rating: null,
      reviewCount: null,
    };

    // Парсим цены
    const priceElement = document.querySelector(
      '[class^="PriceInfo_root"]',
    ).childNodes;
    if (priceElement.length > 1) {
      result.oldPrice = priceElement[0].textContent.split(" ")[0];
      result.currentPrice = priceElement[1].textContent.split(" ")[0];
    } else {
      result.currentPrice = priceElement[0].textContent.split(" ")[0];
    }

    // Парсим рейтинг
    const ratingElement = document.querySelector('[itemprop="ratingValue"]');
    if (ratingElement) {
      result.rating = ratingElement.content;
    }

    // Парсим количество отзывов
    const reviewCount = document.querySelector(
      '[class*="Summary_reviewsCountContainer"] [class*="Summary_title"]',
    );
    if (reviewCount) {
      result.reviewCount = parseInt(reviewCount.textContent);
    }

    return result;
  });

  return productInfo;
}

async function isCurrentRegion(page, region) {
  const nameOfCurrentRegion = await page.evaluate(() => {
    return document.querySelector('div[class^="Region_region"]').textContent;
  });

  return nameOfCurrentRegion === region;
}

function createFile(object) {
  const fs = require("fs");
  const filePath = path.join(__dirname, "data", "product.txt");

  const text = Object.entries(object)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  fs.writeFileSync(filePath, text);
}

async function scrapeProduct(url, region) {
  let browser;
  try {
    browser = await launchBrowser(); // Запускаем браузер
    const page = await browser.newPage(); // Создаем новую страницу
    await setupPage(page); // Настраиваем страницу
    await navigateToProductPage(page, url); // Переходим на страницу продукта
    if (!(await isCurrentRegion(page, region)))
      await selectRegion(page, region); // Выбираем регион
    await takeScreenshot(page); // Делаем скриншот
    const productInfo = await parseProductInfo(page); // Парсим данные о продукте
    createFile(productInfo); // Записываем данные в файл
  } catch (error) {
    console.error("Error during scraping:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close(); // Закрываем браузер
    }
  }
}

scrapeProduct(argv.url, argv.region)
  .then(() => console.log("Завершено"))
  .catch(console.error);
