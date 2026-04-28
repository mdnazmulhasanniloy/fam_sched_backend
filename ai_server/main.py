from fastapi import FastAPI
from app.routes.api_service import router
import uvicorn

app = FastAPI()

app.include_router(router, prefix="/api/v1")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
