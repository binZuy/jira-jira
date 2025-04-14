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
    Comment, CommentCreate
)
# Import services
from ...services.room_service import RoomService
from ...services.ticket_service import TicketService
from ...services.user_service import UserService
from ...hotel_agent_langchain import HotelAgent
# from ..core.config import settings # Keep if needed
from datetime import datetime
import json
from supabase import Client

router = APIRouter(
    tags=["hotel"]
)

# Dependency to get Supabase client
async def get_db() -> Client:
    return get_supabase_client()

# Hotel Agent Route
@router.post("/query", tags=["Agent"])
async def process_query(request: QueryRequest):
    """Process a natural language query using the hotel agent."""
    try:
        # Consider initializing agent per request or using a singleton pattern
        agent = HotelAgent()
        result = await agent.process_query(request.query) # Use query from request body
        # Agent result processing might need refinement based on its output structure
        if isinstance(result, dict) and "error" in result:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result["error"])
        elif isinstance(result, dict) and "response" in result:
             return {"response": result["response"]}
        elif isinstance(result, dict) and "entities" in result:
             # Format based on agent response structure
             return JSONResponse(content=result)
        else:
             # Fallback for unexpected agent output
             return {"response": str(result)}

    except Exception as e:
        print(f"Error processing query: {e}") # Log the error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process query: {str(e)}")

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

from app.schemas.schemas import Comment, CommentCreate # Add Comment schemas

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
