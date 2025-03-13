import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"],
        workers=1,
        ws_ping_interval=None,
        ws_ping_timeout=None,
        timeout_keep_alive=0
    ) 