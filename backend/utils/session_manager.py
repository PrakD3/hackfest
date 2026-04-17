"""Redis-backed session manager for persisting analysis sessions across restarts."""

import json
import os
import redis.asyncio as redis
from utils.logger import get_logger

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
_redis_client = None
logger = get_logger("session_manager")


async def get_redis():
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = await redis.from_url(REDIS_URL, decode_responses=True)
            await _redis_client.ping()
            logger.info(f"Redis connected: {REDIS_URL}")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Sessions will be in-memory only.")
            _redis_client = None
    return _redis_client


async def save_session(session_id: str, state: dict) -> bool:
    """Save session to Redis with 24-hour TTL. Returns True if successful."""
    try:
        r = await get_redis()
        if not r:
            logger.debug(f"Redis unavailable, skipping persistence for session {session_id}")
            return False
        
        await r.setex(
            f"session:{session_id}",
            86400,  # 24 hours
            json.dumps(state, default=str)
        )
        logger.debug(f"Session {session_id} saved to Redis")
        return True
    except Exception as e:
        logger.error(f"Failed to save session {session_id} to Redis: {e}")
        return False


async def get_session(session_id: str) -> dict | None:
    """Retrieve session from Redis. Returns None if not found or Redis unavailable."""
    try:
        r = await get_redis()
        if not r:
            logger.debug(f"Redis unavailable, cannot retrieve session {session_id}")
            return None
        
        data = await r.get(f"session:{session_id}")
        if data:
            logger.debug(f"Session {session_id} retrieved from Redis")
            return json.loads(data)
        return None
    except Exception as e:
        logger.error(f"Failed to retrieve session {session_id} from Redis: {e}")
        return None


async def delete_session(session_id: str) -> bool:
    """Delete session from Redis. Returns True if successful."""
    try:
        r = await get_redis()
        if not r:
            return False
        
        await r.delete(f"session:{session_id}")
        logger.debug(f"Session {session_id} deleted from Redis")
        return True
    except Exception as e:
        logger.error(f"Failed to delete session {session_id} from Redis: {e}")
        return False


async def close_redis():
    """Close Redis connection gracefully."""
    global _redis_client
    if _redis_client:
        try:
            await _redis_client.close()
            _redis_client = None
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis: {e}")
