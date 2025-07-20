"""Server script to run the news analysis web API."""

import uvicorn
import os
import sys
from pathlib import Path

# Add the backend src directory to Python path
backend_src = Path(__file__).parent.parent
sys.path.insert(0, str(backend_src))

from webapi.app import app

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Configuration
    host = os.getenv("WEBAPI_HOST", "0.0.0.0")
    port = int(os.getenv("WEBAPI_PORT", "8001"))
    reload = os.getenv("WEBAPI_RELOAD", "true").lower() == "true"
    
    print(f"Starting News Analysis Web API on {host}:{port}")
    print(f"Reload mode: {reload}")
    
    uvicorn.run(
        "webapi.app:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    ) 