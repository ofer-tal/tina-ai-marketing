import fs from 'fs';

const file = 'C:/Projects/blush-marketing/frontend/src/pages/ContentLibrary.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variables after newHashtag
const stateMarker = `  const [newHashtag, setNewHashtag] = useState('');`;
const stateAddition = `  const [newHashtag, setNewHashtag] = useState('');
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [countdown, setCountdown] = useState('');`;

if (content.includes(stateMarker)) {
  content = content.replace(stateMarker, stateAddition);
}

// 2. Add helper functions before handleVideoPreview
const helperMarker = `  const handleVideoPreview = (post) => {`;

const helperCode = `  const formatScheduledTime = (dateString) => {
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

  `;

if (content.includes(helperMarker)) {
  content = content.replace(helperMarker, helperCode + helperMarker);
}

// 3. Add JSX in modal after ModalTitle
const jsxMarker = `                  <ModalTitle>{selectedVideo.title}</ModalTitle>`;

const jsxAddition = `                  <ModalTitle>{selectedVideo.title}</ModalTitle>

                  {/* Scheduled Time Section */}
                  {selectedVideo.scheduledAt && (
                    <ScheduledTimeSection>
                      <ScheduledTimeInfo>
                        <ScheduledTimeHeader>
                          📅 Scheduled Posting Time
                        </ScheduledTimeHeader>
                        <ScheduledTimeDisplay>
                          🕐 {formatScheduledTime(selectedVideo.scheduledAt).formatted}
                        </ScheduledTimeDisplay>
                        {countdown && (
                          <CountdownTimer>
                            ⏱️ Posting in {countdown}
                          </CountdownTimer>
                        )}
                        <TimezoneDisplay>
                          🌍 {getTimezone()}
                        </TimezoneDisplay>
                      </ScheduledTimeInfo>
                      {selectedVideo.status !== 'posted' && selectedVideo.status !== 'rejected' && (
                        <RescheduleButton onClick={handleStartReschedule} disabled={rescheduleMode}>
                          📅 Reschedule
                        </RescheduleButton>
                      )}
                    </ScheduledTimeSection>
                  )}

                  {rescheduleMode && (
                    <DateTimePickerContainer $visible={rescheduleMode}>
                      <DateTimePickerRow>
                        <label style={{ color: '#eaeaea', fontWeight: '600' }}>New Date & Time:</label>
                        <DateTimeInput
                          type="datetime-local"
                          value={newScheduledTime}
                          onChange={(e) => setNewScheduledTime(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <ConfirmRescheduleButton onClick={handleConfirmReschedule}>
                          ✅ Confirm
                        </ConfirmRescheduleButton>
                        <CancelRescheduleButton onClick={handleCancelReschedule}>
                          ✖ Cancel
                        </CancelRescheduleButton>
                      </DateTimePickerRow>
                    </DateTimePickerContainer>
                  )}
`;

if (content.includes(jsxMarker)) {
  // Find all occurrences and replace the one in the modal (after line 1990)
  const lines = content.split('\n');
  let foundInModal = false;
  let result = [];

  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i]);
    if (lines[i].includes('<ModalTitle>{selectedVideo.title}</ModalTitle>') && !foundInModal && i > 1900) {
      // This is in the modal section
      foundInModal = true;
      // Insert the scheduled time section
      result.push('');
      result.push('                  {/* Scheduled Time Section */}');
      result.push('                  {selectedVideo.scheduledAt && (');
      result.push('                    <ScheduledTimeSection>');
      result.push('                      <ScheduledTimeInfo>');
      result.push('                        <ScheduledTimeHeader>');
      result.push('                          📅 Scheduled Posting Time');
      result.push('                        </ScheduledTimeHeader>');
      result.push('                        <ScheduledTimeDisplay>');
      result.push('                          🕐 {formatScheduledTime(selectedVideo.scheduledAt).formatted}');
      result.push('                        </ScheduledTimeDisplay>');
      result.push('                        {countdown && (');
      result.push('                          <CountdownTimer>');
      result.push('                            ⏱️ Posting in {countdown}');
      result.push('                          </CountdownTimer>');
      result.push('                        )}');
      result.push('                        <TimezoneDisplay>');
      result.push('                          🌍 {getTimezone()}');
      result.push('                        </TimezoneDisplay>');
      result.push('                      </ScheduledTimeInfo>');
      result.push('                      {selectedVideo.status !== \'posted\' && selectedVideo.status !== \'rejected\' && (');
      result.push('                        <RescheduleButton onClick={handleStartReschedule} disabled={rescheduleMode}>');
      result.push('                          📅 Reschedule');
      result.push('                        </RescheduleButton>');
      result.push('                      )}');
      result.push('                    </ScheduledTimeSection>');
      result.push('                  )}');
      result.push('');
      result.push('                  {rescheduleMode && (');
      result.push('                    <DateTimePickerContainer $visible={rescheduleMode}>');
      result.push('                      <DateTimePickerRow>');
      result.push('                        <label style={{ color: \'#eaeaea\', fontWeight: \'600\' }}>New Date & Time:</label>');
      result.push('                        <DateTimeInput');
      result.push('                          type="datetime-local"');
      result.push('                          value={newScheduledTime}');
      result.push('                          onChange={(e) => setNewScheduledTime(e.target.value)}');
      result.push('                          min={new Date().toISOString().slice(0, 16)}');
      result.push('                        />');
      result.push('                        <ConfirmRescheduleButton onClick={handleConfirmReschedule}>');
      result.push('                          ✅ Confirm');
      result.push('                        </ConfirmRescheduleButton>');
      result.push('                        <CancelRescheduleButton onClick={handleCancelReschedule}>');
      result.push('                          ✖ Cancel');
      result.push('                        </CancelRescheduleButton>');
      result.push('                      </DateTimePickerRow>');
      result.push('                    </DateTimePickerContainer>');
      result.push('                  )}');
    }
  }

  content = result.join('\n');
}

fs.writeFileSync(file, content, 'utf8');
console.log('✅ All changes applied successfully');
