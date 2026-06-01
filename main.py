def main() -> None:
    """Run the local API server."""
    import uvicorn

    uvicorn.run("backend.digital_sensei.app:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
