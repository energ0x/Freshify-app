"""
Rate Limiter Configuration for Free-Tier Usage.

This module defines the quota limits and reset window durations for free users.
These limits prevent overuse of AI and third-party APIs (e.g., photo analysis,
recipe generation, and analytics reports) during development and demonstrations.
"""

# Free-tier usage limits per quota window.
# Set all three to a low number so AI credits are not burned during demo/dev.

# Maximum number of product photo uploads/analyses allowed for a free user per reset window.
PHOTO_UPLOADS_LIMIT = 10

# Maximum number of AI recipe generations allowed for a free user per reset window.
RECIPE_GENERATIONS_LIMIT = 10

# Maximum number of AI analytics/insights generations allowed for a free user per reset window.
ANALYTICS_GENERATIONS_LIMIT = 10

# How long (in minutes) before the quota counters reset for free users.
# 1440 = 24 hours — one natural day. Drop to 60 for testing, or 5 for rapid local demos.
LIMIT_RESET_MINUTES = 5
