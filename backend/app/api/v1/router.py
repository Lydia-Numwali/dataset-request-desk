from fastapi import APIRouter
from app.api.v1 import auth, users, episodes, requests, analytics

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(episodes.router, prefix="/episodes", tags=["Episodes"])
api_router.include_router(requests.router, prefix="/requests", tags=["Requests"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
