import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Change to the backend directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    from app.main import app
    
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    print(f"Starting MyTracker API on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
