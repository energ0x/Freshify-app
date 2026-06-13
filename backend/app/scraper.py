import asyncio
import httpx
from bs4 import BeautifulSoup
import json
import re

# pip install fastapi uvicorn httpx beautifulsoup4 pydantic

async def fetch_product_slug(barcode: str) -> str | None:
    api_url = f"https://www.tablycjakalorijnosti.com.ua/autocomplete/foodstuff-activity-meal?query={barcode}&format=json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(api_url, headers=headers)
        
        if response.status_code != 200:
            print(f"Помилка API пошуку: {response.status_code}")
            return None
            
        data = response.json()
        
        if not data or len(data) == 0:
            return None
            
        return data[0].get("url")

async def parse_nutrition_info(slug: str, barcode: str):
    base_url = "https://www.tablycjakalorijnosti.com.ua"
    product_url = f"{base_url}/stravy/{slug}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(product_url, headers=headers)
        
        if response.status_code != 200:
            return {"error": f"Сторінка продукту не знайдена (Код {response.status_code})"}

    soup = BeautifulSoup(response.text, 'html.parser')
    
    try:
        name_tag = soup.find('h1')
        name = name_tag.text.strip() if name_tag else "Назва не знайдена"
     
        image_url = None
        img_tag = soup.find('img', class_='image-foodstuff-lg')
        if img_tag and img_tag.has_attr('src'):
            image_url = f"{base_url}{img_tag['src']}"

        base_weight = 100.0
        weight_div = soup.find('div', class_=lambda c: c and 'text-sum' in c)
        if weight_div:
            weight_text = weight_div.get_text().replace(',', '.')
            match = re.search(r'\d+(?:\.\d+)?', weight_text)
            if match:
                base_weight = float(match.group())

        calories = 0.0
        cal_input = soup.find('input', id='calculatedEnergyValueInit')
        if cal_input and cal_input.get('value'):
            calories = float(cal_input['value'])
        
        def get_nutrient_value(nutrient_name: str) -> float:
            blocks = soup.find_all('div', class_='text-subtitle')
            for block in blocks:
                if nutrient_name in block.get_text():
                    divs = block.find_all('div', recursive=False)
                    if divs:
                        raw_text = divs[-1].get_text().replace(',', '.')
                        match = re.search(r'\d+(?:\.\d+)?', raw_text)
                        if match:
                            return float(match.group())
            return 0.0

        proteins = get_nutrient_value('Білки')
        fats = get_nutrient_value('Жири')
        carbs = get_nutrient_value('Вуглеводи')

        return {
            "barcode": barcode,
            "name": name,
            "base_weight_g": base_weight,
            "calories": calories,
            "proteins": proteins,
            "fats": fats,
            "carbs": carbs,
            "image_url": image_url,
            "source_url": product_url
        }

    except Exception as e:
        return {"error": f"Помилка парсингу HTML: {str(e)}"}

async def main():
    test_barcode = "8680751007385" 
    print(f"Пошук штрихкоду: {test_barcode}...")
    
    slug = await fetch_product_slug(test_barcode)
    
    if slug:
        print(f"Знайдено slug: {slug}. Парсимо сторінку...")
        result = await parse_nutrition_info(slug, test_barcode)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Продукт за цим штрихкодом не знайдено.")

if __name__ == "__main__":
    asyncio.run(main())
