from fastapi import FastAPI

app = FastAPI(
    title="NEXUS Intelligence",
    description="AI-Powered Criminal Network Analysis System",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "system": "NEXUS Intelligence",
        "status": "online",
        "version": "0.1.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }