1. Создается список прокси, из которого поочередно выбирается следующий прокси для каждого запроса.

```js
const proxies = ["proxy1:port", "proxy2:port", "proxy3:port"];
let currentIndex = 0;

function getNextProxy() {
  const proxy = proxies[currentIndex];
  currentIndex = (currentIndex + 1) % proxies.length;
  return proxy;
}

console.log(getNextProxy());
```

2. Прокси выбираются на основе их "качества" (скорость, доступность, количество успешных запросов).
```js
const proxies = {
  "proxy1:port": { successRate: 0.95, responseTime: 1.2 },
  "proxy2:port": { successRate: 0.8, responseTime: 2.5 },
};

function getBestProxy() {
  return Object.entries(proxies).reduce((best, [proxy, stats]) =>
    stats.successRate > best.stats.successRate ? { proxy, stats } : best,
  ).proxy;
}

console.log(getBestProxy());
```
