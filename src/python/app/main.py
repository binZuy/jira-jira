# --- START OF app/main.py ---
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager # Optional: for lifespan manager
import uvicorn # For the __main__ block

# --- Core Application Import ---
# Import the single, consolidated router from the correct location
from app.api.v1 import hotel

# --- Optional: Database Initialization on Startup ---
# Uncomment these lines if you want to use the lifespan manager
# to ensure the Supabase client is initialized when the app starts.
# from app.database.connection import init_supabase_client, get_supabase_client

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     """Handles application startup and shutdown events."""
#     print("Application startup...")
#     init_supabase_client() # Initialize Supabase client
#     client = get_supabase_client() # Verify client is available
#     if client is None:
#          print("FATAL: Supabase client could not be initialized.")
#          # You might want to raise an error or handle this failure scenario
#     else:
#          print("Supabase client check successful.")
#     yield
#     print("Application shutdown.")

# --- Initialize FastAPI App ---
app = FastAPI(
    title="Hotel Management System API",
    description="API for managing hotel rooms, tickets, users via standard endpoints and a natural language agent.",
    version="1.0.0",
    # lifespan=lifespan # Uncomment to enable the lifespan manager
)

# --- Configure CORS ---
# Define allowed origins for Cross-Origin Resource Sharing
allowed_origins = [
    "http://localhost:3000",          # Local  
    # Add any other origins as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,    # List of allowed origins
    allow_credentials=True,           # Allow cookies
    allow_methods=["*"],              # Allow all standard HTTP methods
    allow_headers=["*"],              # Allow all headers
)

# --- Include the Main API Router ---
# All functional endpoints (CRUD for rooms/tickets/users, agent query)
# are defined within the 'hotel' router.
app.include_router(hotel.router, prefix="/api/v1/hotel")

# --- Basic Root Endpoint ---
@app.get("/", tags=["Root"])
async def read_root():
    """Provides a simple welcome message for the API root."""
    return {"message": "Welcome to the Hotel Management System API"}

# --- Run Command (for local development) ---
# This block allows running the app directly using `python -m app.main`
if __name__ == "__main__":
    print("Starting Uvicorn server for local development...")
    # Use "app.main:app" to specify the location of the FastAPI 'app' instance
    # reload=True enables auto-reloading during development
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
