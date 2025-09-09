import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button
} from '@mui/material';
import {
  Notifications,
  Assignment,
  CheckCircle,
  Info
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { Notification } from '../../types';
import axios from 'axios';

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [, setLoading] = useState(false);

  const open = Boolean(anchorEl);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/notifications/${user?.id}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await axios.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`/notifications/${user?.id}/read-all`);
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <Assignment color="primary" />;
      case 'progress':
        return <CheckCircle color="success" />;
      default:
        return <Info color="info" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Box>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-describedby="notification-popover"
      >
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>
      
      <Popover
        id="notification-popover"
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </Box>
          
          {notifications.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No notifications
            </Typography>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                      cursor: 'pointer'
                    }}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export default NotificationCenter;
