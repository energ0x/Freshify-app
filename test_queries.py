import sys
import traceback
sys.path.append('C:\\Users\\S0RBEX\\Desktop\\freshfy\\Freshify-app\\backend')
from app.db.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE consumed_products ADD COLUMN IF NOT EXISTS category_id UUID'))
        # If there are foreign keys, we might need to add it:
        # conn.execute(text('ALTER TABLE consumed_products ADD CONSTRAINT fk_consumed_categories FOREIGN KEY (category_id) REFERENCES categories(id)'))
    print('Successfully updated consumed_products')
except Exception as e:
    print('Error:')
    traceback.print_exc()
