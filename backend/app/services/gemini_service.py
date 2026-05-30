import json
from ollama import chat, AsyncClient

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


async def generate_recipes(products: list[dict], include_grocery: bool = False):
    product_list = "\n".join(
        f"- {p['name']} ({p.get('category', '')}, {p.get('quantity', 1)} {p.get('unit', 'шт')})"
        for p in products
    )

    if include_grocery:
        grocery_rule = "You CAN use extra ingredients. List all missing items strictly under '### Треба докупити:'."
    else:
        grocery_rule = "Use ONLY the provided ingredients. Do NOT add anything new. NEVER output the '### Треба докупити:' section."

    prompt = f"""You are a culinary AI assistant. 
    Available ingredients:
    {product_list}

    TASK: Suggest 5 diverse recipes based on available ingredients.

    CRITICAL CONSTRAINT 1: {grocery_rule}
    CRITICAL CONSTRAINT 2: Respond strictly in Ukrainian.
    CRITICAL CONSTRAINT 3: Do NOT use emojis.
    CRITICAL CONSTRAINT 4: Separate recipes ONLY with `---`.
    CRITICAL CONSTRAINT 5: Follow the exact Markdown template and headers below.

    Template:
    ## [Recipe Name]
    [Short description, 1-2 sentences]

    **Час:** [Time] | **Складність:** [Difficulty]

    ### Інгредієнти:
    - [Ingredient 1]

    ### Треба докупити:
    - [Missing ingredient]

    ### Приготування:
    1. [Step 1]
    """

    try:
        client = AsyncClient()
        async for chunk in await client.chat(
            model=VISION_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            stream=True,
            keep_alive=-1,
            options={'num_gpu': 42}
        ):
            content = chunk.get('message', {}).get('content', '')
            if content:
                yield content
    except Exception as e:
        print(f"Error streaming recipes: {e}")
        yield "\n\n**Помилка:** Не вдалося згенерувати рецепти."


async def stream_diet_recommendations(consumed_data: list[dict]):
    if not consumed_data:
        yield "Недостатньо даних для аналізу раціону. Починайте фіксувати споживання продуктів!"
        return

    consumed_list = "\n".join(
        f"- {item['product_name']} ({item.get('category', '')}): {item.get('total_quantity', 1)} {item.get('unit', 'шт')}"
        for item in consumed_data
    )

    prompt = f"""You are a concise nutritionist.
    Consumed food list:
    {consumed_list}

    TASK: Analyze the diet and provide improvement tips.

    CRITICAL CONSTRAINT 1: Respond strictly in Ukrainian.
    CRITICAL CONSTRAINT 2: The analysis must be ultra-concise (1-2 sentences max).
    CRITICAL CONSTRAINT 3: Do NOT use emojis.
    CRITICAL CONSTRAINT 4: Follow the exact Markdown template and headers below.

    Template:
    **Загальний аналіз:** [Your 1-2 sentences analysis here]
    ---
    **Поради:**
    * [Tip 1]
    * [Tip 2]
    * [Tip 3]
    """

    try:
        client = AsyncClient()
        async for chunk in await client.chat(
            model=VISION_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            stream=True,
            keep_alive=-1,
            options={'num_gpu': 42}
        ):
            content = chunk.get('message', {}).get('content', '')
            if content:
                yield content
    except Exception as e:
        print(f"Error streaming recommendations: {e}")
        yield "\n\n**Помилка:** Не вдалося завершити генерацію рекомендацій."