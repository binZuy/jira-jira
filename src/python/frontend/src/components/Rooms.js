import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    PlusIcon,
    BuildingOfficeIcon,
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

const RoomModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        room_number: '',
        floor: '',
        room_type: 'Standard',
        capacity: '',
        room_status: 'Available',
        cleaning_status: 'Clean',
        cleaning_priority: 'Low',
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">Add New Room</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Room Number</label>
                        <input
                            type="text"
                            value={formData.room_number}
                            onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Floor</label>
                        <input
                            type="number"
                            value={formData.floor}
                            onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Room Type</label>
                        <select
                            value={formData.room_type}
                            onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        >
                            <option value="Standard">Standard</option>
                            <option value="Deluxe">Deluxe</option>
                            <option value="Suite">Suite</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Capacity</label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            Add Room
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Rooms = () => {
    const [rooms, setRooms] = useState([]);
    const [filter, setFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            setIsLoading(true);
            const response = await api.getRooms();
            setRooms(response || []);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRoom = async (roomData) => {
        try {
            const response = await api.createRoom(roomData);
            setRooms(prev => [...prev, response]);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error creating room:', error);
            setError(error.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Available':
                return 'bg-green-100 text-green-800';
            case 'Occupied':
                return 'bg-blue-100 text-blue-800';
            case 'Needs Cleaning':
                return 'bg-yellow-100 text-yellow-800';
            case 'Out of Service':
                return 'bg-red-100 text-red-800';
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

    const filteredRooms = rooms.filter(room => {
        if (filter === 'all') return true;
        return room.room_status === filter;
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Rooms</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Add Room
                </button>
            </div>

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
                    onClick={() => setFilter('Available')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                        filter === 'Available'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                >
                    Available
                </button>
                <button
                    onClick={() => setFilter('Occupied')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                        filter === 'Occupied'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                >
                    Occupied
                </button>
                <button
                    onClick={() => setFilter('Needs Cleaning')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                        filter === 'Needs Cleaning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                >
                    Needs Cleaning
                </button>
                <button
                    onClick={() => setFilter('Out of Service')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                        filter === 'Out of Service'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                >
                    Out of Service
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRooms.map((room) => (
                    <div
                        key={room.id}
                        className="bg-white overflow-hidden shadow rounded-lg"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Room {room.room_number}
                                </h3>
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                        room.room_status
                                    )}`}
                                >
                                    {room.room_status}
                                </span>
                            </div>
                            <div className="mt-4">
                                <div className="flex items-center text-sm text-gray-500">
                                    <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                                    <span>Floor {room.floor}</span>
                                </div>
                                <div className="mt-2 flex items-center text-sm text-gray-500">
                                    <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                                    <span>Type: {room.room_type}</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                        room.cleaning_priority
                                    )}`}
                                >
                                    {room.cleaning_priority} Priority
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <RoomModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateRoom}
            />
        </div>
    );
};

export default Rooms; 