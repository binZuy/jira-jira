const API_BASE_URL = 'http://localhost:8000/api/v1';

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'An error occurred');
    }
    return response.json();
};

const api = {
    // Hotel Agent
    async processQuery(query) {
        try {
            const response = await fetch(`${API_BASE_URL}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error processing query:', error);
            throw error;
        }
    },

    // Rooms
    async getRooms() {
        try {
            const response = await fetch(`${API_BASE_URL}/rooms`);
            return handleResponse(response);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            throw error;
        }
    },

    async createRoom(room) {
        try {
            const response = await fetch(`${API_BASE_URL}/rooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(room),
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    },

    async updateRoom(roomId, roomData) {
        try {
            const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roomData),
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error updating room:', error);
            throw error;
        }
    },

    async deleteRoom(roomId) {
        try {
            const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
                method: 'DELETE',
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error deleting room:', error);
            throw error;
        }
    },

    // Users
    async getUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/users`);
            return handleResponse(response);
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    async createUser(user) {
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(user),
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    async updateUser(id, user) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(user),
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    async deleteUser(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'DELETE',
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // Tickets
    async getTickets() {
        try {
            const response = await fetch(`${API_BASE_URL}/tickets`);
            return handleResponse(response);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            throw error;
        }
    },

    async createTicket(ticket) {
        try {
            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ticket),
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error creating ticket:', error);
            throw error;
        }
    },

    async updateTicket(ticketId, ticketData) {
        try {
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ticketData),
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error updating ticket:', error);
            throw error;
        }
    },

    async deleteTicket(ticketId) {
        try {
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'DELETE',
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error deleting ticket:', error);
            throw error;
        }
    },

    // Chat API
    async sendMessage(message) {
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });
            const data = await handleResponse(response);
            
            // Convert string values to appropriate types
            if (data.entities) {
                data.entities = data.entities.map(entity => ({
                    ...entity,
                    floor: parseInt(entity.floor) || entity.floor,
                    capacity: parseInt(entity.capacity) || entity.capacity,
                    open_tickets: parseInt(entity.open_tickets) || 0
                }));
            }
            
            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    async confirmAction(action) {
        try {
            const response = await fetch(`${API_BASE_URL}/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action }),
            });
            return handleResponse(response);
        } catch (error) {
            console.error('Error confirming action:', error);
            throw error;
        }
    },

    getTicket: async (id) => {
        const response = await fetch(`${API_BASE_URL}/tickets/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch ticket');
        }
        return response.json();
    },

    getRoom: async (id) => {
        const response = await fetch(`${API_BASE_URL}/rooms/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch room');
        }
        return response.json();
    },

    getUser: async (id) => {
        const response = await fetch(`${API_BASE_URL}/users/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user');
        }
        return response.json();
    },

    // Dashboard and Reports
    async getDashboardSummary() {
        const response = await fetch(`${API_BASE_URL}/dashboard/summary`);
        if (!response.ok) throw new Error('Failed to fetch dashboard summary');
        return response.json();
    },

    async getTicketPerformance() {
        const response = await fetch(`${API_BASE_URL}/reports/tickets/performance`);
        if (!response.ok) throw new Error('Failed to fetch ticket performance');
        return response.json();
    },

    async getRoomOccupancy() {
        const response = await fetch(`${API_BASE_URL}/reports/rooms/occupancy`);
        if (!response.ok) throw new Error('Failed to fetch room occupancy');
        return response.json();
    },

    async getUserPerformance() {
        const response = await fetch(`${API_BASE_URL}/reports/users/performance`);
        if (!response.ok) throw new Error('Failed to fetch user performance');
        return response.json();
    },

    // Additional Report Endpoints
    async getRoomStatusReport() {
        const response = await fetch(`${API_BASE_URL}/reports/rooms/status`);
        if (!response.ok) throw new Error('Failed to fetch room status report');
        return response.json();
    },

    async getTicketStatusReport() {
        const response = await fetch(`${API_BASE_URL}/reports/tickets/status`);
        if (!response.ok) throw new Error('Failed to fetch ticket status report');
        return response.json();
    },

    async getTicketPriorityReport() {
        const response = await fetch(`${API_BASE_URL}/reports/tickets/priority`);
        if (!response.ok) throw new Error('Failed to fetch ticket priority report');
        return response.json();
    },

    async getUserRolesReport() {
        const response = await fetch(`${API_BASE_URL}/reports/users/roles`);
        if (!response.ok) throw new Error('Failed to fetch user roles report');
        return response.json();
    },

    async getAssignedTicketsReport() {
        const response = await fetch(`${API_BASE_URL}/reports/tickets/assigned`);
        if (!response.ok) throw new Error('Failed to fetch assigned tickets report');
        return response.json();
    }
};

export default api; 