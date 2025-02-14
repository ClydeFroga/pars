const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

// Создаём экземпляр CookieJar
const jar = new CookieJar();

function createLink(url) {
  return `/api/composer-api.bx/page/json/v2?url=${url}`;
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
    const match = url.match(/https:\/\/www\.ozon\.ru\/product\/([^\/]+)/);

    const newLink = `/api/composer-api.bx/page/json/v2`;

    // Делаем GET-запрос к странице товара
    await client.get(newLink, {
      params: {
        url: `/product/${match[1]}/review/list`,
        showNextPageParams: true,
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400, // Разрешаем все статусы
    });

    console.log(await jar.getCookies(baseURL));

    let hasNextPage = true;

    const reviews = [];
    let index = 0;
    let link;

    while (hasNextPage) {
      const response = await client.get(newLink, {
        params: {
          url: `/product/${match[1]}/review/list`,
          showNextPageParams: true,
        },
      });

      const widgetStates = response.data.widgetStates;

      for (let [key, value] of Object.entries(widgetStates)) {
        if (/listReviews/.test(key)) {
          const parsed = JSON.parse(value);

          parsed.reviews.forEach((review) => {
            if (review.bodySections && Array.isArray(review.bodySections)) {
              review.bodySections.forEach((section) => {
                if (section.descriptionAtom && section.descriptionAtom.text) {
                  reviews.push({
                    index: index,
                    text: section.descriptionAtom.text,
                    answer: "",
                  });
                }

                index++;
              });
            }
          });
        } else {
          hasNextPage = false;
          break;
        }
      }
      link = createLink(response.data.nextPage);
    }
  } catch (error) {
    console.log("Блшя"); // Статус ответа
  }
}

// fetchProductReviews('api/composer-api.bx/page/json/v2?url=/product/vesy-kuhonnye-elektronnye-vesy-dlya-kofe-1555634374/review/list&productReviewsURL=mobWebReviewURL&showNextPageParams=true');
fetchProductReviews(
  "https://www.ozon.ru/product/botinki-romax-1698219158/?campaignId=527",
);
