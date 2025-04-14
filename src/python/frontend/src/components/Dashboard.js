import React, { useState, useEffect } from 'react';
import { Card, Grid, Typography, Box, CircularProgress } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summary, ticketPerformance, roomOccupancy, userPerformance] = await Promise.all([
          api.getDashboardSummary(),
          api.getTicketPerformance(),
          api.getRoomOccupancy(),
          api.getUserPerformance()
        ]);

        setDashboardData({
          summary,
          ticketPerformance,
          roomOccupancy,
          userPerformance
        });
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total Rooms</Typography>
            <Typography variant="h4">{dashboardData.summary.summary.total_rooms}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total Tickets</Typography>
            <Typography variant="h4">{dashboardData.summary.summary.total_tickets}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Open Tickets</Typography>
            <Typography variant="h4">{dashboardData.summary.summary.open_tickets}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">High Priority</Typography>
            <Typography variant="h4">{dashboardData.summary.summary.high_priority_tickets}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total Users</Typography>
            <Typography variant="h4">{dashboardData.summary.summary.total_users}</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Room Status Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" mb={2}>Room Status Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(dashboardData.summary.room_status).map(([name, value]) => ({
                    name,
                    value
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(dashboardData.summary.room_status).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Ticket Status Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" mb={2}>Ticket Status Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(dashboardData.summary.ticket_status).map(([name, value]) => ({
                name,
                value
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Room Occupancy Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" mb={2}>Room Occupancy Metrics</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                {
                  name: 'Occupied',
                  value: dashboardData.roomOccupancy.occupancy_metrics.occupied_rooms
                },
                {
                  name: 'Available',
                  value: dashboardData.roomOccupancy.occupancy_metrics.available_rooms
                },
                {
                  name: 'Maintenance',
                  value: dashboardData.roomOccupancy.occupancy_metrics.maintenance_rooms
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Ticket Performance Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" mb={2}>Ticket Resolution Time</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(dashboardData.ticketPerformance.daily_ticket_distribution).map(([date, count]) => ({
                date,
                count
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>

      {/* User Performance Table */}
      <Card sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" mb={2}>User Performance</Typography>
        <Grid container spacing={2}>
          {Object.values(dashboardData.userPerformance.user_metrics).map((user) => (
            <Grid item xs={12} sm={6} md={4} key={user.name}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1">{user.name}</Typography>
                <Typography variant="body2" color="textSecondary">{user.role}</Typography>
                <Typography variant="body2">Total Tickets: {user.total_tickets}</Typography>
                <Typography variant="body2">Resolved: {user.resolved_tickets}</Typography>
                <Typography variant="body2">
                  Resolution Rate: {user.resolution_rate}%
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Box>
  );
};

export default Dashboard; 