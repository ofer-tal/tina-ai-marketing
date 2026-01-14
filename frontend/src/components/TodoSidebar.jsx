import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Sidebar = styled.aside`
  width: 320px;
  background: #16213e;
  border-right: 1px solid #2d3561;
  height: calc(100vh - 120px);
  position: sticky;
  top: 100px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #1a1a2e;
  }

  &::-webkit-scrollbar-thumb {
    background: #2d3561;
    border-radius: 3px;

    &:hover {
      background: #e94560;
    }
  }
`;

const SidebarHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #2d3561;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #eaeaea;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &::before {
      content: '📋';
    }
  }
`;

const TodoList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const TodoItem = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    transform: translateX(4px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const TodoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const TodoTime = styled.div`
  font-size: 0.8rem;
  color: #e94560;
  font-weight: 600;
  white-space: nowrap;
`;

const TodoStatus = styled.span`
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: ${props => {
    switch (props.$status) {
      case 'pending': return '#ffb020';
      case 'in_progress': return '#7b2cbf';
      case 'completed': return '#00d26a';
      case 'snoozed': return '#6c757d';
      default: return '#2d3561';
    }
  }};
  color: white;
  font-weight: 500;
`;

const TodoTitle = styled.div`
  font-size: 0.9rem;
  color: #eaeaea;
  font-weight: 500;
  line-height: 1.4;
  margin-bottom: 0.25rem;
`;

const TodoMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const PriorityBadge = styled.span`
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  background: ${props => {
    switch (props.$priority) {
      case 'urgent': return '#f8312f';
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffb020';
      case 'low': return '#00d26a';
      default: return '#2d3561';
    }
  }};
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.65rem;
`;

const CategoryBadge = styled.span`
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  background: #2d3561;
  color: #a0a0a0;
  text-transform: capitalize;
  font-size: 0.65rem;
`;

const SidebarFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid #2d3561;
`;

const ViewAllLink = styled.a`
  display: block;
  text-align: center;
  padding: 0.75rem;
  background: transparent;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #e94560;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: #e94560;
    color: white;
    border-color: #e94560;
  }
`;

const LoadingState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #a0a0a0;
  font-size: 0.9rem;
`;

const EmptyState = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: #a0a0a0;
  font-size: 0.9rem;
`;

function TodoSidebar() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/todos');

      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }

      const data = await response.json();

      if (data.success && data.todos) {
        // Sort by scheduled time and filter for pending/in-progress
        const sortedTodos = data.todos
          .filter(todo => todo.status === 'pending' || todo.status === 'in_progress')
          .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
          .slice(0, 7); // Max 7 todos in sidebar

        setTodos(sortedTodos);
      } else {
        setTodos([]);
      }
    } catch (err) {
      console.error('Error fetching todos:', err);
      setError(err.message);

      // Use mock data on error
      const mockTodos = [
        {
          _id: '1',
          title: 'Review and approve 3 pending posts',
          category: 'review',
          priority: 'high',
          status: 'pending',
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '2',
          title: 'Update ASO keywords',
          category: 'configuration',
          priority: 'medium',
          status: 'pending',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '3',
          title: 'Create 10 Professor Romance story posts',
          category: 'posting',
          priority: 'high',
          status: 'in_progress',
          scheduledAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
      ];

      setTodos(mockTodos);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMs < 0) {
      return 'Overdue';
    } else if (diffHrs < 1) {
      return 'Now';
    } else if (diffHrs < 24) {
      return `In ${diffHrs}h`;
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleTodoClick = (todo) => {
    // For now, just log - could expand to show details modal
    console.log('Todo clicked:', todo);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <h2>Tasks</h2>
      </SidebarHeader>

      {loading ? (
        <LoadingState>⏳ Loading tasks...</LoadingState>
      ) : todos.length === 0 ? (
        <EmptyState>✓ No pending tasks</EmptyState>
      ) : (
        <TodoList>
          {todos.map(todo => (
            <TodoItem
              key={todo._id || todo.id}
              onClick={() => handleTodoClick(todo)}
            >
              <TodoHeader>
                <TodoTime>{formatTime(todo.scheduledAt)}</TodoTime>
                <TodoStatus $status={todo.status}>
                  {todo.status === 'in_progress' ? 'In Progress' : todo.status}
                </TodoStatus>
              </TodoHeader>
              <TodoTitle>{todo.title}</TodoTitle>
              <TodoMeta>
                <PriorityBadge $priority={todo.priority}>
                  {todo.priority}
                </PriorityBadge>
                <CategoryBadge>{todo.category}</CategoryBadge>
              </TodoMeta>
            </TodoItem>
          ))}
        </TodoList>
      )}

      <SidebarFooter>
        <ViewAllLink href="/todos">View All Tasks →</ViewAllLink>
      </SidebarFooter>
    </Sidebar>
  );
}

export default TodoSidebar;
