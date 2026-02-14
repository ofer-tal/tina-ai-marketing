import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Sidebar = styled.aside`
  width: ${props => props.$collapsed ? '60px' : '320px'};
  background: #16213e;
  border-right: 1px solid #2d3561;
  height: calc(100vh - 120px);
  position: sticky;
  top: 100px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;

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
  padding: ${props => props.$collapsed ? '1rem 0.5rem' : '1.5rem'};
  border-bottom: 1px solid #2d3561;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: ${props => props.$collapsed ? '0.8rem' : '1.2rem'};
    color: #eaeaea;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
    white-space: nowrap;

    &::before {
      content: '📋';
      font-size: ${props => props.$collapsed ? '1rem' : 'inherit'};
    }

    span {
      display: ${props => props.$collapsed ? 'none' : 'block'};
    }
  }
`;

const CollapseButton = styled.button`
  background: transparent;
  border: 1px solid #2d3561;
  border-radius: 4px;
  color: #eaeaea;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  transition: all 0.2s;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #e94560;
    border-color: #e94560;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const TodoList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const TodoItem = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'overdue' && prop !== '$collapsed'
})`
  background: ${props => props.overdue ? 'rgba(233, 69, 96, 0.15)' : '#1a1a2e'};
  border: 1px solid ${props => props.overdue ? '#f8312f' : '#2d3561'};
  border-radius: 8px;
  padding: ${props => props.$collapsed ? '0.5rem' : '1rem'};
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  ${props => props.overdue && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #f8312f 0%, #ff6b6b 100%);
    }
  `}

  &:hover {
    border-color: #e94560;
    transform: ${props => props.$collapsed ? 'none' : 'translateX(4px)'};
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const TodoHeader = styled.div`
  display: ${props => props.$collapsed ? 'none' : 'flex'};
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

const OverdueBadge = styled.span`
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  background: linear-gradient(135deg, #f8312f 0%, #ff6b6b 100%);
  color: #fff;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
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
  display: ${props => props.$collapsed ? 'none' : 'block'};
`;

const TodoMeta = styled.div`
  display: ${props => props.$collapsed ? 'none' : 'flex'};
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

// Collapsed view components
const CollapsedTodoItem = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'overdue'
})`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$priority) {
      case 'urgent': return '#f8312f';
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffb020';
      case 'low': return '#00d26a';
      default: return '#2d3561';
    }
  }};
  border: ${props => props.overdue ? '2px solid #f8312f' : '2px solid transparent'};
  margin: 0.5rem auto;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &::after {
    content: '${props => props.$count}';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
  }

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 8px ${props => {
      switch (props.$priority) {
        case 'urgent': return 'rgba(248, 49, 47, 0.5)';
        case 'high': return 'rgba(255, 107, 107, 0.5)';
        case 'medium': return 'rgba(255, 176, 32, 0.5)';
        case 'low': return 'rgba(0, 210, 106, 0.5)';
        default: return 'rgba(45, 53, 97, 0.5)';
      }
    }};
  }
`;

const SidebarFooter = styled.div`
  padding: ${props => props.$collapsed ? '0.5rem' : '1rem'};
  border-top: 1px solid #2d3561;
  display: ${props => props.$collapsed ? 'none' : 'block'};
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
  padding: ${props => props.$collapsed ? '1rem 0.5rem' : '2rem'};
  text-align: center;
  color: #a0a0a0;
  font-size: ${props => props.$collapsed ? '0.7rem' : '0.9rem'};
  white-space: ${props => props.$collapsed ? 'nowrap' : 'normal'};
  overflow: hidden;
`;

const EmptyState = styled.div`
  padding: ${props => props.$collapsed ? '1rem 0.5rem' : '2rem 1rem'};
  text-align: center;
  color: #a0a0a0;
  font-size: ${props => props.$collapsed ? '0.7rem' : '0.9rem'};
  white-space: ${props => props.$collapsed ? 'nowrap' : 'normal'};
  overflow: hidden;
`;

// Modal components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 32px rgba(233, 69, 96, 0.2);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #1a1a2e;
  }

  &::-webkit-scrollbar-thumb {
    background: #2d3561;
    border-radius: 3px;
  }
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #2d3561;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.3rem;
  color: #eaeaea;
  flex: 1;
  padding-right: 1rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #a0a0a0;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    color: white;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalDescription = styled.p`
  color: #c0c0c0;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
`;

const MetaInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetaLabel = styled.span`
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetaValue = styled.span`
  font-size: 0.95rem;
  color: #eaeaea;
`;

const ResourcesSection = styled.div`
  margin-top: 1.5rem;
`;

const ResourcesTitle = styled.h4`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #7b2cbf;
`;

const ResourceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ResourceItem = styled.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: #e94560;
    transform: translateX(4px);
  }
`;

const ResourceIcon = styled.span`
  font-size: 1.2rem;
`;

const ResourceInfo = styled.div`
  flex: 1;
`;

const ResourceType = styled.div`
  font-size: 0.7rem;
  color: #a0a0a0;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

const ResourceTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #2d3561;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.primary {
    background: #e94560;
    color: white;

    &:hover {
      background: #ff6b6b;
    }
  }

  &.secondary {
    background: #2d3561;
    color: #eaeaea;

    &:hover {
      background: #3d4171;
    }
  }
`;

function TodoSidebar() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('todoSidebarCollapsed');
      // Default to collapsed on mobile screens (≤768px)
      if (window.innerWidth <= 768) {
        return true;
      }
      return saved ? JSON.parse(saved) : false;
    } catch {
      return window.innerWidth <= 768;
    }
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('todoSidebarCollapsed', JSON.stringify(isCollapsed));
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }, [isCollapsed]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/todos');

      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }

      const data = await response.json();

      if (data.success && data.todos) {
        // Sort by urgency and priority, then filter for pending/in-progress
        const sortedTodos = data.todos
          .filter(todo => todo.status === 'pending' || todo.status === 'in_progress')
          .sort((a, b) => {
            const now = new Date();
            const aTime = new Date(a.scheduledAt);
            const bTime = new Date(b.scheduledAt);
            const aOverdue = aTime < now;
            const bOverdue = bTime < now;

            // Priority weight mapping
            const priorityWeight = {
              urgent: 4,
              high: 3,
              medium: 2,
              low: 1
            };

            const aPriorityWeight = priorityWeight[a.priority] || 2;
            const bPriorityWeight = priorityWeight[b.priority] || 2;

            // 1. Overdue todos first
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;

            // 2. Then by priority (urgent first)
            if (aPriorityWeight !== bPriorityWeight) {
              return bPriorityWeight - aPriorityWeight;
            }

            // 3. Finally by scheduled time (earlier first)
            return aTime - bTime;
          })
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
          description: 'You have 3 posts scheduled for today that need approval before posting. Review the content library and approve or reject each post.',
          category: 'review',
          priority: 'high',
          status: 'pending',
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          resources: [
            { type: 'link', url: '/content/approval', description: 'Review Pending Approvals' },
            { type: 'video', url: '#', description: 'Watch Approval Tutorial' }
          ]
        },
        {
          _id: '2',
          title: 'Update ASO keywords',
          description: 'Fix declining "spicy fiction" keyword ranking (dropped from #5 to #7). Update keyword strategy and add new high-opportunity keywords.',
          category: 'configuration',
          priority: 'medium',
          status: 'pending',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          resources: [
            { type: 'link', url: '/settings', description: 'ASO Settings' },
            { type: 'document', url: '#', description: 'Keyword Research Report' }
          ]
        },
        {
          _id: '3',
          title: 'Create 10 Professor Romance story posts',
          description: 'Increase content volume for top-performing category. Professor Romance stories have 3.2x average engagement rate.',
          category: 'posting',
          priority: 'high',
          status: 'in_progress',
          scheduledAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          resources: [
            { type: 'link', url: '/content', description: 'Content Library' },
            { type: 'document', url: '#', description: 'Professor Romance Story Guide' },
            { type: 'video', url: '#', description: 'Content Generation Tutorial' }
          ]
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

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    return date < now;
  };

  const handleTodoClick = (todo) => {
    setSelectedTodo(todo);
  };

  const handleCloseModal = () => {
    setSelectedTodo(null);
  };

  const handleCompleteTodo = async () => {
    if (!selectedTodo) return;

    try {
      const response = await fetch(`/api/todos/${selectedTodo._id || selectedTodo.id}/complete`, {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh todos and close modal
        fetchTodos();
        handleCloseModal();
      }
    } catch (err) {
      console.error('Error completing todo:', err);
    }
  };

  return (
    <Sidebar $collapsed={isCollapsed}>
      <SidebarHeader $collapsed={isCollapsed}>
        <h2><span>Tasks</span></h2>
        <CollapseButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand tasks' : 'Collapse tasks'}
          title={isCollapsed ? 'Show tasks' : 'Hide tasks'}
        >
          {isCollapsed ? '▶' : '◀'}
        </CollapseButton>
      </SidebarHeader>

      {loading ? (
        <LoadingState $collapsed={isCollapsed}>
          {isCollapsed ? '⏳' : '⏳ Loading tasks...'}
        </LoadingState>
      ) : todos.length === 0 ? (
        <EmptyState $collapsed={isCollapsed}>
          {isCollapsed ? '✓' : '✓ No pending tasks'}
        </EmptyState>
      ) : (
        <TodoList>
          {todos.map(todo => {
            const overdue = isOverdue(todo.scheduledAt) && todo.status !== 'completed';
            return (
              <TodoItem
                key={todo._id || todo.id}
                overdue={overdue}
                $collapsed={isCollapsed}
                onClick={() => handleTodoClick(todo)}
              >
                {!isCollapsed ? (
                  <>
                    <TodoHeader $collapsed={isCollapsed}>
                      {overdue ? (
                        <OverdueBadge>⚠️ Overdue</OverdueBadge>
                      ) : (
                        <TodoTime>{formatTime(todo.scheduledAt)}</TodoTime>
                      )}
                      <TodoStatus $status={todo.status}>
                        {todo.status === 'in_progress' ? 'In Progress' : todo.status}
                      </TodoStatus>
                    </TodoHeader>
                    <TodoTitle $collapsed={isCollapsed}>{todo.title}</TodoTitle>
                    <TodoMeta $collapsed={isCollapsed}>
                      <PriorityBadge $priority={todo.priority}>
                        {todo.priority}
                      </PriorityBadge>
                      <CategoryBadge>{todo.category}</CategoryBadge>
                    </TodoMeta>
                  </>
                ) : null}
              </TodoItem>
            );
          })}
        </TodoList>
      )}

      <SidebarFooter $collapsed={isCollapsed}>
        <ViewAllLink href="/todos">View All Tasks →</ViewAllLink>
      </SidebarFooter>

      {/* Todo Detail Modal */}
      {selectedTodo && (
        <ModalOverlay onClick={handleCloseModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedTodo.title}</ModalTitle>
              <CloseButton onClick={handleCloseModal}>×</CloseButton>
            </ModalHeader>

            <ModalBody>
              {selectedTodo.description && (
                <ModalDescription>{selectedTodo.description}</ModalDescription>
              )}

              <MetaInfo>
                <MetaItem>
                  <MetaLabel>Status</MetaLabel>
                  <MetaValue>
                    <TodoStatus $status={selectedTodo.status}>
                      {selectedTodo.status === 'in_progress' ? 'In Progress' : selectedTodo.status}
                    </TodoStatus>
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaLabel>Priority</MetaLabel>
                  <MetaValue>
                    <PriorityBadge $priority={selectedTodo.priority}>
                      {selectedTodo.priority}
                    </PriorityBadge>
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaLabel>Category</MetaLabel>
                  <MetaValue>
                    <CategoryBadge>{selectedTodo.category}</CategoryBadge>
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaLabel>Scheduled</MetaLabel>
                  <MetaValue>{formatTime(selectedTodo.scheduledAt)}</MetaValue>
                </MetaItem>
              </MetaInfo>

              {selectedTodo.resources && selectedTodo.resources.length > 0 && (
                <ResourcesSection>
                  <ResourcesTitle>Associated Resources</ResourcesTitle>
                  <ResourceList>
                    {selectedTodo.resources.map((resource, idx) => {
                      const icon = resource.type === 'link' ? '🔗' :
                                   resource.type === 'document' ? '📄' :
                                   resource.type === 'video' ? '🎥' : '📎';

                      return (
                        <ResourceItem
                          key={idx}
                          href={resource.url}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Allow default link behavior
                          }}
                        >
                          <ResourceIcon>{icon}</ResourceIcon>
                          <ResourceInfo>
                            <ResourceType>{resource.type}</ResourceType>
                            <ResourceTitle>{resource.description}</ResourceTitle>
                          </ResourceInfo>
                        </ResourceItem>
                      );
                    })}
                  </ResourceList>
                </ResourcesSection>
              )}
            </ModalBody>

            <ModalFooter>
              <ModalButton className="secondary" onClick={handleCloseModal}>
                Close
              </ModalButton>
              <ModalButton className="primary" onClick={handleCompleteTodo}>
                ✓ Mark Complete
              </ModalButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </Sidebar>
  );
}

export default TodoSidebar;
