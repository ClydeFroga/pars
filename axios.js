const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const fs = require("node:fs");
const { hideBin } = require("yargs/helpers");
const yargs = require("yargs/yargs");

const argv = yargs(hideBin(process.argv))
  .command("$0 <url>", "Ссылка", (yargs) => {
    yargs.positional("url", {
      description: "URL продукта",
      type: "string",
      demandOption: true,
    });
  })
  .help().argv;

// Создаём экземпляр CookieJar
const jar = new CookieJar();

function createLink(url) {
  return `/api/composer-api.bx/page/json/v2?url=${url}`;
}

function createFile(reviewsAll) {
  let text = reviewsAll.link + "\n";

  for (let index = 0; index < reviewsAll.texts.length; index++) {
    let item = reviewsAll.texts[index];
    text += `Текст Отзыва_${index}: ${item}\n`;
  }

  fs.writeFileSync("reviews-api.txt", text, "utf-8");
}

async function fetchProductReviews(url) {
  const baseURL = "https://ozon.ru/";
  // Оборачиваем Axios для поддержки куков
  const client = wrapper(
    axios.create({
      jar,
      baseURL,
      headers: {
        Connection: "keep-alive",
        Host: "www.ozon.ru",
        Accept: "*/*",
        "User-Agent": "ozonapp_android/17.48.0+2528",
      },
    }),
  );

  try {
    const startLink = url.match(/https:\/\/www\.ozon\.ru\/product\/([^\/]+)/);

    const newLink = `/api/composer-api.bx/page/json/v2`;

    // Делаем GET-запрос к странице товара
    await client.get(newLink, {
      params: {
        url: `/product/${startLink[1]}/review/list`,
        showNextPageParams: true,
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400, // Разрешаем все статусы
    });

    const reviewsAll = { link: `Ссылка на товар: ${url}`, texts: [] };
    let link;

    while (true) {
      let match;
      if (link) {
        match = createLink(link);
      }

      const response = await client.get(newLink, {
        params: {
          url: `/product/${match ?? startLink[1]}/review/list`,
          showNextPageParams: true,
        },
      });

      const widgetStates = response.data.widgetStates;
      let reviews;
      for (let key in widgetStates) {
        if (/listReviews/.test(key)) {
          reviews = JSON.parse(widgetStates[key]);
        }
      }

      if (!reviews) {
        break;
      }

      for (const review of reviews.reviews) {
        for (let oneOFMany of review.bodySections) {
          reviewsAll.texts.push(oneOFMany.descriptionAtom.text);
        }
      }
      link = response.data.nextPage;
    }

    createFile(reviewsAll);
  } catch (error) {
    console.log(error); // Статус ответа
  }
}

fetchProductReviews(argv.url)
  .then(() => console.log("Завершено"))
  .catch(console.error);
