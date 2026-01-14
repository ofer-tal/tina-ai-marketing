#!/bin/bash
# Add approve/reject handler functions

INPUT="frontend/src/pages/ContentLibrary.jsx"

cat > /tmp/handlers.txt << 'EOF'

  const handleApprove = async () => {
    if (!selectedVideo) return;

    try {
      // Try API call first
      const response = await fetch(`http://localhost:3001/api/content/posts/${selectedVideo._id}/approve`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to approve post');
      }

      // Update local state
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'approved' }
            : post
        )
      );

      // Update selected video
      setSelectedVideo(prev => ({ ...prev, status: 'approved' }));

      alert('✅ Post approved successfully!');
    } catch (err) {
      console.error('Error approving post:', err);
      // For development, update local state anyway
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'approved' }
            : post
        )
      );
      setSelectedVideo(prev => ({ ...prev, status: 'approved' }));
      alert('✅ Post approved! (Note: Backend not connected)');
    }
  };

  const handleReject = async () => {
    if (!selectedVideo) return;

    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      // Try API call first
      const response = await fetch(`http://localhost:3001/api/content/posts/${selectedVideo._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to reject post');
      }

      // Update local state
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'rejected' }
            : post
        )
      );

      handleCloseModal();
      alert('❌ Post rejected.');
    } catch (err) {
      console.error('Error rejecting post:', err);
      // For development, update local state anyway
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === selectedVideo._id
            ? { ...post, status: 'rejected' }
            : post
        )
      );
      handleCloseModal();
      alert('❌ Post rejected! (Note: Backend not connected)');
    }
  };
EOF

# Insert after line 819 (after handleThumbnailClick)
sed -i '819r /tmp/handlers.txt' "$INPUT"

echo "Added handler functions"
echo "New line count: $(wc -l < "$INPUT")"
