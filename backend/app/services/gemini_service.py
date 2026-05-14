import json
import google.generativeai as genai
from app.core.config import get_settings

settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)


def analyze_product_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = """Ти — асистент, що розпізнає продукти харчування.
Подивись на це зображення і визнач, чи є там продукт харчування.

Якщо це продукт харчування — поверни JSON:
{"name": "Назва українською", "category": "категорія", "estimated_shelf_life_days": кількість_днів}

Категорія має бути однією з: Молочні продукти, М'ясо та риба, Овочі, Фрукти, Зелень, Хліб та випічка, Напої, Консерви, Крупи та злаки, Заморожені продукти, Соуси та приправи, Солодощі, Інше

Якщо це НЕ продукт харчування — поверни JSON:
{"error": "Продукт не знайдено"}

Поверни ТІЛЬКИ JSON без зайвого тексту."""

    image_part = {"mime_type": mime_type, "data": image_bytes}
    response = model.generate_content([prompt, image_part])

    try:
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except (json.JSONDecodeError, IndexError):
        return {"error": "Не вдалося розпізнати продукт"}


def generate_recipes(products: list[dict], include_grocery: bool = False) -> dict:
    model = genai.GenerativeModel("gemini-2.5-flash")

    product_list = "\n".join(
        f"- {p['name']} ({p.get('category', '')}, {p.get('quantity', 1)} {p.get('unit', 'шт')})"
        for p in products
    )

    prompt = f"""Ти — кулінарний асистент. В холодильнику користувача є такі продукти:
{product_list}

Запропонуй 5 різних страв, які можна приготувати з цих продуктів (або з більшості з них).
{"Також врахуй, що користувач може докупити деякі додаткові продукти." if include_grocery else "Використовуй лише наявні продукти."}

Поверни JSON у форматі:
{{
  "recipes": [
    {{
      "name": "Назва страви",
      "description": "Короткий опис (1-2 речення)",
      "cooking_time": "30 хвилин",
      "difficulty": "Легко/Середньо/Важко",
      "ingredients": ["інгредієнт 1", "інгредієнт 2"],
      "missing_ingredients": ["чого не вистачає"],
      "instructions": ["Крок 1", "Крок 2", "Крок 3"]
    }}
  ]
}}

Поверни ТІЛЬКИ JSON без зайвого тексту."""

    response = model.generate_content(prompt)

    try:
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except (json.JSONDecodeError, IndexError):
        return {"recipes": []}


def generate_diet_recommendations(consumed_data: list[dict]) -> dict:
    model = genai.GenerativeModel("gemini-2.5-flash")

    if not consumed_data:
        return {"recommendations": "Недостатньо даних для аналізу раціону. Починайте фіксувати споживання продуктів!"}

    consumed_list = "\n".join(
        f"- {item['product_name']} ({item.get('category', '')}): {item.get('total_quantity', 1)} {item.get('unit', 'шт')}"
        for item in consumed_data
    )

    prompt = f"""Ти — дієтолог. Ось список продуктів, які користувач споживав нещодавно:
{consumed_list}

Дай персоналізовані рекомендації щодо раціону харчування: що не вистачає, чого забагато, що варто додати до раціону.
Відповідай українською мовою. Будь конкретним і корисним.

Поверни JSON:
{{
  "recommendations": "текст рекомендацій",
  "tips": ["порада 1", "порада 2", "порада 3"]
}}

Поверни ТІЛЬКИ JSON."""

    response = model.generate_content(prompt)

    try:
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except (json.JSONDecodeError, IndexError):
        return {"recommendations": "Не вдалося сформувати рекомендації", "tips": []}
