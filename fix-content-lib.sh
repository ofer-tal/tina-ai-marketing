#!/bin/bash
# Fix ContentLibrary.jsx to use mock data when API returns empty results

INPUT="frontend/src/pages/ContentLibrary.jsx"
OUTPUT="frontend/src/pages/ContentLibrary.jsx"

# Backup
cp "$INPUT" "${INPUT}.fix-backup"

# Use sed to replace lines 575-581 with the new implementation
# The strategy: delete those lines and insert new content

sed -i '575,581d' "$INPUT"

# Now insert the new code at line 574 (which was 574 before deletion)
sed -i '574a\
      const data = await response.json();\
      const fetchedPosts = data.data.posts || [];\
\
      // If API returns empty data, use mock data for development\
      if (fetchedPosts.length === 0) {\
        console.log('\''API returned empty data, using mock data for development'\'');\
        let mockPosts = generateMockPosts();\
\
        // Apply filters to mock data\
        if (filters.platform !== '\''all'\'') {\
          mockPosts = mockPosts.filter(post => post.platform === filters.platform);\
        }\
        if (filters.status !== '\''all'\'') {\
          mockPosts = mockPosts.filter(post => post.status === filters.status);\
        }\
        if (filters.search) {\
          const searchLower = filters.search.toLowerCase();\
          mockPosts = mockPosts.filter(post =>\
            post.title.toLowerCase().includes(searchLower) ||\
            post.storyName.toLowerCase().includes(searchLower)\
          );\
        }\
\
        // Apply pagination to mock data\
        const startIndex = (pagination.page - 1) * pagination.limit;\
        const endIndex = startIndex + pagination.limit;\
        const paginatedPosts = mockPosts.slice(startIndex, endIndex);\
\
        setPosts(paginatedPosts);\
        setPagination(prev => ({\
          ...prev,\
          total: mockPosts.length,\
          hasMore: endIndex < mockPosts.length\
        }));\
      } else {\
        setPosts(fetchedPosts);\
        setPagination(prev => ({\
          ...prev,\
          total: data.data.pagination?.total || 0,\
          hasMore: data.data.pagination?.hasMore || false\
        }));\
      }' "$INPUT"

echo "Fixed! Line count: $(wc -l < "$INPUT")"
