import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const PageContainer = styled.div`
  padding: 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const NewTodoButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #e94560;
  border: none;
  border-radius: 8px;
  color: #eaeaea;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #e94560;
  }
`;

const TodoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
`;

const TodoCard = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.2);
    transform: translateY(-2px);
  }
`;

const TodoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 0.75rem;
  gap: 0.75rem;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  min-width: 20px;
  cursor: pointer;
  accent-color: #00d26a;
  margin-top: 2px;

  &:checked {
    accent-color: #00d26a;
  }

  &:hover {
    transform: scale(1.1);
    transition: transform 0.2s;
  }
`;

const TodoTitle = styled.h3.withConfig({
  shouldForwardProp: (prop) => prop !== 'completed'
})`
  font-size: 1.1rem;
  margin: 0;
  color: #eaeaea;
  flex: 1;
  ${props => props.completed && `
    text-decoration: line-through;
    color: #a0a0a0;
  `}
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;

  ${props => {
    switch(props.status) {
      case 'pending':
        return 'background: #ffb020; color: #1a1a2e;';
      case 'in_progress':
        return 'background: #00d4ff; color: #1a1a2e;';
      case 'completed':
        return 'background: #00d26a; color: #1a1a2e;';
      case 'cancelled':
        return 'background: #a0a0a0; color: #1a1a2e;';
      default:
        return 'background: #2d3561; color: #eaeaea;';
    }
  }}
`;

const PriorityBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;

  ${props => {
    switch(props.priority) {
      case 'urgent':
        return 'background: #f8312f; color: #fff;';
      case 'high':
        return 'background: #ff9500; color: #1a1a2e;';
      case 'medium':
        return 'background: #ffb020; color: #1a1a2e;';
      case 'low':
        return 'background: #00d26a; color: #1a1a2e;';
      default:
        return 'background: #2d3561; color: #eaeaea;';
    }
  }}
`;

const CategoryBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
  background: #7b2cbf;
  color: #fff;
`;

const BadgesContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const TodoDescription = styled.p`
  color: #a0a0a0;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TodoMeta = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #a0a0a0;
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: #eaeaea;
`;

const EmptyStateText = styled.p`
  margin: 0;
  color: #a0a0a0;
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  color: #eaeaea;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #eaeaea;
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #e94560;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.9rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #e94560;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.9rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #e94560;
  }

  option {
    background: #1a1a2e;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.primary ? `
    background: #e94560;
    color: #eaeaea;

    &:hover {
      background: #ff6b6b;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
    }
  ` : `
    background: #2d3561;
    color: #eaeaea;

    &:hover {
      background: #3d4561;
    }
  `}
`;

function Todos() {
  const [todos, setTodos] = useState([]);
  const [filteredTodos, setFilteredTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all'
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'review',
    priority: 'medium',
    scheduledAt: ''
  });

  useEffect(() => {
    fetchTodos();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [todos, filters]);

  const fetchTodos = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/todos');
      const data = await response.json();
      if (data.success) {
        setTodos(data.todos);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...todos];

    if (filters.status !== 'all') {
      filtered = filtered.filter(todo => todo.status === filters.status);
    }
    if (filters.category !== 'all') {
      filtered = filtered.filter(todo => todo.category === filters.category);
    }
    if (filters.priority !== 'all') {
      filtered = filtered.filter(todo => todo.priority === filters.priority);
    }

    filtered.sort((a, b) => {
      // Sort by status first (pending first, then in_progress, then completed/cancelled)
      const statusOrder = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };
      const statusCompare = statusOrder[a.status] - statusOrder[b.status];
      if (statusCompare !== 0) return statusCompare;

      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityCompare !== 0) return priorityCompare;

      // Finally by scheduled time
      return new Date(a.scheduledAt) - new Date(b.scheduledAt);
    });

    setFilteredTodos(filtered);
  };

  const handleCreateTodo = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3001/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          createdBy: 'user'
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchTodos();
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          category: 'review',
          priority: 'medium',
          scheduledAt: ''
        });
      }
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  const handleTodoClick = (todo) => {
    setSelectedTodo(todo);
    setShowDetailModal(true);
  };

  const handleToggleComplete = async (todo, e) => {
    e.stopPropagation(); // Prevent opening detail modal

    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';

    try {
      const response = await fetch(`http://localhost:3001/api/todos/${todo._id || todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        await fetchTodos();
      }
    } catch (error) {
      console.error('Error toggling todo completion:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
      if (diffHours < 24) {
        return `Overdue by ${diffHours}h`;
      }
      return `Overdue by ${Math.abs(diffDays)}d`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return <PageContainer><p>Loading todos...</p></PageContainer>;
  }

  return (
    <PageContainer>
      <Header>
        <Title>📋 All Tasks</Title>
        <NewTodoButton onClick={() => setShowCreateModal(true)}>
          + New Todo
        </NewTodoButton>
      </Header>

      <FilterBar>
        <FilterSelect
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </FilterSelect>

        <FilterSelect
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="all">All Categories</option>
          <option value="posting">Posting</option>
          <option value="review">Review</option>
          <option value="configuration">Configuration</option>
          <option value="development">Development</option>
          <option value="analysis">Analysis</option>
        </FilterSelect>

        <FilterSelect
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </FilterSelect>
      </FilterBar>

      {filteredTodos.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>📋</EmptyStateIcon>
          <EmptyStateTitle>No tasks found</EmptyStateTitle>
          <EmptyStateText>
            {todos.length === 0
              ? 'Create your first task to get started!'
              : 'Try adjusting your filters to see more tasks.'}
          </EmptyStateText>
        </EmptyState>
      ) : (
        <TodoGrid>
          {filteredTodos.map(todo => (
            <TodoCard key={todo.id || todo._id} onClick={() => handleTodoClick(todo)}>
              <TodoHeader>
                <Checkbox
                  type="checkbox"
                  checked={todo.status === 'completed'}
                  onChange={(e) => handleToggleComplete(todo, e)}
                  onClick={(e) => e.stopPropagation()}
                />
                <TodoTitle completed={todo.status === 'completed'}>{todo.title}</TodoTitle>
              </TodoHeader>

              <BadgesContainer>
                <StatusBadge status={todo.status}>{todo.status.replace('_', ' ')}</StatusBadge>
                <PriorityBadge priority={todo.priority}>{todo.priority}</PriorityBadge>
                <CategoryBadge>{todo.category}</CategoryBadge>
              </BadgesContainer>

              {todo.description && (
                <TodoDescription>{todo.description}</TodoDescription>
              )}

              <TodoMeta>
                <MetaItem>
                  📅 {formatDate(todo.scheduledAt)}
                </MetaItem>
                {todo.estimatedTime && (
                  <MetaItem>
                    ⏱️ {todo.estimatedTime}m
                  </MetaItem>
                )}
              </TodoMeta>
            </TodoCard>
          ))}
        </TodoGrid>
      )}

      {/* Create Todo Modal */}
      {showCreateModal && (
        <ModalOverlay onClick={() => setShowCreateModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Create New Todo</ModalTitle>

            <form onSubmit={handleCreateTodo}>
              <FormGroup>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter todo title..."
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter todo description..."
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="posting">Posting</option>
                  <option value="review">Review</option>
                  <option value="configuration">Configuration</option>
                  <option value="development">Development</option>
                  <option value="analysis">Analysis</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="scheduledAt">Scheduled For</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </FormGroup>

              <ButtonGroup>
                <Button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" primary>
                  Create Todo
                </Button>
              </ButtonGroup>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Todo Detail Modal */}
      {showDetailModal && selectedTodo && (
        <ModalOverlay onClick={() => setShowDetailModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>{selectedTodo.title}</ModalTitle>

            <BadgesContainer>
              <StatusBadge status={selectedTodo.status}>
                {selectedTodo.status.replace('_', ' ')}
              </StatusBadge>
              <PriorityBadge priority={selectedTodo.priority}>
                {selectedTodo.priority}
              </PriorityBadge>
              <CategoryBadge>{selectedTodo.category}</CategoryBadge>
            </BadgesContainer>

            {selectedTodo.description && (
              <FormGroup>
                <Label>Description</Label>
                <p style={{ color: '#a0a0a0', lineHeight: '1.6' }}>
                  {selectedTodo.description}
                </p>
              </FormGroup>
            )}

            <FormGroup>
              <Label>Details</Label>
              <div style={{ color: '#a0a0a0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div><strong>Status:</strong> {selectedTodo.status.replace('_', ' ')}</div>
                <div><strong>Priority:</strong> {selectedTodo.priority}</div>
                <div><strong>Category:</strong> {selectedTodo.category}</div>
                <div><strong>Scheduled:</strong> {formatDate(selectedTodo.scheduledAt)}</div>
                {selectedTodo.dueAt && (
                  <div><strong>Due:</strong> {new Date(selectedTodo.dueAt).toLocaleString()}</div>
                )}
                {selectedTodo.estimatedTime && (
                  <div><strong>Estimated Time:</strong> {selectedTodo.estimatedTime} minutes</div>
                )}
                {selectedTodo.actualTime && (
                  <div><strong>Actual Time:</strong> {selectedTodo.actualTime} minutes</div>
                )}
                <div><strong>Created By:</strong> {selectedTodo.createdBy}</div>
              </div>
            </FormGroup>

            {selectedTodo.resources && selectedTodo.resources.length > 0 && (
              <FormGroup>
                <Label>Associated Resources</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedTodo.resources.map((resource, index) => (
                    <a
                      key={index}
                      href={resource.url}
                      target={resource.url.startsWith('http') ? '_blank' : undefined}
                      rel={resource.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: '#1a1a2e',
                        border: '1px solid #2d3561',
                        borderRadius: '8px',
                        color: '#eaeaea',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = '#e94560';
                        e.target.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = '#2d3561';
                        e.target.style.transform = 'translateX(0)';
                      }}
                    >
                      <span>
                        {resource.type === 'link' && '🔗'}
                        {resource.type === 'video' && '🎥'}
                        {resource.type === 'document' && '📄'}
                      </span>
                      <span>{resource.description || resource.url}</span>
                    </a>
                  ))}
                </div>
              </FormGroup>
            )}

            <ButtonGroup>
              <Button onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

export default Todos;
