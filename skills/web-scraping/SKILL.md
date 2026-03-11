# Web Scraping Skill

## Overview
The Web Scraping skill enables the extraction of data from websites and web applications. This involves navigating DOM structures, handling asynchronous content, and respecting web standards and ethics.

## Core Capabilities
- **Static Content Extraction**: Using libraries like BeautifulSoup or Cheerio to parse HTML and extract data using CSS selectors or XPath.
- **Dynamic Content Handling**: Utilizing headless browsers (Playwright, Puppeteer, Selenium) to interact with JavaScript-heavy sites.
- **API Interception**: Identifying and calling internal APIs used by web frontends to retrieve structured data directly.
- **Data Cleaning**: Post-processing scraped data into structured formats (JSON, CSV, SQL).

## Tools & Libraries
- **Python**: BeautifulSoup4, Scrapy, Selenium, Playwright, Requests.
- **Node.js**: Cheerio, Puppeteer, Playwright, Axios.

## Best Practices & Ethics
- **Respect robots.txt**: Always check and adhere to the target site's scraping policies.
- **Rate Limiting**: Implement delays and exponential backoff to avoid overwhelming target servers.
- **User-Agent Rotation**: Use realistic User-Agent headers and rotate them if necessary.
- **Legal Compliance**: Ensure scraping activities comply with Terms of Service and data privacy laws (GDPR, CCPA).

## Troubleshooting
- **Cloudflare/Bot Protection**: Use specialized headers or browser-based scraping to bypass basic bot detection.
- **CAPTCHAs**: Implement manual solve prompts or integration with solving services if strictly necessary.
- **Changing Selectors**: Implement robust selectors (ID-based or stable attributes) and error handling for when site structures change.
