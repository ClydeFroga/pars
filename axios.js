const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const fs = require("node:fs");
const { hideBin } = require("yargs/helpers");
const yargs = require("yargs/yargs");

// Парсим аргументы командной строки
const argv = yargs(hideBin(process.argv))
  .command("$0 <url>", "Ссылка на продукт", (yargs) => {
    yargs.positional("url", {
      description: "URL продукта",
      type: "string",
      demandOption: true,
    });
  })
  .help().argv;

// Создаём экземпляр CookieJar
const jar = new CookieJar();

// Создаём клиент Axios с поддержкой куков
const client = wrapper(
  axios.create({
    jar,
    baseURL: "https://ozon.ru",
    headers: {
      "User-Agent": "ozonapp_android/17.48.0+2528",
      Accept: "*/*",
    },
  })
);

// Функция для извлечения ID продукта из URL
function extractProductId(url) {
  const match = url.match(/https:\/\/www\.ozon\.ru\/product\/([^\/]+)/);
  if (!match) throw new Error("Некорректный URL продукта");
  return match[1];
}

// Функция для записи отзывов в файл
function saveReviewsToFile(reviews, url) {
  const content = `Ссылка на товар: ${url}\n${reviews
    .map((text, index) => `Текст Отзыва_${index}: ${text}`)
    .join("\n")}`;
  fs.writeFileSync("reviews-api.txt", content, "utf-8");
}

// Основная функция для получения отзывов
async function fetchProductReviews(url) {
  const productId = extractProductId(url);
  const reviews = [];
  let nextPageLink = null;

  // Делаем GET-запрос к странице товара, чтобы получить куки
  await client.get("api/composer-api.bx/page/json/v2", {
    params: {
      url: `/product/${productId}/review/list`,
    },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400, // Разрешаем все статусы
  });

  while (true) {
    const response = await client.get("/api/composer-api.bx/page/json/v2", {
      params: {
        url: `/product/${nextPageLink || productId}/review/list`,
        showNextPageParams: true,
      },
    });

    const widgetStates = response.data.widgetStates;
    const reviewsData = Object.keys(widgetStates)
      .filter((key) => /listReviews/.test(key))
      .map((key) => JSON.parse(widgetStates[key]))[0];

    if (!reviewsData) break;

    reviewsData.reviews.forEach((review) => {
      review.bodySections.forEach((section) => {
        reviews.push(section.descriptionAtom.text);
      });
    });

    nextPageLink = response.data.nextPage;
    if (!nextPageLink) break;
  }

  saveReviewsToFile(reviews, url);
}

// Запуск
fetchProductReviews(argv.url)
  .then(() => console.log("Завершено"))
  .catch((error) => console.error("Ошибка:", error.message));
