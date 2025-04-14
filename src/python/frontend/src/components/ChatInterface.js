import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import './ChatInterface.css';

// Icons for different entities
const RoomIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 19V4h-4V3H5v16H3v2h18v-2h-2zm-6-6h-3v-3h3v3z"/>
    </svg>
);

const TicketIcon = () => (
  <svg className="entity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);

const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);

const TimeIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
    </svg>
);

const RoomCard = ({ room, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedRoom, setEditedRoom] = useState(room);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            await api.updateRoom(room.id, editedRoom);
            setIsEditing(false);
            // Refresh the room list
            const response = await api.sendMessage("show me all rooms");
            if (response.entities) {
                onUpdate(response.entities);
            }
        } catch (error) {
            console.error('Error updating room:', error);
        }
    };

    const handleCancel = () => {
        setEditedRoom(room);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this room?')) {
            try {
                await api.deleteRoom(room.id);
                // Refresh the room list
                const response = await api.sendMessage("show me all rooms");
                if (response.entities) {
                    onUpdate(response.entities);
                }
            } catch (error) {
                console.error('Error deleting room:', error);
            }
        }
    };

    if (isEditing) {
        return (
            <div className="entity-card">
                <RoomIcon />
                <div className="entity-content">
                    <div className="entity-header">
                        <input
                            type="text"
                            value={editedRoom.room_number}
                            onChange={(e) => setEditedRoom({ ...editedRoom, room_number: e.target.value })}
                            className="entity-input"
                        />
                        <select
                            value={editedRoom.room_status}
                            onChange={(e) => setEditedRoom({ ...editedRoom, room_status: e.target.value })}
                            className={`entity-status status-${editedRoom.room_status.toLowerCase().replace(' ', '-')}`}
                        >
                            <option value="Available">Available</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Needs Cleaning">Needs Cleaning</option>
                            <option value="Out of Service">Out of Service</option>
                        </select>
                    </div>
                    <div className="entity-meta">
                        <div className="entity-meta-item">
                            <input
                                type="number"
                                value={editedRoom.floor}
                                onChange={(e) => setEditedRoom({ ...editedRoom, floor: parseInt(e.target.value) })}
                                className="entity-input-small"
                            />
                            Floor
                        </div>
                        <select
                            value={editedRoom.cleaning_priority}
                            onChange={(e) => setEditedRoom({ ...editedRoom, cleaning_priority: e.target.value })}
                            className={`entity-meta-item priority-${editedRoom.cleaning_priority.toLowerCase()}`}
                        >
                            <option value="High">High Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="Low">Low Priority</option>
                        </select>
                    </div>
                    <div className="entity-actions">
                        <button onClick={handleSave} className="entity-action-button edit-button">Save</button>
                        <button onClick={handleCancel} className="entity-action-button delete-button">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="entity-card">
            <RoomIcon />
            <div className="entity-content">
                <div className="entity-header">
                    <h3 className="entity-title">Room {room.room_number}</h3>
                    <span className={`entity-status status-${room.room_status.toLowerCase().replace(' ', '-')}`}>
                        {room.room_status}
                    </span>
                </div>
                <div className="entity-meta">
                    <div className="entity-meta-item">
                        <svg className="entity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Floor {room.floor}
                    </div>
                    <div className={`entity-meta-item priority-${room.cleaning_priority.toLowerCase()}`}>
                        <svg className="entity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {room.cleaning_priority} Priority
                    </div>
                    {room.open_tickets > 0 && (
                        <div className="entity-meta-item">
                            <TicketIcon />
                            {room.open_tickets} Open Tickets
                        </div>
                    )}
                </div>
                {room.ticket_descriptions && (
                    <p className="entity-description">
                        {room.ticket_descriptions}
                    </p>
                )}
                <div className="entity-actions">
                    <button onClick={handleEdit} className="entity-action-button edit-button">Edit</button>
                    <button onClick={handleDelete} className="entity-action-button delete-button">Delete</button>
                </div>
            </div>
        </div>
    );
};

const TicketCard = ({ ticket, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTicket, setEditedTicket] = useState(ticket);

    const handleEdit = () => {
        setIsEditing(true);
        setEditedTicket(ticket); // Reset to original values when starting edit
    };

    const handleSave = async () => {
        try {
            // Format the date properly
            const formattedTicket = {
                ...editedTicket,
                due_time: new Date(editedTicket.due_time).toISOString()
            };
            
            await api.updateTicket(ticket.id, formattedTicket);
            setIsEditing(false);
            
            // Refresh the ticket list
            const response = await api.sendMessage("show me all tickets");
            if (response.entities) {
                onUpdate(response.entities);
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
            alert('Failed to update ticket. Please try again.');
        }
    };

    const handleCancel = () => {
        setEditedTicket(ticket);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this ticket?')) {
            try {
                await api.deleteTicket(ticket.id);
                // Refresh the ticket list
                const response = await api.sendMessage("show me all tickets");
                if (response.entities) {
                    onUpdate(response.entities);
                }
            } catch (error) {
                console.error('Error deleting ticket:', error);
                alert('Failed to delete ticket. Please try again.');
            }
        }
    };

    if (isEditing) {
        return (
            <div className="entity-card editing">
                <div className="entity-content">
                    <div className="entity-header">
                        <div className="entity-title">
                            <RoomIcon />
                            <span>Room {ticket.room_number}</span>
                        </div>
                        <select
                            value={editedTicket.status}
                            onChange={(e) => setEditedTicket({ ...editedTicket, status: e.target.value })}
                            className={`entity-status status-${editedTicket.status.toLowerCase().replace(' ', '-')}`}
                        >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Canceled">Canceled</option>
                        </select>
                    </div>
                    <input
                        type="text"
                        value={editedTicket.description}
                        onChange={(e) => setEditedTicket({ ...editedTicket, description: e.target.value })}
                        className="entity-input"
                        placeholder="Description"
                    />
                    <div className="entity-meta">
                        <div className="entity-meta-item">
                            <UserIcon />
                            <input
                                type="text"
                                value={editedTicket.assigned_to}
                                onChange={(e) => setEditedTicket({ ...editedTicket, assigned_to: e.target.value })}
                                className="entity-input-small"
                                placeholder="Assigned To"
                            />
                        </div>
                        <div className="entity-meta-item">
                            <TimeIcon />
                            <input
                                type="datetime-local"
                                value={editedTicket.due_time ? editedTicket.due_time.slice(0, 16) : ''}
                                onChange={(e) => setEditedTicket({ ...editedTicket, due_time: e.target.value })}
                                className="entity-input-small"
                            />
                        </div>
                    </div>
                    <div className="entity-actions">
                        <button onClick={handleSave} className="action-button save">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                            </svg>
                            Save
                        </button>
                        <button onClick={handleCancel} className="action-button cancel">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                            </svg>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="entity-card">
            <div className="entity-content">
                <div className="entity-header">
                    <div className="entity-title">
                        <RoomIcon />
                        <span>Room {ticket.room_number}</span>
                    </div>
                    <span className={`entity-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                    </span>
                </div>
                <div className="entity-description">{ticket.description}</div>
                <div className="entity-meta">
                    <div className="entity-meta-item">
                        <UserIcon />
                        <span>{ticket.assigned_to}</span>
                    </div>
                    <div className="entity-meta-item">
                        <TimeIcon />
                        <span>{new Date(ticket.due_time).toLocaleString()}</span>
                    </div>
                </div>
                <div className="entity-actions">
                    <button onClick={handleEdit} className="action-button edit">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                        Edit
                    </button>
                    <button onClick={handleDelete} className="action-button delete">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

const UserCard = ({ user, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState(user);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            await api.updateUser(user.id, editedUser);
            setIsEditing(false);
            // Refresh the user list
            const response = await api.sendMessage("show me all users");
            if (response.entities) {
                onUpdate(response.entities);
            }
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    const handleCancel = () => {
        setEditedUser(user);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.deleteUser(user.id);
                // Refresh the user list
                const response = await api.sendMessage("show me all users");
                if (response.entities) {
                    onUpdate(response.entities);
                }
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    if (isEditing) {
        return (
            <div className="entity-card">
                <UserIcon />
                <div className="entity-content">
                    <div className="entity-header">
                        <input
                            type="text"
                            value={editedUser.full_name}
                            onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                            className="entity-input"
                        />
                        <select
                            value={editedUser.role}
                            onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
                            className={`entity-status status-${editedUser.role.toLowerCase().replace(' ', '-')}`}
                        >
                            <option value="Front Desk">Front Desk</option>
                            <option value="Housekeeping">Housekeeping</option>
                            <option value="Maintenance">Maintenance</option>
                        </select>
                    </div>
                    <div className="entity-meta">
                        <div className="entity-meta-item">
                            <input
                                type="text"
                                value={editedUser.email}
                                onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                                className="entity-input-small"
                            />
                        </div>
                        <div className="entity-meta-item">
                            <input
                                type="datetime-local"
                                value={editedUser.start_time}
                                onChange={(e) => setEditedUser({ ...editedUser, start_time: e.target.value })}
                                className="entity-input-small"
                            />
                        </div>
                        <div className="entity-meta-item">
                            <input
                                type="datetime-local"
                                value={editedUser.end_time}
                                onChange={(e) => setEditedUser({ ...editedUser, end_time: e.target.value })}
                                className="entity-input-small"
                            />
                        </div>
                    </div>
                    <div className="entity-actions">
                        <button onClick={handleSave} className="entity-action-button edit-button">Save</button>
                        <button onClick={handleCancel} className="entity-action-button delete-button">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="entity-card">
            <UserIcon />
            <div className="entity-content">
                <div className="entity-header">
                    <h3 className="entity-title">{user.full_name}</h3>
                    <span className="entity-status">{user.role}</span>
                </div>
                <div className="entity-meta">
                    <div className="entity-meta-item">{user.email}</div>
                    <div className="entity-meta-item">
                        <TimeIcon />
                        {user.start_time} - {user.end_time}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AssistantIcon = () => (
    <svg className="message-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/>
    </svg>
);

const ChatUserIcon = () => (
    <svg className="message-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);

const ChatInterface = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [entities, setEntities] = useState([]);
    const [entityType, setEntityType] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleUpdateEntities = (newEntities) => {
        setEntities(newEntities);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.sendMessage(input);
            
            if (response.error) {
                setMessages(prev => [...prev, { role: 'error', content: response.error }]);
            } else if (response.entities) {
                setEntities(response.entities);
                setEntityType(response.entityType);
                setMessages(prev => [...prev, { 
                    role: 'assistant',
                    content: response.message,
                    preview: { entities: response.entities, type: response.entityType }
                }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'error', content: error.message }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderEntityList = (entities, type) => {
        if (!entities || entities.length === 0) return null;

        return (
            <div className="entity-list">
                {entities.map(entity => {
                    switch (type) {
                        case 'ticket':
                            return <TicketCard key={entity.id} ticket={entity} onUpdate={handleUpdateEntities} />;
                        case 'room':
                            return <RoomCard key={entity.id} room={entity} onUpdate={handleUpdateEntities} />;
                        case 'user':
                            return <UserCard key={entity.id} user={entity} onUpdate={handleUpdateEntities} />;
                        default:
                            return null;
                    }
                })}
            </div>
        );
    };

    const renderMessage = (message, index) => {
        const isPreview = message.preview && message.preview.entities;
        
        return (
            <div key={index} className={`message ${message.role}`}>
                {message.role === 'user' ? <ChatUserIcon /> : <AssistantIcon />}
                <div className="message-content">
                    {message.content}
                    {isPreview && renderEntityList(message.preview.entities, message.preview.type)}
                </div>
            </div>
        );
    };

    return (
        <div className="chat-interface">
            <div className="messages">
                {messages.map((message, index) => renderMessage(message, index))}
                {isLoading && <div className="loading">Loading...</div>}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>Send</button>
            </form>
        </div>
    );
};

export default ChatInterface; 