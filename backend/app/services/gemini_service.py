import json
import logging
from google import genai
from google.genai import types
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

api_key = str(settings.gemini_api_key) if settings.gemini_api_key else None
client = genai.Client(api_key=api_key) if api_key else None

MODEL_NAME = "gemini-2.5-flash"


async def analyze_product_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    user_allergens: list[str] | None = None,
    available_categories: list[str] | None = None,
) -> dict:
    allergens_prompt = (
        f"User is allergic to: {', '.join(user_allergens)}." if user_allergens
        else "User has no known allergies."
    )
    categories_prompt = (
        f"Available categories: {', '.join(available_categories)}." if available_categories
        else "No categories available."
    )

    prompt = f"""You are a food recognition assistant.
Analyze the image and identify ALL food products visible (e.g. from a receipt or multiple items on a table).

1.  **Identify the products** and their names in Ukrainian.
2.  **Categorize the products.** Choose the BEST category ONLY from this list: {categories_prompt}
3.  **Check for allergens.** The user's allergies are: {allergens_prompt}. Do the products contain any of these?
4.  **Estimate shelf life.** Provide the estimated number of days the product stays fresh.

Respond with a JSON object following this exact format:
{{
  "products": [
    {{
      "name": "Назва українською",
      "category": "Одна з доступних категорій",
      "estimated_shelf_life_days": int,
      "has_allergen": boolean
    }}
  ]
}}

If the image does not contain any food products, return:
{{
  "error": "Продукти не знайдено",
  "products": []
}}"""

    if not client:
        return {"error": "Gemini API ключ не налаштовано"}

    try:
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        config = types.GenerateContentConfig(response_mime_type="application/json")

        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=[prompt, image_part],
            config=config,
        )
        return json.loads(response.text or "{}")
    except Exception as e:
        logger.error("Error analyzing product image: %s", e)
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            return {"error": "Ліміт запитів до ШІ вичерпано. Спробуйте пізніше."}
        return {"error": "Не вдалося розпізнати продукт"}


async def generate_recipes(
    products: list[dict],
    user_diet: str | None = None,
    user_allergens: list[str] | None = None,
    include_grocery: bool = False,
):
    product_list = "\n".join(
        f"- {p['name']} ({p.get('category', '')}, {p.get('quantity', 1)} {p.get('unit', 'шт')})"
        for p in products
    )

    diet_prompt = (
        f"User's diet: {user_diet}." if user_diet and user_diet != "none"
        else "User has no specific diet."
    )
    allergens_prompt = (
        f"User is allergic to: {', '.join(user_allergens)}." if user_allergens
        else "User has no known allergies."
    )

    if include_grocery:
        grocery_rule = "You CAN use extra ingredients. List all missing items strictly under '### Треба докупити:'."
    else:
        grocery_rule = "Use ONLY the provided ingredients. Do NOT add anything new. NEVER output the '### Треба докупити:' section."

    prompt = f"""You are a culinary AI assistant.
        Available ingredients:
        {product_list}

        USER CONSTRAINTS:
        - Diet: {diet_prompt}
        - Allergies: {allergens_prompt}

        TASK: Suggest 5 diverse recipes based on available ingredients, strictly adhering to the user's diet and allergy constraints.

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

    if not client:
        yield "\n\n**Помилка:** Gemini API ключ не налаштовано."
        return

    try:
        response_stream = await client.aio.models.generate_content_stream(
            model=MODEL_NAME,
            contents=prompt,
        )

        async for chunk in response_stream:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        logger.error("Error streaming recipes: %s", e)
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            yield "\n\n**Ліміт запитів до ШІ вичерпано.** Спробуйте пізніше."
            return
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

    if not client:
        yield "\n\n**Помилка:** Gemini API ключ не налаштовано."
        return

    try:
        response_stream = await client.aio.models.generate_content_stream(
            model=MODEL_NAME,
            contents=prompt,
        )

        async for chunk in response_stream:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        logger.error("Error streaming recommendations: %s", e)
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            yield "\n\n**Ліміт запитів до ШІ вичерпано.** Спробуйте пізніше."
            return
        yield "\n\n**Помилка:** Не вдалося завершити генерацію рекомендацій."
