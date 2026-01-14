#!/usr/bin/env python3
import re

file_path = 'C:/Projects/blush-marketing/frontend/src/pages/ContentLibrary.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the position to insert
marker = '  const handleVideoPreview = (post) => {'

helper_code = '''
  // Helper function to format scheduled time with countdown
  const formatScheduledTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;

    if (diffMs < 0) {
      return {
        formatted: date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        countdown: 'Past due',
        isPast: true
      };
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let countdownText = '';
    if (diffDays > 0) {
      countdownText = diffDays + 'd ' + diffHours + 'h ' + diffMinutes + 'm';
    } else if (diffHours > 0) {
      countdownText = diffHours + 'h ' + diffMinutes + 'm';
    } else if (diffMinutes > 0) {
      countdownText = diffMinutes + ' minutes';
    } else {
      countdownText = 'Less than 1 minute';
    }

    return {
      formatted: date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      countdown: countdownText,
      isPast: false
    };
  };

  const getTimezone = () => {
    const date = new Date();
    const abbreviation = date.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ')[2];
    return abbreviation || 'Local Time';
  };

  const handleStartReschedule = () => {
    setRescheduleMode(true);
    const defaultTime = selectedVideo.scheduledAt || new Date(Date.now() + 3600000).toISOString();
    setNewScheduledTime(new Date(defaultTime).toISOString().slice(0, 16));
  };

  const handleCancelReschedule = () => {
    setRescheduleMode(false);
    setNewScheduledTime('');
  };

  const handleConfirmReschedule = async () => {
    if (!newScheduledTime) return;

    try {
      const response = await fetch('http://localhost:3003/api/content/' + selectedVideo._id + '/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: new Date(newScheduledTime).toISOString() })
      });

      if (response.ok) {
        setSelectedVideo({ ...selectedVideo, scheduledAt: new Date(newScheduledTime).toISOString() });
        fetchPosts();
        setRescheduleMode(false);
        setNewScheduledTime('');
        alert('Scheduled time updated!');
      } else {
        const error = await response.json();
        alert('Failed to update: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      setSelectedVideo({ ...selectedVideo, scheduledAt: new Date(newScheduledTime).toISOString() });
      setRescheduleMode(false);
      setNewScheduledTime('');
      alert('Updated locally');
    }
  };

  // Update countdown every minute
  useEffect(() => {
    if (!selectedVideo || !selectedVideo.scheduledAt) return;

    const updateCountdown = () => {
      const timeInfo = formatScheduledTime(selectedVideo.scheduledAt);
      setCountdown(timeInfo.countdown);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [selectedVideo]);

'''

if marker in content:
    new_content = content.replace(marker, helper_code + marker)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('✅ Helper functions added successfully')
else:
    print('❌ Marker not found')
