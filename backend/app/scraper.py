import asyncio
import logging
import re
import json
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_SCRAPER_TIMEOUT = httpx.Timeout(10.0)
_BASE_URL = "https://www.tablycjakalorijnosti.com.ua"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
}


async def fetch_product_slug(barcode: str) -> str | None:
    api_url = f"{_BASE_URL}/autocomplete/foodstuff-activity-meal?query={barcode}&format=json"
    async with httpx.AsyncClient(timeout=_SCRAPER_TIMEOUT) as client:
        try:
            response = await client.get(api_url, headers=_HEADERS)
        except httpx.RequestError as e:
            logger.error("Scraper search request failed: %s", e)
            return None

        if response.status_code != 200:
            logger.warning("Scraper search returned %s", response.status_code)
            return None

        data = response.json()
        if not data:
            return None

        return data[0].get("url")


async def parse_nutrition_info(slug: str, barcode: str) -> dict:
    product_url = f"{_BASE_URL}/stravy/{slug}"
    async with httpx.AsyncClient(timeout=_SCRAPER_TIMEOUT) as client:
        try:
            response = await client.get(product_url, headers=_HEADERS)
        except httpx.RequestError as e:
            logger.error("Scraper page request failed: %s", e)
            return {"error": "Не вдалося отримати сторінку продукту"}

        if response.status_code != 200:
            return {"error": f"Сторінка продукту не знайдена (Код {response.status_code})"}

    soup = BeautifulSoup(response.text, "html.parser")

    try:
        name_tag = soup.find("h1")
        name = name_tag.text.strip() if name_tag else "Назва не знайдена"

        image_url = None
        img_tag = soup.find("img", class_="image-foodstuff-lg")
        if img_tag and img_tag.has_attr("src"):
            image_url = f"{_BASE_URL}{img_tag['src']}"

        base_weight = 100.0
        weight_div = soup.find("div", class_=lambda c: c and "text-sum" in c)
        if weight_div:
            weight_text = weight_div.get_text().replace(",", ".")
            match = re.search(r"\d+(?:\.\d+)?", weight_text)
            if match:
                base_weight = float(match.group())

        calories = 0.0
        cal_input = soup.find("input", id="calculatedEnergyValueInit")
        if cal_input and cal_input.get("value"):
            calories = float(cal_input["value"])

        def get_nutrient_value(nutrient_name: str) -> float:
            for block in soup.find_all("div", class_="text-subtitle"):
                if nutrient_name in block.get_text():
                    divs = block.find_all("div", recursive=False)
                    if divs:
                        raw = divs[-1].get_text().replace(",", ".")
                        m = re.search(r"\d+(?:\.\d+)?", raw)
                        if m:
                            return float(m.group())
            return 0.0

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
    test_barcode = "8680751007385"
    logger.info("Searching barcode %s…", test_barcode)
    slug = await fetch_product_slug(test_barcode)
    if slug:
        result = await parse_nutrition_info(slug, test_barcode)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Продукт за цим штрихкодом не знайдено.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
