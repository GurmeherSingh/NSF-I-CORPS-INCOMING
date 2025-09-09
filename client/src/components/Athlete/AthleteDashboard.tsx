import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Alert
} from '@mui/material';
import {
  CheckCircle,
  FitnessCenter,
  TrendingUp,
  Assignment,
  PlayArrow,
  Info
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { Assignment as AssignmentType } from '../../types';
import axios from 'axios';

const AthleteDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentType[]>([]);
  const [, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentType | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logData, setLogData] = useState({
    notes: '',
    painLevel: 1,
    difficulty: 1
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchAssignments = useCallback(async () => {
    try {
      if (!user) return;

      const response = await axios.get(`/users/${user.id}/assignments`);
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleLogProgress = (assignment: AssignmentType) => {
    setSelectedAssignment(assignment);
    setLogData({ notes: '', painLevel: 1, difficulty: 1 });
    setLogDialogOpen(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedAssignment) return;

    setSubmitting(true);
    try {
      await axios.post('/progress', {
        assignmentId: selectedAssignment.assignmentId,
        notes: logData.notes,
        painLevel: logData.painLevel,
        difficulty: logData.difficulty
      });

      setSuccessMessage('Progress logged successfully!');
      setLogDialogOpen(false);
      fetchAssignments(); // Refresh assignments
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error logging progress:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isCompletedToday = (assignment: AssignmentType) => {
    const today = new Date().toISOString().split('T')[0];
    return assignment.progress?.some(p => p.completedDate === today);
  };

  const getCompletionRate = (assignment: AssignmentType) => {
    if (!assignment.progress || assignment.progress.length === 0) return 0;
    
    const startDate = new Date(assignment.startDate);
    const today = new Date();
    const daysDiff = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const expectedCompletions = Math.min(daysDiff, 7); // For demo, assume daily frequency
    const actualCompletions = assignment.progress.length;
    
    return Math.min((actualCompletions / expectedCompletions) * 100, 100);
  };

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'twice_weekly': return 'Twice Weekly';
      case 'three_times_weekly': return 'Three Times Weekly';
      default: return frequency;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Rehabilitation Program
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome, {user?.firstName}! Track your progress and stay on top of your recovery.
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Stats Overview */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assignment color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{assignments.length}</Typography>
                  <Typography color="text.secondary">Active Exercises</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">
                    {assignments.filter(isCompletedToday).length}
                  </Typography>
                  <Typography color="text.secondary">Completed Today</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="info" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">
                    {Math.round(assignments.reduce((acc, a) => acc + getCompletionRate(a), 0) / assignments.length || 0)}%
                  </Typography>
                  <Typography color="text.secondary">Overall Progress</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Assignments List */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {assignments.map((assignment) => (
          <Box key={assignment.assignmentId} sx={{ flex: '1 1 400px', minWidth: '350px' }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box flexGrow={1}>
                    <Typography variant="h6" gutterBottom>
                      {assignment.exerciseName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {assignment.description}
                    </Typography>
                    <Box display="flex" gap={1} sx={{ mb: 2 }}>
                      <Chip label={assignment.bodyPart} size="small" />
                      <Chip label={getFrequencyText(assignment.frequency)} size="small" />
                      <Chip 
                        label={assignment.category} 
                        size="small" 
                        color="secondary" 
                      />
                    </Box>
                  </Box>
                  {assignment.videoUrl && (
                    <IconButton size="small">
                      <PlayArrow />
                    </IconButton>
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Progress: {Math.round(getCompletionRate(assignment))}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={getCompletionRate(assignment)} 
                    sx={{ mb: 1 }}
                  />
                </Box>

                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Instructions:</strong> {assignment.instructions}
                </Typography>

                {assignment.duration && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Duration: {assignment.duration} seconds
                  </Typography>
                )}

                {assignment.sets && assignment.reps && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Sets: {assignment.sets} × Reps: {assignment.reps}
                  </Typography>
                )}

                <Box display="flex" gap={1}>
                  <Button
                    variant={isCompletedToday(assignment) ? "outlined" : "contained"}
                    color={isCompletedToday(assignment) ? "success" : "primary"}
                    startIcon={isCompletedToday(assignment) ? <CheckCircle /> : <FitnessCenter />}
                    onClick={() => handleLogProgress(assignment)}
                    disabled={isCompletedToday(assignment)}
                    fullWidth
                  >
                    {isCompletedToday(assignment) ? 'Completed Today' : 'Log Progress'}
                  </Button>
                  <IconButton size="small">
                    <Info />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Log Progress Dialog */}
      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Exercise Progress</DialogTitle>
        <DialogContent>
          {selectedAssignment && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedAssignment.exerciseName}
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (optional)"
                value={logData.notes}
                onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                sx={{ mb: 3 }}
              />

              <Typography gutterBottom>
                Pain Level: {logData.painLevel}/10
              </Typography>
              <Slider
                value={logData.painLevel}
                onChange={(_, value) => setLogData({ ...logData, painLevel: value as number })}
                min={1}
                max={10}
                step={1}
                marks
                sx={{ mb: 3 }}
              />

              <Typography gutterBottom>
                Difficulty: {logData.difficulty}/5
              </Typography>
              <Slider
                value={logData.difficulty}
                onChange={(_, value) => setLogData({ ...logData, difficulty: value as number })}
                min={1}
                max={5}
                step={1}
                marks
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitProgress} 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Logging...' : 'Log Progress'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AthleteDashboard;
