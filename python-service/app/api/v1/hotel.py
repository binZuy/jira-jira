from fastapi import APIRouter, HTTPException, Query, Depends, status
from typing import List, Optional, Dict, Any
from fastapi.responses import JSONResponse
from ...database.connection import get_supabase_client
# Import updated schemas and enums
from ...schemas.schemas import (
    Room, RoomCreate, RoomUpdate,
    Ticket, TicketCreate, TicketUpdate,
    User, UserCreate, UserUpdate,
    QueryRequest, DashboardStats, RoomStatusEnum, TicketStatusEnum, 
    CleaningPriorityEnum,
    Comment, CommentCreate, BatchUpdateRequest
)
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Type
from ...schemas.schemas import Comment, CommentCreate # Add Comment schemas
# Import services
from ...services.room_service import RoomService
from ...services.ticket_service import TicketService, TicketServiceError
from ...services.user_service import UserService
from ...hotel_agent_langchain import HotelAgent
# from ..core.config import settings # Keep if needed
from datetime import datetime
import json
from supabase import Client
from fastapi.responses import JSONResponse
from fastapi import HTTPException, status, Depends
import logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter(
    tags=["hotel"]
)

# Dependency to get Supabase client
async def get_db() -> Client:
    return get_supabase_client()

# Hotel Agent Route
@router.post("/query", tags=["Agent"], response_model=Dict[str, Any]) # Keep response_model
async def process_query(request: QueryRequest): # Remove db dependency if agent handles it internally
    """
    Process a natural language query using the hotel agent.
    Returns the structured JSON response from the agent directly.
    """
    try:
        agent = HotelAgent()
        result = await agent.process_query(request.query) # result is the dict from the agent

        # --- FIX: Return the result dict directly ---
        # FastAPI will serialize this dict into the JSON response body.
        # Check for internal agent errors and potentially raise HTTPException
        if isinstance(result, dict) and result.get("type") == "error":
             # Optional: Raise an exception to return non-200 status for agent errors
             print(f"Agent returned error: {result.get('message')}")
             raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST, # Or 500 depending on error source
                 detail=result.get("message", "Agent processing error")
             )
        # For all other valid structures (read_results, confirmation_required, message, etc.)
        # return the dictionary directly.
        return result
        # --- End FIX ---

    except HTTPException as http_exc:
         # Re-raise HTTPExceptions from agent errors or other checks
         raise http_exc
    except Exception as e:
        print(f"Error processing query endpoint: {e}")
        # Raise HTTPException for unexpected internal server errors
        raise HTTPException(
             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
             detail=f"Internal server error while processing query."
        )
             
# === Room Routes (Using RoomService) ===
@router.get("/rooms", response_model=List[Room], tags=["Rooms"])
async def get_rooms_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Client = Depends(get_db)
):
    """Get all rooms."""
    rooms = await RoomService.get_rooms(db, skip=skip, limit=limit)
    return rooms

@router.get("/rooms/{room_id}", response_model=Room, tags=["Rooms"])
async def get_room_endpoint(room_id: int, db: Client = Depends(get_db)):
    """Get a specific room by ID."""
    room = await RoomService.get_room(db, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return room

# Note: Frontend seems to use room_number in URL, adjust if needed
@router.get("/rooms/number/{room_number}", response_model=Room, tags=["Rooms"])
async def get_room_by_number_endpoint(room_number: str, db: Client = Depends(get_db)):
    """Get a specific room by number."""
    room = await RoomService.get_room_by_number(db, room_number)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Room with number {room_number} not found")
    return room

@router.post("/rooms", response_model=Room, status_code=status.HTTP_201_CREATED, tags=["Rooms"])
async def create_room_endpoint(room: RoomCreate, db: Client = Depends(get_db)):
    """Create a new room."""
    created_room = await RoomService.create_room(db, room)
    if created_room is None:
        # More specific error based on RoomService failure reason (e.g., duplicate)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create room. Check data or room number uniqueness.")
    return created_room

@router.put("/rooms/{room_id}", response_model=Room, tags=["Rooms"])
async def update_room_endpoint(room_id: int, room_update: RoomUpdate, db: Client = Depends(get_db)):
    """Update a room."""
    updated_room = await RoomService.update_room(db, room_id, room_update)
    if updated_room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found or update failed")
    return updated_room

# Consider PATCH for partial updates if PUT means full replacement
@router.patch("/rooms/{room_id}", response_model=Room, tags=["Rooms"])
async def patch_room_endpoint(room_id: int, room_update: RoomUpdate, db: Client = Depends(get_db)):
    """Partially update a room."""
    # Same implementation as PUT if using RoomUpdate with Optional fields
    updated_room = await RoomService.update_room(db, room_id, room_update)
    if updated_room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found or update failed")
    return updated_room

@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Rooms"])
async def delete_room_endpoint(room_id: int, db: Client = Depends(get_db)):
    """Delete a room."""
    success = await RoomService.delete_room(db, room_id)
    if not success:
        # Distinguish between "not found" and "cannot delete" (e.g., due to tickets)
        room = await RoomService.get_room(db, room_id)
        if room is None:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
        else:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete room, possibly due to associated tickets.")
    return None # Return No Content on success

# === Ticket Routes (Using TicketService) ===
@router.get("/tickets", response_model=List[Ticket], tags=["Tickets"])
async def get_tickets_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Client = Depends(get_db)
):
    """Get all tickets."""
    tickets = await TicketService.get_tickets(db, skip=skip, limit=limit)
    return tickets

@router.get("/tickets/{ticket_id}", response_model=Ticket, tags=["Tickets"])
async def get_ticket_endpoint(ticket_id: int, db: Client = Depends(get_db)):
    """Get a specific ticket by ID."""
    ticket = await TicketService.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket

@router.post("/tickets", response_model=Ticket, status_code=status.HTTP_201_CREATED, tags=["Tickets"])
async def create_ticket_endpoint(ticket: TicketCreate, db: Client = Depends(get_db)):
    """Create a new ticket."""
    created_ticket = await TicketService.create_ticket(db, ticket)
    if created_ticket is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create ticket. Check foreign keys (room_id, assigned_to, created_by).")
    return created_ticket

@router.put("/tickets/{ticket_id}", response_model=Ticket, tags=["Tickets"])
async def update_ticket_endpoint(ticket_id: int, ticket_update: TicketUpdate, db: Client = Depends(get_db)):
    """Update a ticket."""
    updated_ticket = await TicketService.update_ticket(db, ticket_id, ticket_update)
    if updated_ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found or update failed")
    return updated_ticket

@router.patch("/tickets/{ticket_id}", response_model=Ticket, tags=["Tickets"])
async def patch_ticket_endpoint(ticket_id: int, ticket_update: TicketUpdate, db: Client = Depends(get_db)):
    """Partially update a ticket."""
    # Same implementation as PUT with TicketUpdate having Optional fields
    updated_ticket = await TicketService.update_ticket(db, ticket_id, ticket_update)
    if updated_ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found or update failed")
    return updated_ticket

@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Tickets"])
async def delete_ticket_endpoint(ticket_id: int, db: Client = Depends(get_db)):
    """Delete a ticket."""
    success = await TicketService.delete_ticket(db, ticket_id)
    if not success:
        # Check if ticket existed before assuming delete failed
        ticket = await TicketService.get_ticket(db, ticket_id)
        if ticket is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        else:
            # This case is less likely if delete returns True on no exception
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete ticket")
    return None # Return No Content on success



# GET Comments for a Ticket
@router.get("/tickets/{ticket_id}/comments", response_model=List[Comment], tags=["Tickets", "Comments"])
async def get_ticket_comments_endpoint(ticket_id: int, db: Client = Depends(get_db)):
    comments = await TicketService.get_ticket_comments(db, ticket_id)
    return comments

# POST Comment to a Ticket
@router.post("/tickets/{ticket_id}/comments", response_model=Comment, status_code=status.HTTP_201_CREATED, tags=["Tickets", "Comments"])
async def add_ticket_comment_endpoint(
    ticket_id: int,
    comment: CommentCreate, # Expect payload matching CommentCreate
    db: Client = Depends(get_db)
):
    try:
        # Optional: Check if ticket exists first
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        # Optional: Verify user_id in comment payload matches logged-in user (requires auth setup)

        created_comment = await TicketService.add_comment(db, ticket_id, comment)
        if created_comment is None:
             # Should be caught by the exception in the service, but as fallback:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create comment")
        return created_comment
    except TicketServiceError as e:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
         print(f"Unexpected error adding comment: {e}")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal error occurred")


# === User Routes (Using UserService) ===
@router.get("/users", response_model=List[User], tags=["Users"])
async def get_users_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Client = Depends(get_db)
):
    """Get all users."""
    users = await UserService.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/users/{user_id}", response_model=User, tags=["Users"])
async def get_user_endpoint(user_id: int, db: Client = Depends(get_db)):
    """Get a specific user by ID."""
    user = await UserService.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.post("/users", response_model=User, status_code=status.HTTP_201_CREATED, tags=["Users"])
async def create_user_endpoint(user: UserCreate, db: Client = Depends(get_db)):
    """Create a new user."""
    created_user = await UserService.create_user(db, user)
    if created_user is None:
        # More specific error (e.g., email exists)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create user. Email might already exist.")
    return created_user

@router.put("/users/{user_id}", response_model=User, tags=["Users"])
async def update_user_endpoint(user_id: int, user_update: UserUpdate, db: Client = Depends(get_db)):
    """Update a user."""
    updated_user = await UserService.update_user(db, user_id, user_update)
    if updated_user is None:
         # More specific error (e.g., not found, email conflict)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or update failed (e.g., email conflict).")
    return updated_user

@router.patch("/users/{user_id}", response_model=User, tags=["Users"])
async def patch_user_endpoint(user_id: int, user_update: UserUpdate, db: Client = Depends(get_db)):
    """Partially update a user."""
    updated_user = await UserService.update_user(db, user_id, user_update)
    if updated_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or update failed (e.g., email conflict).")
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Users"])
async def delete_user_endpoint(user_id: int, db: Client = Depends(get_db)):
    """Delete a user."""
    success = await UserService.delete_user(db, user_id)
    if not success:
        user = await UserService.get_user(db, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete user, possibly due to associated tickets.")
    return None # Return No Content on success


# === Dashboard and Report Routes ===
@router.get("/dashboard/summary", response_model=DashboardStats, tags=["Dashboard"])
async def get_dashboard_summary(db: Client = Depends(get_db)):
    """Get a comprehensive dashboard summary."""
    try:
        # Use services to get data (counts might be optimized later)
        # Note: Services return lists, getting counts requires fetching all data currently.
        # This can be inefficient for large datasets. Consider adding count methods to services.
        rooms = await RoomService.get_rooms(db, limit=10000) # High limit to get all for counts
        tickets = await TicketService.get_tickets(db, limit=10000) # High limit
        users = await UserService.get_users(db, limit=10000) # High limit

        total_users = len(users)
        total_rooms = len(rooms)
        total_tickets = len(tickets) # For consistency, though frontend doesn't show total tickets

        # Calculate active tickets count
        active_tickets = sum(1 for t in tickets if t.status in [TicketStatusEnum.OPEN, TicketStatusEnum.IN_PROGRESS])

        # Calculate rooms to clean count
        rooms_to_clean = sum(1 for r in rooms if r.room_status == RoomStatusEnum.NEEDS_CLEANING)

        # Calculate high priority rooms count (based on cleaning_priority)
        high_priority_rooms = sum(1 for r in rooms if r.cleaning_priority == CleaningPriorityEnum.HIGH)

        return DashboardStats(
            total_users=total_users,
            active_tickets=active_tickets,
            total_rooms=total_rooms,
            rooms_to_clean=rooms_to_clean,
            high_priority_rooms=high_priority_rooms
        )
    except Exception as e:
        print(f"Error getting dashboard summary: {e}") # Log error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve dashboard summary: {str(e)}")

# === Add NEW Confirmation Endpoints ===

# --- Room Confirmation ---
@router.put("/confirm/update/room/{room_id}", response_model=Room, tags=["Confirm Actions"])
async def confirm_update_room(
    room_id: int,
    room_update: RoomUpdate, # Expect the proposed updates in the body
    db: Client = Depends(get_db)
):
    """Confirm and execute a room update."""
    updated_room = await RoomService.update_room(db, room_id, room_update)
    if updated_room is None:
        # Check if room still exists before raising 404 vs 400
        existing = await RoomService.get_room(db, room_id)
        if not existing:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found (may have been deleted).")
        else: # Update failed for other reason (e.g. DB error, invalid data)
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update room.")
    return updated_room

@router.delete("/confirm/delete/room/{room_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Confirm Actions"])
async def confirm_delete_room(room_id: int, db: Client = Depends(get_db)):
    """Confirm and execute a room delete."""
    success = await RoomService.delete_room(db, room_id)
    if not success:
         # Check if room still exists
        existing = await RoomService.get_room(db, room_id)
        if not existing:
              raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found (may have already been deleted).")
        else: # Deletion failed (e.g., associated tickets constraint re-check)
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete room, possibly due to associated tickets.")
    return None

# --- Ticket Confirmation ---
@router.put("/confirm/update/ticket/{ticket_id}", response_model=Ticket, tags=["Confirm Actions"])
async def confirm_update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate, # Expect proposed updates
    db: Client = Depends(get_db)
):
    """Confirm and execute a ticket update."""
    updated_ticket = await TicketService.update_ticket(db, ticket_id, ticket_update)
    if updated_ticket is None:
        existing = await TicketService.get_ticket(db, ticket_id)
        if not existing:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found (may have been deleted).")
        else:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update ticket.")
    return updated_ticket

@router.delete("/confirm/delete/ticket/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Confirm Actions"])
async def confirm_delete_ticket(ticket_id: int, db: Client = Depends(get_db)):
    """Confirm and execute a ticket delete."""
    success = await TicketService.delete_ticket(db, ticket_id)
    if not success:
        existing = await TicketService.get_ticket(db, ticket_id)
        if not existing:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found (may have already been deleted).")
        else:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete ticket.")
    return None

# --- User Confirmation ---
@router.put("/confirm/update/user/{user_id}", response_model=User, tags=["Confirm Actions"])
async def confirm_update_user(
    user_id: int,
    user_update: UserUpdate, # Expect proposed updates
    db: Client = Depends(get_db)
):
    """Confirm and execute a user update."""
    # Re-check email conflict before executing
    if user_update.email is not None:
        current_user = await UserService.get_user(db, user_id)
        if not current_user:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        if user_update.email != current_user.email:
             existing_email_user = await UserService.get_user_by_email(db, user_update.email)
             if existing_email_user and existing_email_user.id != user_id:
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Email '{user_update.email}' is already taken by another user.")

    updated_user = await UserService.update_user(db, user_id, user_update)
    if updated_user is None:
         existing = await UserService.get_user(db, user_id)
         if not existing:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found (may have been deleted).")
         else: # Update failed (DB error?)
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update user.")
    return updated_user

@router.delete("/confirm/delete/user/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Confirm Actions"])
async def confirm_delete_user(user_id: int, db: Client = Depends(get_db)):
    """Confirm and execute a user delete."""
     # Re-check ticket association before delete, although prepare should have caught it
    success = await UserService.delete_user(db, user_id)
    if not success:
        existing = await UserService.get_user(db, user_id)
        if not existing:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found (may have already been deleted).")
        else: # Deletion failed (constraint re-check)
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete user, possibly due to associated tickets.")
    return None

@router.post("/confirm/create/room", response_model=Room, status_code=status.HTTP_201_CREATED, tags=["Confirm Actions"])
async def confirm_create_room(
    room_create: RoomCreate, # Expect RoomCreate data in the body
    db: Client = Depends(get_db)
):
    """Confirm and execute a room creation."""
    # Re-check uniqueness just before creation (optional but safer)
    existing = await RoomService.get_room_by_number(db, room_create.room_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, # 409 Conflict is appropriate here
            detail=f"Room number '{room_create.room_number}' already exists (created after preparation?)."
        )

    created_room = await RoomService.create_room(db, room_create)
    if created_room is None:
        # This might happen due to DB errors or other validation
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create room. Please check the data.")
    return created_room

@router.post("/confirm/create/ticket", response_model=Ticket, status_code=status.HTTP_201_CREATED, tags=["Confirm Actions"])
async def confirm_create_ticket(
    ticket_create: TicketCreate, # Expect TicketCreate data
    db: Client = Depends(get_db)
):
    """Confirm and execute a ticket creation."""
     # Re-check foreign keys (optional but safer)
    room = await RoomService.get_room(db, ticket_create.room_id)
    if not room:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Room with ID {ticket_create.room_id} not found (deleted after preparation?).")
    if ticket_create.assigned_to:
         assignee = await UserService.get_user(db, ticket_create.assigned_to)
         if not assignee:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Assigned user with ID {ticket_create.assigned_to} not found.")
    creator = await UserService.get_user(db, ticket_create.created_by)
    if not creator:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Creating user with ID {ticket_create.created_by} not found.")


    created_ticket = await TicketService.create_ticket(db, ticket_create)
    if created_ticket is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create ticket. Please check the data and referenced IDs.")
    return created_ticket

@router.post("/confirm/create/user", response_model=User, status_code=status.HTTP_201_CREATED, tags=["Confirm Actions"])
async def confirm_create_user(
    user_create: UserCreate, # Expect UserCreate data
    db: Client = Depends(get_db)
):
    """Confirm and execute a user creation."""
    # Re-check email uniqueness
    existing = await UserService.get_user_by_email(db, user_create.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{user_create.email}' already exists (registered after preparation?)."
        )

    created_user = await UserService.create_user(db, user_create)
    if created_user is None:
         # Should have been caught by the check above, but handle other errors
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create user. Please check the data.")
    return created_user

@router.put("/confirm/batch_update/{entity_type}", tags=["Confirm Actions"], status_code=status.HTTP_200_OK)
async def confirm_batch_update(
    entity_type: str,
    batch_request: BatchUpdateRequest, # Use the validated Pydantic model
    db: Client = Depends(get_db)
):
    """
    Confirm and execute a batch update for rooms, tickets, or users.
    Performs a single database update operation for efficiency.
    """
    logger.info(f"Received batch update request for entity_type: {entity_type} with {len(batch_request.ids)} IDs.")
    logger.debug(f"Batch update payload: {batch_request.payload}")

    Service = None
    UpdateSchema: Optional[Type[BaseModel]] = None # Use Type hint
    table_name: str = ""

    # --- Map entity_type to Service, Schema, and Table ---
    if entity_type == "room":
        # Service = RoomService # Not strictly needed for direct DB update
        UpdateSchema = RoomUpdate
        table_name = "rooms"
    elif entity_type == "ticket":
        # Service = TicketService
        UpdateSchema = TicketUpdate
        table_name = "tickets"
    elif entity_type == "user":
        # Service = UserService
        UpdateSchema = UserUpdate
        table_name = "users"
    else:
        logger.error(f"Invalid entity type for batch update: {entity_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity type '{entity_type}'. Valid types are 'room', 'ticket', 'user'."
        )

    # --- Validate and Prepare Payload ---
    validated_payload: Dict[str, Any] = {}
    try:
        # Validate the payload against the specific Pydantic Update schema
        if UpdateSchema:
            update_model = UpdateSchema(**batch_request.payload)
            # Exclude unset fields AND filter out None values (adjust if Nones should be set)
            validated_payload = update_model.model_dump(exclude_unset=True)
            validated_payload = {k: v for k, v in validated_payload.items() if v is not None}
        else:
             # Fallback if no schema mapping (shouldn't happen with current code)
             raise ValueError("Update schema not found for entity type.")

        if not validated_payload:
             logger.warning("Batch update requested with no valid non-null fields.")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid update fields provided in payload.")

        # --- Specific Pre-Update Checks (Optional but Recommended) ---
        # Example: Prevent batch updating email for users to the same address
        if entity_type == "user" and "email" in validated_payload and len(batch_request.ids) > 1:
             logger.warning(f"Attempted batch update of email for multiple users: {batch_request.ids}")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch updating email for multiple users simultaneously is not allowed.")
         # Add other critical checks if needed (e.g., ensuring required fields aren't set to null if not allowed)

    except Exception as validation_error:
         logger.error(f"Invalid payload for batch update {entity_type}: {validation_error}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid update payload: {str(validation_error)}")


    # --- Execute Batch Update using Supabase client ---
    try:
        logger.info(f"Executing batch update on '{table_name}' for IDs: {batch_request.ids}")
        response = db.table(table_name)\
                     .update(validated_payload)\
                     .in_('id', batch_request.ids)\
                     .execute()

        # Supabase `update().execute()` usually returns the updated records in `response.data`
        # Note: It doesn't throw an error if *some* IDs in the list don't exist.
        # We infer success/failure counts based on the returned data vs requested IDs.
        updated_ids = {item['id'] for item in response.data} if response.data else set()
        success_count = len(updated_ids)
        fail_count = len(batch_request.ids) - success_count
        failed_ids = [id_ for id_ in batch_request.ids if id_ not in updated_ids]

        logger.info(f"Batch update completed. Success: {success_count}, Failed/Not Found: {fail_count}")
        if failed_ids:
            logger.warning(f"Failed to update IDs: {failed_ids}")

        final_message = f"Batch update for {entity_type}(s) completed: {success_count} succeeded"
        if fail_count > 0:
            final_message += f", {fail_count} failed or not found."
            if len(failed_ids) <= 10: # List failed IDs if not too many
                 final_message += f" (IDs: {', '.join(map(str, failed_ids))})"

        return {"message": final_message, "success_count": success_count, "fail_count": fail_count, "failed_ids": failed_ids}

    except Exception as e:
         logger.error(f"Database error during batch update for {entity_type} IDs {batch_request.ids}: {e}", exc_info=True)
         # Use traceback.format_exc() for detailed error logging if needed
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error during batch update: {str(e)}")


# Add endpoints for RecentTickets and RoomStatusOverview if needed for dashboard
# Example:
# @router.get("/dashboard/recent-tickets", response_model=List[RecentTicket], tags=["Dashboard"])
# async def get_recent_tickets(limit: int = 5, db: Client = Depends(get_db)):
#     tickets = await TicketService.get_tickets(db, limit=limit) # Assumes get_tickets orders by recent
#     # Map Ticket to RecentTicket schema
#     recent_tickets = [
#         RecentTicket(
#             id=t.id,
#             room_number=t.room_number or "N/A",
#             description=t.description,
#             priority=t.priority.value if t.priority else "N/A", # Use enum value
#             status=t.status.value if t.status else "N/A", # Use enum value
#             assigned_to_name=t.assigned_to_name or "Unassigned"
#         ) for t in tickets
#     ]
#     return recent_tickets

# @router.get("/dashboard/room-status", response_model=List[RoomStatusOverview], tags=["Dashboard"])
# async def get_room_status_overview(limit: int = 10, db: Client = Depends(get_db)):
#     rooms = await RoomService.get_rooms(db, limit=limit)
#     # Map Room to RoomStatusOverview schema
#     overview = [
#         RoomStatusOverview(
#             room_number=r.room_number,
#             room_status=r.room_status.value if r.room_status else "N/A",
#             cleaning_priority=r.cleaning_priority.value if r.cleaning_priority else "N/A"
#         ) for r in rooms
#     ]
#     return overview
