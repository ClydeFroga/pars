# Product Page Scraper

This script uses Puppeteer to scrape product information from web pages. It captures:
- Screenshot of the product page
- Current price
- Old price (if available)
- Product rating
- Number of reviews

## Installation

1. Make sure you have Node.js installed on your system
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

## Usage

Run the script with the following command:
```bash
node src/index.js --url "https://example.com/product" --region "your-region"
```

Or using short options:
```bash
node src/index.js -u "https://example.com/product" -r "your-region"
```

### Arguments
- `--url` or `-u`: The URL of the product page to scrape (required)
- `--region` or `-r`: The region for the product (required)

## Output
- Screenshots are saved in the `screenshots` directory
- Product information is printed to the console

## Note
You may need to adjust the CSS selectors in the script based on the specific website you're scraping.
