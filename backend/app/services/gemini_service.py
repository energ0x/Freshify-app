import json
from ollama import chat

VISION_MODEL = "gemma4:e4b"
TEXT_MODEL = "gemma3:4b"

def analyze_product_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    prompt = """Ти — асистент, що розпізнає продукти харчування.
Подивись на це зображення і визнач, чи є там продукт харчування.
Якщо це продукт харчування — поверни JSON:
{"name": "Назва українською", "category": "категорія", "estimated_shelf_life_days": кількість_днів}
Категорія має бути однією з: Молочні продукти, М'ясо та риба, Овочі, Фрукти, Зелень, Хліб та випічка, Напої, Консерви, Крупи та злаки, Заморожені продукти, Соуси та приправи, Солодощі, Інше
Якщо це НЕ продукт харчування — поверни JSON:
{"error": "Продукт не знайдено"}"""

    try:
        response = chat(
            model=VISION_MODEL,
            messages=[{'role': 'user', 'content': prompt, 'images': [image_bytes]}],
            format='json',
            keep_alive=-1,
            options={
                'num_gpu': 42,
                'num_ctx': 2048
            }
        )
        return json.loads(response['message']['content'])
    except Exception:
        return {"error": "Не вдалося розпізнати продукт"}


def generate_recipes(products: list[dict], include_grocery: bool = False) -> dict:
    product_list = "\n".join(
        f"- {p['name']} ({p.get('category', '')}, {p.get('quantity', 1)} {p.get('unit', 'шт')})"
        for p in products
    )

    prompt = f"""Ти — кулінарний асистент. В холодильнику є такі продукти:
{product_list}
Запропонуй 5 різних страв з цих продуктів.
{"Врахуй, що користувач може докупити додаткові продукти." if include_grocery else "Використовуй лише наявні продукти."}

Поверни JSON:
{{
  "recipes": [
    {{
      "name": "Назва",
      "description": "Короткий опис",
      "cooking_time": "30 хвилин",
      "difficulty": "Легко",
      "ingredients": ["інгредієнт 1"],
      "missing_ingredients": ["чого не вистачає"],
      "instructions": ["Крок 1"]
    }}
  ]
}}"""

    try:
        response = chat(
            model=TEXT_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            format='json',
            keep_alive=-1,
            options={
                'num_gpu': 99,
                'num_ctx': 4096
            }
        )
        return json.loads(response['message']['content'])
    except Exception:
        return {"recipes": []}


def generate_diet_recommendations(consumed_data: list[dict]) -> dict:
    if not consumed_data:
        return {"recommendations": "Недостатньо даних для аналізу раціону. Починайте фіксувати споживання продуктів!"}

    consumed_list = "\n".join(
        f"- {item['product_name']} ({item.get('category', '')}): {item.get('total_quantity', 1)} {item.get('unit', 'шт')}"
        for item in consumed_data
    )

    prompt = f"""Ти — дієтолог. Список нещодавно спожитих продуктів:
{consumed_list}
Дай персоналізовані рекомендації українською: чого не вистачає, чого забагато.
Поверни JSON:
{{
  "recommendations": "текст рекомендацій",
  "tips": ["порада 1", "порада 2"]
}}"""

    try:
        response = chat(
            model=TEXT_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            format='json',
            keep_alive=-1,
            options={
                'num_gpu': 99
            }
        )
        return json.loads(response['message']['content'])
    except Exception:
        return {"recommendations": "Не вдалося сформувати рекомендації", "tips": []}