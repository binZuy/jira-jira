"""Hotel Management System using LangChain

This module implements a hotel management system using LangChain to handle CRUD operations
through natural language queries with confirmation steps and proactive recommendations.
"""

from typing import Dict, Any, List, Optional, Tuple
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain.agents.format_scratchpad.openai_tools import format_to_openai_tool_messages
from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.memory import ConversationBufferMemory
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv
from datetime import datetime
from .database.connection import get_supabase_client
import re

# Load environment variables
load_dotenv()

# Initialize OpenAI client
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

# Define Pydantic models for data validation
class Room(BaseModel):
    id: Optional[int] = Field(description="Room ID", default=None)
    floor: int = Field(description="Floor number")
    room_number: str = Field(description="Room number")
    room_type: Optional[str] = Field(description="Type of room (e.g., Standard, Deluxe, Suite)", default="Standard")
    capacity: Optional[int] = Field(description="Maximum number of occupants", default=2)
    room_status: Optional[str] = Field(description="Room status (Available, Occupied, Needs Cleaning, Out of Service)", default="Available")
    cleaning_status: Optional[str] = Field(description="Current cleaning status", default="Clean")
    cleaning_priority: Optional[str] = Field(description="Cleaning priority (High, Medium, Low)", default="Medium")
    credit: Optional[int] = Field(description="Credit value", default=0)
    last_cleaned: Optional[str] = Field(description="Timestamp of last cleaning", default=None)
    notes: Optional[str] = Field(description="Additional notes about the room", default=None)

class User(BaseModel):
    id: Optional[int] = Field(description="User ID", default=None)
    full_name: str = Field(description="Full name of the user")
    email: str = Field(description="Email address")
    role: str = Field(description="User role (Manager, Housekeeper, Director, Admin)")
    start_time: str = Field(description="Start time of shift")
    end_time: str = Field(description="End time of shift")
    credit: Optional[int] = Field(description="User credit", default=100)
    created_at: Optional[str] = Field(description="Creation timestamp", default=None)

class Ticket(BaseModel):
    id: Optional[int] = Field(description="Ticket ID", default=None)
    room_id: int = Field(description="Room ID")
    description: str = Field(description="Ticket description")
    status: Optional[str] = Field(description="Ticket status (Open, In Progress, Resolved, Canceled)", default="Open")
    priority: Optional[str] = Field(description="Ticket priority (High, Medium, Low)", default="Medium")
    assigned_to: Optional[int] = Field(description="User ID assigned to the ticket", default=None)
    created_by: int = Field(description="User ID who created the ticket")
    due_time: Optional[str] = Field(description="Due time for the ticket", default=None)
    attachment: Optional[str] = Field(description="Attachment path if any", default=None)
    comment_log: Optional[str] = Field(description="Comment log", default=None)
    subtask: Optional[str] = Field(description="Subtask details", default=None)
    created_at: Optional[str] = Field(description="Creation timestamp", default=None)

# Define tools for CRUD operations
@tool
async def verify_room_and_tickets(room_number: str) -> str:
    """Verify if a room exists and has any tickets.
    
    This tool is useful for queries like:
    - "check if room 101 exists"
    - "show me all tickets for room 302"
    - "verify room 204 status"
    
    The tool will:
    1. Check if the room exists using exact matching
    2. Show all associated tickets
    3. Include room status and details
    4. Show ticket status and priority
    """
    try:
        supabase = get_supabase_client()
        
        # Get room details using exact matching
        room_result = supabase.table('rooms').select('*').eq('room_number', room_number).execute()
        
        if not room_result.data:
            return f"STOP: Room {room_number} not found. Please verify the room number is correct. This is a final response."
            
        room = room_result.data[0]
        
        # Get associated tickets
        ticket_result = supabase.table('tickets').select('*').eq('room_id', room['id']).execute()
        
        return f"Room verification results: {{'room': {room}, 'tickets': {ticket_result.data if ticket_result.data else []}}}"
    except Exception as e:
        return f"Error verifying room and tickets: {str(e)}"

@tool
async def verify_user_and_tickets(user_name: str) -> str:
    """Verify if a user exists and has any tickets.
    
    This tool is useful for queries like:
    - "check if John Smith exists"
    - "show me all tickets for Sarah"
    - "verify Mike's workload"
    
    The tool will:
    1. Check if the user exists using partial name matching
    2. Show all associated tickets
    3. Include user role and details
    4. Show ticket status and priority
    """
    try:
        supabase = get_supabase_client()
        
        # Get user details using partial name matching
        user_result = supabase.table('users').select('*').ilike('full_name', f'%{user_name}%').execute()
        
        if not user_result.data:
            return "No users found matching the name"
            
        user = user_result.data[0]
        
        # Get user's tickets
        ticket_result = supabase.table('tickets').select('*').eq('created_by', user['id']).execute()
        
        return f"User verification results: {{'user': {user}, 'tickets': {ticket_result.data if ticket_result.data else []}}}"
    except Exception as e:
        return f"Error verifying user and tickets: {str(e)}"

@tool
async def read_rooms(conditions: Optional[Dict[str, Any]] = None) -> str:
    """Read rooms based on conditions.
    
    This tool is useful for queries like:
    - "show all available rooms"
    - "list rooms on floor 2"
    - "find rooms that need cleaning"
    
    The tool will:
    1. Filter rooms based on provided conditions
    2. Show room status and details
    3. Include cleaning priority
    4. Show associated tickets if any
    
    Example conditions:
    {
        "room_status": "Available",
        "floor": 2,
        "cleaning_priority": "High",
        "room_type": "Standard"
    }
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table('rooms').select('*')
        
        if conditions:
            for key, value in conditions.items():
                if isinstance(value, str):
                    query = query.ilike(key, f'%{value}%')
                else:
                    query = query.eq(key, value)
        
        result = query.execute()
        
        if result.data:
            return f"Found rooms: {result.data}"
        return "No rooms found matching the criteria"
    except Exception as e:
        return f"Error reading rooms: {str(e)}"

@tool
async def read_tickets(conditions: Optional[Dict[str, Any]] = None) -> str:
    """Read tickets based on conditions.
    
    This tool is useful for queries like:
    - "show all open tickets"
    - "list high priority tickets"
    - "find tickets assigned to John"
    
    The tool will:
    1. Filter tickets based on provided conditions
    2. Show ticket status and priority
    3. Include room information
    4. Show assigned staff member
    
    Example conditions:
    {
        "status": "Open",
        "priority": "High",
        "assigned_to": 123,
        "created_by": 456
    }
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table('tickets').select('*')
        
        if conditions:
            for key, value in conditions.items():
                if isinstance(value, str):
                    query = query.ilike(key, f'%{value}%')
                else:
                    query = query.eq(key, value)
        
        result = query.execute()
        
        if result.data:
            return f"Found tickets: {result.data}"
        return "No tickets found matching the criteria"
    except Exception as e:
        return f"Error reading tickets: {str(e)}"

@tool
async def read_users(conditions: Optional[Dict[str, Any]] = None) -> str:
    """Read users based on conditions.
    
    This tool is useful for queries like:
    - "show all maintenance staff"
    - "list users with high credit"
    - "find users working night shift"
    
    The tool will:
    1. Filter users based on provided conditions
    2. Show user role and details
    3. Include schedule information
    4. Show credit status
    
    Example conditions:
    {
        "role": "Maintenance",
        "credit": 100,
        "start_time": "22:00",
        "end_time": "06:00"
    }
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table('users').select('*')
        
        if conditions:
            for key, value in conditions.items():
                if isinstance(value, str):
                    query = query.ilike(key, f'%{value}%')
                else:
                    query = query.eq(key, value)
        
        result = query.execute()
        
        if result.data:
            return f"Found users: {result.data}"
        return "No users found matching the criteria"
    except Exception as e:
        return f"Error reading users: {str(e)}"

@tool
async def create_room(data: Dict[str, Any]) -> str:
    """Create a new room using Supabase.
    
    This tool is useful for queries like:
    - "add new room 401"
    - "create a suite on floor 3"
    - "register new standard room"
    
    The tool will:
    1. Validate room data
    2. Create room record
    3. Set default status
    4. Return room details
    """
    try:
        supabase = get_supabase_client()
        
        # Extract the actual room data from the input
        room_data = data.get("data", data)
        
        # Validate the data using the Room model
        Room(**room_data)
        
        # Insert the room using Supabase
        result = supabase.table('rooms').insert(room_data).execute()
        
        if result.data:
            return f"Room created successfully: {result.data[0]}"
        return "Failed to create room"
    except Exception as e:
        return f"Error creating room: {str(e)}"

@tool
async def create_ticket(data: Dict[str, Any]) -> str:
    """Create a new ticket using Supabase.
    
    This tool is useful for queries like:
    - "create maintenance ticket for room 101"
    - "add cleaning request for room 302"
    - "register AC issue in room 204"
    
    The tool will:
    1. Validate ticket data
    2. Look up room_id from room number if provided
    3. Create ticket record
    4. Set default status
    5. Return ticket details
    """
    try:
        supabase = get_supabase_client()
        
        # Extract the actual ticket data from the input
        ticket_data = data.get("data", data)
        
        # If room_number is provided instead of room_id, look up the room_id
        if "room_number" in ticket_data:
            room_result = supabase.table('rooms').select('id').eq('room_number', ticket_data['room_number']).execute()
            if not room_result.data:
                return f"STOP: Room {ticket_data['room_number']} not found. Please verify the room number. This is a final response."
            ticket_data['room_id'] = room_result.data[0]['id']
            del ticket_data['room_number']
        
        # Add default created_by if not provided (using a default admin user)
        if 'created_by' not in ticket_data:
            ticket_data['created_by'] = 1  # Default admin user ID
        
        # Validate the data using the Ticket model
        Ticket(**ticket_data)
        
        # Insert the ticket using Supabase
        result = supabase.table('tickets').insert(ticket_data).execute()
        
        if result.data:
            return f"Ticket created successfully: {result.data[0]}"
        return "Failed to create ticket"
    except Exception as e:
        return f"Error creating ticket: {str(e)}"

@tool
async def create_user(data: Dict[str, Any]) -> str:
    """Create a new user using Supabase.
    
    This tool is useful for queries like:
    - "add new staff member John Smith"
    - "register new housekeeper Sarah"
    - "create maintenance staff account"
    
    The tool will:
    1. Validate user data
    2. Create user record
    3. Set default role
    4. Return user details
    """
    try:
        supabase = get_supabase_client()
        
        # Extract the actual user data from the input
        user_data = data.get("data", data)
        
        # Validate the data using the User model
        User(**user_data)
        
        # Insert the user using Supabase
        result = supabase.table('users').insert(user_data).execute()
        
        if result.data:
            return f"User created successfully: {result.data[0]}"
        return "Failed to create user"
    except Exception as e:
        return f"Error creating user: {str(e)}"

@tool
async def update_room(data: Dict[str, Any], conditions: Dict[str, Any]) -> str:
    """Update a room using Supabase.
    
    This tool is useful for queries like:
    - "mark room 101 as occupied"
    - "update room 302 cleaning status"
    - "change room 204 priority"
    
    The tool will:
    1. Validate update data
    2. Update room record
    3. Return updated details
    4. Maintain data integrity
    """
    try:
        supabase = get_supabase_client()
        
        # Update the room using Supabase
        result = supabase.table('rooms').update(data).match(conditions).execute()
        
        if result.data:
            return f"Room updated successfully: {result.data[0]}"
        return "Failed to update room"
    except Exception as e:
        return f"Error updating room: {str(e)}"

@tool
async def update_ticket(data: Dict[str, Any], conditions: Dict[str, Any]) -> str:
    """Update a ticket using Supabase.
    
    This tool is useful for queries like:
    - "mark ticket #123 as resolved"
    - "update ticket priority to high"
    - "assign ticket to John"
    
    The tool will:
    1. Validate update data
    2. Update ticket record
    3. Return updated details
    4. Maintain data integrity
    """
    try:
        supabase = get_supabase_client()
        
        # Update the ticket using Supabase
        result = supabase.table('tickets').update(data).match(conditions).execute()
        
        if result.data:
            return f"Ticket updated successfully: {result.data[0]}"
        return "Failed to update ticket"
    except Exception as e:
        return f"Error updating ticket: {str(e)}"

@tool
async def update_user(data: Dict[str, Any], conditions: Dict[str, Any]) -> str:
    """Update a user using Supabase.
    
    This tool is useful for queries like:
    - "update John's role to manager"
    - "change Sarah's shift hours"
    - "modify user permissions"
    
    The tool will:
    1. Validate update data
    2. Update user record
    3. Return updated details
    4. Maintain data integrity
    """
    try:
        supabase = get_supabase_client()
        
        # Update the user using Supabase
        result = supabase.table('users').update(data).match(conditions).execute()
        
        if result.data:
            return f"User updated successfully: {result.data[0]}"
        return "Failed to update user"
    except Exception as e:
        return f"Error updating user: {str(e)}"

@tool
async def delete_room(conditions: Dict[str, Any]) -> str:
    """Delete a room using Supabase.
    
    This tool is useful for queries like:
    - "remove room 101"
    - "delete room 302"
    - "remove out of service room"
    
    The tool will:
    1. Verify room exists
    2. Check for active tickets
    3. Delete room record
    4. Return confirmation
    """
    try:
        supabase = get_supabase_client()
        
        # Delete the room using Supabase
        result = supabase.table('rooms').delete().match(conditions).execute()
        
        if result.data:
            return f"Room deleted successfully: {result.data[0]}"
        return "Failed to delete room"
    except Exception as e:
        return f"Error deleting room: {str(e)}"

@tool
async def delete_ticket(conditions: Dict[str, Any]) -> str:
    """Delete a ticket using Supabase.
    
    This tool is useful for queries like:
    - "remove ticket #123"
    - "delete resolved tickets"
    - "remove duplicate ticket"
    
    The tool will:
    1. Verify ticket exists
    2. Check ticket status
    3. Delete ticket record
    4. Return confirmation
    """
    try:
        supabase = get_supabase_client()
        
        # Delete the ticket using Supabase
        result = supabase.table('tickets').delete().match(conditions).execute()
        
        if result.data:
            return f"Ticket deleted successfully: {result.data[0]}"
        return "Failed to delete ticket"
    except Exception as e:
        return f"Error deleting ticket: {str(e)}"

@tool
async def delete_user(conditions: Dict[str, Any]) -> str:
    """Delete a user using Supabase.
    
    This tool is useful for queries like:
    - "remove John Smith"
    - "delete inactive user"
    - "remove former staff member"
    
    The tool will:
    1. Verify user exists
    2. Check for active tickets
    3. Delete user record
    4. Return confirmation
    """
    try:
        supabase = get_supabase_client()
        
        # Delete the user using Supabase
        result = supabase.table('users').delete().match(conditions).execute()
        
        if result.data:
            return f"User deleted successfully: {result.data[0]}"
        return "Failed to delete user"
    except Exception as e:
        return f"Error deleting user: {str(e)}"

@tool
async def search_tickets_by_description(description: str) -> str:
    """Search for tickets using description text, including partial matches and related terms.
    
    IMPORTANT: This tool will return a response starting with "STOP:" if no tickets are found.
    When you receive a "STOP:" response:
    1. DO NOT make another call to this tool
    2. DO NOT try different search terms
    3. Return the exact response to the user
    4. Ask the user to verify their search terms
    
    This tool is useful for queries like:
    - "show me rooms that has problem with ac"
    - "find tickets about maintenance issues"
    - "list all cleaning requests"
    
    The tool will:
    1. Search for partial matches in ticket descriptions
    2. Include room and user information
    3. Only show non-resolved tickets
    4. Order by priority and status
    
    Example responses:
    - If tickets found: "Found tickets: [list of tickets]"
    - If no tickets found: "STOP: No tickets found matching the description. Please try a different search term or use a different tool. Do not repeat this search. This is a final response."
    """
    try:
        supabase = get_supabase_client()
        
        # Build the query using Supabase's filter capabilities
        query = supabase.table('tickets').select(
            'id, description, status, priority, created_at, due_time, room_id, assigned_to, created_by, rooms(room_number, room_status, cleaning_priority), users!tickets_assigned_to_fkey(full_name)'
        ).neq('status', 'Resolved')
        
        # Add a flexible search condition that matches partial words
        # This will match 'ac' in 'air conditioning', 'AC', 'a/c', etc.
        query = query.ilike('description', f'%{description}%')
        
        # Execute the query with proper ordering syntax
        result = query.order('status').order('priority', desc=True).execute()
        
        if result.data:
            # Process and format the results for better readability
            formatted_results = []
            for ticket in result.data:
                formatted_results.append({
                    'room': ticket['rooms']['room_number'],
                    'description': ticket['description'],
                    'status': ticket['status'],
                    'priority': ticket['priority'],
                    'assigned_to': ticket['users']['full_name'] if ticket['users'] else 'Unassigned',
                    'room_status': ticket['rooms']['room_status'],
                    'cleaning_priority': ticket['rooms']['cleaning_priority']
                })
            return f"Found tickets: {formatted_results}"
        
        # Make the "no results" response more explicit to prevent repeated execution
        return "STOP: No tickets found matching the description. Please try a different search term or use a different tool. Do not repeat this search. This is a final response."
    except Exception as e:
        return f"Error searching tickets: {str(e)}"

@tool
async def get_rooms_by_status(status_type: str) -> str:
    """Get rooms based on their status or condition.
    
    IMPORTANT: This tool will return a response starting with "STOP:" if no rooms are found.
    When you receive a "STOP:" response:
    1. DO NOT make another call to this tool
    2. DO NOT try different status types
    3. Return the exact response to the user
    4. Ask the user to verify their search criteria
    
    This tool is useful for queries like:
    - "show rooms that need cleaning"
    - "find rooms with maintenance issues"
    - "list rooms that are out of service"
    
    The tool will:
    1. Check room status and cleaning priority
    2. Look for related maintenance tickets
    3. Show room details and associated issues
    4. Order by priority and room number
    
    Example responses:
    - If rooms found: "Found rooms with matching status: [list of rooms]"
    - If no rooms found: "STOP: No rooms found matching the criteria. Try using search_tickets_by_description for more flexible search results."
    """
    try:
        supabase = get_supabase_client()
        
        # First, try to find tickets with matching description
        tickets_query = supabase.table('tickets').select(
            'id, description, status, priority, room_id, rooms(room_number, room_status, cleaning_priority)'
        ).neq('status', 'Resolved')
        
        # Add flexible search for partial word matches
        # This will match 'maintenance' in 'maintenance issues', 'maintenance needed', etc.
        tickets_query = tickets_query.ilike('description', f'%{status_type}%')
        
        # Execute the tickets query
        tickets_result = tickets_query.execute()
        
        if tickets_result.data:
            # Process and format the results
            formatted_results = []
            for ticket in tickets_result.data:
                room = ticket['rooms']
                if room:
                    room_info = {
                        'room_number': room['room_number'],
                        'status': room['room_status'],
                        'cleaning_priority': room['cleaning_priority'],
                        'active_tickets': [{
                            'description': ticket['description'],
                            'status': ticket['status'],
                            'priority': ticket['priority']
                        }]
                    }
                    formatted_results.append(room_info)
            
            if formatted_results:
                return f"Found rooms with matching tickets: {formatted_results}"
        
        # If no tickets found, try searching by room status
        # Define valid room statuses
        valid_statuses = ['Available', 'Occupied', 'Needs Cleaning', 'Out of Service']
        
        # Check if the status type matches any valid status
        matching_status = next((status for status in valid_statuses if status_type.lower() in status.lower()), None)
        
        if matching_status:
            rooms_query = supabase.table('rooms').select(
                'id, room_number, room_status, cleaning_priority, floor, credit'
            ).eq('room_status', matching_status)
            
            rooms_result = rooms_query.execute()
            
            if rooms_result.data:
                # Get tickets for these rooms
                room_ids = [room['id'] for room in rooms_result.data]
                room_tickets_query = supabase.table('tickets').select(
                    'id, description, status, priority, room_id'
                ).in_('room_id', room_ids).neq('status', 'Resolved')
                
                room_tickets_result = room_tickets_query.execute()
                
                # Combine results
                formatted_results = []
                for room in rooms_result.data:
                    room_info = {
                        'room_number': room['room_number'],
                        'status': room['room_status'],
                        'cleaning_priority': room['cleaning_priority'],
                        'floor': room['floor'],
                        'active_tickets': []
                    }
                    
                    # Add ticket information
                    room_tickets = [t for t in room_tickets_result.data if t['room_id'] == room['id']]
                    for ticket in room_tickets:
                        room_info['active_tickets'].append({
                            'description': ticket['description'],
                            'status': ticket['status'],
                            'priority': ticket['priority']
                        })
                    
                    formatted_results.append(room_info)
                
                return f"Found rooms with matching status: {formatted_results}"
        
        # If no results found, return a clear message and suggest using search_tickets_by_description
        return "STOP: No rooms found matching the criteria. Try using search_tickets_by_description for more flexible search results. This is a final response."
    except Exception as e:
        return f"Error getting rooms: {str(e)}"

@tool
async def get_users_by_ticket_status(has_tickets: bool) -> str:
    """Get users based on whether they have active tickets or not."""
    try:
        supabase = get_supabase_client()
        
        # Build a query that checks user ticket assignments
        query = supabase.table('users').select(
            'id, full_name, email, role, start_time, end_time, credit, created_at, tickets!inner(ticket_id, status, description, priority, room_id)'
        )
        
        if has_tickets:
            # Users with active tickets
            query = query.neq('tickets.status', 'Resolved')
        else:
            # Users without active tickets
            query = query.is_('tickets.ticket_id', 'null')
        
        # Execute the query with ordering
        result = query.order('full_name').execute()
        
        if result.data:
            return f"Found users: {result.data}"
        return "No users found matching the criteria"
    except Exception as e:
        return f"Error getting users: {str(e)}"

@tool
async def get_room_issues_summary() -> str:
    """Get a comprehensive summary of room issues and their status."""
    try:
        supabase = get_supabase_client()
        
        # Build a complex query that aggregates room issues
        query = supabase.table('rooms').select(
            'room_id, room_number, room_status, cleaning_priority, floor, credit, tickets!inner(ticket_id, status, description, priority, created_at, assigned_to, users!assigned_to(full_name))'
        ).neq('tickets.status', 'Resolved')
        
        # Execute the query with ordering
        result = query.order('cleaning_priority', desc=True).order('room_number').execute()
        
        if result.data:
            # Process and format the results
            summary = {}
            for room in result.data:
                room_number = room['room_number']
                if room_number not in summary:
                    summary[room_number] = {
                        'status': room['room_status'],
                        'priority': room['cleaning_priority'],
                        'issues': []
                    }
                
                for ticket in room['tickets']:
                    summary[room_number]['issues'].append({
                        'description': ticket['description'],
                        'status': ticket['status'],
                        'priority': ticket['priority'],
                        'assigned_to': ticket['users']['full_name'] if ticket['users'] else 'Unassigned'
                    })
            
            return f"Room Issues Summary: {summary}"
        return "No room issues found"
    except Exception as e:
        return f"Error getting room issues summary: {str(e)}"

@tool
async def get_user_workload_summary() -> str:
    """Get a comprehensive summary of user workload and ticket assignments."""
    try:
        supabase = get_supabase_client()
        
        # Build a complex query that aggregates user workload
        query = supabase.table('users').select(
            'id, full_name, role, start_time, end_time, credit, tickets!inner(ticket_id, status, description, priority, room_id, rooms(room_number, room_status))'
        ).neq('tickets.status', 'Resolved')
        
        # Execute the query with ordering
        result = query.order('full_name').execute()
        
        if result.data:
            # Process and format the results
            summary = {}
            for user in result.data:
                user_name = user['full_name']
                if user_name not in summary:
                    summary[user_name] = {
                        'role': user['role'],
                        'active_tickets': []
                    }
                
                for ticket in user['tickets']:
                    summary[user_name]['active_tickets'].append({
                        'room': ticket['rooms']['room_number'],
                        'description': ticket['description'],
                        'status': ticket['status'],
                        'priority': ticket['priority']
                    })
            
            return f"User Workload Summary: {summary}"
        return "No active tickets found"
    except Exception as e:
        return f"Error getting user workload summary: {str(e)}"

@tool
async def get_ticket_status_summary(status_type: str = None) -> str:
    """Get a comprehensive summary of ticket statuses and their details.
    
    IMPORTANT: This tool will return a response starting with "STOP:" if no tickets are found.
    When you receive a "STOP:" response:
    1. DO NOT make another call to this tool
    2. DO NOT try different status types
    3. Return the exact response to the user
    4. Ask the user to verify their search criteria
    
    This tool is useful for queries like:
    - "what's the status of all maintenance tickets"
    - "show me all open tickets"
    - "list tickets assigned to John"
    
    The tool will:
    1. Show ticket status distribution
    2. Include room and user information
    3. Group by status type if specified
    4. Show priority levels and assignments
    
    Example responses:
    - If tickets found: "Ticket Status Summary: [summary of tickets]"
    - If no tickets found: "STOP: No tickets found. This is a final response."
    """
    try:
        supabase = get_supabase_client()
        
        # Build a complex query that aggregates ticket information
        query = supabase.table('tickets').select(
            'ticket_id, description, status, priority, created_at, due_time, room_id, assigned_to, created_by, rooms(room_number, room_status), users!assigned_to(full_name, role)'
        )
        
        if status_type:
            query = query.eq('status', status_type)
        
        # Execute the query with ordering
        result = query.order('status').order('priority', desc=True).execute()
        
        if result.data:
            # Process and format the results
            summary = {}
            for ticket in result.data:
                status = ticket['status']
                if status not in summary:
                    summary[status] = []
                
                summary[status].append({
                    'room': ticket['rooms']['room_number'],
                    'description': ticket['description'],
                    'priority': ticket['priority'],
                    'assigned_to': ticket['users']['full_name'] if ticket['users'] else 'Unassigned',
                    'role': ticket['users']['role'] if ticket['users'] else 'Unassigned',
                    'created_at': ticket['created_at']
                })
            
            return f"Ticket Status Summary: {summary}"
        return "STOP: No tickets found. This is a final response."
    except Exception as e:
        return f"Error getting ticket status summary: {str(e)}"

@tool
async def get_user_ticket_summary(user_name: str = None) -> str:
    """Get a comprehensive summary of user ticket assignments and status.
    
    This tool is useful for queries like:
    - "show me all tickets assigned to John"
    - "what's the workload of maintenance staff"
    - "list tickets created by Sarah"
    
    The tool will:
    1. Show user's ticket assignments
    2. Include ticket status and priority
    3. Show room information
    4. Group by ticket status
    """
    try:
        supabase = get_supabase_client()
        
        # Build a query that gets user ticket information
        query = supabase.table('users').select(
            'id, full_name, role, tickets!inner(ticket_id, status, description, priority, room_id, rooms(room_number, room_status))'
        )
        
        if user_name:
            query = query.ilike('full_name', f'%{user_name}%')
        
        # Execute the query with ordering
        result = query.order('full_name').execute()
        
        if result.data:
            # Process and format the results
            summary = {}
            for user in result.data:
                user_name = user['full_name']
                if user_name not in summary:
                    summary[user_name] = {
                        'role': user['role'],
                        'tickets': {}
                    }
                
                for ticket in user['tickets']:
                    status = ticket['status']
                    if status not in summary[user_name]['tickets']:
                        summary[user_name]['tickets'][status] = []
                    
                    summary[user_name]['tickets'][status].append({
                        'room': ticket['rooms']['room_number'],
                        'description': ticket['description'],
                        'priority': ticket['priority']
                    })
            
            return f"User Ticket Summary: {summary}"
        return "No user ticket information found"
    except Exception as e:
        return f"Error getting user ticket summary: {str(e)}"


# Define the tools list
tools = [
    verify_room_and_tickets,
    verify_user_and_tickets,
    read_rooms,
    read_tickets,
    read_users,
    create_room,
    create_ticket,
    create_user,
    update_room,
    update_ticket,
    update_user,
    delete_room,
    delete_ticket,
    delete_user,
    search_tickets_by_description,
    get_rooms_by_status,
    get_users_by_ticket_status,
    get_room_issues_summary,
    get_user_workload_summary,
    get_ticket_status_summary,
    get_user_ticket_summary
]

# Define the agent prompt
prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a helpful hotel management assistant. Your role is to help with hotel operations, room management, and ticket handling.

CRITICAL RULES FOR TOOL USAGE:
1. NEVER repeat the same tool call with identical parameters if:
   - The previous call returned "No results found"
   - The previous call returned an error
   - The previous call returned empty data
   - The previous call returned a response starting with "STOP:"

2. When searching for issues or problems:
   - Try up to 5 different synonyms or related terms before giving up
   - Example for "air conditioning":
     * First try: "upper.ac" (direct search)
     * Second try: "air conditioning"
     * Third try: "AC" or "a/c"
     * Fourth try: "cooling"
     * Fifth try: "temperature"
   - Example for "maintenance":
     * First try: "maintenance"
     * Second try: "repair" or "fix"
     * Third try: "issue" or "problem"
     * Fourth try: "broken"
     * Fifth try: "malfunction"
   - Only return "STOP:" after trying all synonyms
   - If any synonym returns results, use that and stop searching

3. When a tool call returns a response starting with "STOP:":
   - DO NOT stop all further tool calls
   - TRY A DIFFERENT TOOL that might help
   - Example: If search_tickets_by_description fails, try:
     * get_rooms_by_status to check room status
     * get_ticket_status_summary to see all tickets
     * get_room_issues_summary for a comprehensive view
   - Only stop if ALL relevant tools have been tried
   - Return the most helpful response from any tool

4. When a tool call returns no results:
   - TRY A DIFFERENT TOOL that might help
   - Example: If searching for maintenance issues:
     * First try: search_tickets_by_description("maintenance")
     * If that fails, try: get_rooms_by_status("Out of Service")
     * If that fails, try: get_ticket_status_summary()
   - Only stop if ALL relevant tools have been tried
   - ALWAYS ask the user for clarification or alternative search terms
   - NEVER assume the user made a mistake - ask them to verify their request

5. For search queries:
   - If search_tickets_by_description returns no results:
     * Try get_rooms_by_status for room status
     * Try get_ticket_status_summary for all tickets
     * Try get_room_issues_summary for comprehensive view
   - If get_rooms_by_status returns no results:
     * Try search_tickets_by_description for specific issues
     * Try get_ticket_status_summary for ticket overview
     * Try get_room_issues_summary for room problems
   - If get_user_ticket_summary returns no results:
     * Try get_users_by_ticket_status for user overview
     * Try get_ticket_status_summary for all tickets
     * Try get_user_workload_summary for workload view

6. Tool call limits:
   - Maximum 3 attempts per tool with different synonyms
   - Try ALL relevant tools before giving up
   - NEVER make multiple attempts with the same parameters
   - Only stop if ALL relevant tools have been tried

Example responses for no results:
1. When search_tickets_by_description returns no results:
   "I couldn't find any tickets matching your search. Could you please:
   - Verify the search term is correct
   - Try using different keywords
   - Specify if you're looking for a particular room or time period"

2. When get_rooms_by_status returns no results:
   "I couldn't find any rooms with that status. Could you please:
   - Verify the room status you're looking for
   - Try using different status terms
   - Specify if you're looking for a particular floor or room type"

3. When get_user_ticket_summary returns no results:
   "I couldn't find any tickets for that user. Could you please:
   - Verify the user's name is correct
   - Try using their full name
   - Specify if you're looking for a particular time period"

IMPORTANT GUIDELINES FOR NAME HANDLING AND CLARIFICATION:
1. ALWAYS ask for clarification when:
   - A name is ambiguous or could refer to multiple people
   - Multiple results are found for a search
   - A user's full name is not provided
   - A room number is not clearly specified
   - A ticket ID is not clearly specified
   - NO results are found for a search

2. For user queries:
   - If only a first name is provided (e.g., "John"), ask for the full name
   - If multiple users share the same name, ask for additional details (role, email, etc.)
   - If a name could be misspelled, ask for confirmation
   - If a name is common, ask for more context
   - If no user is found, ask for verification of the name

3. For room queries:
   - If a room number is ambiguous, ask for confirmation
   - If multiple rooms match the criteria, list them and ask which one
   - If a floor number is mentioned without room number, ask for specific room
   - If no rooms are found, ask for verification of the room number or status

4. For ticket queries:
   - If multiple tickets match the description, list them and ask which one
   - If a ticket ID is not provided, ask for it
   - If a ticket could be for multiple rooms, ask for clarification
   - If no tickets are found, ask for verification of the search terms

Example clarification responses:
1. For ambiguous names:
   "I found multiple users with the name 'John'. Could you please specify which one you're looking for?
   - John Smith (Maintenance)
   - John Doe (Housekeeping)
   - John Wilson (Manager)"

2. For multiple rooms:
   "I found several rooms that need cleaning. Which one would you like to focus on?
   - Room 101 (High priority)
   - Room 204 (Medium priority)
   - Room 302 (Low priority)"

3. For multiple tickets:
   "I found multiple tickets matching your description. Could you specify which one?
   - Ticket #123: AC issue in Room 101
   - Ticket #124: AC issue in Room 204
   - Ticket #125: AC issue in Room 302"

4. For no results:
   "I couldn't find any results matching your search. Could you please verify:
   - Are the search terms correct?
   - Would you like to try different keywords?
   - Are you looking for a specific room, user, or time period?"

Key capabilities:
1. Room Management:
   - Create, update, and check room status
   - Track room cleaning status and priorities
   - Monitor room maintenance issues
   - Handle room assignments and availability
   - Get comprehensive room issue summaries

2. Ticket Management:
   - Create and update maintenance tickets
   - Track cleaning requests
   - Monitor AC and other equipment issues
   - Assign tickets to staff members
   - Search tickets with flexible matching
   - Get detailed ticket status summaries

3. User Management:
   - Track staff assignments and workload
   - Monitor user ticket assignments
   - Handle user schedules and availability
   - Get comprehensive workload summaries
   - View user-specific ticket information

4. Specialized Queries:
   - Find rooms with specific issues (e.g., AC problems)
   - Identify rooms needing cleaning
   - Track users without active tickets
   - Monitor high-priority maintenance issues
   - Get detailed summaries of room issues and user workload

Query Type Recognition and Tool Selection:
1. Room Issue Queries (e.g., "show me rooms that has problem with ac"):
   - Use search_tickets_by_description for specific issues
   - The tool will match partial words (e.g., "ac" matches "air conditioning")
   - Includes room status and cleaning priority
   - Shows assigned staff and ticket status
   - DO NOT use get_rooms_by_status for maintenance or issue queries
   - If no results found, STOP and ask for clarification

2. Ticket Status Queries (e.g., "what's the status of maintenance tickets"):
   - Use get_ticket_status_summary for status overview
   - Can filter by specific status type
   - Shows ticket distribution and assignments
   - Includes priority levels and room information
   - If no results found, STOP and ask for clarification

3. User Ticket Queries (e.g., "show me tickets assigned to John"):
   - Use get_user_ticket_summary for user-specific tickets
   - Shows all tickets assigned to a user
   - Groups tickets by status
   - Includes room information and priorities
   - If no results found, STOP and ask for clarification

4. Room Status Queries (e.g., "which rooms need cleaning"):
   - Use get_rooms_by_status ONLY for predefined room statuses:
     * Available
     * Occupied
     * Needs Cleaning
     * Out of Service
   - DO NOT use for maintenance issues or other conditions
   - For maintenance issues, use search_tickets_by_description instead
   - If no results found, STOP and ask for clarification

5. User Workload Queries (e.g., "who has no active tickets"):
   - Use get_users_by_ticket_status for ticket assignment queries
   - Can find users with or without active tickets
   - Includes user roles and schedules
   - Shows ticket distribution
   - If no results found, STOP and ask for clarification

Tool Selection Guidelines:
1. For maintenance issues:
   - ALWAYS use search_tickets_by_description
   - NEVER use get_rooms_by_status
   - Example: "show rooms with maintenance issues" → use search_tickets_by_description("maintenance")
   - If no results found, STOP and ask for clarification

2. For room status:
   - ONLY use get_rooms_by_status for predefined statuses
   - Example: "show rooms that need cleaning" → use get_rooms_by_status("Needs Cleaning")
   - If no results found, STOP and ask for clarification

3. For ticket status:
   - Use get_ticket_status_summary
   - Example: "what's the status of maintenance tickets" → use get_ticket_status_summary()
   - If no results found, STOP and ask for clarification

4. For user tickets:
   - Use get_user_ticket_summary
   - Example: "show tickets assigned to John" → use get_user_ticket_summary("John")
   - If no results found, STOP and ask for clarification

Always provide clear, structured responses with:
1. Relevant details (room numbers, user names, ticket statuses)
2. Priority levels and urgency indicators
3. Related information (e.g., ticket history for room issues)
4. Action items or next steps when applicable
5. Comprehensive summaries when appropriate

Example responses:
1. For AC issues:
   "I found 3 rooms with AC issues:
   - Room 302: AC not cooling properly (High priority)
     * Status: In Progress
     * Assigned to: John Smith (Maintenance)
     * Room Status: Occupied
     * Cleaning Priority: High
   - Room 401: Temperature control malfunctioning (Medium priority)
     * Status: Open
     * Assigned to: Sarah Wilson (Maintenance)
     * Room Status: Available
     * Cleaning Priority: Medium
   - Room 203: AC making noise (Low priority)
     * Status: Open
     * Assigned to: Unassigned
     * Room Status: Occupied
     * Cleaning Priority: Low"

2. For ticket status:
   "Current ticket status distribution:
   Open Tickets (5):
   - Room 302: AC issue (High priority)
   - Room 401: Maintenance needed (Medium priority)
   - Room 203: Cleaning required (Low priority)
   
   In Progress (3):
   - Room 101: Plumbing repair (High priority)
   - Room 204: Electrical issue (Medium priority)
   - Room 305: Furniture repair (Low priority)"

3. For user tickets:
   "John Smith's ticket assignments:
   Open Tickets:
   - Room 302: AC not cooling properly (High priority)
   - Room 401: Temperature control issue (Medium priority)
   
   In Progress:
   - Room 101: Plumbing repair (High priority)
   - Room 204: Electrical issue (Medium priority)"

Remember to:
1. Use appropriate tools for each query type
2. Consider multiple factors when answering queries
3. Provide structured, easy-to-read responses
4. Include relevant details and context
5. Suggest next steps when appropriate
6. Use comprehensive summaries for complex queries
7. Consider relationships between rooms, tickets, and users
8. Match partial words in descriptions (e.g., "ac" matches "air conditioning")
9. Group related information logically
10. Prioritize information based on urgency
11. STOP and ask for clarification when no results are found
12. NEVER repeat the same tool call if it returns no results
13. ALWAYS use search_tickets_by_description for maintenance issues
14. ONLY use get_rooms_by_status for predefined room statuses
15. ALWAYS ask for clarification when:
    - Multiple results are found
    - Names are ambiguous
    - Room numbers are unclear
    - Ticket IDs are missing
    - Context is insufficient
    - NO results are found
16. STOP and ask for clarification when:
    - A tool call returns a response starting with "STOP:"
    - A tool call returns "No tickets found" or "No rooms found"
    - The same tool is called with identical parameters
    - A tool call returns an error or empty data
    - The query is ambiguous or missing critical information
    - Multiple results are found without clear criteria
    - A name or identifier could refer to multiple items
    - A room number or ticket ID is not clearly specified
    - The context is insufficient to proceed
17. SUGGEST alternatives when:
    - A tool call returns no results:
      * Suggest different search terms or keywords
      * Recommend alternative tools that might help
      * Ask if the user meant something else
      * Offer to search with broader criteria
    - A tool call returns a STOP response:
      * Suggest different parameters or search terms
      * Recommend alternative approaches
      * Ask if the user wants to try a different tool
      * Offer to search with different criteria
    - A query is ambiguous:
      * List possible interpretations
      * Ask for clarification on specific details
      * Suggest more specific search terms
      * Offer to search with different parameters
    - Multiple results are found:
      * List the results with clear identifiers
      * Ask which specific item the user is interested in
      * Suggest ways to narrow down the search
      * Offer to filter by additional criteria

18. Handling Complex Queries with Multiple Information:
   - When a query contains multiple pieces of information:
     * Break down the query into sub-queries
     * Query each piece of information separately
     * Combine the results to provide a complete answer
     * If any sub-query fails, ask for clarification on that specific part
   
   Example complex query handling:
   "Show me all maintenance tickets for rooms on floor 2 that need cleaning"
   Steps:
   1. First query: Get all rooms on floor 2
   2. Second query: Get maintenance tickets
   3. Third query: Get rooms that need cleaning
   4. Combine results and show intersection
   5. If any step fails, ask for clarification on that specific part

   Example sub-query responses:
   "I found multiple pieces of information. Let me break this down:
   1. Rooms on floor 2:
      - Room 201 (Available)
      - Room 202 (Occupied)
      - Room 203 (Needs Cleaning)
   
   2. Maintenance tickets:
      - Room 201: AC issue (High priority)
      - Room 203: Plumbing repair (Medium priority)
   
   3. Rooms needing cleaning:
      - Room 203 (High priority)
      - Room 205 (Medium priority)
   
   Based on this information:
   - Room 203 is the only room that matches all criteria
   - It has a maintenance ticket for plumbing repair
   - It also needs cleaning (High priority)
   
   Would you like me to provide more details about any specific aspect?"

19. Clarification for Complex Queries:
   - When a complex query has missing or unclear information:
     * Ask for clarification on each unclear part
     * Provide options for each unclear element
     * Allow the user to specify which parts are most important
     * Suggest alternative ways to structure the query
   
   Example clarification for complex queries:
   "Your query involves multiple aspects. Could you please clarify:
   1. Which floor are you interested in?
   2. What type of maintenance issues are you looking for?
   3. Are you interested in all cleaning priorities or just high priority?
   4. Would you like to see resolved tickets as well?
   
   This will help me provide more accurate and relevant information."

20. Progressive Information Gathering:
   - Start with the most specific information
   - Use results from each sub-query to refine subsequent queries
   - Build a complete picture step by step
   - Stop and ask for clarification if any step is unclear
   
   Example progressive query:
   "Let me gather this information step by step:
   1. First, let's find all rooms on floor 2
   2. Then, let's check which of these rooms have maintenance tickets
   3. Finally, let's see which ones need cleaning
   
   Would you like me to proceed with this approach?"

Remember to:
1. Break down complex queries into manageable parts
2. Query each part separately
3. Combine results logically
4. Ask for clarification when needed
5. Provide clear, structured responses
6. Show relationships between different pieces of information
7. Stop and clarify if any part is unclear
8. Suggest alternative approaches when appropriate
""",
    ),
    ("human", "{input}"),
    ("human", "Tip: Make sure to respond in a clear, structured manner. Include all relevant details and prioritize information based on urgency. Always ask for clarification when needed. STOP and ask for clarification if a tool call returns no results."),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

class HotelAgent:
    def __init__(self):
        self.memory = ConversationBufferMemory(memory_key="chat_history")
        
        # Create the agent first
        agent = create_openai_tools_agent(
            llm=llm,
            tools=tools,
            prompt=prompt
        )
        
        # Then create the executor with the agent
        self.agent_executor = AgentExecutor.from_agent_and_tools(
            agent=agent,
            tools=tools,
            llm=llm,
            memory=self.memory,
            format_scratchpad=format_to_openai_tool_messages,
            output_parser=OpenAIToolsAgentOutputParser(),
            verbose=True  # Add verbose mode to see what's happening
        )

    async def process_query(self, query: str) -> str:
        """Process a user query and return a response."""
        try:
            # Execute the agent for tool-related queries
            result = await self.agent_executor.ainvoke(
                {"input": query, "chat_history": self.memory.chat_memory.messages}
            )

            # Extract the output from the result dictionary
            output = result.get("output", "")

            # Check if the output starts with "STOP:"
            if output.startswith("STOP:"):
                # Record the failed call in memory
                self.memory.chat_memory.add_user_message(f"Failed call with parameters: {query}")
                self.memory.chat_memory.add_ai_message(output)
                return output

            # Check if the output contains "No tickets found" or "No rooms found"
            if "No tickets found" in output or "No rooms found" in output:
                # Record the failed call in memory
                self.memory.chat_memory.add_user_message(f"Failed call with parameters: {query}")
                self.memory.chat_memory.add_ai_message(output)
                return output

            # If we get here, the call was successful
            return output

        except Exception as e:
            return f"Error processing query: {str(e)}"