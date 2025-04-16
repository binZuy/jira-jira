# ticket_service.py
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.database.connection import get_supabase_client

# Assuming schemas are in ../schemas relative to services directory
from ..schemas.schemas import (
    Ticket, TicketCreate, TicketUpdate, TicketStatusEnum, TicketPriorityEnum,
    Comment, CommentCreate # Keep comment schemas if using comments
)
from supabase import Client, PostgrestAPIResponse # Use correct PostgREST import if needed

# Setup logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) # Adjust level as needed (INFO, DEBUG)

class TicketServiceError(Exception):
    """Custom exception for TicketService errors."""
    pass

class TicketService:
    DEFAULT_LIMIT = 100

    @staticmethod
    async def _fetch_and_construct_ticket(ticket_id: int) -> Optional[Ticket]:
        """
        Helper using inferred relationships for joins.
        """
        logger.debug(f"Fetching detailed ticket for ID: {ticket_id} (using inferred joins)")
        try:
        # --- Use Inferred Relationship SELECT statement ---

            supabase = get_supabase_client()
            query = supabase.table('tickets').select('*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)')
            query = query.eq('id', ticket_id).maybe_single()

            # --- Execute the query (NO await for standard execute) ---
            response = query.execute()

            # --- Process the response ---
            data = response.data # data is dict | None here due to maybe_single()
            if not data:
                logger.warning(f"Ticket ID {ticket_id} not found by Supabase (maybe_single returned None).")
                return None

            # --- Log the raw data ---
            logger.debug(f"Raw Supabase data (inferred joins) for ticket {ticket_id}: {data}")

            # --- Extract using aliases expected from the inferred join select ---
            # (Note: This assumes the select used aliases like assigned_user, creator)
            room_details = data.get("rooms") # Assuming 'rooms' is the key for the room join result
            assigned_user_details = data.get("assigned_user") # Alias from the select
            creator_details = data.get("creator") # Alias from the select

            room_number_val = room_details.get("room_number") if isinstance(room_details, dict) else None
            # Check original assigned_to FK before assuming join worked
            assignee_name_val = assigned_user_details.get("full_name") if data.get("assigned_to") and isinstance(assigned_user_details, dict) else None
            created_by_name_val = creator_details.get("full_name") if isinstance(creator_details, dict) else f"Unknown User (ID: {data.get('created_by')})" if data.get('created_by') else "Unknown Creator"

            # Prepare data for Pydantic validation
            ticket_data_for_validation = {
                **data, # Spread base ticket fields first
                "room_number": room_number_val,
                "assigned_to_name": assignee_name_val,
                "created_by_name": created_by_name_val,
            }

            # Remove the original nested dictionary structures if they exist based on aliases used
            ticket_data_for_validation.pop("rooms", None) # Use the key from the select ('rooms' in this inferred example)
            ticket_data_for_validation.pop("assigned_user", None) # Use the alias
            ticket_data_for_validation.pop("creator", None) # Use the alias
            # --- End Extraction ---


            # --- Validate the single dictionary ---
            try:
                ticket_obj = Ticket(**ticket_data_for_validation) # Validate against Pydantic model
                logger.debug(f"Data passed to Pydantic for ticket {ticket_id}: {ticket_data_for_validation}")
                logger.debug(f"Constructed Ticket object: {ticket_obj.model_dump_json(indent=2)}")
                return ticket_obj
            except Exception as validation_error:
                logger.error(f"Pydantic validation failed for ticket {ticket_id}: {validation_error}", exc_info=True)
                logger.error(f"Data causing validation error: {ticket_data_for_validation}") # Log data again
                return None
        except Exception as e:
            logger.error(f"Error in _fetch_and_construct_ticket for ID {ticket_id}: {e}", exc_info=True)
            return None

    @staticmethod
    async def get_tickets(db: Client, skip: int = 0, limit: int = DEFAULT_LIMIT) -> List[Ticket]:
        """Get tickets with pagination and related info."""
        try:
            logger.debug(f"Fetching tickets: skip={skip}, limit={limit}")
            response = db.table('tickets').select(
                 """
                 *,
                 rooms ( room_number ),
                 assigned_user:users!tickets_assigned_to_fkey ( full_name ),
                 creator:users!tickets_created_by_fkey ( full_name )
                 """
            ).order('created_at', desc=True).range(skip, skip + limit - 1).execute() # No await

            tickets_raw = response.data or []
            tickets_list = []
            for data in tickets_raw:
                 ticket_data = {
                    **data,
                    "room_number": data.get("rooms", {}).get("room_number") if data.get("rooms") else None,
                    "assigned_to_name": data.get("assigned_user", {}).get("full_name") if data.get("assigned_user") else None,
                    "created_by_name": data.get("creator", {}).get("full_name") if data.get("creator") else "Unknown Creator",
                 }
                 ticket_data.pop("rooms", None)
                 ticket_data.pop("assigned_user", None)
                 ticket_data.pop("creator", None)
                 try:
                     tickets_list.append(Ticket(**ticket_data))
                 except Exception as validation_error:
                      logger.warning(f"Skipping ticket {data.get('id')} due to validation error: {validation_error}")

            logger.info(f"Fetched {len(tickets_list)} tickets.")
            return tickets_list
        except Exception as e:
            logger.error(f"Error getting tickets: {e}", exc_info=True)
            return [] # Return empty list on failure

    @staticmethod
    async def get_ticket(db: Client, ticket_id: int) -> Optional[Ticket]:
        """Get a single ticket by ID with related info, using the helper."""
        logger.debug(f"Getting ticket ID: {ticket_id}")
        # Use the helper for consistency and detailed fetching
        return await TicketService._fetch_and_construct_ticket(ticket_id)

    @staticmethod
    async def create_ticket(db: Client, ticket: TicketCreate) -> Optional[Ticket]:
        """Create a new ticket."""
        try:
            logger.info(f"Attempting to create ticket for room_id: {ticket.room_id}")
            # Convert Pydantic model to dict
            # mode='json' handles enums and datetime conversion appropriately for Supabase
            ticket_data = ticket.model_dump(mode='json')

            # Optional: Pre-checks for foreign keys (Room, created_by, assigned_to if not None)
            # These might be better handled by DB constraints or agent pre-checks
            # ...

            response = db.table('tickets').insert(ticket_data).execute() # No await

            if not response.data:
                 logger.error("Ticket creation failed in DB, no data returned.")
                 # Consider raising specific error based on response details if available
                 return None # Or raise TicketServiceError

            created_ticket_id = response.data[0]['id']
            logger.info(f"Ticket created successfully with ID: {created_ticket_id}")

            # Fetch the full ticket details using the helper (await is correct here)
            return await TicketService._fetch_and_construct_ticket(created_ticket_id)

        except Exception as e:
            # Catch potential DB errors (e.g., foreign key violation, unique constraint)
            logger.error(f"Error creating ticket: {e}", exc_info=True)
            # Re-raise, return None, or raise custom error based on needs
            # Consider parsing e for specific Supabase error codes if needed
            return None

    @staticmethod
    async def update_ticket(db: Client, ticket_id: int, ticket_update: TicketUpdate) -> Optional[Ticket]:
        """
        Update a ticket by ID. Handles setting assigned_to to NULL if None is provided
        in ticket_update.
        """
        try:
            logger.info(f"Attempting to update ticket ID: {ticket_id}")
            # Get only explicitly set fields, allow None to be passed for assigned_to
            update_data = ticket_update.model_dump(exclude_unset=True, exclude_none=False, mode='json')

            # Filter out None values EXCEPT for assigned_to if it was explicitly set
            final_update_data = {}
            for k, v in update_data.items():
                if k == 'assigned_to':
                    if k in ticket_update.model_fields_set: # Check field was explicitly passed in request/payload
                        final_update_data[k] = v # Keep explicit None or int ID
                elif v is not None:
                    final_update_data[k] = v

            # If nothing to update after filtering, fetch and return current ticket
            if not final_update_data:
                logger.info(f"No effective update data provided for ticket {ticket_id}. Returning current state.")
                # Await is correct for async helper
                return await TicketService._fetch_and_construct_ticket(ticket_id)

            # Optional: Pre-check if assigned_to user ID exists if changing assignment
            if 'assigned_to' in final_update_data and final_update_data['assigned_to'] is not None:
                 assignee_exists = db.table('users').select('id').eq('id', final_update_data['assigned_to']).maybe_single().execute() # No await
                 if not assignee_exists.data:
                     logger.error(f"Update failed: Assignee user ID {final_update_data['assigned_to']} not found.")
                     raise TicketServiceError(f"Assignee user ID {final_update_data['assigned_to']} not found.")

            logger.debug(f"Updating ticket {ticket_id} with payload: {final_update_data}")
            response = db.table('tickets').update(final_update_data).eq('id', ticket_id).execute() # No await

            # Check if the update actually affected a row (response.data might contain updated record depending on RETURNING settings)
            # Fetching again ensures consistency and gets joined data. Await is correct here.
            updated_ticket = await TicketService._fetch_and_construct_ticket(ticket_id)
            if updated_ticket:
                 logger.info(f"Ticket {ticket_id} updated successfully.")
            else:
                 # This could happen if the ticket was deleted between the check and update, or RLS prevents seeing it
                 logger.warning(f"Ticket {ticket_id} potentially updated, but could not fetch details afterwards.")
                 # Depending on requirements, might return None or raise error if fetch fails post-update
            return updated_ticket

        except TicketServiceError as tse: # Catch specific validation errors
             raise tse # Re-raise to be handled by caller
        except Exception as e:
            logger.error(f"Error updating ticket {ticket_id}: {e}", exc_info=True)
            return None # Or raise

    @staticmethod
    async def delete_ticket(db: Client, ticket_id: int) -> bool:
        """Delete a ticket by ID."""
        try:
            logger.warning(f"Attempting to delete ticket ID: {ticket_id}") # Warning level for delete
            response = db.table('tickets').delete().eq('id', ticket_id).execute() # No await

            # Check if deletion was successful.
            # Supabase delete might return the deleted records in response.data (if RETURNING is set)
            # Or check response status/count if available.
            # For simplicity, assume success if no exception. A check count could be added.
            # Example check (might depend on exact Supabase client version/config):
            # success = response.count > 0 if hasattr(response, 'count') else bool(response.data)
            # if not success: logger.warning(f"Ticket {ticket_id} delete command executed but no rows affected (already deleted?).")

            logger.info(f"Ticket {ticket_id} deleted successfully.")
            return True # Assume success if no error for now

        except Exception as e:
            logger.error(f"Error deleting ticket {ticket_id}: {e}", exc_info=True)
            return False

    # --- Methods for Comments, History, Search ---
    # (Keep existing methods, ensure execute() is not awaited)

    @staticmethod
    async def get_ticket_comments(db: Client, ticket_id: int) -> List[Comment]:
        """Get comments for a specific ticket, joining user names."""
        try:
            logger.debug(f"Fetching comments for ticket {ticket_id}")
            # Adjust join syntax as needed
            response = db.table('ticket_comments').select(
                '*, author:users!ticket_comments_user_id_fkey(full_name)'
            ).eq('ticket_id', ticket_id).order('created_at', desc=True).execute() # No await

            comments_raw = response.data or []
            comments_list = []
            for item in comments_raw:
                 comment_data = {
                    **item,
                    "user_full_name": item.get("author", {}).get("full_name") if item.get("author") else None,
                 }
                 comment_data.pop("author", None)
                 try:
                     comments_list.append(Comment(**comment_data))
                 except Exception as validation_error:
                     logger.warning(f"Skipping comment {item.get('id')} due to validation error: {validation_error}")
            return comments_list
        except Exception as e:
            logger.error(f"Error getting comments for ticket {ticket_id}: {e}", exc_info=True)
            return []

    @staticmethod
    async def add_comment(db: Client, ticket_id: int, comment_data: CommentCreate) -> Optional[Comment]:
        """Add a comment to a ticket."""
        try:
            logger.info(f"Adding comment to ticket {ticket_id} by user {comment_data.user_id}")
            # Ensure ticket_id from URL is added to payload
            db_payload = { **comment_data.model_dump(mode='json'), 'ticket_id': ticket_id }

            insert_response = db.table('ticket_comments').insert(db_payload).execute() # No await

            if not insert_response.data:
                 logger.error(f"Comment creation failed for ticket {ticket_id}, no data returned.")
                 raise TicketServiceError("Comment creation failed, no data returned.")

            created_comment_id = insert_response.data[0]['id']
            logger.info(f"Comment {created_comment_id} added successfully.")

            # Fetch the created comment with user name join to return full details
            fetch_response = db.table('ticket_comments').select(
                 '*, author:users!ticket_comments_user_id_fkey(full_name)'
             ).eq('id', created_comment_id).maybe_single().execute() # No await

            if not fetch_response.data:
                 logger.error(f"Failed to fetch newly created comment {created_comment_id} after insert.")
                 return None # Should not happen if insert succeeded

            item = fetch_response.data
            full_comment_data = {
                 **item,
                 "user_full_name": item.get("author", {}).get("full_name") if item.get("author") else None,
            }
            full_comment_data.pop("author", None)
            return Comment(**full_comment_data)

        except Exception as e:
            logger.error(f"Error adding comment to ticket {ticket_id}: {e}", exc_info=True)
            # Raise specific error to be caught by endpoint
            raise TicketServiceError(f"Failed to add comment: {str(e)}") from e


    @staticmethod
    async def search_tickets(db: Client, search_term: str, limit: int = 50) -> List[Ticket]:
        """Search tickets by description (case-insensitive)."""
        try:
            logger.debug(f"Searching tickets for description: '{search_term}'")
            response = db.table('tickets').select(
                 '*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)'
            ).ilike('description', f'%{search_term}%').limit(limit).order('created_at', desc=True).execute() # No await

            tickets_raw = response.data or []
            tickets_list = []
            for data in tickets_raw:
                 ticket_data = {
                    **data,
                    "room_number": data.get("rooms", {}).get("room_number") if data.get("rooms") else None,
                    "assigned_to_name": data.get("assigned_user", {}).get("full_name") if data.get("assigned_user") else None,
                    "created_by_name": data.get("creator", {}).get("full_name") if data.get("creator") else "Unknown Creator",
                 }
                 ticket_data.pop("rooms", None); ticket_data.pop("assigned_user", None); ticket_data.pop("creator", None)
                 try:
                     tickets_list.append(Ticket(**ticket_data))
                 except Exception as validation_error:
                      logger.warning(f"Skipping search result ticket {data.get('id')} due to validation error: {validation_error}")

            logger.info(f"Found {len(tickets_list)} tickets matching search.")
            return tickets_list
        except Exception as e:
            logger.error(f"Error searching tickets: {e}", exc_info=True)
            return []