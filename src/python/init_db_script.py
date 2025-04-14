#!/usr/bin/env python3
"""
Database initialization script for the hotel management system.
This script connects to Supabase and initializes the database with sample data.
"""

import os
import asyncio
from dotenv import load_dotenv
from app.database.init_db import init_database
from app.database.connection import supabase

async def main():
    """Initialize the database with sample data."""
    print("Starting database initialization...")
    
    # Check Supabase connection
    try:
        # Simple query to check connection
        response = supabase.table('rooms').select('count').execute()
        print(f"✅ Successfully connected to Supabase!")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {str(e)}")
        print("Please check your SUPABASE_URL and SUPABASE_KEY environment variables.")
        return
    
    # Initialize database
    try:
        print("\nInitializing database with sample data...")
        init_database()
        print("✅ Database initialized successfully!")
    except Exception as e:
        print(f"❌ Error initializing database: {str(e)}")

if __name__ == "__main__":
    # Check if .env file exists and load it
    if os.path.exists(".env"):
        load_dotenv()
        print("Loaded environment variables from .env file")
    
    # Check if Supabase credentials are set
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
        print("Supabase credentials not found in environment variables.")
        supabase_url = input("Enter your Supabase URL: ")
        supabase_key = input("Enter your Supabase API Key: ")
        
        # Set environment variables
        os.environ["SUPABASE_URL"] = supabase_url
        os.environ["SUPABASE_KEY"] = supabase_key
        print("Credentials set for this session.")
    
    # Run the initialization
    asyncio.run(main())
