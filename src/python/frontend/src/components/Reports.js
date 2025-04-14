import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    ChartBarIcon,
    ClockIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

const Reports = () => {
    const [stats, setStats] = useState({
        totalRooms: 0,
        activeTickets: 0,
        totalUsers: 0,
        averageResponseTime: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setIsLoading(true);
            const [rooms, tickets, users] = await Promise.all([
                api.getRooms(),
                api.getTickets({ status: 'Open' }),
                api.getUsers(),
            ]);

            setStats({
                totalRooms: rooms.length,
                activeTickets: tickets.length,
                totalUsers: users.length,
                averageResponseTime: calculateAverageResponseTime(tickets),
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateAverageResponseTime = (tickets) => {
        if (!tickets.length) return 0;
        const totalTime = tickets.reduce((acc, ticket) => {
            const created = new Date(ticket.created_at);
            const updated = new Date(ticket.updated_at);
            return acc + (updated - created);
        }, 0);
        return Math.round(totalTime / tickets.length / (1000 * 60)); // Convert to minutes
    };

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
                <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Rooms
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.totalRooms}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <ChartBarIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Active Tickets
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.activeTickets}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <UserGroupIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Users
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.totalUsers}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <ClockIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Avg Response Time
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.averageResponseTime} min
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">More Analytics Coming Soon</h2>
                <p className="text-gray-500">
                    We're working on adding more detailed analytics and reports to help you better understand your hotel's performance.
                </p>
            </div>
        </div>
    );
};

export default Reports; 