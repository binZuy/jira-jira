# tests/test_hotel_api.py
import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, ANY as mocker_ANY # Use ANY from unittest.mock
from datetime import datetime, time

# --- FIX: Import the FastAPI app instance ---
from app.main import app

# Import schemas correctly
from app.schemas.schemas import (
    Room, RoomCreate, RoomUpdate, RoomStatusEnum, CleaningPriorityEnum, # Added CleaningPriorityEnum
    Ticket, TicketCreate, TicketUpdate, TicketStatusEnum, TicketPriorityEnum, # Added TicketPriorityEnum
    User, UserCreate, UserUpdate, UserRoleEnum,
    QueryRequest, DashboardStats
)
# Import service classes to mock their methods
from app.services.room_service import RoomService
from app.services.ticket_service import TicketService
from app.services.user_service import UserService
# Import agent if testing the query endpoint
from app.hotel_agent_langchain import HotelAgent
# Import Supabase client type hint (optional but good practice)
from supabase import Client as SupabaseClient


# Mark all tests in this module to use asyncio
pytestmark = pytest.mark.asyncio

# --- Fixtures ---

@pytest_asyncio.fixture(scope="function")
async def client():
    """Provides an async test client for the FastAPI app."""
    # Note: If your app has startup/shutdown events (lifespan) that need mocking
    # or if dependencies like get_db *must* be overridden even with mocked services,
    # you might need more setup here using app.dependency_overrides.
    # For now, assuming service mocking is sufficient.
    async with AsyncClient(app=app, base_url="http://test") as test_client:
        yield test_client

@pytest_asyncio.fixture(autouse=True)
def mock_services(mocker): # mocker fixture is provided by pytest-mock
    """Mocks all methods of the service classes."""
    # Mock RoomService methods
    mocker.patch.object(RoomService, 'get_rooms', return_value=[], new_callable=AsyncMock)
    mocker.patch.object(RoomService, 'get_room', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(RoomService, 'get_room_by_number', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(RoomService, 'create_room', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(RoomService, 'update_room', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(RoomService, 'delete_room', return_value=False, new_callable=AsyncMock)

    # Mock TicketService methods
    mocker.patch.object(TicketService, 'get_tickets', return_value=[], new_callable=AsyncMock)
    mocker.patch.object(TicketService, 'get_ticket', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(TicketService, 'create_ticket', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(TicketService, 'update_ticket', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(TicketService, 'delete_ticket', return_value=False, new_callable=AsyncMock)
    # Mock other TicketService methods if their corresponding endpoints are tested
    mocker.patch.object(TicketService, 'search_tickets', return_value=[], new_callable=AsyncMock)
    mocker.patch.object(TicketService, 'get_ticket_history', return_value=[], new_callable=AsyncMock)
    mocker.patch.object(TicketService, 'add_comment', return_value={}, new_callable=AsyncMock)
    mocker.patch.object(TicketService, 'get_ticket_comments', return_value=[], new_callable=AsyncMock)


    # Mock UserService methods
    mocker.patch.object(UserService, 'get_users', return_value=[], new_callable=AsyncMock)
    mocker.patch.object(UserService, 'get_user', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(UserService, 'get_user_by_email', return_value=None, new_callable=AsyncMock) # Added if used internally
    mocker.patch.object(UserService, 'create_user', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(UserService, 'update_user', return_value=None, new_callable=AsyncMock)
    mocker.patch.object(UserService, 'delete_user', return_value=False, new_callable=AsyncMock)

    # Mock the Agent's process_query method
    # Patch where it's used: app.api.v1.hotel
    mocker.patch('app.api.v1.hotel.HotelAgent.process_query', new_callable=AsyncMock, return_value={"response": "Mocked agent response"})


# --- Sample Data (using Pydantic models) ---

# Added default values for clarity and potentially missing imports
def create_sample_room(id: int = 1, room_number: str = "T101") -> Room:
    # Ensure all required fields for Room have defaults or are passed
    return Room(
        id=id, floor=int(room_number[0]), room_number=room_number, room_type="Standard",
        capacity=2, room_status=RoomStatusEnum.AVAILABLE, cleaning_status="Clean",
        cleaning_priority=CleaningPriorityEnum.MEDIUM, credit=0, last_cleaned=None, notes=None,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )

def create_sample_user(id: int = 1, email: str = "test1@hotel.com", role: UserRoleEnum = UserRoleEnum.HOUSEKEEPER) -> User:
    return User(
        id=id, full_name=f"Test {role.value} {id}", email=email, role=role,
        start_time=time(9,0), end_time=time(17,0), credit=100,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )

def create_sample_ticket(
    id: int = 1,
    room_id: int = 1,
    created_by: int = 1,
    assigned_to: int = 2,
    status: TicketStatusEnum = TicketStatusEnum.OPEN # <<< ADD THIS PARAMETER
    ) -> Ticket:
     now_aware = datetime.now().astimezone()
     return Ticket(
        id=id, room_id=room_id, description=f"Test Ticket {id}",
        status=status, # <<< USE THE PARAMETER HERE
        priority=TicketPriorityEnum.MEDIUM, assigned_to=assigned_to, created_by=created_by,
        due_time=now_aware, attachment=None, comment_log=None, subtask=None,
        created_at=now_aware, updated_at=now_aware,
        room_number="101", # Note: Still hardcoded '101', might need adjustment for consistency
        assigned_to_name="Test Housekeeper 2", created_by_name="Test Housekeeper 1"
    )


# --- Test Functions ---

# Test Root Endpoint
async def test_read_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Hotel Management System API"}

# --- Room Endpoint Tests (Continued) ---
API_PREFIX = "/api/v1/hotel"

# Test Create Room (Example - assumes test_create_room exists)
async def test_create_room(client: AsyncClient, mocker): # Pass mocker fixture
    room_data = RoomCreate(floor=1, room_number="101")# Use "101"
    expected_room = create_sample_room(id=1, room_number="101") # Use "101"

    # Inside test_delete_room_has_tickets (Assuming room_id tested is 1)
    RoomService.get_room.return_value = create_sample_room(id=1, room_number="101") # Use "101"

    response = await client.post(f"{API_PREFIX}/rooms", json=room_data.model_dump(mode='json'))

    assert response.status_code == 201
    assert response.json() == expected_room.model_dump(mode='json')
    # Use mocker_ANY for the first argument (db client)
    RoomService.create_room.assert_awaited_once_with(mocker_ANY, room_data)

async def test_delete_room_has_tickets(client: AsyncClient, mocker): # Pass mocker fixture
    room_id = 1
    RoomService.delete_room.return_value = False # Simulate delete failed due to constraint
    RoomService.get_room.return_value = create_sample_room(id=room_id) # Simulate room exists

    response = await client.delete(f"{API_PREFIX}/rooms/{room_id}")

    assert response.status_code == 400
    assert "Cannot delete room" in response.json()["detail"]
    RoomService.delete_room.assert_awaited_once_with(mocker_ANY, room_id)
    RoomService.get_room.assert_awaited_once_with(mocker_ANY, room_id)


# --- Ticket Endpoint Tests (Continued) ---

async def test_create_ticket(client: AsyncClient, mocker): # Pass mocker fixture
    # Create a datetime object or use an ISO string
    due_time_dt = datetime.now().astimezone()
    ticket_data = TicketCreate(room_id=1, description="Needs cleaning", assigned_to=2, created_by=1,
                               due_time=due_time_dt) # Pass datetime object
    expected_ticket = create_sample_ticket(id=5, room_id=1, assigned_to=2, created_by=1)
    TicketService.create_ticket.return_value = expected_ticket

    # Use .model_dump(mode='json') which handles datetime serialization
    json_payload = ticket_data.model_dump(mode='json')

    response = await client.post(f"{API_PREFIX}/tickets", json=json_payload)

    assert response.status_code == 201
    assert response.json() == expected_ticket.model_dump(mode='json')
    TicketService.create_ticket.assert_awaited_once()
    call_args, call_kwargs = TicketService.create_ticket.call_args
    assert isinstance(call_args[1], TicketCreate)
    assert call_args[1].room_id == ticket_data.room_id
    # Optionally check due_time matching (might need tolerance for milliseconds)
    assert call_args[1].due_time.isoformat(timespec='seconds') == ticket_data.due_time.isoformat(timespec='seconds')


async def test_create_ticket_fails_bad_fk(client: AsyncClient, mocker): # Pass mocker fixture
    ticket_data = TicketCreate(room_id=999, description="Bad room", assigned_to=2, created_by=1, due_time=datetime.now().astimezone())
    TicketService.create_ticket.return_value = None

    response = await client.post(f"{API_PREFIX}/tickets", json=ticket_data.model_dump(mode='json'))

    assert response.status_code == 400
    assert "Failed to create ticket" in response.json()["detail"]

# ... (include the rest of your test functions: test_get_tickets, test_get_ticket_by_id_found, etc.) ...
# ... Make sure to add 'mocker' fixture to tests asserting mock calls with mocker_ANY ...

async def test_get_ticket_by_id_found(client: AsyncClient, mocker):
    ticket_id = 1
    expected_ticket = create_sample_ticket(id=ticket_id)
    TicketService.get_ticket.return_value = expected_ticket

    response = await client.get(f"{API_PREFIX}/tickets/{ticket_id}")

    assert response.status_code == 200
    assert response.json() == expected_ticket.model_dump(mode='json')
    TicketService.get_ticket.assert_awaited_once_with(mocker_ANY, ticket_id)


async def test_update_ticket(client: AsyncClient, mocker):
    ticket_id = 1
    update_data = TicketUpdate(status=TicketStatusEnum.IN_PROGRESS, description="Work started")
    updated_ticket = create_sample_ticket(id=ticket_id)
    updated_ticket.status = TicketStatusEnum.IN_PROGRESS
    updated_ticket.description = "Work started"
    TicketService.update_ticket.return_value = updated_ticket

    response = await client.patch(f"{API_PREFIX}/tickets/{ticket_id}", json=update_data.model_dump(mode='json', exclude_unset=True))

    assert response.status_code == 200
    assert response.json() == updated_ticket.model_dump(mode='json')
    TicketService.update_ticket.assert_awaited_once_with(mocker_ANY, ticket_id, update_data)


async def test_delete_ticket_success(client: AsyncClient, mocker):
    ticket_id = 1
    TicketService.delete_ticket.return_value = True

    response = await client.delete(f"{API_PREFIX}/tickets/{ticket_id}")

    assert response.status_code == 204
    TicketService.delete_ticket.assert_awaited_once_with(mocker_ANY, ticket_id)

async def test_delete_ticket_not_found(client: AsyncClient, mocker):
    ticket_id = 999
    TicketService.delete_ticket.return_value = False
    TicketService.get_ticket.return_value = None

    response = await client.delete(f"{API_PREFIX}/tickets/{ticket_id}")

    assert response.status_code == 404
    TicketService.get_ticket.assert_awaited_once_with(mocker_ANY, ticket_id)


# --- User Endpoint Tests (Continued) ---

async def test_create_user(client: AsyncClient, mocker):
    user_data = UserCreate(full_name="New User", email="new@hotel.com", role=UserRoleEnum.HOUSEKEEPER,
                           start_time=time(8,0), end_time=time(16,0))
    expected_user = create_sample_user(id=3, email="new@hotel.com", role=UserRoleEnum.HOUSEKEEPER)
    UserService.create_user.return_value = expected_user

    # Use model_dump which handles time object serialization for JSON
    response = await client.post(f"{API_PREFIX}/users", json=user_data.model_dump(mode='json'))

    assert response.status_code == 201
    assert response.json() == expected_user.model_dump(mode='json')
    UserService.create_user.assert_awaited_once()
    call_args, call_kwargs = UserService.create_user.call_args
    assert isinstance(call_args[1], UserCreate)
    assert call_args[1].email == user_data.email


async def test_get_user_by_id_found(client: AsyncClient, mocker):
    user_id = 1
    expected_user = create_sample_user(id=user_id)
    UserService.get_user.return_value = expected_user

    response = await client.get(f"{API_PREFIX}/users/{user_id}")

    assert response.status_code == 200
    assert response.json() == expected_user.model_dump(mode='json')
    UserService.get_user.assert_awaited_once_with(mocker_ANY, user_id)


async def test_update_user(client: AsyncClient, mocker):
    user_id = 1
    update_data = UserUpdate(role=UserRoleEnum.MANAGER, credit=150)
    updated_user = create_sample_user(id=user_id)
    updated_user.role = UserRoleEnum.MANAGER
    updated_user.credit = 150
    UserService.update_user.return_value = updated_user

    response = await client.patch(f"{API_PREFIX}/users/{user_id}", json=update_data.model_dump(mode='json', exclude_unset=True))

    assert response.status_code == 200
    assert response.json() == updated_user.model_dump(mode='json')
    UserService.update_user.assert_awaited_once_with(mocker_ANY, user_id, update_data)


async def test_delete_user_success(client: AsyncClient, mocker):
    user_id = 1
    UserService.delete_user.return_value = True

    response = await client.delete(f"{API_PREFIX}/users/{user_id}")

    assert response.status_code == 204
    UserService.delete_user.assert_awaited_once_with(mocker_ANY, user_id)

async def test_delete_user_has_tickets(client: AsyncClient, mocker):
    user_id = 1
    UserService.delete_user.return_value = False
    UserService.get_user.return_value = create_sample_user(id=user_id)

    response = await client.delete(f"{API_PREFIX}/users/{user_id}")

    assert response.status_code == 400
    assert "Cannot delete user" in response.json()["detail"]
    UserService.get_user.assert_awaited_once_with(mocker_ANY, user_id)

# --- Dashboard Endpoint Test (Continued) ---

async def test_get_dashboard_summary(client: AsyncClient, mocker):
    # Configure mocks to return data for calculations
    sample_rooms = [
        create_sample_room(id=1, room_number="101"),
        create_sample_room(id=2, room_number="102"),
        create_sample_room(id=3, room_number="103")
    ]
    sample_rooms[1].room_status = RoomStatusEnum.NEEDS_CLEANING
    sample_rooms[2].cleaning_priority = CleaningPriorityEnum.HIGH
    RoomService.get_rooms.return_value = sample_rooms

    sample_tickets = [
        create_sample_ticket(id=1, status=TicketStatusEnum.OPEN),
        create_sample_ticket(id=2, status=TicketStatusEnum.IN_PROGRESS),
        create_sample_ticket(id=3, status=TicketStatusEnum.RESOLVED)
    ]
    TicketService.get_tickets.return_value = sample_tickets

    sample_users = [
        create_sample_user(id=1),
        create_sample_user(id=2)
    ]
    UserService.get_users.return_value = sample_users

    expected_stats = DashboardStats(
        total_users=2,
        active_tickets=2, # Open + In Progress
        total_rooms=3,
        rooms_to_clean=1,
        high_priority_rooms=1
    )

    response = await client.get(f"{API_PREFIX}/dashboard/summary")

    assert response.status_code == 200
    assert response.json() == expected_stats.model_dump()
    RoomService.get_rooms.assert_awaited_once_with(mocker_ANY, limit=10000)
    TicketService.get_tickets.assert_awaited_once_with(mocker_ANY, limit=10000)
    UserService.get_users.assert_awaited_once_with(mocker_ANY, limit=10000)

# --- Agent Query Endpoint Test (Continued) ---

async def test_agent_query(client: AsyncClient, mocker):
    query = "Show me tickets for room 101"
    request_data = QueryRequest(query=query)
    # This is what the fixture's mock returns by default
    expected_mock_response = {"response": "Mocked agent response"}

    # The mock is already configured by the fixture, no need to patch again here unless
    # you want a *different* response for *this specific test*.
    # mocked_process_query = mocker.patch('app.api.v1.hotel.HotelAgent.process_query', new_callable=AsyncMock, return_value=mock_response)
    mocked_process_query = HotelAgent.process_query # Get ref to the fixture mock

    response = await client.post(f"{API_PREFIX}/query", json=request_data.model_dump())

    assert response.status_code == 200
    # --- FIX: Assert against the actual mock response ---
    assert response.json() == expected_mock_response
    mocked_process_query.assert_awaited_once_with(query)

async def test_agent_query_error(client: AsyncClient, mocker): # Pass mocker fixture
    query = "Cause an error"
    request_data = QueryRequest(query=query)
    error_message = "Simulated agent error"

    # Configure mock to raise an exception
    mocked_process_query = HotelAgent.process_query
    mocked_process_query.side_effect = Exception(error_message)

    response = await client.post(f"{API_PREFIX}/query", json=request_data.model_dump())

    assert response.status_code == 500
    assert error_message in response.json()["detail"]
    mocked_process_query.assert_awaited_once_with(query) # Verify it was still called
