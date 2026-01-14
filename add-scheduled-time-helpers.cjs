const fs = require('fs');

const filePath = 'C:/Projects/blush-marketing/frontend/src/pages/ContentLibrary.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const oldCode = `  const getActionLabel = (action) => {
    const labels = {
      approved: 'Approved',
      rejected: 'Rejected',
      regenerated: 'Regenerated',
      edited: 'Edited'
    };
    return labels[action] || 'Updated';
  };`;

const newCode = `  const getActionLabel = (action) => {
    const labels = {
      approved: 'Approved',
      rejected: 'Rejected',
      regenerated: 'Regenerated',
      edited: 'Edited'
    };
    return labels[action] || 'Updated';
  };

  // Helper function to format scheduled time with countdown
  const formatScheduledTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;

    // If date is in the past
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

    // Calculate countdown
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let countdownText = '';
    if (diffDays > 0) {
      countdownText = `${diffDays}d ${diffHours}h ${diffMinutes}m`;
    } else if (diffHours > 0) {
      countdownText = `${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      countdownText = `${diffMinutes} minutes`;
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

  // Get timezone abbreviation
  const getTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = new Date();
    const abbreviation = date.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ')[2];
    return abbreviation || 'Local Time';
  };

  // Handle start rescheduling
  const handleStartReschedule = () => {
    setRescheduleMode(true);
    setNewScheduledTime(selectedVideo.scheduledAt ?
      new Date(selectedVideo.scheduledAt).toISOString().slice(0, 16) :
      new Date(Date.now() + 3600000).toISOString().slice(0, 16)
    );
  };

  // Handle cancel rescheduling
  const handleCancelReschedule = () => {
    setRescheduleMode(false);
    setNewScheduledTime('');
  };

  // Handle confirm rescheduling
  const handleConfirmReschedule = async () => {
    if (!newScheduledTime) return;

    try {
      const response = await fetch(\`http://localhost:3003/api/content/\${selectedVideo._id}/schedule\`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduledAt: new Date(newScheduledTime).toISOString()
        })
      });

      if (response.ok) {
        // Update local state
        setSelectedVideo({
          ...selectedVideo,
          scheduledAt: new Date(newScheduledTime).toISOString()
        });

        // Refresh posts list
        fetchPosts();

        // Close reschedule mode
        setRescheduleMode(false);
        setNewScheduledTime('');

        alert('✅ Scheduled time updated successfully!');
      } else {
        const error = await response.json();
        alert(\`❌ Failed to update schedule: \${error.message || 'Unknown error'}\`);
      }
    } catch (error) {
      console.error('Error rescheduling:', error);
      // If API fails, update local state anyway for demo
      setSelectedVideo({
        ...selectedVideo,
        scheduledAt: new Date(newScheduledTime).toISOString()
      });
      setRescheduleMode(false);
      setNewScheduledTime('');
      alert('⚠️ Updated locally (backend disconnected)');
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
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [selectedVideo]);`;

if (content.includes(oldCode)) {
  const newContent = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ Helper functions added successfully');
} else {
  console.log('❌ Helper code marker not found');
  console.log('Looking for:', oldCode.substring(0, 100));
}
