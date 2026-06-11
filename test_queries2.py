import sys
import traceback
sys.path.append('C:\\Users\\S0RBEX\\Desktop\\freshfy\\Freshify-app\\backend')
from app.db.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID'))
        conn.execute(text('ALTER TABLE products DROP COLUMN IF EXISTS category'))
        
        conn.execute(text('ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS category_id UUID'))
        conn.execute(text('ALTER TABLE grocery_items DROP COLUMN IF EXISTS category'))
    print('Successfully updated products and grocery_items')
except Exception as e:
    print('Error:')
    traceback.print_exc()
