from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.Room])
def get_rooms(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    rooms = db.query(models.Room).offset(skip).limit(limit).all()
    return rooms

@router.get("/{room_id}", response_model=schemas.Room)
def get_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.room_id == room_id).first()
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.post("/", response_model=schemas.Room)
def create_room(room: schemas.RoomCreate, db: Session = Depends(get_db)):
    db_room = models.Room(**room.model_dump())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

@router.put("/{room_id}", response_model=schemas.Room)
def update_room(room_id: int, room: schemas.RoomCreate, db: Session = Depends(get_db)):
    db_room = db.query(models.Room).filter(models.Room.room_id == room_id).first()
    if db_room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    
    for key, value in room.model_dump().items():
        setattr(db_room, key, value)
    
    db.commit()
    db.refresh(db_room)
    return db_room

@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    db_room = db.query(models.Room).filter(models.Room.room_id == room_id).first()
    if db_room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    
    db.delete(db_room)
    db.commit()
    return {"message": "Room deleted successfully"}

@router.get("/status/{status}", response_model=List[schemas.Room])
def get_rooms_by_status(status: models.RoomStatus, db: Session = Depends(get_db)):
    rooms = db.query(models.Room).filter(models.Room.room_status == status).all()
    return rooms

@router.get("/floor/{floor}", response_model=List[schemas.Room])
def get_rooms_by_floor(floor: int, db: Session = Depends(get_db)):
    rooms = db.query(models.Room).filter(models.Room.floor == floor).all()
    return rooms

@router.get("/priority/{priority}", response_model=List[schemas.Room])
def get_rooms_by_priority(priority: models.CleaningPriority, db: Session = Depends(get_db)):
    rooms = db.query(models.Room).filter(models.Room.cleaning_priority == priority).all()
    return rooms 