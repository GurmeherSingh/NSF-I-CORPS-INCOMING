import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Fab
} from '@mui/material';
import {
  Add,
  FitnessCenter,
  People,
  TrendingUp,
  Assignment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface DashboardStats {
  totalAssignments: number;
  activeAssignments: number;
  completedThisWeek: number;
}

interface RecentAssignment {
  assignmentId: number;
  exerciseName: string;
  athleteFirstName: string;
  athleteLastName: string;
  status: string;
  createdAt: string;
}

const TrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0,
    activeAssignments: 0,
    completedThisWeek: 0
  });
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([]);
  const [, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!user) return;

      // Fetch stats
      const statsResponse = await axios.get(`/assignments/stats/${user.id}`);
      setStats(statsResponse.data);

      // Fetch recent assignments
      const assignmentsResponse = await axios.get(`/assignments/trainer/${user.id}`);
      const assignments = assignmentsResponse.data.slice(0, 5); // Get latest 5
      setRecentAssignments(assignments);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Trainer Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {user?.firstName}! Manage your athletes' rehabilitation programs.
      </Typography>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assignment color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.totalAssignments}</Typography>
                  <Typography color="text.secondary">Total Assignments</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <FitnessCenter color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.activeAssignments}</Typography>
                  <Typography color="text.secondary">Active Programs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="info" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.completedThisWeek}</Typography>
                  <Typography color="text.secondary">Completed This Week</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <People color="secondary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">-</Typography>
                  <Typography color="text.secondary">Active Athletes</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 400px', minWidth: '350px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/trainer/exercises/create')}
                  fullWidth
                >
                  Create New Exercise
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<People />}
                  onClick={() => navigate('/trainer/athletes')}
                  fullWidth
                >
                  Manage Athletes
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Assignment />}
                  onClick={() => navigate('/trainer/assignments')}
                  fullWidth
                >
                  View All Assignments
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: '350px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Assignments
              </Typography>
              {recentAssignments.length > 0 ? (
                <List>
                  {recentAssignments.map((assignment) => (
                    <ListItem key={assignment.assignmentId} divider>
                      <ListItemText
                        primary={`${assignment.exerciseName}`}
                        secondary={`${assignment.athleteFirstName} ${assignment.athleteLastName}`}
                      />
                      <Chip
                        label={assignment.status}
                        color={getStatusColor(assignment.status) as any}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No recent assignments
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/trainer/assignments/create')}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default TrainerDashboard;
