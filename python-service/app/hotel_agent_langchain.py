# hotel_agent_langchain.py

import json
import re
import traceback # Import traceback for detailed error printing
import operator
from copy import deepcopy
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from langchain.agents import AgentExecutor, create_openai_tools_agent # Use standard helper
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
# Import the correct formatter for OpenAI tools agent
from langchain.agents.format_scratchpad.openai_tools import format_to_openai_tool_messages
# Removed parser - create_openai_tools_agent handles output parsing internally typically
# from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from langchain_core.runnables import RunnableLambda, RunnablePassthrough # Import necessary runnables
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field # Keep BaseModel for tool validation if needed
from supabase import Client
import logging


from .database.connection import get_supabase_client
# Import necessary schemas and services correctly
from .schemas.schemas import (Room, RoomCreate, RoomStatusEnum, RoomUpdate,
                              Ticket, TicketCreate, TicketStatusEnum,
                              TicketUpdate, User, UserCreate, UserRoleEnum,
                              UserUpdate, BatchUpdateRequest)
from .services.room_service import RoomService
from .services.ticket_service import TicketService
from .services.user_service import UserService

# Load environment variables
load_dotenv()

# Initialize OpenAI client
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0
)

# --- Parsing Helpers ---
# (Keep parse_time_constraints, parse_credit_comparison, parse_ticket_count_comparison as they are)
def parse_time_constraints(time_str: str) -> dict:
    now = datetime.now(); today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if not time_str: return {}
    time_str = time_str.lower()
    if "yesterday" in time_str: yesterday_start = today_start - timedelta(days=1); return {"created_at": {"gte": yesterday_start.isoformat(), "lt": today_start.isoformat()}}
    hour_match = re.search(r"last (\d+) hours?", time_str);
    if hour_match: hours = int(hour_match.group(1)); time_ago = now - timedelta(hours=hours); return {"created_at": {"gte": time_ago.isoformat()}}
    day_match = re.search(r"last (\d+) days?", time_str);
    if day_match: days = int(day_match.group(1)); time_ago = today_start - timedelta(days=days); return {"created_at": {"gte": time_ago.isoformat()}}
    if "today" in time_str: return {"created_at": {"gte": today_start.isoformat()}}
    if "this week" in time_str: week_start = today_start - timedelta(days=today_start.weekday()); return {"created_at": {"gte": week_start.isoformat()}}
    return {}

def parse_credit_comparison(credit_condition: str) -> dict:
    if not credit_condition: return {}
    credit_condition = credit_condition.lower(); number_match = re.search(r'(\d+)', credit_condition)
    if not number_match: return {}; number = int(number_match.group(1))
    if "more than" in credit_condition or "greater than" in credit_condition: return {"credit": {"gt": number}}
    elif "less than" in credit_condition or "fewer than" in credit_condition: return {"credit": {"lt": number}}
    elif "at least" in credit_condition or "minimum" in credit_condition: return {"credit": {"gte": number}}
    elif "at most" in credit_condition or "maximum" in credit_condition: return {"credit": {"lte": number}}
    elif "equal" in credit_condition or re.search(r'(\d+)\s+credits?$', credit_condition): return {"credit": {"eq": number}}
    return {}

def parse_ticket_count_comparison(count_condition: str) -> dict:
    if not count_condition: return {}
    count_condition = count_condition.lower(); number_match = re.search(r'(\d+)', count_condition)
    if not number_match: return {}; number = int(number_match.group(1))
    if "more than" in count_condition or "greater than" in count_condition: return {"ticket_count": {"gt": number}}
    elif "less than" in count_condition or "fewer than" in count_condition: return {"ticket_count": {"lt": number}}
    elif "at least" in count_condition or "minimum" in count_condition: return {"ticket_count": {"gte": number}}
    elif "at most" in count_condition or "maximum" in count_condition: return {"ticket_count": {"lte": number}}
    elif "equal" in count_condition or re.search(r'(\d+)\s+tickets?$', count_condition): return {"ticket_count": {"eq": number}}
    return {}

# --- Tools ---

# Helper to Fetch Data (Consolidated) - Returns Pydantic model or None
async def _fetch_entity(db: Client, entity_type: str, entity_id: int) -> Optional[Room | Ticket | User]:
    try:
        if entity_type == "room": return await RoomService.get_room(db, entity_id)
        elif entity_type == "ticket": return await TicketService.get_ticket(db, entity_id)
        elif entity_type == "user": return await UserService.get_user(db, entity_id)
        else: return None
    except Exception as e: print(f"Error fetching {entity_type} {entity_id}: {e}"); return None

# --- READ/SEARCH Tools (Corrected await) ---
@tool
async def verify_room_and_tickets(room_number: str, time_constraint: str = None) -> dict:
    """Verify if a room exists and get its associated tickets, filtering by time if needed. Returns structured data."""
    try:
        supabase = get_supabase_client()
        room_obj = await RoomService.get_room_by_number(supabase, room_number) # Keep await for async service
        if not room_obj: return { "type": "error", "message": f"Room {room_number} not found." }

        query = supabase.table('tickets').select(
            '*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)'
        ).eq('room_id', room_obj.id)
        time_filters = parse_time_constraints(time_constraint)
        if time_filters:
            field = next(iter(time_filters)); filters = time_filters[field]
            for op, val in filters.items():
                if op == 'gte': query = query.gte(field, val)
                elif op == 'lt': query = query.lt(field, val)

        # --- FIX: Remove await from execute() ---
        ticket_result = query.execute()
        # --- End FIX ---
        tickets_raw = ticket_result.data or []

        tickets_list = []
        for data in tickets_raw:
            ticket_data = {**data, "room_number": data.get("rooms", {}).get("room_number") or room_obj.room_number, "assigned_to_name": data.get("assigned_user", {}).get("full_name"), "created_by_name": data.get("creator", {}).get("full_name") }
            ticket_data.pop("rooms", None); ticket_data.pop("assigned_user", None); ticket_data.pop("creator", None)
            try: tickets_list.append(Ticket(**ticket_data).model_dump(mode='json'))
            except Exception as e: print(f"Pydantic validation error for ticket {data.get('id')}: {e}")
        return {"type": "read_results", "entity_type": "room_with_tickets", "data": { "room": room_obj.model_dump(mode='json'), "tickets": tickets_list }, "message": f"Details for Room {room_number}." }
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error retrieving room/ticket info: {str(e)}"}


@tool
async def read_rooms(conditions: dict = None, time_constraint: str = None, credit_condition: str = None, ticket_count_condition: str = None) -> dict:
    """Read rooms based on conditions, time, credit, and ticket count. Returns structured data."""
    try:
        supabase = get_supabase_client(); select_query = '*, tickets!inner(*)' if ticket_count_condition else '*'
        query = supabase.table('rooms').select(select_query)
        if conditions:
            for key, value in conditions.items():
                if value is None: continue
                if key in ['id', 'floor', 'capacity', 'credit']: # Added credit here too
                    try: query = query.eq(key, int(value))
                    except ValueError: return {"type": "error", "message": f"Invalid numeric value for Room '{key}': '{value}'."}
                else: query = query.eq(key, value)
        time_filters = parse_time_constraints(time_constraint)
        if time_filters: field = next(iter(time_filters)); filters = time_filters[field]; [query.gte(field, v) if k=='gte' else query.lt(field, v) for k,v in filters.items()]
        credit_filters = parse_credit_comparison(credit_condition)
        if credit_filters: field = next(iter(credit_filters)); filters = credit_filters[field]; [getattr(query, k)(field, v) for k,v in filters.items()]

        # --- FIX: Remove await from execute() ---
        result = query.order('room_number').execute()
        # --- End FIX ---
        rooms_data_raw = result.data or []

        filtered_rooms_data = []
        if ticket_count_condition:
            count_filters = parse_ticket_count_comparison(ticket_count_condition)
            if count_filters and 'ticket_count' in count_filters:
                op = list(count_filters['ticket_count'].keys())[0]; val = count_filters['ticket_count'][op]; active = [TicketStatusEnum.OPEN.value, TicketStatusEnum.IN_PROGRESS.value]
                for room_raw in rooms_data_raw:
                    count = sum(1 for t in room_raw.get('tickets', []) if t.get('status') in active)
                    match = False
                    if op == 'gt' and count > val:
                        match = True
                    elif op == 'lt' and count < val:
                        match = True
                    elif op == 'gte' and count >= val:
                        match = True
                    elif op == 'lte' and count <= val:
                        match = True
                    elif op == 'eq' and count == val:
                        match = True
                    if match:
                        filtered_rooms_data.append({k: v for k, v in room_raw.items() if k != 'tickets'})
            else:
                filtered_rooms_data = [{k: v for k, v in r.items() if k != 'tickets'} for r in rooms_data_raw]
                print(f"Warning: Could not parse ticket_count_condition: {ticket_count_condition}")
        else:
            filtered_rooms_data = rooms_data_raw

        rooms_list = [];
        for room_raw in filtered_rooms_data:
            room_clean = {k: v for k, v in room_raw.items() if k != 'tickets'};
            try: rooms_list.append(Room(**room_clean).model_dump(mode='json'))
            except Exception as e: print(f"Pydantic validation error for room {room_clean.get('id')}: {e}")
        num_found = len(rooms_list); message = f"Found {num_found} rooms matching criteria." if num_found > 0 else "STOP: No rooms found matching the specified criteria."
        return {"type": "read_results", "entity_type": "room", "data": rooms_list, "message": message }
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error reading rooms: {str(e)}"}


@tool
async def read_tickets(conditions: dict = None, time_constraint: str = None, credit_condition: str = None) -> dict:
    """
    Reads a list of tickets based on specified conditions like status, priority, user, room, etc.
    Use this for finding MULTIPLE tickets or filtering by criteria other than a single ID.
    Args:
        conditions (dict, optional): Filters like status, priority, room_id, assigned_to, created_by. Example: {{'status': 'Open'}}.
        time_constraint (str, optional): Time filter.
        credit_condition (str, optional): Credit filter.
    Returns structured ticket data list.
    """
    try:
        supabase = get_supabase_client(); query = supabase.table('tickets').select('*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)')
        if conditions:
            for key, value in conditions.items():
                 if value is None: continue
                 if key in ['id', 'room_id', 'assigned_to', 'created_by', 'credit']:
                     try: query = query.eq(key, int(value))
                     except ValueError: return {"type": "error", "message": f"Invalid numeric value for Ticket '{key}': '{value}'."}
                 else: query = query.eq(key, value)
        time_filters = parse_time_constraints(time_constraint)
        if time_filters: field = next(iter(time_filters)); filters = time_filters[field]; [query.gte(field, v) if k=='gte' else query.lt(field, v) for k,v in filters.items()]
        credit_filters = parse_credit_comparison(credit_condition)
        if credit_condition and not credit_filters: print(f"Warning: Could not parse credit_condition: {credit_condition}")
        if credit_filters: field = next(iter(credit_filters)); filters = credit_filters[field]; [getattr(query, k)(field, v) for k,v in filters.items()]

        # --- FIX: Remove await from execute() ---
        result = query.order('created_at', desc=True).execute()
        # --- End FIX ---
        tickets_raw = result.data or []

        tickets_list = []
        for data in tickets_raw:
            ticket_data = {**data, "room_number": data.get("rooms", {}).get("room_number"), "assigned_to_name": data.get("assigned_user", {}).get("full_name"), "created_by_name": data.get("creator", {}).get("full_name") }
            ticket_data.pop("rooms", None); ticket_data.pop("assigned_user", None); ticket_data.pop("creator", None)
            try: tickets_list.append(Ticket(**ticket_data).model_dump(mode='json'))
            except Exception as e: print(f"Pydantic validation error for ticket {data.get('id')} in read_tickets: {e}")
        num_found = len(tickets_list); message = f"Found {num_found} tickets matching criteria." if num_found > 0 else "STOP: No tickets found matching the specified criteria."
        return {"type": "read_results", "entity_type": "ticket", "data": tickets_list, "message": message}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error reading tickets: {str(e)}"}


@tool
async def read_users(conditions: dict = None, time_constraint: str = None, credit_condition: str = None) -> dict:
    """Read users based on conditions (ilike for name), time, and credit. Returns structured data."""
    try:
        supabase = get_supabase_client(); query = supabase.table('users').select('*')
        if conditions:
            for key, value in conditions.items():
                if value is None: continue
                if key == 'full_name': search_term = str(value).strip(); query = query.ilike(key, f'%{search_term}%') if search_term else query
                elif key in ['id', 'credit']:
                     try: query = query.eq(key, int(value))
                     except ValueError: return {"type": "error", "message": f"Invalid numeric value for User '{key}': '{value}'."}
                else: query = query.eq(key, value)
        time_filters = parse_time_constraints(time_constraint)
        if time_filters: field = next(iter(time_filters)); filters = time_filters[field]; [query.gte(field, v) if k=='gte' else query.lt(field, v) for k,v in filters.items()]
        credit_filters = parse_credit_comparison(credit_condition)
        if credit_condition and not credit_filters: print(f"Warning: Could not parse credit_condition: {credit_condition}")
        if credit_filters: field = next(iter(credit_filters)); filters = credit_filters[field]; [getattr(query, k)(field, v) for k,v in filters.items()]

        # --- FIX: Remove await from execute() ---
        result = query.order('full_name').execute()
        # --- End FIX ---
        users_data_raw = result.data or []

        users_list = []
        for user_raw in users_data_raw:
            try: users_list.append(User(**user_raw).model_dump(mode='json'))
            except Exception as e: print(f"Pydantic validation error for user {user_raw.get('id')} in read_users: {e}")
        num_found = len(users_list); message = f"Found {num_found} users matching criteria." if num_found > 0 else "STOP: No users found matching the specified criteria."
        return {"type": "read_results", "entity_type": "user", "data": users_list, "message": message}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error reading users: {str(e)}"}

@tool
async def search_tickets_by_description(description: str) -> dict:
    """Search tickets by description (ilike). Returns structured data."""
    try:
        supabase = get_supabase_client(); search_term = f'%{description}%'

        # --- FIX: Remove await from execute() ---
        response = supabase.table('tickets').select(
             '*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)'
        ).ilike('description', search_term).order('created_at', desc=True).execute()
        # --- End FIX ---
        tickets_raw = response.data or []

        tickets_list = []
        for data in tickets_raw:
             ticket_data = {**data, "room_number": data.get("rooms", {}).get("room_number"), "assigned_to_name": data.get("assigned_user", {}).get("full_name"), "created_by_name": data.get("creator", {}).get("full_name") }
             ticket_data.pop("rooms", None); ticket_data.pop("assigned_user", None); ticket_data.pop("creator", None)
             try: tickets_list.append(Ticket(**ticket_data).model_dump(mode='json'))
             except Exception as e: print(f"Pydantic validation error for ticket {data.get('id')} during search: {e}")
        if not tickets_list: return {"type": "message", "content": f"STOP: No tickets found matching description '{description}'. Please try a different search term."}
        return {"type": "search_results", "entity_type": "ticket", "data": tickets_list, "message": f"Found {len(tickets_list)} tickets matching description '{description}'."}
    except Exception as e: return {"type": "error", "message": f"Error searching tickets: {str(e)}"}


# --- LIST/FIND/SUMMARIZE Tools (Corrected await) ---
@tool
async def list_rooms_by_status(status: str) -> dict:
    """Lists rooms by 'room_status' field. Use search_tickets_by_description for issues."""
    try:
        supabase = get_supabase_client()
        try: valid_status = RoomStatusEnum(status)
        except ValueError: valid_statuses = [e.value for e in RoomStatusEnum]; return {"type": "error", "message": f"Invalid room status '{status}'. Valid: {valid_statuses}"}

        query = supabase.table('rooms').select('*').eq('room_status', valid_status.value)

        # --- FIX: Remove await from execute() ---
        result = query.order('room_number').execute()
        # --- End FIX ---
        rooms_data = result.data or []

        rooms_list = [Room(**room).model_dump(mode='json') for room in rooms_data]
        if not rooms_list: return {"type": "message", "content": f"STOP: No rooms found with status '{valid_status.value}'."}
        return {"type": "read_results", "entity_type": "room", "data": rooms_list, "message": f"Found {len(rooms_list)} rooms with status '{valid_status.value}'."}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error listing rooms by status: {str(e)}"}


@tool
async def find_users_by_workload(has_active_tickets: bool) -> dict:
    """Finds users with (True) or without (False) active assigned tickets."""
    try:
        supabase = get_supabase_client()

        # --- FIX: Remove await from execute() ---
        all_users_resp = supabase.table('users').select('id, full_name, role, email, start_time, end_time, credit, created_at').order('full_name').execute()
        # --- End FIX ---
        all_users_data = all_users_resp.data or []

        all_user_ids = {user['id'] for user in all_users_data}; active_statuses = [TicketStatusEnum.OPEN.value, TicketStatusEnum.IN_PROGRESS.value]

        # --- FIX: Remove await from execute() ---
        users_with_active_tickets_resp = supabase.table('tickets').select('assigned_to').in_('status', active_statuses).not_.is_('assigned_to', 'null').execute()
        # --- End FIX ---
        users_with_active_ids = {t['assigned_to'] for t in (users_with_active_tickets_resp.data or []) if t.get('assigned_to')}

        target_user_ids = users_with_active_ids if has_active_tickets else all_user_ids - users_with_active_ids
        message_verb = "have active tickets" if has_active_tickets else "do not have active tickets"
        filtered_users = [user for user in all_users_data if user['id'] in target_user_ids]
        users_list = [User(**user).model_dump(mode='json') for user in filtered_users]
        if not users_list: return {"type": "message", "content": f"STOP: No users found who {message_verb}."}
        return {"type": "read_results", "entity_type": "user", "data": users_list, "message": f"Found {len(users_list)} users who {message_verb}."}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error finding users by workload: {str(e)}"}


@tool
async def summarize_rooms_with_active_tickets() -> dict:
    """Summary of rooms with active (Open/In Progress) tickets."""
    try:
        supabase = get_supabase_client(); active_statuses = [TicketStatusEnum.OPEN.value, TicketStatusEnum.IN_PROGRESS.value]
        query = supabase.table('rooms').select("id, floor, room_number, room_type, capacity, room_status, cleaning_status, cleaning_priority, credit, last_cleaned, notes, created_at, updated_at, tickets!inner(id, room_id, description, status, priority, credit, assigned_to, created_by, due_time, attachment, comment_log, subtask, created_at, assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name))").in_('tickets.status', active_statuses)

        # --- FIX: Remove await from execute() ---
        result = query.order('room_number').execute()
        # --- End FIX ---
        rooms_with_tickets_raw = result.data or []

        summary_data = []
        for room_raw in rooms_with_tickets_raw:
            room_tickets_list = []
            for ticket_raw in room_raw.get('tickets', []):
                ticket_data = {**ticket_raw, "room_number": room_raw.get('room_number'), "assigned_to_name": ticket_raw.get("assigned_user", {}).get("full_name"), "created_by_name": ticket_raw.get("creator", {}).get("full_name") }; ticket_data.pop("assigned_user", None); ticket_data.pop("creator", None)
                try: room_tickets_list.append(Ticket(**ticket_data).model_dump(mode='json'))
                except Exception as e: print(f"Skipping ticket {ticket_raw.get('id')}: {e}")
            room_info = {k: v for k, v in room_raw.items() if k != 'tickets'}
            try: room_dict = Room(**room_info).model_dump(mode='json'); summary_data.append({"room": room_dict, "active_tickets": room_tickets_list })
            except Exception as e: print(f"Skipping room {room_raw.get('id')}: {e}")
        if not summary_data: return {"type": "message", "content": "STOP: No rooms currently have active (Open or In Progress) tickets."}
        return {"type": "summary_results", "entity_type": "room_issues", "data": summary_data, "message": f"Summary of {len(summary_data)} rooms with active tickets."}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error summarizing room issues: {str(e)}"}


@tool
async def summarize_all_user_workloads() -> dict:
    """Summary of workload for users with active (Open/In Progress) assigned tickets."""
    try:
        supabase = get_supabase_client(); active_statuses = [TicketStatusEnum.OPEN.value, TicketStatusEnum.IN_PROGRESS.value]
        query = supabase.table('users').select("id, full_name, email, role, start_time, end_time, credit, created_at, assigned_tickets:tickets!inner(id, room_id, description, status, priority, credit, assigned_to, created_by, due_time, attachment, comment_log, subtask, created_at, rooms(room_number), creator:users!tickets_created_by_fkey(full_name))").in_('assigned_tickets.status', active_statuses)

        # --- FIX: Remove await from execute() ---
        result = query.order('full_name').execute()
        # --- End FIX ---
        users_with_tickets_raw = result.data or []

        summary_data = []
        for user_raw in users_with_tickets_raw:
            user_tickets_list = []
            for ticket_raw in user_raw.get('assigned_tickets', []):
                 ticket_data = {**ticket_raw, "room_number": ticket_raw.get("rooms", {}).get("room_number"), "assigned_to_name": user_raw.get('full_name'), "created_by_name": ticket_raw.get("creator", {}).get("full_name") }; ticket_data.pop("rooms", None); ticket_data.pop("creator", None)
                 try: user_tickets_list.append(Ticket(**ticket_data).model_dump(mode='json'))
                 except Exception as e: print(f"Skipping ticket {ticket_raw.get('id')} for user {user_raw.get('id')}: {e}")
            user_info = {k: v for k, v in user_raw.items() if k != 'assigned_tickets'}
            try: user_dict = User(**user_info).model_dump(mode='json'); summary_data.append({"user": user_dict, "active_tickets": user_tickets_list})
            except Exception as e: print(f"Skipping user {user_raw.get('id')}: {e}")
        if not summary_data: return {"type": "message", "content": "STOP: No users currently have active (Open or In Progress) tickets assigned."}
        return {"type": "summary_results", "entity_type": "user_workload", "data": summary_data, "message": f"Workload summary for {len(summary_data)} users with active tickets."}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error summarizing user workloads: {str(e)}"}


@tool
async def list_tickets_by_status(status: Optional[str] = None) -> dict:
    """Lists tickets, optionally filtering by status. Returns structured data."""
    try:
        supabase = get_supabase_client(); target_status = None
        if status:
            try: target_status = TicketStatusEnum(status).value
            except ValueError: valid_statuses = [e.value for e in TicketStatusEnum]; return {"type": "error", "message": f"Invalid ticket status '{status}'. Valid: {valid_statuses}"}
        query = supabase.table('tickets').select('*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)')
        if target_status: query = query.eq('status', target_status)

        # --- FIX: Remove await from execute() ---
        result = query.order('created_at', desc=True).execute()
        # --- End FIX ---
        tickets_raw = result.data or []

        tickets_list = []
        for data in tickets_raw:
            ticket_data = {**data, "room_number": data.get("rooms", {}).get("room_number"), "assigned_to_name": data.get("assigned_user", {}).get("full_name"), "created_by_name": data.get("creator", {}).get("full_name") }
            ticket_data.pop("rooms", None); ticket_data.pop("assigned_user", None); ticket_data.pop("creator", None)
            try: tickets_list.append(Ticket(**ticket_data).model_dump(mode='json'))
            except Exception as e: print(f"Pydantic validation error for ticket {data.get('id')} in list_tickets_by_status: {e}")
        status_filter_msg = f" with status '{target_status}'" if target_status else " (all statuses)"; num_found = len(tickets_list)
        if not tickets_list: return {"type": "message", "content": f"STOP: No tickets found{status_filter_msg}."}
        return {"type": "read_results", "entity_type": "ticket", "data": tickets_list, "message": f"Found {num_found} tickets{status_filter_msg}."}
    except Exception as e: return {"type": "error", "message": f"Error listing tickets by status: {str(e)}"}


@tool
async def list_tickets_for_user(user_name: str) -> dict:
    """Lists tickets assigned to or created by a user (partial name match). Returns structured data."""
    try:
        supabase = get_supabase_client(); user_search_term = f'%{user_name}%'

        # --- FIX: Remove await from execute() ---
        user_resp = supabase.table('users').select('id, full_name').ilike('full_name', user_search_term).execute()
        # --- End FIX ---
        matched_users = user_resp.data or []

        if not matched_users: return {"type": "message", "content": f"STOP: No user found matching name '{user_name}'."}
        if len(matched_users) > 1: user_names = [f"'{u['full_name']}' (ID: {u['id']})" for u in matched_users]; return {"type": "clarification_needed", "message": f"Multiple users found for '{user_name}': {', '.join(user_names)}. Please specify."}
        target_user_id = matched_users[0]['id']; target_full_name = matched_users[0]['full_name']
        query = supabase.table('tickets').select('*, rooms(room_number), assigned_user:users!tickets_assigned_to_fkey(full_name), creator:users!tickets_created_by_fkey(full_name)').or_(f'assigned_to.eq.{target_user_id},created_by.eq.{target_user_id}')

        # --- FIX: Remove await from execute() ---
        result = query.order('created_at', desc=True).execute()
        # --- End FIX ---
        tickets_raw = result.data or []

        tickets_list = []
        for data in tickets_raw:
             ticket_data = {**data, "room_number": data.get("rooms", {}).get("room_number"), "assigned_to_name": data.get("assigned_user", {}).get("full_name"), "created_by_name": data.get("creator", {}).get("full_name") }
             ticket_data.pop("rooms", None); ticket_data.pop("assigned_user", None); ticket_data.pop("creator", None)
             try: tickets_list.append(Ticket(**ticket_data).model_dump(mode='json'))
             except Exception as e: print(f"Pydantic validation error for ticket {data.get('id')} in list_tickets_for_user: {e}")
        if not tickets_list: return {"type": "message", "content": f"STOP: No tickets found associated with user '{target_full_name}' (ID: {target_user_id})."}
        return {"type": "read_results", "entity_type": "ticket", "data": tickets_list, "message": f"Found {len(tickets_list)} tickets associated with user '{target_full_name}'."}
    except Exception as e: return {"type": "error", "message": f"Error listing tickets for user: {str(e)}"}


# --- PREPARE CREATE/UPDATE/DELETE Tools (Corrected await) ---
@tool
async def prepare_create_room(data: Dict[str, Any]) -> dict:
    """Prepares room creation for confirmation. Validates data, checks uniqueness."""
    supabase = get_supabase_client()
    try:
        room_data_input = data.get("data", data)
        try: room_create_data = RoomCreate(**room_data_input)
        except Exception as validation_error: return {"type": "error", "message": f"Invalid data for creating room: {validation_error}"}
        # Use await for the async service call
        existing_room = await RoomService.get_room_by_number(supabase, room_create_data.room_number)
        if existing_room: return {"type": "error", "message": f"Cannot create room: Room number '{room_create_data.room_number}' already exists (ID: {existing_room.id})."}
        proposed_data = room_create_data.model_dump(mode='json')
        return {"type": "confirmation_required", "action": "create", "entity_type": "room", "entity_id": None, "original_data": None, "proposed_data": proposed_data, "message": f"Please review the details for the new room '{proposed_data.get('room_number')}' and confirm creation."}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing room creation: {str(e)}"}


@tool
async def prepare_create_ticket(data: Dict[str, Any]) -> dict:
    """Prepares ticket creation for confirmation. Validates data, checks foreign keys."""
    supabase = get_supabase_client()
    try:
        ticket_data_input = data.get("data", data); temp_ticket_data = ticket_data_input.copy()
        if "room_number" in temp_ticket_data and "room_id" not in temp_ticket_data:
            # Use await for the async service call
            room_obj = await RoomService.get_room_by_number(supabase, temp_ticket_data['room_number'])
            if not room_obj: return {"type": "error", "message": f"Cannot create ticket: Room number '{temp_ticket_data['room_number']}' not found."}
            temp_ticket_data['room_id'] = room_obj.id
        elif "room_id" not in temp_ticket_data: return {"type": "error", "message": "Cannot create ticket: Room ID or Room Number is required."}
        try: ticket_create_data = TicketCreate(**temp_ticket_data)
        except Exception as validation_error: return {"type": "error", "message": f"Invalid data for creating ticket: {validation_error}"}

        # Use await for async service calls
        room_exists = await RoomService.get_room(supabase, ticket_create_data.room_id);
        if not room_exists: return {"type": "error", "message": f"Cannot create ticket: Room with ID '{ticket_create_data.room_id}' not found."}
        if ticket_create_data.assigned_to is not None:
             assigned_user = await UserService.get_user(supabase, ticket_create_data.assigned_to)
             if not assigned_user: return {"type": "error", "message": f"Cannot create ticket: Assigned user ID '{ticket_create_data.assigned_to}' not found."}
        created_by_user = await UserService.get_user(supabase, ticket_create_data.created_by)
        if not created_by_user: return {"type": "error", "message": f"Cannot create ticket: Creating user ID '{ticket_create_data.created_by}' not found."}

        proposed_data = ticket_create_data.model_dump(mode='json')
        return {"type": "confirmation_required", "action": "create", "entity_type": "ticket", "entity_id": None, "original_data": None, "proposed_data": proposed_data, "message": f"Please review the details for the new ticket and confirm creation."}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing ticket creation: {str(e)}"}

@tool
async def prepare_create_user(data: Dict[str, Any]) -> dict:
    """Prepares user creation for confirmation. Validates data, checks email uniqueness."""
    supabase = get_supabase_client()
    try:
        user_data_input = data.get("data", data)
        try: user_create_data = UserCreate(**user_data_input)
        except Exception as validation_error: return {"type": "error", "message": f"Invalid data for creating user: {validation_error}"}
        # Use await for async service call
        existing_user = await UserService.get_user_by_email(supabase, user_create_data.email)
        if existing_user: return {"type": "error", "message": f"Cannot create user: Email '{user_create_data.email}' is already registered."}
        proposed_data = user_create_data.model_dump(mode='json')
        return {"type": "confirmation_required", "action": "create", "entity_type": "user", "entity_id": None, "original_data": None, "proposed_data": proposed_data, "message": f"Please review the details for the new user '{proposed_data.get('full_name')}' and confirm creation."}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing user creation: {str(e)}"}


@tool
async def prepare_update_room(conditions: Dict[str, Any], data: Dict[str, Any]) -> dict:
    """Prepares room update for confirmation. Fetches room, simulates changes."""
    supabase = get_supabase_client()
    try:
        room_number = conditions.get("room_number"); room_id = conditions.get("id")
        if not room_id and room_number:
            find_resp = supabase.table('rooms').select('id', count='exact').eq('room_number', room_number).maybe_single().execute()
            # --- FIX: Check find_resp before accessing data ---
            if find_resp and find_resp.data:
                room_id = find_resp.data['id']
            else:
                # Explicitly handle not found case during preparation
                return {"type": "error", "message": f"Cannot prepare update: Room number '{room_number}' not found."}
            # --- End FIX ---
        elif not room_id: return {"type": "error", "message": "Room ID or Room Number condition required."}

        # --- Normalize common enum-like values in 'data' ---
        if isinstance(data, dict):
             if 'cleaning_priority' in data and isinstance(data['cleaning_priority'], str):
                 data['cleaning_priority'] = data['cleaning_priority'].capitalize() # Low -> Low
             if 'room_status' in data and isinstance(data['room_status'], str):
                 # More complex mapping might be needed if casing differs significantly
                 data['room_status'] = data['room_status'].replace("_", " ").title() # needs_cleaning -> Needs Cleaning
             if 'cleaning_status' in data and isinstance(data['cleaning_status'], str):
                 data['cleaning_status'] = data['cleaning_status'].title() # clean -> Clean
        # --- End Normalization ---


        original_room_obj = await _fetch_entity(supabase, "room", room_id)
        if not original_room_obj: return {"type": "error", "message": f"Room {room_id} not found."}

        original_data_dict = original_room_obj.model_dump(mode='json')
        proposed_data_dict = deepcopy(original_data_dict)

        try:
            update_payload = RoomUpdate(**data).model_dump(exclude_unset=True, mode='json')
            update_payload = {k: v for k, v in update_payload.items() if v is not None}
        except Exception as validation_error:
             return {"type": "error", "message": f"Invalid data for updating room: {validation_error}"}

        if not update_payload: return {"type": "message", "content": f"No valid updates provided for Room {original_data_dict.get('room_number', room_id)}."}

        proposed_data_dict.update(update_payload)
        return {"type": "confirmation_required", "action": "update", "entity_type": "room", "entity_id": room_id, "original_data": original_data_dict, "proposed_data": proposed_data_dict, "update_payload": update_payload, "message": f"Confirm update for Room {original_data_dict.get('room_number', room_id)}?"}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing room update: {str(e)}"}


@tool
async def prepare_delete_room(conditions: Dict[str, Any]) -> dict:
    """Prepares room deletion for confirmation. Fetches room, checks tickets."""
    supabase = get_supabase_client()
    try:
        room_number = conditions.get("room_number"); room_id = conditions.get("id")
        if not room_id and room_number:
             find_resp = supabase.table('rooms').select('id', count='exact').eq('room_number', room_number).maybe_single().execute()
             # --- FIX: Check find_resp before accessing data ---
             if find_resp and find_resp.data:
                 room_id = find_resp.data['id']
             else:
                 return {"type": "error", "message": f"Cannot prepare deletion: Room number '{room_number}' not found."}
             # --- End FIX ---
        elif not room_id: return {"type": "error", "message": "Room ID or Room Number condition required."}

        original_room_obj = await _fetch_entity(supabase, "room", room_id)
        if not original_room_obj: return {"type": "error", "message": f"Room {room_id} not found."}

        original_data_dict = original_room_obj.model_dump(mode='json')
        tickets_response = supabase.table('tickets').select('id', count='exact').eq('room_id', room_id).limit(1).execute()
        if tickets_response.count and tickets_response.count > 0: return {"type": "error", "message": f"Cannot delete Room {original_data_dict.get('room_number', room_id)}: It has associated tickets."}
        return {"type": "confirmation_required", "action": "delete", "entity_type": "room", "entity_id": room_id, "original_data": original_data_dict, "proposed_data": None, "message": f"Confirm DELETE Room {original_data_dict.get('room_number', room_id)}?"}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing room deletion: {str(e)}"}


# --- ADD Normalization to prepare_update_ticket and prepare_update_user similarly ---


@tool
async def prepare_update_ticket(conditions: Dict[str, Any], data: Dict[str, Any]) -> dict:
    """
    Prepares ticket update for confirmation. Fetches full original ticket details,
    simulates changes, validates 'assigned_to', fetches NEW related names/numbers for
    the proposed state, and returns original data, proposed data, and update payload.
    """
    supabase = get_supabase_client()
    try:
        ticket_id = conditions.get("id") or conditions.get("ticket_id")
        # ... (ID validation) ...
        if not isinstance(ticket_id, int): 
            try: ticket_id = int(ticket_id)
            except (ValueError, TypeError): return {"type": "error", "message": f"Invalid Ticket ID format."}
        if not ticket_id: return {"type": "error", "message": "Ticket ID condition required."}

        # --- 1. Fetch FULL Original Ticket Data ---
        # Use the service method which includes joins for names/number
        original_ticket_obj = await TicketService._fetch_and_construct_ticket(ticket_id=ticket_id)
        if not original_ticket_obj:
            return {"type": "error", "message": f"Ticket {ticket_id} not found."}
        # Original data is now complete, including names/number
        original_data_dict = original_ticket_obj.model_dump(mode='json')

        # --- 2. Normalize and Validate Input Update Data ---
        update_data_normalized = data.copy()
        # ... (priority, status normalization) ...
        if 'priority' in update_data_normalized and isinstance(update_data_normalized['priority'], str): update_data_normalized['priority'] = update_data_normalized['priority'].capitalize()
        if 'status' in update_data_normalized and isinstance(update_data_normalized['status'], str): status_lower = update_data_normalized['status'].lower(); status_map = { 'in progress': 'In Progress', 'resolved': 'Resolved', 'canceled': 'Canceled', 'open': 'Open' }; update_data_normalized['status'] = status_map.get(status_lower, update_data_normalized['status'].capitalize())

        # Validate 'assigned_to' if present, allowing unassignment
        new_assignee_id: Optional[int] = -1 # Use sentinel value to differentiate "not set" from "set to None"
        if 'assigned_to' in update_data_normalized:
            assignee_value = update_data_normalized.get('assigned_to')
            if assignee_value is None or str(assignee_value).lower() in ['null', 'none', 'unassigned', '0', '']:
                new_assignee_id = None
                update_data_normalized['assigned_to'] = None # Ensure None is passed for validation
            else:
                try:
                    potential_id = int(assignee_value)
                    if potential_id <= 0: raise ValueError("Assignee ID must be positive.")
                    assignee = await UserService.get_user(supabase, potential_id) # Check existence
                    if not assignee: return {"type": "error", "message": f"Cannot update ticket: Assigned user ID '{potential_id}' not found."}
                    new_assignee_id = potential_id
                    update_data_normalized['assigned_to'] = new_assignee_id # Ensure int ID for validation
                except (ValueError, TypeError): return {"type": "error", "message": f"Invalid User ID for assigned_to: '{assignee_value}'."}
        # --- End Normalization/Validation ---


        # --- 3. Calculate Minimal Update Payload ---
        try:
            update_payload = TicketUpdate(**update_data_normalized).model_dump(exclude_unset=True, mode='json')
            # Filter Nones, EXCEPT for assigned_to if it was explicitly set to None
            filtered_payload = {}
            for k, v in update_payload.items():
                if k == 'assigned_to' and 'assigned_to' in update_data_normalized: # Check if it was in input
                      filtered_payload[k] = update_data_normalized['assigned_to'] # Use the potentially None value
                elif v is not None:
                      filtered_payload[k] = v
            update_payload = filtered_payload
        except Exception as validation_error: return {"type": "error", "message": f"Invalid data for ticket update: {validation_error}"}

        if not update_payload: return {"type": "message", "content": f"No valid updates provided for Ticket {ticket_id}."}
        # --- End Payload Calculation ---


        # --- 4. Create Proposed State Dictionary ---
        proposed_data_dict = deepcopy(original_data_dict)
        proposed_data_dict.update(update_payload) # Apply the minimal changes
        # --- End Proposed State Creation ---


        # --- 5. Fetch/Update Names/Numbers for the Proposed State ---
        # Get IDs from the *proposed* state
        proposed_room_id = proposed_data_dict.get('room_id')
        proposed_assignee_id = proposed_data_dict.get('assigned_to') # Could be None now
        proposed_creator_id = proposed_data_dict.get('created_by') # Should not change

        # Fetch Room Number for Proposed State
        if proposed_room_id:
             room = await RoomService.get_room(supabase, proposed_room_id)
             proposed_data_dict['room_number'] = room.room_number if room else None
        else: proposed_data_dict['room_number'] = None

        # Fetch Assignee Name for Proposed State
        if proposed_assignee_id:
             assignee = await UserService.get_user(supabase, proposed_assignee_id)
             proposed_data_dict['assigned_to_name'] = assignee.full_name if assignee else None
        else: # Unassigned
             proposed_data_dict['assigned_to_name'] = None

        # Fetch Creator Name for Proposed State (usually unchanged but good practice)
        if proposed_creator_id:
             creator = await UserService.get_user(supabase, proposed_creator_id)
             proposed_data_dict['created_by_name'] = creator.full_name if creator else None
        else: proposed_data_dict['created_by_name'] = None
        # --- End Fetching Names/Numbers ---


        return {
            "type": "confirmation_required",
            "action": "update",
            "entity_type": "ticket",
            "entity_id": ticket_id,
            "original_data": original_data_dict, # Already includes names/number
            "proposed_data": proposed_data_dict, # Includes names/number corresponding to updated IDs
            "update_payload": update_payload, # Minimal payload for the actual update
            "message": f"Confirm update for Ticket {ticket_id}?"
        }
    except Exception as e:
        traceback.print_exc()
        return {"type": "error", "message": f"Error preparing ticket update: {str(e)}"}

@tool
async def prepare_update_user(conditions: Dict[str, Any], data: Dict[str, Any]) -> dict:
    """Prepares user update for confirmation. Fetches user, simulates changes, checks email."""
    supabase = get_supabase_client()
    try:
        user_id = conditions.get("id")
        if not user_id: return {"type": "error", "message": "User ID condition required."}

        # --- Normalize common enum-like values in 'data' ---
        if isinstance(data, dict):
            if 'role' in data and isinstance(data['role'], str):
                 data['role'] = data['role'].capitalize() # manager -> Manager
        # --- End Normalization ---

        original_user_obj = await _fetch_entity(supabase, "user", user_id)
        if not original_user_obj: return {"type": "error", "message": f"User {user_id} not found."}

        original_data_dict = original_user_obj.model_dump(mode='json')
        proposed_data_dict = deepcopy(original_data_dict)

        try:
            update_payload = UserUpdate(**data).model_dump(exclude_unset=True, mode='json')
            update_payload = {k: v for k, v in update_payload.items() if v is not None}
        except Exception as validation_error:
             return {"type": "error", "message": f"Invalid data for updating user: {validation_error}"}

        if 'email' in update_payload:
             if update_payload['email'] != original_data_dict.get('email'):
                  existing_user = await UserService.get_user_by_email(supabase, update_payload['email'])
                  if existing_user and existing_user.id != user_id: return {"type": "error", "message": f"Update prep failed: Email '{update_payload['email']}' already taken."}

        if not update_payload: return {"type": "message", "content": f"No valid updates provided for User {original_data_dict.get('full_name', user_id)}."}

        proposed_data_dict.update(update_payload)
        return {"type": "confirmation_required", "action": "update", "entity_type": "user", "entity_id": user_id, "original_data": original_data_dict, "proposed_data": proposed_data_dict, "update_payload": update_payload, "message": f"Confirm update for User {original_data_dict.get('full_name', user_id)}?"}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing user update: {str(e)}"}

@tool
async def prepare_delete_room(conditions: Dict[str, Any]) -> dict:
    """Prepares room deletion for confirmation. Fetches room, checks tickets."""
    supabase = get_supabase_client()
    try:
        room_number = conditions.get("room_number"); room_id = conditions.get("id")
        if not room_id and room_number:
             # --- FIX: Remove await from execute() ---
             find_resp = supabase.table('rooms').select('id', count='exact').eq('room_number', room_number).maybe_single().execute()
             # --- End FIX ---
             room_id = find_resp.data['id'] if find_resp.data else None
        if not room_id: return {"type": "error", "message": "Room ID or Room Number condition required."}
        # await async helper/service call
        original_room_obj = await _fetch_entity(supabase, "room", room_id)
        if not original_room_obj: return {"type": "error", "message": f"Room {room_id} not found."}
        original_data_dict = original_room_obj.model_dump(mode='json')
        # --- FIX: Remove await from execute() ---
        tickets_response = supabase.table('tickets').select('id', count='exact').eq('room_id', room_id).limit(1).execute()
        # --- End FIX ---
        if tickets_response.count and tickets_response.count > 0: return {"type": "error", "message": f"Cannot delete Room {original_data_dict.get('room_number', room_id)}: It has associated tickets."}
        return {"type": "confirmation_required", "action": "delete", "entity_type": "room", "entity_id": room_id, "original_data": original_data_dict, "proposed_data": None, "message": f"Confirm DELETE Room {original_data_dict.get('room_number', room_id)}?"}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing room deletion: {str(e)}"}


@tool
async def prepare_delete_ticket(conditions: Dict[str, Any]) -> dict:
    """Prepares ticket deletion for confirmation. Fetches ticket."""
    supabase = get_supabase_client()
    try:
        ticket_id = conditions.get("id") or conditions.get("ticket_id")
        if not ticket_id: return {"type": "error", "message": "Ticket ID condition required."}
        # await async helper/service call
        original_ticket_obj = await _fetch_entity(supabase, "ticket", ticket_id)
        if not original_ticket_obj: return {"type": "error", "message": f"Ticket {ticket_id} not found."}
        original_data_dict = original_ticket_obj.model_dump(mode='json')
        return {"type": "confirmation_required", "action": "delete", "entity_type": "ticket", "entity_id": ticket_id, "original_data": original_data_dict, "proposed_data": None, "message": f"Confirm DELETE Ticket {ticket_id}?"}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing ticket deletion: {str(e)}"}


@tool
async def prepare_delete_user(conditions: Dict[str, Any]) -> dict:
    """Prepares user deletion for confirmation. Fetches user, checks tickets."""
    supabase = get_supabase_client()
    try:
        user_id = conditions.get("id")
        if not user_id: return {"type": "error", "message": "User ID condition required."}
        # await async helper/service call
        original_user_obj = await _fetch_entity(supabase, "user", user_id)
        if not original_user_obj: return {"type": "error", "message": f"User {user_id} not found."}
        original_data_dict = original_user_obj.model_dump(mode='json')
        # --- FIX: Remove await from execute() ---
        assigned_tickets = supabase.table('tickets').select('id', count='exact').eq('assigned_to', user_id).limit(1).execute()
        created_tickets = supabase.table('tickets').select('id', count='exact').eq('created_by', user_id).limit(1).execute()
        # --- End FIX ---
        if (assigned_tickets.count and assigned_tickets.count > 0) or (created_tickets.count and created_tickets.count > 0): return {"type": "error", "message": f"Cannot delete User {original_data_dict.get('full_name', user_id)}: Associated with tickets."}
        return {"type": "confirmation_required", "action": "delete", "entity_type": "user", "entity_id": user_id, "original_data": original_data_dict, "proposed_data": None, "message": f"Confirm DELETE User {original_data_dict.get('full_name', user_id)}?"}
    except Exception as e: traceback.print_exc(); return {"type": "error", "message": f"Error preparing user deletion: {str(e)}"}

@tool
async def verify_multiple_rooms_and_tickets(room_numbers: List[str]) -> dict:
    """
    Verifies multiple rooms by their numbers and gets their details and associated tickets.
    Use this when the user asks to see details for multiple specific rooms (e.g., "show room 201, 202, 305").
    Returns a list of structured data for each found room. Errors for non-existent rooms are included.
    """
    supabase = get_supabase_client() # Get client once
    results = []
    found_count = 0
    not_found = []

    if not isinstance(room_numbers, list) or not room_numbers:
         return {"type": "error", "message": "Invalid input: A list of room numbers is required."}

    # --- Prepare list of tasks to run concurrently ---
    tasks = []
    for room_num in room_numbers:
        if not isinstance(room_num, str):
            # Add error directly for invalid format
            results.append({"type": "error", "message": f"Invalid room number format provided: {room_num}"})
            continue
        # --- FIX: Use .ainvoke with a dictionary ---
        # Create a task to call the single tool asynchronously
        tasks.append(verify_room_and_tickets.ainvoke({"room_number": room_num.strip()}))
        # --- End FIX ---

    # --- Execute tasks concurrently ---
    import asyncio # Import asyncio if not already imported
    task_results = await asyncio.gather(*tasks, return_exceptions=True) # Gather results, capture exceptions

    # --- Process results ---
    for i, single_result in enumerate(task_results):
        room_num_requested = room_numbers[i].strip() # Get corresponding room number

        if isinstance(single_result, Exception):
             # Handle exceptions raised during the .ainvoke call itself
             print(f"Exception invoking tool for room {room_num_requested}: {single_result}")
             results.append({"type": "error", "message": f"Error processing room {room_num_requested}: {str(single_result)}"})
        elif isinstance(single_result, dict):
             # Process the dictionary result returned by the tool
             if single_result.get("type") == "error":
                  # Handle errors returned *by* the tool (e.g., room not found)
                  results.append(single_result) # Add the error object
                  if "not found" in single_result.get("message", "").lower():
                      not_found.append(room_num_requested)
             elif single_result.get("type") == "read_results":
                  # Add the successful data payload
                  results.append(single_result['data']) # Add {room:..., tickets:...}
                  found_count += 1
             else:
                  # Handle unexpected dictionary structure from tool
                  print(f"Unexpected result structure for room {room_num_requested}: {single_result}")
                  results.append({"type": "error", "message": f"Received unexpected result format for room {room_num_requested}."})
        else:
             # Handle completely unexpected return type
             print(f"Unexpected result type for room {room_num_requested}: {type(single_result)}")
             results.append({"type": "error", "message": f"Received unexpected result type for room {room_num_requested}."})


    # --- Prepare final message ---
    message = f"Fetched details for {found_count} room(s)."
    if not_found: message += f" Could not find room(s): {', '.join(not_found)}."
    # Optionally report other specific errors if needed from the results list

    return {
        "type": "batch_read_results",
        "entity_type": "room_with_tickets", # Keep consistent entity type
        "data": results, # List containing data objects or error objects
        "message": message
    }


@tool
async def prepare_batch_update_rooms(room_numbers: List[str], data: Dict[str, Any]) -> dict:
    """
    Prepares a batch update for multiple rooms identified by their numbers.
    Validates the update data once and prepares a confirmation request summarizing the batch action.
    Use this when the user asks to update the same field(s) for multiple rooms (e.g., "set priority low for rooms 201, 202, 203").
    """
    supabase = get_supabase_client()
    target_rooms = []
    errors = []
    not_found = []

    if not isinstance(room_numbers, list) or not room_numbers:
         return {"type": "error", "message": "Invalid input: A list of room numbers is required."}
    if not isinstance(data, dict) or not data:
         return {"type": "error", "message": "Invalid input: Update data (key-value pairs) is required."}


    # --- Normalize update data once ---
    update_data_normalized = data.copy()
    if 'cleaning_priority' in update_data_normalized and isinstance(update_data_normalized['cleaning_priority'], str):
        update_data_normalized['cleaning_priority'] = update_data_normalized['cleaning_priority'].capitalize()
    if 'room_status' in update_data_normalized and isinstance(update_data_normalized['room_status'], str):
        update_data_normalized['room_status'] = update_data_normalized['room_status'].replace("_", " ").title()
    if 'cleaning_status' in update_data_normalized and isinstance(update_data_normalized['cleaning_status'], str):
        update_data_normalized['cleaning_status'] = update_data_normalized['cleaning_status'].title()

    # Validate the normalized update payload structure
    try:
        update_payload = RoomUpdate(**update_data_normalized).model_dump(exclude_unset=True, mode='json')
        update_payload = {k: v for k, v in update_payload.items() if v is not None}
    except Exception as validation_error:
         return {"type": "error", "message": f"Invalid data for updating rooms: {validation_error}"}

    if not update_payload:
         return {"type": "message", "content": "No valid updates identified in the request."}

    # Find target room IDs and basic info
    for room_num in room_numbers:
        room_num_stripped = room_num.strip()
        try:
            find_resp = supabase.table('rooms').select('id, room_number, floor').eq('room_number', room_num_stripped).maybe_single().execute()
            if find_resp and find_resp.data:
                 target_rooms.append(find_resp.data) # Store {'id': X, 'room_number': 'Y', 'floor': Z}
            else:
                 not_found.append(room_num_stripped)
        except Exception as e:
             print(f"Error finding room {room_num_stripped}: {e}")
             errors.append(f"Error checking room {room_num_stripped}")

    if not target_rooms:
         error_msg = "Cannot prepare batch update: No target rooms found."
         if not_found: error_msg += f" Non-existent rooms: {', '.join(not_found)}."
         if errors: error_msg += f" Errors encountered: {'; '.join(errors)}."
         return {"type": "error", "message": error_msg}

    # Prepare summary message for confirmation
    room_list_str = ", ".join([r['room_number'] for r in target_rooms])
    update_desc = ", ".join([f"{k}: '{v}'" for k, v in update_payload.items()])
    message = f"Please confirm applying the following update(s) ({update_desc}) to {len(target_rooms)} room(s): {room_list_str}."
    if not_found: message += f" (Note: Room(s) {', '.join(not_found)} were not found and will be ignored)."
    if errors: message += f" (Note: Errors occurred while checking some rooms: {'; '.join(errors)})."

    return {
        "type": "confirmation_required",
        "action": "batch_update", # Special action type
        "entity_type": "room",
        "entity_ids": [r['id'] for r in target_rooms], # List of IDs to update
        "original_data": None, # Too complex to show all originals for batch
        "proposed_data": None, # Showing individual proposed states is complex
        "update_payload": update_payload, # The common payload to apply
        "message": message
    }

@tool
async def prepare_batch_update_tickets(ticket_ids: List[int], data: Dict[str, Any]) -> dict:
    """
    Prepares a batch update for multiple tickets identified by their IDs.
    Validates the update data once and prepares a confirmation request summarizing the batch action.
    Use this for requests like "set priority high for tickets 123, 456".
    """
    supabase = get_supabase_client()
    target_tickets_info = [] # Store basic info like ID and description
    errors = []
    not_found = []

    if not isinstance(ticket_ids, list) or not ticket_ids:
        return {"type": "error", "message": "Invalid input: A list of ticket IDs is required."}
    if not isinstance(data, dict) or not data:
        return {"type": "error", "message": "Invalid input: Update data (key-value pairs) is required."}

    # Normalize update data
    update_data_normalized = data.copy()
    if 'priority' in update_data_normalized and isinstance(update_data_normalized['priority'], str):
        update_data_normalized['priority'] = update_data_normalized['priority'].capitalize()
    if 'status' in update_data_normalized and isinstance(update_data_normalized['status'], str):
        status_lower = update_data_normalized['status'].lower()
        if status_lower == 'in progress': update_data_normalized['status'] = 'In Progress'
        elif status_lower == 'resolved': update_data_normalized['status'] = 'Resolved'
        elif status_lower == 'canceled': update_data_normalized['status'] = 'Canceled'
        else: update_data_normalized['status'] = update_data_normalized['status'].capitalize()

    # Validate payload
    try:
        update_payload = TicketUpdate(**update_data_normalized).model_dump(exclude_unset=True, mode='json')
        update_payload = {k: v for k, v in update_payload.items() if v is not None}
    except Exception as validation_error:
        return {"type": "error", "message": f"Invalid data for updating tickets: {validation_error}"}

    if not update_payload:
        return {"type": "message", "content": "No valid updates identified."}

    # Check foreign keys if relevant (e.g., assigned_to) - Check ONCE
    if 'assigned_to' in update_payload and update_payload['assigned_to'] is not None:
        assignee = await UserService.get_user(supabase, update_payload['assigned_to'])
        if not assignee:
            return {"type": "error", "message": f"Cannot set assignee: User ID '{update_payload['assigned_to']}' not found."}
    # Add checks for other FKs if needed

    # Find target ticket IDs (verify they exist)
    # Fetch basic info to display in confirmation message
    select_query = supabase.table('tickets').select('id, description').in_('id', ticket_ids)
    find_resp = select_query.execute() # Removed await

    if find_resp.data:
        found_ids = {t['id'] for t in find_resp.data}
        target_tickets_info = find_resp.data
        not_found = [str(tid) for tid in ticket_ids if tid not in found_ids]
    else:
        not_found = [str(tid) for tid in ticket_ids]

    if not target_tickets_info:
         error_msg = "Cannot prepare batch update: No target tickets found."
         if not_found: error_msg += f" Non-existent IDs: {', '.join(not_found)}."
         return {"type": "error", "message": error_msg}

    # Prepare confirmation message
    ticket_list_str = ", ".join([f"#{t['id']}" for t in target_tickets_info])
    update_desc = ", ".join([f"{k}: '{v}'" for k, v in update_payload.items()])
    message = f"Confirm applying update(s) ({update_desc}) to {len(target_tickets_info)} ticket(s): {ticket_list_str}."
    if not_found: message += f" (Note: Ticket ID(s) {', '.join(not_found)} not found/ignored)."

    return {
        "type": "confirmation_required",
        "action": "batch_update",
        "entity_type": "ticket",
        "entity_ids": [t['id'] for t in target_tickets_info],
        "update_payload": update_payload,
        "message": message
    }

@tool
async def prepare_batch_update_users(user_ids: List[int], data: Dict[str, Any]) -> dict:
    """
    Prepares a batch update for multiple users identified by their IDs.
    Validates the update data once and prepares a confirmation request summarizing the batch action.
    Use this for requests like "add 10 credits to users 5, 8". Checks email conflicts if email is updated.
    """
    supabase = get_supabase_client()
    target_users_info = []
    errors = []
    not_found = []

    if not isinstance(user_ids, list) or not user_ids:
        return {"type": "error", "message": "Invalid input: A list of user IDs is required."}
    if not isinstance(data, dict) or not data:
        return {"type": "error", "message": "Invalid input: Update data is required."}

    # Normalize update data
    update_data_normalized = data.copy()
    if 'role' in update_data_normalized and isinstance(update_data_normalized['role'], str):
        update_data_normalized['role'] = update_data_normalized['role'].capitalize()

    # Validate payload
    try:
        update_payload = UserUpdate(**update_data_normalized).model_dump(exclude_unset=True, mode='json')
        update_payload = {k: v for k, v in update_payload.items() if v is not None}
    except Exception as validation_error:
        return {"type": "error", "message": f"Invalid data for updating users: {validation_error}"}

    if not update_payload:
        return {"type": "message", "content": "No valid updates identified."}

    # Pre-check for email conflict if email is being updated (more complex for batch)
    # For simplicity, we might skip this pre-check in batch and let the actual update fail later if needed,
    # OR perform the check individually AFTER finding the users. Let's check after finding.

    # Find target user IDs & basic info
    select_query = supabase.table('users').select('id, full_name, email').in_('id', user_ids)
    find_resp = select_query.execute() # Removed await

    if find_resp.data:
        found_ids = {u['id'] for u in find_resp.data}
        target_users_info = find_resp.data
        not_found = [str(uid) for uid in user_ids if uid not in found_ids]

         # Check email conflict for found users if email is in payload
        if 'email' in update_payload:
             new_email = update_payload['email']
             # Check if this email is already used by someone NOT in the current update batch
             existing_email_resp = supabase.table('users').select('id, full_name') \
                 .eq('email', new_email) \
                 .not_.in_('id', [u['id'] for u in target_users_info]) \
                 .limit(1).execute() # Removed await
             if existing_email_resp.data:
                 conflicting_user = existing_email_resp.data[0]
                 return {"type": "error", "message": f"Cannot prepare batch update: Proposed email '{new_email}' is already used by another user '{conflicting_user['full_name']}' (ID: {conflicting_user['id']}) outside this batch."}
             # Also check for conflicts *within* the batch if more than one user is being updated (they'd all get the same email)
             if len(target_users_info) > 1:
                  # This logic assumes updating multiple users to the *same* new email is invalid.
                  # Adjust if that's allowed (though unlikely).
                  return {"type": "error", "message": "Cannot prepare batch update: Updating multiple users to the same new email address is not allowed."}

    else:
        not_found = [str(uid) for uid in user_ids]


    if not target_users_info:
         error_msg = "Cannot prepare batch update: No target users found."
         if not_found: error_msg += f" Non-existent IDs: {', '.join(not_found)}."
         return {"type": "error", "message": error_msg}

    # Prepare confirmation message
    user_list_str = ", ".join([f"'{u['full_name']}' (ID:{u['id']})" for u in target_users_info])
    update_desc = ", ".join([f"{k}: '{v}'" for k, v in update_payload.items()])
    message = f"Confirm applying update(s) ({update_desc}) to {len(target_users_info)} user(s): {user_list_str}."
    if not_found: message += f" (Note: User ID(s) {', '.join(not_found)} not found/ignored)."

    return {
        "type": "confirmation_required",
        "action": "batch_update",
        "entity_type": "user",
        "entity_ids": [u['id'] for u in target_users_info],
        "update_payload": update_payload,
        "message": message
    }

@tool
async def read_user_names() -> dict:
    """
    Reads and returns a list of all user names and their corresponding IDs.
    Useful for providing options when assigning tasks or when clarification is needed for a user name.
    """
    supabase = get_supabase_client()
    try:
        query = supabase.table('users').select('id, full_name, role') # Select ID, name, maybe role for context
        response = query.order('full_name').execute() # No await

        users_data = response.data or []

        # Format data simply as list of {id, name, role} dicts
        user_list = [{"id": u['id'], "full_name": u['full_name'], "role": u.get('role')} for u in users_data]

        if not user_list:
            return {"type": "message", "content": "STOP: No users found in the system."}

        return {
            "type": "read_results",
            "entity_type": "user_summary", # Use a specific entity type
            "data": user_list, # List of {id, full_name, role}
            "message": f"Found {len(user_list)} users."
        }
    except Exception as e:
        return {"type": "error", "message": f"Error reading user names: {str(e)}"}


@tool
async def get_ticket_by_id(ticket_id: int) -> dict:
    """
    Retrieves the full details for a SINGLE specific ticket using its unique ID.
    Includes related room number and user names (creator/assignee) via efficient join.
    Use this tool ONLY when the user asks for one specific ticket by its number/ID.
    Args:
        ticket_id (int): The exact ID of the ticket to retrieve.
    Returns structured data for the single ticket or an error if not found.
    """
    supabase = get_supabase_client()

    try:
        # Validate ID
        if not isinstance(ticket_id, int) or ticket_id <= 0:
             return {"type": "error", "message": f"Invalid Ticket ID: '{ticket_id}'. Must be positive integer."}

        # --- USE SERVICE METHOD DIRECTLY ---
        # TicketService._fetch_and_construct_ticket already performs the correct
        # Supabase select with joins and returns a validated Pydantic Ticket object or None.
        ticket_obj: Optional[Ticket] = await TicketService._fetch_and_construct_ticket( ticket_id=ticket_id
        )

        # --- END USE SERVICE METHOD ---

        if not ticket_obj:
            return {"type": "message", "content": f"STOP: No ticket found with ID {ticket_id}."}

        # Dump the Pydantic object (which includes the names/number) to dict
        ticket_data_dict = ticket_obj.model_dump(mode='json')

        return {
            "type": "read_results",
            "entity_type": "ticket",
            "data": [ticket_data_dict], # Return as single-element list
            "message": f"Details for Ticket ID {ticket_id}."
        }
    except Exception as e:
        traceback.print_exc()
        return {"type": "error", "message": f"Error retrieving ticket {ticket_id}: {str(e)}"}

# --- Tools List (Remains the same) ---
tools = [
    # ... (list all tools as before) ...
    verify_room_and_tickets, read_rooms, read_tickets, read_users,
    search_tickets_by_description, list_rooms_by_status, find_users_by_workload,
    summarize_rooms_with_active_tickets, summarize_all_user_workloads,
    list_tickets_by_status, list_tickets_for_user,
    prepare_create_room, prepare_create_ticket, prepare_create_user,
    prepare_update_room, prepare_update_ticket, prepare_update_user,
    prepare_delete_room, prepare_delete_ticket, prepare_delete_user,
    prepare_batch_update_rooms, verify_multiple_rooms_and_tickets,
    prepare_batch_update_tickets, prepare_batch_update_users,
    read_user_names, get_ticket_by_id
]

# --- Agent Prompt (Remains the same) ---
prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a helpful and meticulous hotel management assistant. Your primary role is to interact with the hotel's data (rooms, tickets, users) using the available tools and provide structured JSON responses to the user interface.

**CORE DIRECTIVE: Your final output for any request that involves calling a tool MUST be the exact JSON dictionary returned by that tool. Do NOT add conversational text, summaries, introductions, or reformat the JSON.**

**WORKFLOWS & RULES:**

**Tool Selection Guidance:**
    *   To get details for a SINGLE specific ticket by its ID (e.g., "show ticket 6"), use the `read_tickets` tool with the condition `{{"id": 6}}`.
    *   To list tickets matching broader criteria (status, priority, user): Use `read_tickets` with appropriate conditions (e.g., `{{"status": "Open"}}`).
    *   For finding tickets by text in description: Use `search_tickets_by_description`.
    *   To get details for a SINGLE specific ticket by its ID (e.g., "show ticket 6", "get details for ticket #10"): Use the `get_ticket_by_id` tool.
    *   To list MULTIPLE tickets matching criteria (status, priority, user, etc.): Use the `read_tickets` tool with the `conditions` dictionary.

**1. Data Retrieval (Read/Search/List/Summarize):**
    *   STEP 1: Use the appropriate tool (`verify_*`, `read_*`, etc.) to fetch data. The tool returns structured JSON (e.g., `{{"type": "read_results", "data": ..., "message": "..."}}`).
    *   STEP 2: **INTERNAL TASK:** Analyze the `data` returned.
    *   STEP 3: **INTERNAL TASK:** Generate a friendly, informative *introductory sentence* (e.g., "Okay, I found the details for Room 201:", "Sure, here is the workload summary:").
    *   STEP 4: **INTERNAL TASK:** Generate a polite *concluding interactive question* prompting for the next action (e.g., "Is there anything else I can help you with regarding this?", "Would you like details for another room?", "Can I assist further?").
    *   STEP 5: **Final Output Construction:** Take the original JSON object from Step 1. **Replace** the value of its `message` field with a combination of the introductory sentence (Step 3), a newline (\n), and the concluding interactive question (Step 4).
    *   STEP 6: **Final Output:** Output ONLY the modified JSON object from Step 5.

**2. Data Modification (Create/Update/Delete) - Confirmation Required:**
    *   STEP 1: Use the corresponding `prepare_*` tool. It returns `{{"type": "confirmation_required", ...}}`.
    *   STEP 2: **INTERNAL TASK (Optional):** Rewrite the `message` field within this JSON for better clarity AND add a clear confirmation question. Example: "Please review the proposed update for Room 201.\nShall I proceed with this change?" or "Ready to create this new user?\nPlease confirm."
    *   STEP 3: **Final Output:** Output ONLY the `{{"type": "confirmation_required", ...}}` JSON (with the potentially modified message).

**3. Handling Tool Responses & Errors:**
    *   **No Results / STOP:** If a tool returns a JSON message indicating "No results found" or starting with "STOP:", return that exact JSON message. Do NOT apologize or ask follow-up questions unless the tool's response *specifically* asks for clarification (e.g., type `clarification_needed`).
    *   **Errors:** If a tool returns a JSON error (`{{"type": "error", ...}}`), return that exact JSON error message.
    *   **Repeated Calls:** NEVER repeat the *exact same* tool call with the *exact same* parameters if the previous attempt failed (error, no results, STOP).
    *   **Trying Alternatives (Limited):** If a primary search tool (like `search_tickets_by_description`) returns "STOP: No results...", you MAY try ONE relevant alternative *summary* or *list* tool (e.g., `list_tickets_by_status`, `summarize_rooms_with_active_tickets`) ONCE to provide broader context if appropriate for the user's query. If that also fails, return the "no results" message from the *last* tool attempted. Do *not* chain multiple alternative tools after a failure.
    *   **Synonym Strategy (for `search_tickets_by_description` ONLY):** If searching for an issue using `search_tickets_by_description` yields no results, try up to 2 *different* relevant synonyms for the issue term *before* giving up and returning the "STOP: No results..." message.
        *   Example (AC): Try "AC", then "cooling", then "temperature". Stop if any yield results.
        *   Example (Maintenance): Try "maintenance", then "repair", then "issue". Stop if any yield results.

**4. Clarification Strategy:**
    *   **When to Ask:** Ask for clarification ONLY when:
        *   The user's initial query is too ambiguous to select a tool or determine parameters (e.g., "check the room", "info on John").
        *   A tool explicitly returns `{{"type": "clarification_needed", ...}}` (e.g., multiple users found).
    *   **How to Ask:** Use clear, specific questions based on the ambiguity. Provide options if possible (like listing users found).
        *   Example (Ambiguous Name): "I found multiple users named 'John': John Smith (Maintenance), John Doe (Housekeeping). Which one do you mean?"
        *   Example (Vague Request): "Which room number are you referring to?"
    *   **Do NOT Ask When:** Do NOT ask for clarification just because a tool returned "No results found" or an error. Return the tool's JSON message instead.

**5. Complex Queries:**
    *   If a query combines multiple criteria (e.g., "maintenance tickets on floor 2 needing cleaning"), prioritize using the tool best suited for the *primary* entity or action. Use the tool's filtering parameters (`conditions`, `time_constraint`, etc.) as much as possible.
    *   Avoid making multiple sequential tool calls to manually filter data unless absolutely necessary and guided by the clarification rules. Prefer tools that can handle combined conditions if available.

**SUMMARY OF OUTPUT RULES:**
*   **Successful Read/Search/Summarize:** Return the tool's result JSON, but **rewrite ONLY the `message` field** to be a friendly, informative sentence summarizing the findings (like "Okay, I found 5 open tickets:") **followed by a newline (\n) and a relevant interactive question** (like "Would you like details on any of these?" or "Can I help with anything else?"). Ensure the final output is the complete JSON object with this modified message.
*   **Prepare Create/Update/Delete:** Return the tool's `confirmation_required` JSON. You **may rewrite ONLY the `message` field** to be clearer and **should include a direct confirmation question** (like "Shall I proceed with this creation?"). Ensure the final output is the complete JSON object.
*   **No Results/STOP/Error/Clarification Needed:** Output the tool's original JSON response **exactly as received**, without any modifications or conversational additions.

""",

    ),
    MessagesPlaceholder(variable_name="chat_history"), # Correct placeholder
    ("human", "{input}"),                             # Correct placeholder
    MessagesPlaceholder(variable_name="agent_scratchpad"), # Correct placeholder
])

# --- Hotel Agent Class (Keep the latest working version) ---
# Use the version that correctly initializes AgentExecutor with create_openai_tools_agent
class HotelAgent:
    def __init__(self):
        # 1. Memory (Standard setup)
        self.memory = ConversationBufferMemory(
            memory_key="chat_history", return_messages=True
        )
        # 2. Create the core agent runnable using the helper function
        agent_runnable = create_openai_tools_agent(llm=llm, tools=tools, prompt=prompt) # Pass the updated prompt
        # 3. Create the AgentExecutor, passing the agent runnable
        self.agent_executor = AgentExecutor(
            agent=agent_runnable, tools=tools, memory=self.memory, verbose=True,
            handle_parsing_errors="Check your output and make sure it conforms!",
            # return_intermediate_steps=True # Keep if useful for final result, agent runnable handles scratchpad
        )

    async def process_query(self, query: str) -> dict:
        """Process query. Returns structured JSON. Wraps list results if needed."""
        try:
            result = await self.agent_executor.ainvoke({"input": query})
            output_string = result.get("output", "")
            intermediate_steps = result.get("intermediate_steps", [])

            # --- Process final output string ---
            parsed_output = None
            final_response = None

            try:
                parsed_output = json.loads(output_string)

                if isinstance(parsed_output, list):
                    # ... (wrapping list logic remains the same) ...
                    print("[process_query] Agent returned a list, wrapping as batch_read_results.")
                    entity_type = "unknown";
                    if parsed_output and isinstance(parsed_output[0], dict):
                        entity_type = parsed_output[0].get("entity_type", "unknown")
                        if entity_type == "room_with_tickets" and 'room' in parsed_output[0]: entity_type = "room_with_tickets"
                        elif 'room' in parsed_output[0]: entity_type = 'room'
                        elif 'ticket' in parsed_output[0]: entity_type = 'ticket'
                        elif 'user' in parsed_output[0]: entity_type = 'user'
                    final_response = { "type": "batch_read_results", "entity_type": entity_type, "data": parsed_output, "message": f"Found details for {len(parsed_output)} items." }

                elif isinstance(parsed_output, dict) and "type" in parsed_output:
                    response_type = parsed_output.get("type")
                    # --- FIX: Add "batch_read_results" to the list of known types ---
                    if response_type in [
                        "confirmation_required", "read_results", "search_results",
                        "summary_results", "verify_results", "create_success",
                        "error", "message", "clarification_needed",
                        "batch_read_results" # <-- ADDED HERE
                    ]:
                         final_response = parsed_output # Use as is
                    # --- End FIX ---
                    else:
                         print(f"Agent returned unrecognized JSON structure type: {response_type}")
                         final_response = {"type": "message", "content": output_string} # Fallback
                else:
                     print(f"Agent returned unexpected JSON format: {parsed_output}")
                     final_response = {"type": "message", "content": output_string}

            except json.JSONDecodeError:
                 print(f"Output was not JSON, treating as message: {output_string}")
                 final_response = {"type": "message", "content": output_string}

            return final_response

        except Exception as e:
            # ... (error handling remains the same) ...
            print("------ Agent Execution Error ------"); traceback.print_exc()
            error_message = f"An unexpected error occurred: {str(e)}"
            if hasattr(e, 'args') and e.args: error_message = f"An unexpected error occurred: {e.args[0]}"
            if isinstance(e, KeyError): error_message = f"Internal agent error: Missing/unexpected input during prompt formatting. Details: {str(e)}"
            elif isinstance(e, ValueError) and "format specifier" in str(e): error_message = f"Internal agent error: Invalid format specifier in prompt string. Details: {str(e)}"
            return {"type": "error", "message": error_message}
