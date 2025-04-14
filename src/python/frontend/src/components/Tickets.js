import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import {
  PlusIcon,
  FunnelIcon,
  TicketIcon,
  UserIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  XMarkIcon,
  TrashIcon,
  XCircleIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import TicketModal from './TicketModal';
import api from '../services/api';

const getStatusColor = (status) => {
  switch (status) {
    case 'Open':
      return 'bg-red-100 text-red-800';
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'Resolved':
      return 'bg-green-100 text-green-800';
    case 'Canceled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-800';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'Low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const TicketListItem = ({ ticket, onClick }) => (
  <div 
    className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <TicketIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Room {ticket.room_number}</h3>
          <p className="text-sm text-gray-500">{ticket.description}</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
          {ticket.status}
        </span>
        <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
          {ticket.priority}
        </span>
      </div>
    </div>
    <div className="mt-3 flex items-center text-sm text-gray-500">
      <UserIcon className="w-4 h-4 mr-2" />
      <span>{ticket.assigned_to_name}</span>
      <span className="mx-2">•</span>
      <ClockIcon className="w-4 h-4 mr-2" />
      <span>{new Date(ticket.created_at).toLocaleString()}</span>
    </div>
  </div>
);

const TicketDetail = ({ ticket, onBack, onEdit, onStatusUpdate, onAddComment, newComment, setNewComment }) => (
  <div className="bg-white rounded-lg shadow-sm">
    <div className="p-4 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Room {ticket.room_number}</h3>
            <p className="text-sm text-gray-500">{ticket.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
            {ticket.status}
          </span>
          <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority}
          </span>
        </div>
      </div>
    </div>

    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Assigned To</h4>
          <p className="mt-1 text-sm text-gray-900">{ticket.assigned_to_name}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Created</h4>
          <p className="mt-1 text-sm text-gray-900">{new Date(ticket.created_at).toLocaleString()}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Due Time</h4>
          <p className="mt-1 text-sm text-gray-900">{new Date(ticket.due_time).toLocaleString()}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Last Updated</h4>
          <p className="mt-1 text-sm text-gray-900">{new Date(ticket.updated_at).toLocaleString()}</p>
        </div>
      </div>

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">Comments</h4>
        </div>
        <div className="space-y-4">
          {ticket.comment_log?.map((comment, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 text-sm font-medium">
                    {comment.user[0]}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{comment.user}</p>
                  <p className="text-xs text-gray-500">{comment.time}</p>
                </div>
                <p className="text-sm text-gray-600 mt-1">{comment.message}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex space-x-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => onAddComment(ticket.id)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Add Comment
          </button>
        </div>
      </div>
    </div>

    <div className="px-4 py-3 bg-gray-50 border-t">
      <div className="flex space-x-3">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50"
        >
          Edit Ticket
        </button>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to update the ticket status?')) {
              const newStatus = ticket.status === 'Open' ? 'In Progress' : 'Resolved';
              onStatusUpdate(ticket.id, newStatus);
            }
          }}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {ticket.status === 'Open' ? 'Start Progress' : 'Mark Resolved'}
        </button>
      </div>
    </div>
  </div>
);

const Tickets = () => {
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [ticketsResponse, roomsResponse, usersResponse] = await Promise.all([
        api.getTickets(),
        api.getRooms(),
        api.getUsers()
      ]);
      console.log('Tickets response:', ticketsResponse); // Debug log
      setTickets(ticketsResponse || []);
      setRooms(roomsResponse || []);
      setUsers(usersResponse || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      // Format the ticket data to match the backend schema
      const formattedTicket = {
        room_id: parseInt(ticketData.room_id),
        description: ticketData.description,
        status: ticketData.status || 'Open',
        assigned_to: parseInt(ticketData.assigned_to),
        created_by: 1, // Default to admin user
        due_time: ticketData.due_time,
        attachment: null,
        comment_log: ticketData.comment_log ? JSON.stringify(ticketData.comment_log) : null,
        subtask: ticketData.subtask ? JSON.stringify(ticketData.subtask) : null
      };

      console.log('Creating ticket with data:', formattedTicket); // Debug log
      const response = await api.createTicket(formattedTicket);
      console.log('Ticket creation response:', response); // Debug log
      setTickets(prev => [...prev, response]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError(error.message);
    }
  };

  const handleUpdateTicket = async (ticketId, ticketData) => {
    try {
      const response = await api.updateTicket(ticketId, ticketData);
      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === ticketId ? response.data : ticket
        )
      );
      setIsModalOpen(false);
      setSelectedTicket(null);
    } catch (error) {
      console.error('Error updating ticket:', error);
      setError(error.message);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.updateTicketStatus(ticketId, newStatus);
      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === ticketId
            ? { ...ticket, status: newStatus }
            : ticket
        )
      );
    } catch (error) {
      console.error('Error updating ticket status:', error);
      setError(error.message);
    }
  };

  const handleAddComment = async (ticketId) => {
    if (!newComment.trim()) return;

    try {
      const response = await api.addComment(ticketId, { content: newComment });
      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === ticketId
            ? { ...ticket, comment_log: [...ticket.comment_log, response.data] }
            : ticket
        )
      );
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError(error.message);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    try {
      await api.deleteTicket(ticketId);
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
    } catch (error) {
      console.error('Error deleting ticket:', error);
      setError(error.message);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
        <button 
          onClick={() => {
            setSelectedTicket(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Create Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('Open')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'Open'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setFilter('In Progress')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'In Progress'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilter('Resolved')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'Resolved'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Resolved
        </button>
        <button
          onClick={() => setFilter('Canceled')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'Canceled'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Canceled
        </button>
      </div>

      {/* Content with scrollbar */}
      <div className="h-[calc(100vh-200px)] overflow-y-auto">
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <TicketListItem
                key={ticket.id}
                ticket={ticket}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setViewMode('detail');
                }}
              />
            ))}
          </div>
        ) : (
          <TicketDetail
            ticket={selectedTicket}
            onBack={() => setViewMode('list')}
            onEdit={() => {
              setSelectedTicket(selectedTicket);
              setIsModalOpen(true);
            }}
            onStatusUpdate={handleStatusChange}
            onAddComment={handleAddComment}
            newComment={newComment}
            setNewComment={setNewComment}
          />
        )}
      </div>

      {/* Ticket Modal */}
      <TicketModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        onSubmit={selectedTicket ? handleUpdateTicket : handleCreateTicket}
        rooms={rooms}
        users={users}
      />
    </div>
  );
};

export default Tickets; 