"""
Web Scraper Service.

This module provides async web scraping functionality to query and parse food product information
(such as name, weight, calories, proteins, fats, and carbohydrates) from 'tablycjakalorijnosti.com.ua'
using product barcode values.
"""

import asyncio
import logging
import re
import json
import httpx
from bs4 import BeautifulSoup

# Configure logger for this module
logger = logging.getLogger(__name__)

# Timeout configurations for the HTTP requests
_SCRAPER_TIMEOUT = httpx.Timeout(10.0)

# Base URL for the target Ukrainian nutrition database
_BASE_URL = "https://www.tablycjakalorijnosti.com.ua"

# Custom headers to simulate browser requests and fetch JSON autocomplete search data
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
}


async def fetch_product_slug(barcode: str) -> str | None:
    """
    Queries the autocomplete API endpoint of the target database with a barcode
    to retrieve the relative URL path/slug for the matching product.

    Args:
        barcode (str): The product barcode.

    Returns:
        str | None: The product page URL path (slug) if found, otherwise None.
    """
    api_url = f"{_BASE_URL}/autocomplete/foodstuff-activity-meal?query={barcode}&format=json"
    async with httpx.AsyncClient(timeout=_SCRAPER_TIMEOUT) as client:
        try:
            # Perform asynchronous search query
            response = await client.get(api_url, headers=_HEADERS)
        except httpx.RequestError as e:
            logger.error("Scraper search request failed: %s", e)
            return None

        # Verify request success
        if response.status_code != 200:
            logger.warning("Scraper search returned %s", response.status_code)
            return None

        # Autocomplete returns a JSON array of search result dictionaries
        data = response.json()
        if not data:
            return None

        # Return the 'url' property of the first search match
        return data[0].get("url")


async def parse_nutrition_info(slug: str, barcode: str) -> dict:
    """
    Fetches the HTML page for a product by its URL slug, parses it, and extracts
    product name, base weight, calories, macronutrients (proteins, fats, carbs),
    and product image URL.

    Args:
        slug (str): The product URL slug (relative path).
        barcode (str): The product barcode.

    Returns:
        dict: A dictionary containing the parsed product metadata, or error keys.
    """
    product_url = f"{_BASE_URL}/stravy/{slug}"
    async with httpx.AsyncClient(timeout=_SCRAPER_TIMEOUT) as client:
        try:
            # Fetch the product detail HTML page
            response = await client.get(product_url, headers=_HEADERS)
        except httpx.RequestError as e:
            logger.error("Scraper page request failed: %s", e)
            return {"error": "Не вдалося отримати сторінку продукту"}

        # Check HTTP status code
        if response.status_code != 200:
            return {"error": f"Сторінка продукту не знайдена (Код {response.status_code})"}

    # Parse HTML document using BeautifulSoup
    soup = BeautifulSoup(response.text, "html.parser")

    try:
        # Extract product name from <h1> element
        name_tag = soup.find("h1")
        name = name_tag.text.strip() if name_tag else "Назва не знайдена"

        # Find the product image URL if present
        image_url = None
        img_tag = soup.find("img", class_="image-foodstuff-lg")
        if img_tag and img_tag.has_attr("src"):
            image_url = f"{_BASE_URL}{img_tag['src']}"

        # Determine reference/base weight (typically 100g)
        base_weight = 100.0
        weight_div = soup.find("div", class_=lambda c: c and "text-sum" in c)
        if weight_div:
            # Clean number formatting for conversion
            weight_text = weight_div.get_text().replace(",", ".")
            match = re.search(r"\d+(?:\.\d+)?", weight_text)
            if match:
                base_weight = float(match.group())

        # Extract energy value/calories
        calories = 0.0
        cal_input = soup.find("input", id="calculatedEnergyValueInit")
        if cal_input and cal_input.get("value"):
            calories = float(cal_input["value"])

        # Inner helper to search for macronutrient values in specific structural subtitle blocks
        def get_nutrient_value(nutrient_name: str) -> float:
            for block in soup.find_all("div", class_="text-subtitle"):
                if nutrient_name in block.get_text():
                    divs = block.find_all("div", recursive=False)
                    if divs:
                        # Extract value from the last sibling element and convert commas to dots
                        raw = divs[-1].get_text().replace(",", ".")
                        m = re.search(r"\d+(?:\.\d+)?", raw)
                        if m:
                            return float(m.group())
            return 0.0

        # Construct and return final scraped results dictionary
        return {
            "barcode": barcode,
            "name": name,
            "base_weight_g": base_weight,
            "calories": calories,
            "proteins": get_nutrient_value("Білки"),
            "fats": get_nutrient_value("Жири"),
            "carbs": get_nutrient_value("Вуглеводи"),
            "image_url": image_url,
            "source_url": product_url,
        }

    except Exception as e:
        logger.error("Scraper HTML parse error: %s", e)
        return {"error": f"Помилка парсингу HTML: {e}"}


async def main():
    """
    Test execution entry point. Queries a sample barcode and prints out the result.
    """
    test_barcode = "8680751007385"
    logger.info("Searching barcode %s…", test_barcode)
    slug = await fetch_product_slug(test_barcode)
    if slug:
        result = await parse_nutrition_info(slug, test_barcode)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Продукт за цим штрихкодом не знайдено.")


if __name__ == "__main__":
    # Setup basic logging format for local test execution
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
