import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    BuildingOfficeIcon,
    TicketIcon,
    UserGroupIcon,
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import Dashboard from './components/Dashboard';
import Rooms from './components/Rooms';
import Tickets from './components/Tickets';
import Users from './components/Users';
import Reports from './components/Reports';
import ChatInterface from './components/ChatInterface';

const Sidebar = () => {
    const location = useLocation();
    const [isChatOpen, setIsChatOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: HomeIcon },
        { name: 'Rooms', href: '/rooms', icon: BuildingOfficeIcon },
        { name: 'Tickets', href: '/tickets', icon: TicketIcon },
        { name: 'Users', href: '/users', icon: UserGroupIcon },
        { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col">
                <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r">
                    <div className="flex items-center flex-shrink-0 px-4">
                        <h1 className="text-2xl font-bold text-gray-900">Boost</h1>
                    </div>
                    <div className="mt-5 flex-grow flex flex-col">
                        <nav className="flex-1 px-2 space-y-1">
                            {navigation.map((item) => {
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                            isActive
                                                ? 'bg-gray-100 text-gray-900'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <item.icon
                                            className={`mr-3 flex-shrink-0 h-6 w-6 ${
                                                isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                                            }`}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
                    <div className="flex-1 px-4 flex justify-between">
                        <div className="flex-1 flex">
                            <div className="flex-shrink-0 flex items-center">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
                                </h2>
                            </div>
                        </div>
                        <div className="ml-4 flex items-center md:ml-6">
                            <button
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1 relative overflow-y-auto focus:outline-none">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/rooms" element={<Rooms />} />
                                <Route path="/tickets" element={<Tickets />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/reports" element={<Reports />} />
                            </Routes>
                        </div>
                    </div>
                </main>
            </div>

            {/* Chat Interface */}
            {isChatOpen && (
                <div className="fixed bottom-0 right-0 w-96 h-[600px] bg-white shadow-lg rounded-t-lg overflow-hidden">
                    <ChatInterface />
                </div>
            )}
        </div>
    );
};

const App = () => {
    return (
        <Router>
            <Sidebar />
        </Router>
    );
};

export default App; 