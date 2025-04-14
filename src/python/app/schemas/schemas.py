from pydantic import BaseModel, EmailStr, Field, ConfigDict # Use ConfigDict for Pydantic v2
from typing import Optional, List
from datetime import datetime, time # Import time
import enum

# Define Enums matching the schema constraints
class RoomStatusEnum(str, enum.Enum):
    AVAILABLE = "Available"
    OCCUPIED = "Occupied"
    NEEDS_CLEANING = "Needs Cleaning"
    OUT_OF_SERVICE = "Out of Service"

class CleaningPriorityEnum(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class TicketStatusEnum(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CANCELED = "Canceled"

# Define Ticket Priority Enum (based on frontend, add to schema)
class TicketPriorityEnum(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class UserRoleEnum(str, enum.Enum):
    MANAGER = "Manager"
    HOUSEKEEPER = "Housekeeper"
    DIRECTOR = "Director"
    ADMIN = "Admin"

# === Room Schemas ===
class RoomBase(BaseModel):
    floor: int = Field(..., description="Floor number")
    room_number: str = Field(..., description="Unique room number (e.g., '101', '205A')")
    room_type: Optional[str] = Field("Standard", description="Type of room (e.g., Standard, Deluxe, Suite)")
    capacity: Optional[int] = Field(2, description="Maximum number of occupants")
    room_status: Optional[RoomStatusEnum] = Field(RoomStatusEnum.AVAILABLE, description="Current availability status")
    # Add cleaning_status if needed by logic/frontend, map from RoomStatusEnum or separate? Assuming separate for now based on provided room.py schema
    cleaning_status: Optional[str] = Field("Clean", description="Current cleaning status (e.g., Clean, Dirty, In Progress)") # Consider making this an Enum too
    cleaning_priority: Optional[CleaningPriorityEnum] = Field(CleaningPriorityEnum.MEDIUM, description="Cleaning priority level")
    credit: Optional[int] = Field(0, description="Credit value associated with the room, if any") # Added from original schemas.py
    last_cleaned: Optional[datetime] = Field(None, description="Timestamp of last cleaning")
    notes: Optional[str] = Field(None, description="Additional notes about the room")

class RoomCreate(RoomBase):
    # Inherits all fields from RoomBase
    pass

class RoomUpdate(BaseModel):
    # All fields are optional for partial updates (PATCH)
    floor: Optional[int] = Field(None, description="Floor number")
    room_number: Optional[str] = Field(None, description="Unique room number (e.g., '101', '205A')")
    room_type: Optional[str] = Field(None, description="Type of room (e.g., Standard, Deluxe, Suite)")
    capacity: Optional[int] = Field(None, description="Maximum number of occupants")
    room_status: Optional[RoomStatusEnum] = Field(None, description="Current availability status")
    cleaning_status: Optional[str] = Field(None, description="Current cleaning status") # Consider Enum
    cleaning_priority: Optional[CleaningPriorityEnum] = Field(None, description="Cleaning priority level")
    credit: Optional[int] = Field(None, description="Credit value associated with the room, if any")
    last_cleaned: Optional[datetime] = Field(None, description="Timestamp of last cleaning")
    notes: Optional[str] = Field(None, description="Additional notes about the room")

class Room(RoomBase):
    id: int = Field(..., description="Unique identifier for the room")
    created_at: Optional[datetime] = Field(None, description="Timestamp when the room record was created") # Made optional as it might not always be returned/needed
    updated_at: Optional[datetime] = Field(None, description="Timestamp when the room record was last updated")

    # Pydantic v2 configuration
    model_config = ConfigDict(
        from_attributes=True, # Enable ORM mode compatibility
        use_enum_values=True, # Serialize enums to their values (strings)
        json_schema_extra = {
            "example": {
                "id": 1,
                "floor": 1,
                "room_number": "101",
                "room_type": "Standard",
                "capacity": 2,
                "room_status": "Available",
                "cleaning_status": "Clean",
                "cleaning_priority": "Low",
                "credit": 0,
                "last_cleaned": "2024-03-20T10:00:00Z",
                "notes": "Room has a view of the garden",
                "created_at": "2024-03-20T09:00:00Z",
                "updated_at": "2024-03-20T10:05:00Z"
            }
        }
    )

# === User Schemas ===
class UserBase(BaseModel):
    full_name: str = Field(..., description="Full name of the user")
    email: EmailStr = Field(..., description="Unique email address of the user")
    role: UserRoleEnum = Field(..., description="Role of the user within the hotel")
    start_time: time = Field(..., description="Start time of the user's typical shift (HH:MM or HH:MM:SS)") # Use time type
    end_time: time = Field(..., description="End time of the user's typical shift (HH:MM or HH:MM:SS)") # Use time type
    credit: Optional[int] = Field(100, description="Credit points associated with the user")

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, description="Full name of the user")
    email: Optional[EmailStr] = Field(None, description="Unique email address of the user")
    role: Optional[UserRoleEnum] = Field(None, description="Role of the user within the hotel")
    start_time: Optional[time] = Field(None, description="Start time of the user's typical shift")
    end_time: Optional[time] = Field(None, description="End time of the user's typical shift")
    credit: Optional[int] = Field(None, description="Credit points associated with the user")

class User(UserBase):
    id: int = Field(..., description="Unique identifier for the user")
    created_at: Optional[datetime] = Field(None, description="Timestamp when the user record was created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when the user record was last updated")

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        json_schema_extra = {
            "example": {
                "id": 1,
                "full_name": "Alice Manager",
                "email": "alice.manager@hotel.com",
                "role": "Manager",
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "credit": 200,
                "created_at": "2024-03-20T09:00:00Z",
                "updated_at": "2024-03-20T09:00:00Z"
            }
        }
    )

# === Ticket Schemas ===
class TicketBase(BaseModel):
    room_id: int = Field(..., description="ID of the room associated with the ticket")
    description: str = Field(..., description="Detailed description of the issue or task")
    status: Optional[TicketStatusEnum] = Field(TicketStatusEnum.OPEN, description="Current status of the ticket")
    priority: Optional[TicketPriorityEnum] = Field(TicketPriorityEnum.MEDIUM, description="Priority level of the ticket")
    assigned_to: Optional[int] = Field(None, description="ID of the user assigned to handle the ticket") # Allow None if unassigned
    created_by: int = Field(..., description="ID of the user who created the ticket")
    due_time: Optional[datetime] = Field(None, description="Optional due date and time for the ticket") # Use datetime, make optional
    attachment: Optional[str] = Field(None, description="URL or path to an attached file, if any")
    comment_log: Optional[str] = Field(None, description="A simple log of comments (consider separate Comment model)") # Keep for now, but Comment model is better
    subtask: Optional[str] = Field(None, description="Details about any subtasks related to this ticket")

class TicketCreate(TicketBase):
     assigned_to: int = Field(..., description="ID of the user assigned to handle the ticket") # Make mandatory on create if required

class TicketUpdate(BaseModel):
    room_id: Optional[int] = Field(None, description="ID of the room associated with the ticket")
    description: Optional[str] = Field(None, description="Detailed description of the issue or task")
    status: Optional[TicketStatusEnum] = Field(None, description="Current status of the ticket")
    priority: Optional[TicketPriorityEnum] = Field(None, description="Priority level of the ticket")
    assigned_to: Optional[int] = Field(None, description="ID of the user assigned to handle the ticket") # Allow changing assignee
    # created_by should generally not be updated
    due_time: Optional[datetime] = Field(None, description="Optional due date and time for the ticket")
    attachment: Optional[str] = Field(None, description="URL or path to an attached file, if any")
    comment_log: Optional[str] = Field(None, description="A simple log of comments")
    subtask: Optional[str] = Field(None, description="Details about any subtasks related to this ticket")

class Ticket(TicketBase):
    id: int = Field(..., description="Unique identifier for the ticket")
    created_at: Optional[datetime] = Field(None, description="Timestamp when the ticket was created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when the ticket was last updated")

    # Add fields returned by service/agent joins for frontend display
    room_number: Optional[str] = Field(None, description="Room number (obtained via join)")
    assigned_to_name: Optional[str] = Field(None, description="Full name of the assigned user (obtained via join)")
    created_by_name: Optional[str] = Field(None, description="Full name of the user who created the ticket (obtained via join)")

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
         json_schema_extra = {
            "example": {
                "id": 1,
                "room_id": 102, # Example room ID
                "description": "AC not cooling properly.",
                "status": "Open",
                "priority": "High",
                "assigned_to": 2, # Example user ID
                "created_by": 1, # Example user ID
                "due_time": "2024-10-28T17:00:00Z",
                "attachment": None,
                "comment_log": None,
                "subtask": None,
                "created_at": "2024-10-27T10:00:00Z",
                "updated_at": "2024-10-27T10:05:00Z",
                "room_number": "102", # Example joined data
                "assigned_to_name": "Bob Housekeeper", # Example joined data
                "created_by_name": "Alice Manager" # Example joined data
            }
        }
    )


# === Comment Schema (Moved from ticket.py) ===
class CommentBase(BaseModel):
     ticket_id: int = Field(..., description="ID of the ticket this comment belongs to")
     user_id: int = Field(..., description="ID of the user who wrote the comment")
     content: str = Field(..., description="The text content of the comment")

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
     id: int = Field(..., description="Unique identifier for the comment")
     created_at: Optional[datetime] = Field(None, description="Timestamp when the comment was created")
     # Optional fields if joining user data
     user_full_name: Optional[str] = Field(None, description="Full name of the user who wrote the comment")

     model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "id": 1,
                "ticket_id": 1,
                "user_id": 2, # Bob Housekeeper's ID
                "content": "Checked the AC unit. Filter needs cleaning. Will do it tomorrow.",
                "created_at": "2024-10-27T14:30:00Z",
                "user_full_name": "Bob Housekeeper"
            }
        }
     )


# === Dashboard Schemas (Refined from original schemas.py and users.py/tickets.py) ===
class DashboardStats(BaseModel):
    total_users: int
    active_tickets: int # Tickets with status Open or In Progress
    total_rooms: int
    rooms_to_clean: int # Rooms with status Needs Cleaning
    high_priority_rooms: int # Rooms with cleaning_priority High


class RecentTicket(BaseModel):
    # Schema matching the frontend component: Card: Recent Tickets
    id: int = Field(..., description="Ticket ID")
    room_number: str = Field(..., description="Room number associated with the ticket")
    description: str = Field(..., description="Brief description of the ticket")
    priority: TicketPriorityEnum = Field(..., description="Priority level of the ticket")
    status: TicketStatusEnum = Field(..., description="Current status of the ticket")
    assigned_to_name: Optional[str] = Field(None, description="Name of the assigned user")

    model_config = ConfigDict(use_enum_values=True)


class RoomStatusOverview(BaseModel):
     # Schema matching the frontend component: Card: Room Status Overview
    room_number: str = Field(..., description="Room number")
    room_status: RoomStatusEnum = Field(..., description="Current availability status")
    cleaning_priority: CleaningPriorityEnum = Field(..., description="Cleaning priority")

    model_config = ConfigDict(use_enum_values=True)


# === Agent Query Schema (Moved from query.py) ===
class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query for the hotel agent")

    model_config = {
        "json_schema_extra": {
            "example": {
                "query": "Show me high priority tickets for Bob Housekeeper"
            }
        }
    }