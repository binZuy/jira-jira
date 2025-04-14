from typing import List, Optional, Dict, Any
# Import updated schemas and enums
from ..schemas.schemas import Ticket, TicketCreate, TicketUpdate, TicketStatusEnum, TicketPriorityEnum, Comment, CommentCreate
from supabase import Client, PostgrestAPIResponse

# Assume enums are defined in schemas or a central place

class TicketServiceError(Exception):
    """Custom exception for TicketService errors."""
    pass

class TicketService:
    DEFAULT_LIMIT = 100

    @staticmethod
    async def _fetch_and_construct_ticket(db: Client, ticket_id: int) -> Optional[Ticket]:
        """Helper to fetch full ticket details after creation/update."""
        try:
            # Use joins to get related names and room number
            response: PostgrestAPIResponse = db.table('tickets').select(
                '*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)'
            ).eq('id', ticket_id).maybe_single().execute()

            data = response.data
            if not data:
                return None

            # Construct the Ticket Pydantic model
            ticket_data = {
                **data,
                "room_number": data.get("rooms", {}).get("room_number") if data.get("rooms") else None,
                "assigned_to_name": data.get("assigned_user", {}).get("full_name") if data.get("assigned_user") else None,
                "created_by_name": data.get("creator", {}).get("full_name") if data.get("creator") else None,
            }
            # Remove helper nested dicts if they exist
            ticket_data.pop("rooms", None)
            ticket_data.pop("assigned_user", None)
            ticket_data.pop("creator", None)

            # Ensure enums are handled correctly if needed (Supabase might return strings)
            # Pydantic should handle validation if types match

            return Ticket(**ticket_data)

        except Exception as e:
            print(f"Error fetching ticket details for {ticket_id}: {e}")
            # Decide on error handling: re-raise, return None, or raise specific error
            raise TicketServiceError(f"Failed to fetch details for ticket {ticket_id}") from e


    @staticmethod
    async def get_tickets(db: Client, skip: int = 0, limit: int = DEFAULT_LIMIT) -> List[Ticket]:
        """Get all tickets with pagination and related info."""
        try:
            response: PostgrestAPIResponse = db.table('tickets').select(
                 '*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)'
            ).order('created_at', desc=True).range(skip, skip + limit - 1).execute()

            tickets_data = response.data or []
            tickets_list = []
            for data in tickets_data:
                 ticket_data = {
                    **data,
                    "room_number": data.get("rooms", {}).get("room_number") if data.get("rooms") else None,
                    "assigned_to_name": data.get("assigned_user", {}).get("full_name") if data.get("assigned_user") else None,
                    "created_by_name": data.get("creator", {}).get("full_name") if data.get("creator") else None,
                 }
                 ticket_data.pop("rooms", None)
                 ticket_data.pop("assigned_user", None)
                 ticket_data.pop("creator", None)
                 tickets_list.append(Ticket(**ticket_data))

            return tickets_list
        except Exception as e:
            print(f"Error getting tickets: {e}")
            # Consider logging the error
            return [] # Return empty list on failure

    @staticmethod
    async def get_ticket(db: Client, ticket_id: int) -> Optional[Ticket]:
        """Get a ticket by ID with related info."""
        try:
            return await TicketService._fetch_and_construct_ticket(db, ticket_id)
        except TicketServiceError:
             # Error already printed in helper, return None as per original logic
            return None
        except Exception as e:
            # Catch unexpected errors
            print(f"Unexpected error getting ticket {ticket_id}: {e}")
            return None


    @staticmethod
    async def create_ticket(db: Client, ticket: TicketCreate) -> Optional[Ticket]:
        """Create a new ticket."""
        try:
            # Convert Pydantic model to dict, ensuring enums are string values
            ticket_data = ticket.model_dump(mode='json')

            # Convert datetime to ISO 8601 string for Supabase if needed
            if ticket_data.get('due_time') and isinstance(ticket_data['due_time'], datetime):
                 ticket_data['due_time'] = ticket_data['due_time'].isoformat()

            response: PostgrestAPIResponse = db.table('tickets').insert(ticket_data).execute()

            if not response.data:
                 raise TicketServiceError("Ticket creation failed, no data returned.")

            created_ticket_id = response.data[0]['id']
            # Fetch the full ticket details using the helper
            return await TicketService._fetch_and_construct_ticket(db, created_ticket_id)
        except Exception as e:
            print(f"Error creating ticket: {e}")
            # Propagate the error or return None/raise custom error
            # raise TicketServiceError(f"Failed to create ticket: {e}") from e
            return None # Or match original behavior by raising

    @staticmethod
    async def update_ticket(db: Client, ticket_id: int, ticket_update: TicketUpdate) -> Optional[Ticket]:
        """Update a ticket by ID."""
        try:
            # Use exclude_unset=True to only include fields explicitly provided
            update_data = ticket_update.model_dump(exclude_unset=True, mode='json')

            # Remove fields that are None, unless explicitly allowed by the DB schema
            update_data = {k: v for k, v in update_data.items() if v is not None}

            if not update_data:
                # If nothing to update, return the current ticket state
                print(f"No update data provided for ticket {ticket_id}.")
                return await TicketService.get_ticket(db, ticket_id)

            # Convert datetime to ISO 8601 string if present
            if update_data.get('due_time') and isinstance(update_data['due_time'], datetime):
                 update_data['due_time'] = update_data['due_time'].isoformat()

            response: PostgrestAPIResponse = db.table('tickets').update(update_data).eq('id', ticket_id).execute()

            # Check if update was successful (e.g., response status or data)
            # Supabase update might not return data if RLS prevents it or no row matches
            # Fetching the ticket again is a good way to confirm/get latest state

            return await TicketService._fetch_and_construct_ticket(db, ticket_id)
        except Exception as e:
            print(f"Error updating ticket {ticket_id}: {e}")
            # raise TicketServiceError(f"Failed to update ticket {ticket_id}: {e}") from e
            return None # Match original behavior

    @staticmethod
    async def delete_ticket(db: Client, ticket_id: int) -> bool:
        """Delete a ticket by ID."""
        try:
            response: PostgrestAPIResponse = db.table('tickets').delete().eq('id', ticket_id).execute()
            # Check if any rows were deleted. Response data might contain the deleted records.
            # Check count or response metadata if available, otherwise assume success if no exception
            # len(response.data) > 0 might be unreliable depending on Supabase return settings (e.g., RLS)
            # A more robust check might involve trying to fetch the ticket after deletion
            # For simplicity, assume success if no error occurs.
            # print(f"Delete response for ticket {ticket_id}: {response}") # Debugging
            return True # Assume success if no exception
        except Exception as e:
            print(f"Error deleting ticket {ticket_id}: {e}")
            return False

    # --- Methods for Comments, History, Search (Keep as is, but ensure joins use correct FK names if needed) ---
    @staticmethod
    async def get_ticket_history(db: Client, ticket_id: int) -> List[Dict[str, Any]]:
        """Get ticket history."""
        # Assuming ticket_history table and users table exist and FKs are correct
        try:
            response = db.table('ticket_history').select(
                '*, changed_by_user:users(full_name)' # Adjust join syntax if needed
            ).eq('ticket_id', ticket_id).order('changed_at', desc=True).execute()
            # Process data to flatten user name if needed
            history_data = response.data or []
            for item in history_data:
                item['changed_by_name'] = item.get('changed_by_user', {}).get('full_name')
                item.pop('changed_by_user', None)
            return history_data
        except Exception as e:
            print(f"Error getting ticket history for ticket {ticket_id}: {e}")
            return []

    @staticmethod
    async def search_tickets(db: Client, search_term: str) -> List[Ticket]:
        """Search tickets by description."""
        try:
            # Use the same select as get_tickets for consistency
            response: PostgrestAPIResponse = db.table('tickets').select(
                 '*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)'
            ).ilike('description', f'%{search_term}%').execute() # Search description

            tickets_data = response.data or []
            tickets_list = []
            for data in tickets_data:
                 ticket_data = {
                    **data,
                    "room_number": data.get("rooms", {}).get("room_number") if data.get("rooms") else None,
                    "assigned_to_name": data.get("assigned_user", {}).get("full_name") if data.get("assigned_user") else None,
                    "created_by_name": data.get("creator", {}).get("full_name") if data.get("creator") else None,
                 }
                 ticket_data.pop("rooms", None)
                 ticket_data.pop("assigned_user", None)
                 ticket_data.pop("creator", None)
                 tickets_list.append(Ticket(**ticket_data))

            return tickets_list
        except Exception as e:
            print(f"Error searching tickets: {e}")
            return []
    
    @staticmethod
    async def get_ticket_comments(db: Client, ticket_id: int) -> List[Comment]:
        """Get comments for a specific ticket, joining user names."""
        try:
            # Adjust join syntax as needed for your Supabase foreign keys
            response = await db.table('ticket_comments').select(
                '*, author:users!ticket_comments_user_id_fkey(full_name)' # Example join
            ).eq('ticket_id', ticket_id).order('created_at', desc=True).execute()

            comments_data = response.data or []
            comments_list = []
            for item in comments_data:
                 comment_data = {
                    **item,
                    "user_full_name": item.get("author", {}).get("full_name") if item.get("author") else None,
                 }
                 comment_data.pop("author", None) # Remove nested object
                 comments_list.append(Comment(**comment_data))
            return comments_list
        except Exception as e:
            print(f"Error getting comments for ticket {ticket_id}: {e}")
            return []

    @staticmethod
    async def add_comment(db: Client, ticket_id: int, comment_data: CommentCreate) -> Optional[Comment]:
        """Add a comment to a ticket."""
        try:
            # Ensure ticket_id from URL is added to payload sent to DB
            db_payload = {
                **comment_data.model_dump(mode='json'),
                'ticket_id': ticket_id,
                # 'created_at' will be handled by DB default typically
            }
            response = await db.table('ticket_comments').insert(db_payload).execute()

            if not response.data:
                 raise TicketServiceError("Comment creation failed, no data returned.")

            # Fetch the created comment with user name join to return full details
            created_comment_id = response.data[0]['id']
            fetch_response = await db.table('ticket_comments').select(
                 '*, author:users!ticket_comments_user_id_fkey(full_name)'
             ).eq('id', created_comment_id).maybe_single().execute()

            if not fetch_response.data:
                 return None # Should not happen if insert succeeded

            item = fetch_response.data
            full_comment_data = {
                 **item,
                 "user_full_name": item.get("author", {}).get("full_name") if item.get("author") else None,
            }
            full_comment_data.pop("author", None)
            return Comment(**full_comment_data)

        except Exception as e:
            print(f"Error adding comment to ticket {ticket_id}: {e}")
            raise TicketServiceError(f"Failed to add comment: {e}") from e

    