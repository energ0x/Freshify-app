import sys
import os
sys.path.append('C:\\Users\\S0RBEX\\Desktop\\freshfy\\Freshify-app\\backend')
from app.core.config import get_settings
settings = get_settings()
print('DB URL:', settings.database_url)
