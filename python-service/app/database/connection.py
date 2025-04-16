import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase_client: Client | None = None

def init_supabase_client():
    """Initializes the Supabase client."""
    global supabase_client
    print("Attempting to initialize Supabase client...") # Add this
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file.")
        return

    try:
        supabase_client = create_client(url, key)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"--- DETAILED ERROR during Supabase client init ---") # Add this
        import traceback
        traceback.print_exc() # Print the full exception details
        print(f"---------------------------------------------------")
        supabase_client = None

# Call initialization when the module is loaded
init_supabase_client()

def get_supabase_client() -> Client:
    """
    Get the initialized Supabase client instance.

    Raises:
        Exception: If the client hasn't been initialized successfully.
    """
    if supabase_client is None:
        # This should ideally not happen if init is called on load and handles errors
        # Re-attempt initialization or raise a clear error
        print("Warning: Supabase client accessed before successful initialization.")
        init_supabase_client() # Attempt to init again
        if supabase_client is None:
             raise Exception("Supabase client is not initialized. Check environment variables and connection.")
    return supabase_client
