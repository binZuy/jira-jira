import os
import sys
from datetime import datetime, time # Import time

# Ensure the app directory is in the Python path
# Adjust the path depth (../) based on where you place the scripts folder
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Now import from the app structure
try:
    from app.database.connection import get_supabase_client
except ImportError as e:
     print(f"Error importing Supabase client. Make sure PYTHONPATH is correct or run from project root.")
     print(f"Current sys.path: {sys.path}")
     print(f"Details: {e}")
     sys.exit(1)


async def seed_database():
    """Inserts sample data into existing tables."""
    supabase = get_supabase_client() # Get the initialized client
    if not supabase:
        print("Supabase client not available. Aborting seeding.")
        return False

    print("Attempting to insert sample data...")

    try:
        # === Insert sample data for rooms ===
        print("\n--- Seeding Rooms ---")
        rooms_data = [
            {
                'room_number': '101', 'floor': 1, 'room_type': 'Standard', 'capacity': 2,
                'room_status': 'Available', 'cleaning_status': 'Clean', 'cleaning_priority': 'Low',
                'last_cleaned': datetime.now().isoformat(), 'notes': 'Garden view'
            },
            {
                'room_number': '102', 'floor': 1, 'room_type': 'Standard', 'capacity': 2,
                'room_status': 'Occupied', 'cleaning_status': 'Dirty', 'cleaning_priority': 'Medium', # Changed from High for variety
                'last_cleaned': datetime(2023, 10, 25, 10, 0, 0).isoformat(), 'notes': None
            },
             {
                'room_number': '103', 'floor': 1, 'room_type': 'Standard', 'capacity': 2,
                'room_status': 'Needs Cleaning', 'cleaning_status': 'Dirty', 'cleaning_priority': 'High',
                'last_cleaned': datetime(2023, 10, 26, 9, 0, 0).isoformat(), 'notes': 'Needs immediate attention'
            },
            {
                'room_number': '201', 'floor': 2, 'room_type': 'Deluxe', 'capacity': 3,
                'room_status': 'Available', 'cleaning_status': 'Clean', 'cleaning_priority': 'Medium',
                'last_cleaned': datetime.now().isoformat(), 'notes': 'Balcony, sea view'
            },
             {
                'room_number': '202', 'floor': 2, 'room_type': 'Suite', 'capacity': 4,
                'room_status': 'Out of Service', 'cleaning_status': 'Clean', 'cleaning_priority': 'Low',
                'last_cleaned': datetime(2023, 10, 20, 14, 0, 0).isoformat(), 'notes': 'Under renovation'
            }
        ]

        # Use upsert to avoid errors if data already exists (based on unique room_number)
        response = supabase.table('rooms').upsert(rooms_data, on_conflict='room_number').execute()
        if response.data:
             print(f"Upserted {len(response.data)} rooms.")
        if hasattr(response, 'error') and response.error:
            print(f"Error upserting rooms: {response.error}")


        # === Insert sample users ===
        print("\n--- Seeding Users ---")
        users_data = [
            {
                'full_name': 'Alice Manager', 'email': 'alice.manager@hotel.com', 'role': 'Manager',
                'start_time': time(9, 0).isoformat(), 'end_time': time(17, 0).isoformat(), 'credit': 200
            },
            {
                'full_name': 'Bob Housekeeper', 'email': 'bob.housekeeper@hotel.com', 'role': 'Housekeeper',
                'start_time': time(8, 0).isoformat(), 'end_time': time(16, 0).isoformat(), 'credit': 100
            },
             {
                'full_name': 'Charlie Housekeeper', 'email': 'charlie.housekeeper@hotel.com', 'role': 'Housekeeper',
                'start_time': time(14, 0).isoformat(), 'end_time': time(22, 0).isoformat(), 'credit': 100
            },
            {
                'full_name': 'Diana Director', 'email': 'diana.director@hotel.com', 'role': 'Director',
                'start_time': time(9, 0).isoformat(), 'end_time': time(17, 0).isoformat(), 'credit': 500
            }
        ]
        response = supabase.table('users').upsert(users_data, on_conflict='email').execute()
        if response.data:
             print(f"Upserted {len(response.data)} users.")
        if hasattr(response, 'error') and response.error:
            print(f"Error upserting users: {response.error}")


        # === Fetch IDs for Ticket Creation ===
        print("\n--- Fetching IDs for Tickets ---")
        rooms_resp = supabase.table('rooms').select('id, room_number').in_('room_number', ['102', '103', '201']).execute()
        users_resp = supabase.table('users').select('id, email').in_('email', ['alice.manager@hotel.com', 'bob.housekeeper@hotel.com', 'charlie.housekeeper@hotel.com']).execute()

        if hasattr(rooms_resp, 'error') or hasattr(users_resp, 'error') or not rooms_resp.data or not users_resp.data:
            print("Error fetching Room or User IDs. Cannot seed tickets accurately.")
            print(f"Room fetch error: {getattr(rooms_resp, 'error', 'None')}")
            print(f"User fetch error: {getattr(users_resp, 'error', 'None')}")
        else:
            rooms_map = {r['room_number']: r['id'] for r in rooms_resp.data}
            users_map = {u['email']: u['id'] for u in users_resp.data}

            print("Fetched IDs successfully.")

            # === Insert sample tickets ===
            print("\n--- Seeding Tickets ---")
            tickets_data = [
                {
                    'room_id': rooms_map.get('102'), 'description': 'AC not cooling properly.', 'status': 'Open',
                    'priority': 'High', 'assigned_to': users_map.get('bob.housekeeper@hotel.com'),
                    'created_by': users_map.get('alice.manager@hotel.com'), 'due_time': datetime(2023, 10, 28, 17, 0, 0).isoformat()
                },
                {
                    'room_id': rooms_map.get('103'), 'description': 'Room requires deep cleaning.', 'status': 'Open',
                    'priority': 'High', 'assigned_to': users_map.get('charlie.housekeeper@hotel.com'),
                    'created_by': users_map.get('alice.manager@hotel.com'), 'due_time': datetime(2023, 10, 27, 12, 0, 0).isoformat()
                },
                 {
                    'room_id': rooms_map.get('201'), 'description': 'Remote control batteries need replacement.', 'status': 'In Progress',
                    'priority': 'Low', 'assigned_to': users_map.get('bob.housekeeper@hotel.com'),
                    'created_by': users_map.get('alice.manager@hotel.com'), 'due_time': None # Optional due time
                },
                {
                    'room_id': rooms_map.get('102'), 'description': 'Guest requested extra towels.', 'status': 'Resolved',
                    'priority': 'Medium', 'assigned_to': users_map.get('bob.housekeeper@hotel.com'),
                    'created_by': users_map.get('alice.manager@hotel.com'), 'due_time': datetime(2023, 10, 26, 11, 0, 0).isoformat()
                }
            ]

            # Filter out tickets where FK IDs couldn't be found
            valid_tickets_data = [t for t in tickets_data if t['room_id'] and t['assigned_to'] and t['created_by']]
            skipped_count = len(tickets_data) - len(valid_tickets_data)
            if skipped_count > 0:
                 print(f"Warning: Skipped {skipped_count} tickets due to missing room/user references.")

            if valid_tickets_data:
                 # Insert tickets (cannot easily upsert without a unique constraint other than ID)
                 # Consider adding a unique constraint (e.g., room_id + description + created_at) if needed
                 # For seeding, we'll just insert. Re-running might create duplicates.
                 # Clear existing tickets first for idempotent seeding?
                 # print("Clearing existing tickets...")
                 # supabase.table('tickets').delete().neq('id', 0).execute() # Deletes all rows

                 response = supabase.table('tickets').insert(valid_tickets_data).execute()
                 if response.data:
                     print(f"Inserted {len(response.data)} tickets.")
                 if hasattr(response, 'error') and response.error:
                     print(f"Error inserting tickets: {response.error}")
            else:
                 print("No valid ticket data to insert.")


        print("\nDatabase seeding completed!")
        return True

    except Exception as e:
        import traceback
        print(f"\nAn error occurred during database seeding: {str(e)}")
        print(traceback.format_exc()) # Print full traceback
        return False

# Make the script runnable
if __name__ == "__main__":
    import asyncio
    print("Running database seeding script...")
    # Supabase client uses httpx which often requires an async context
    async def main():
        success = await seed_database()
        if success:
            print("Seeding finished successfully.")
        else:
            print("Seeding finished with errors.")

    asyncio.run(main())
