from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class RoomStatus(str, enum.Enum):
    AVAILABLE = "Available"
    OCCUPIED = "Occupied"
    NEEDS_CLEANING = "Needs Cleaning"
    OUT_OF_SERVICE = "Out of Service"

class CleaningPriority(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class TicketStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CANCELED = "Canceled"

class UserRole(str, enum.Enum):
    MANAGER = "Manager"
    HOUSEKEEPER = "Housekeeper"
    DIRECTOR = "Director"
    ADMIN = "Admin"

class Room(Base):
    __tablename__ = "rooms"
    
    room_id = Column(Integer, primary_key=True, index=True)
    floor = Column(Integer, nullable=False)
    room_number = Column(String, unique=True, nullable=False)
    room_status = Column(Enum(RoomStatus), default=RoomStatus.AVAILABLE)
    cleaning_priority = Column(Enum(CleaningPriority), default=CleaningPriority.MEDIUM)
    credit = Column(Integer, default=0)
    
    tickets = relationship("Ticket", back_populates="room")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    credit = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    created_tickets = relationship("Ticket", back_populates="created_by_user", foreign_keys="Ticket.created_by")
    assigned_tickets = relationship("Ticket", back_populates="assigned_to_user", foreign_keys="Ticket.assigned_to")

class Ticket(Base):
    __tablename__ = "tickets"
    
    ticket_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    due_time = Column(String, nullable=False)
    attachment = Column(String, nullable=True)
    comment_log = Column(Text, nullable=True)
    subtask = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    room = relationship("Room", back_populates="tickets")
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="created_tickets")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tickets") 