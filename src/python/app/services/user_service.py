from typing import List, Optional
from ..schemas.schemas import User, UserCreate, UserUpdate # Import updated schemas
from supabase import Client, PostgrestAPIResponse

class UserService:
    DEFAULT_LIMIT = 100

    @staticmethod
    async def get_users(db: Client, skip: int = 0, limit: int = DEFAULT_LIMIT) -> List[User]:
        # Implement similar to TicketService.get_tickets
        try:
            response: PostgrestAPIResponse = db.table('users').select('*')\
                .order('full_name')\
                .range(skip, skip + limit - 1)\
                .execute()
            return [User(**user) for user in response.data] if response.data else []
        except Exception as e:
            print(f"Error getting users: {e}")
            return []

    @staticmethod
    async def get_user(db: Client, user_id: int) -> Optional[User]:
        # Implement similar to TicketService.get_ticket
        try:
            response: PostgrestAPIResponse = db.table('users').select('*')\
                .eq('id', user_id).maybe_single().execute()
            return User(**response.data) if response.data else None
        except Exception as e:
            print(f"Error getting user {user_id}: {e}")
            return None

    @staticmethod
    async def get_user_by_email(db: Client, email: str) -> Optional[User]:
         try:
            response: PostgrestAPIResponse = db.table('users').select('*')\
                .eq('email', email).maybe_single().execute()
            return User(**response.data) if response.data else None
         except Exception as e:
            print(f"Error getting user by email {email}: {e}")
            return None

    @staticmethod
    async def create_user(db: Client, user: UserCreate) -> Optional[User]:
        # Implement similar to TicketService.create_ticket
        # Add check for existing email
        try:
            existing_user = await UserService.get_user_by_email(db, user.email)
            if existing_user:
                 print(f"User creation failed: Email '{user.email}' already exists.")
                 # Optionally raise a specific exception
                 return None

            user_data = user.model_dump(mode='json')
            response: PostgrestAPIResponse = db.table('users').insert(user_data).execute()
            if not response.data: return None
            created_id = response.data[0]['id']
            return await UserService.get_user(db, created_id)
        except Exception as e:
            print(f"Error creating user: {e}")
            # Handle specific Supabase errors (e.g., unique constraint violation)
            return None # Or raise

    @staticmethod
    async def update_user(db: Client, user_id: int, user_update: UserUpdate) -> Optional[User]:
        # Implement similar to TicketService.update_ticket
        # Add check if new email is already taken
        try:
            update_data = user_update.model_dump(exclude_unset=True, mode='json')
            update_data = {k: v for k, v in update_data.items() if v is not None}

            if not update_data:
                return await UserService.get_user(db, user_id)

            # Check for email conflict if email is being updated
            if 'email' in update_data:
                 existing_user = await UserService.get_user_by_email(db, update_data['email'])
                 if existing_user and existing_user.id != user_id:
                     print(f"User update failed: Email '{update_data['email']}' already taken.")
                     # Optionally raise a specific exception
                     return None # Or prevent update

            response: PostgrestAPIResponse = db.table('users').update(update_data).eq('id', user_id).execute()
            return await UserService.get_user(db, user_id)
        except Exception as e:
            print(f"Error updating user {user_id}: {e}")
            return None # Or raise

    @staticmethod
    async def delete_user(db: Client, user_id: int) -> bool:
        # Implement similar to TicketService.delete_ticket
        # Add check for assigned tickets
        try:
            # Check if user created or is assigned to any tickets
            assigned_tickets = db.table('tickets').select('id').eq('assigned_to', user_id).limit(1).execute()
            created_tickets = db.table('tickets').select('id').eq('created_by', user_id).limit(1).execute()

            if assigned_tickets.data or created_tickets.data:
                print(f"Cannot delete user {user_id}: User is associated with tickets.")
                return False # Or raise specific error

            response: PostgrestAPIResponse = db.table('users').delete().eq('id', user_id).execute()
            return True # Assume success if no error
        except Exception as e:
            print(f"Error deleting user {user_id}: {e}")
            return False
