from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.User])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=schemas.User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if new email is already taken by another user
    if user.email != db_user.email:
        email_exists = db.query(models.User).filter(
            models.User.email == user.email,
            models.User.id != user_id
        ).first()
        if email_exists:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    for key, value in user.model_dump().items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has any tickets
    tickets = db.query(models.Ticket).filter(
        (models.Ticket.assigned_to == user_id) | (models.Ticket.created_by == user_id)
    ).first()
    
    if tickets:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete user with active tickets"
        )
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/role/{role}", response_model=List[schemas.User])
def get_users_by_role(role: models.UserRole, db: Session = Depends(get_db)):
    users = db.query(models.User).filter(models.User.role == role).all()
    return users

@router.get("/stats/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_users = db.query(models.User).count()
    active_tickets = db.query(models.Ticket).filter(
        models.Ticket.status.in_([models.TicketStatus.OPEN, models.TicketStatus.IN_PROGRESS])
    ).count()
    total_rooms = db.query(models.Room).count()
    rooms_to_clean = db.query(models.Room).filter(
        models.Room.room_status == models.RoomStatus.NEEDS_CLEANING
    ).count()
    high_priority_rooms = db.query(models.Room).filter(
        models.Room.cleaning_priority == models.CleaningPriority.HIGH
    ).count()
    
    return schemas.DashboardStats(
        total_users=total_users,
        active_tickets=active_tickets,
        total_rooms=total_rooms,
        rooms_to_clean=rooms_to_clean,
        high_priority_rooms=high_priority_rooms
    ) 