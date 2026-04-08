from flask_caching import Cache

# Simple in-memory cache for mini-project usage.
cache = Cache(
    config={
        "CACHE_TYPE": "SimpleCache",
        "CACHE_DEFAULT_TIMEOUT": 300,
    }
)
