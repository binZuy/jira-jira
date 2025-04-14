import React, { useState, useEffect } from 'react';
import {
    ChartBarIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

function EnhancedReports() {
    const [timeRange, setTimeRange] = useState('week');
    const [reportData, setReportData] = useState({
        occupancy: {
            current: 75,
            previous: 68,
            trend: 'up',
        },
        revenue: {
            current: 25000,
            previous: 22000,
            trend: 'up',
        },
        guestSatisfaction: {
            current: 4.5,
            previous: 4.2,
            trend: 'up',
        },
        maintenanceIssues: {
            current: 12,
            previous: 15,
            trend: 'down',
        },
    });

    const [topPerformingRooms, setTopPerformingRooms] = useState([
        { id: 1, roomNumber: '101', revenue: 5000, occupancy: '90%' },
        { id: 2, roomNumber: '205', revenue: 4800, occupancy: '85%' },
        { id: 3, roomNumber: '304', revenue: 4500, occupancy: '80%' },
    ]);

    const [revenueByCategory, setRevenueByCategory] = useState([
        { category: 'Room Revenue', amount: 15000 },
        { category: 'Food & Beverage', amount: 5000 },
        { category: 'Services', amount: 3000 },
        { category: 'Other', amount: 2000 },
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
                    <p className="mt-1 text-sm text-gray-500">Comprehensive insights and performance metrics</p>
                </div>
                <div className="flex space-x-4">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="day">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Occupancy Rate</dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {reportData.occupancy.current}%
                                        </div>
                                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                                            reportData.occupancy.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {reportData.occupancy.trend === 'up' ? '↑' : '↓'} {Math.abs(reportData.occupancy.current - reportData.occupancy.previous)}%
                                        </div>
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
                                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            ${reportData.revenue.current.toLocaleString()}
                                        </div>
                                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                                            reportData.revenue.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {reportData.revenue.trend === 'up' ? '↑' : '↓'} {Math.abs(reportData.revenue.current - reportData.revenue.previous)}%
                                        </div>
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
                                    <dt className="text-sm font-medium text-gray-500 truncate">Guest Satisfaction</dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {reportData.guestSatisfaction.current}/5
                                        </div>
                                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                                            reportData.guestSatisfaction.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {reportData.guestSatisfaction.trend === 'up' ? '↑' : '↓'} {Math.abs(reportData.guestSatisfaction.current - reportData.guestSatisfaction.previous)}
                                        </div>
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
                                    <dt className="text-sm font-medium text-gray-500 truncate">Maintenance Issues</dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {reportData.maintenanceIssues.current}
                                        </div>
                                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                                            reportData.maintenanceIssues.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {reportData.maintenanceIssues.trend === 'up' ? '↑' : '↓'} {Math.abs(reportData.maintenanceIssues.current - reportData.maintenanceIssues.previous)}
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performing Rooms */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Top Performing Rooms</h3>
                </div>
                <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {topPerformingRooms.map((room) => (
                            <li key={room.id} className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <p className="text-sm font-medium text-gray-900">Room {room.roomNumber}</p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <p className="text-sm text-gray-500">Revenue: ${room.revenue.toLocaleString()}</p>
                                        <p className="text-sm text-gray-500">Occupancy: {room.occupancy}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Revenue by Category */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Revenue by Category</h3>
                </div>
                <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {revenueByCategory.map((category) => (
                            <li key={category.category} className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <p className="text-sm font-medium text-gray-900">{category.category}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <p className="text-sm text-gray-500">${category.amount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default EnhancedReports; 