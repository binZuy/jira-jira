from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.Ticket])
def get_tickets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    tickets = db.query(models.Ticket).offset(skip).limit(limit).all()
    return tickets

@router.get("/{ticket_id}", response_model=schemas.Ticket)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.post("/", response_model=schemas.Ticket)
def create_ticket(ticket: schemas.TicketCreate, db: Session = Depends(get_db)):
    # Verify room exists
    room = db.query(models.Room).filter(models.Room.room_id == ticket.room_id).first()
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Verify users exist
    assigned_user = db.query(models.User).filter(models.User.id == ticket.assigned_to).first()
    created_by_user = db.query(models.User).filter(models.User.id == ticket.created_by).first()
    
    if assigned_user is None or created_by_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_ticket = models.Ticket(**ticket.model_dump())
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.put("/{ticket_id}", response_model=schemas.Ticket)
def update_ticket(ticket_id: int, ticket: schemas.TicketCreate, db: Session = Depends(get_db)):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    for key, value in ticket.model_dump().items():
        setattr(db_ticket, key, value)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.delete("/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db.delete(db_ticket)
    db.commit()
    return {"message": "Ticket deleted successfully"}

@router.get("/room/{room_id}", response_model=List[schemas.Ticket])
def get_tickets_by_room(room_id: int, db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).filter(models.Ticket.room_id == room_id).all()
    return tickets

@router.get("/status/{status}", response_model=List[schemas.Ticket])
def get_tickets_by_status(status: models.TicketStatus, db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).filter(models.Ticket.status == status).all()
    return tickets

@router.get("/user/{user_id}", response_model=List[schemas.Ticket])
def get_tickets_by_user(user_id: int, db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).filter(
        (models.Ticket.assigned_to == user_id) | (models.Ticket.created_by == user_id)
    ).all()
    return tickets

@router.get("/recent/", response_model=List[schemas.RecentTicket])
def get_recent_tickets(limit: int = 5, db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).order_by(models.Ticket.created_at.desc()).limit(limit).all()
    return [
        schemas.RecentTicket(
            id=f"T-{t.ticket_id}",
            room=t.room.room_number,
            title=t.description,
            priority="High" if t.room.cleaning_priority == models.CleaningPriority.HIGH else "Medium" if t.room.cleaning_priority == models.CleaningPriority.MEDIUM else "Low",
            status=t.status.value,
            assignee=t.assigned_to_user.full_name
        )
        for t in tickets
    ] 