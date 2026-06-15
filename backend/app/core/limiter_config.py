# Free-tier usage limits per quota window.
# Set all three to a low number so AI credits are not burned during demo/dev.
PHOTO_UPLOADS_LIMIT = 10
RECIPE_GENERATIONS_LIMIT = 10
ANALYTICS_GENERATIONS_LIMIT = 10

# How long (minutes) before the quota counters reset for free users.
# 1440 = 24 h — one natural day. Drop to 60 for testing, 5 for rapid local demos.
LIMIT_RESET_MINUTES = 5
