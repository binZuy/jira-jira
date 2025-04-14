from typing import List, Optional
from ..schemas.schemas import Room, RoomCreate, RoomUpdate # Import updated schemas
from supabase import Client, PostgrestAPIResponse

class RoomService:
    DEFAULT_LIMIT = 100

    @staticmethod
    async def get_rooms(db: Client, skip: int = 0, limit: int = DEFAULT_LIMIT) -> List[Room]:
        # Implement similar to TicketService.get_tickets
        # Select needed fields, potentially join for ticket counts if required by UI
        try:
            # Example: Get basic room info
            # Add joins later if needed for dashboard/UI (e.g., count open tickets)
            response: PostgrestAPIResponse = db.table('rooms').select('*')\
                .order('room_number')\
                .range(skip, skip + limit - 1)\
                .execute()
            return [Room(**room) for room in response.data] if response.data else []
        except Exception as e:
            print(f"Error getting rooms: {e}")
            return []

    @staticmethod
    async def get_room(db: Client, room_id: int) -> Optional[Room]:
        # Implement similar to TicketService.get_ticket
        try:
            response: PostgrestAPIResponse = db.table('rooms').select('*')\
                .eq('id', room_id).maybe_single().execute()
            return Room(**response.data) if response.data else None
        except Exception as e:
            print(f"Error getting room {room_id}: {e}")
            return None

    @staticmethod
    async def get_room_by_number(db: Client, room_number: str) -> Optional[Room]:
        # Helper to find room by number
        try:
            response: PostgrestAPIResponse = db.table('rooms').select('*')\
                .eq('room_number', room_number).maybe_single().execute()
            return Room(**response.data) if response.data else None
        except Exception as e:
            print(f"Error getting room by number {room_number}: {e}")
            return None

    @staticmethod
    async def create_room(db: Client, room: RoomCreate) -> Optional[Room]:
        # Implement similar to TicketService.create_ticket
        try:
            room_data = room.model_dump(mode='json')
            response: PostgrestAPIResponse = db.table('rooms').insert(room_data).execute()
            if not response.data: return None
            # Fetch the created room to return the full object with ID
            created_id = response.data[0]['id']
            return await RoomService.get_room(db, created_id)
        except Exception as e:
            print(f"Error creating room: {e}")
            # Handle duplicate room_number error specifically? (Supabase might raise PostgrestError)
            return None # Or raise

    @staticmethod
    async def update_room(db: Client, room_id: int, room_update: RoomUpdate) -> Optional[Room]:
        # Implement similar to TicketService.update_ticket
        try:
            update_data = room_update.model_dump(exclude_unset=True, mode='json')
            update_data = {k: v for k, v in update_data.items() if v is not None}
            if not update_data:
                return await RoomService.get_room(db, room_id)

            response: PostgrestAPIResponse = db.table('rooms').update(update_data).eq('id', room_id).execute()
            # Fetch updated room
            return await RoomService.get_room(db, room_id)
        except Exception as e:
            print(f"Error updating room {room_id}: {e}")
            return None # Or raise

    @staticmethod
    async def delete_room(db: Client, room_id: int) -> bool:
        # Implement similar to TicketService.delete_ticket
        # Add check for associated tickets before deleting?
        try:
            # Check for tickets associated with the room first
            tickets_response = db.table('tickets').select('id').eq('room_id', room_id).limit(1).execute()
            if tickets_response.data:
                print(f"Cannot delete room {room_id}: It has associated tickets.")
                return False # Or raise specific error

            response: PostgrestAPIResponse = db.table('rooms').delete().eq('id', room_id).execute()
            return True # Assume success if no error
        except Exception as e:
            print(f"Error deleting room {room_id}: {e}")
            return False