const fs = require('fs');

const filePath = 'C:/Projects/blush-marketing/frontend/src/pages/ContentLibrary.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const oldState = `  const [editedHashtags, setEditedHashtags] = useState([]);
  const [newHashtag, setNewHashtag] = useState('');`;

const newState = `  const [editedHashtags, setEditedHashtags] = useState([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [countdown, setCountdown] = useState('');`;

if (content.includes(oldState)) {
  const newContent = content.replace(oldState, newState);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ State variables added successfully');
} else {
  console.log('❌ State marker not found');
  console.log('Looking for:', oldState);
}
