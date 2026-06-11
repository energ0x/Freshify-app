import sys
import traceback
sys.path.append('C:\\Users\\S0RBEX\\Desktop\\freshfy\\Freshify-app\\backend')
from app.db.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='grocery_items'"))
        columns = [row[0] for row in res]
        print('Grocery columns:', columns)
except Exception as e:
    print('Error:')
    traceback.print_exc()
