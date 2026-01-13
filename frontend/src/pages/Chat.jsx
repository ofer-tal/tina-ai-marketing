import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  max-height: 800px;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  overflow: hidden;
`;

const ChatHeader = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChatStatus = styled.div`
  font-size: 0.875rem;
  opacity: 0.9;
`;

const ClearButton = styled.button`
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1a1a2e;
  }

  &::-webkit-scrollbar-thumb {
    background: #2d3561;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #e94560;
  }
`;

const MessageWrapper = styled.div`
  display: flex;
  ${props => props.$isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  ${props => props.$isUser ? `
    background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
    color: white;
    border-bottom-right-radius: 4px;
  ` : `
    background: #1a1a2e;
    border: 1px solid #2d3561;
    color: #eaeaea;
    border-bottom-left-radius: 4px;
  `}
  line-height: 1.6;
  word-wrap: break-word;

  strong {
    font-weight: 600;
    color: ${props => props.$isUser ? 'white' : '#e94560'};
  }

  em {
    font-style: italic;
    opacity: 0.9;
  }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  li {
    margin: 0.25rem 0;
  }

  code {
    background: ${props => props.$isUser ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)'};
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 0.9em;
  }
`;

const MessageTime = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-top: 0.5rem;
  text-align: right;
`;

const InputContainer = styled.div`
  padding: 1.5rem;
  background: #1a1a2e;
  border-top: 1px solid #2d3561;
  display: flex;
  gap: 1rem;
  align-items: flex-end;
`;

const MessageInput = styled.textarea`
  flex: 1;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-family: inherit;
  resize: none;
  min-height: 50px;
  max-height: 150px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  &::placeholder {
    color: #a0a0a0;
  }
`;

const SendButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const WelcomeMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #a0a0a0;

  h3 {
    color: #e94560;
    margin-bottom: 1rem;
  }

  p {
    line-height: 1.6;
    margin-bottom: 0.5rem;
  }
`;

const SuggestionChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
  justify-content: center;
`;

const SuggestionChip = styled.button`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 20px;
  color: #eaeaea;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e94560;
    border-color: #e94560;
    transform: translateY(-2px);
  }
`;

const LoadingDots = styled.span`
  display: inline-flex;
  gap: 4px;

  &::after {
    content: '';
    animation: dots 1.5s steps(4, end) infinite;
  }

  @keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
  }
`;

const CreateTodoButton = styled.button`
  padding: 0.4rem 0.8rem;
  background: linear-gradient(135deg, #00d26a 0%, #00a854 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 210, 106, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TodoCreatedBadge = styled.div`
  padding: 0.4rem 0.8rem;
  background: rgba(0, 210, 106, 0.1);
  border: 1px solid #00d26a;
  border-radius: 6px;
  color: #00d26a;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const ProposalCard = styled.div`
  background: rgba(233, 69, 96, 0.1);
  border: 2px solid #e94560;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.75rem;
`;

const ProposalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #e94560;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
`;

const ProposalStatus = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch(props.$status) {
      case 'approved': return 'rgba(0, 210, 106, 0.2)';
      case 'rejected': return 'rgba(248, 49, 47, 0.2)';
      default: return 'rgba(255, 176, 32, 0.2)';
    }
  }};
  color: ${props => {
    switch(props.$status) {
      case 'approved': return '#00d26a';
      case 'rejected': return '#f8312f';
      default: return '#ffb020';
    }
  }};
`;

const ProposalActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`;

const ProposalButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  ${props => props.$variant === 'approve' ? `
    background: linear-gradient(135deg, #00d26a 0%, #00a854 100%);
    color: white;

    &:hover:not(:disabled) {
      box-shadow: 0 3px 8px rgba(0, 210, 106, 0.3);
      transform: translateY(-1px);
    }
  ` : `
    background: rgba(248, 49, 47, 0.1);
    border: 1px solid #f8312f;
    color: #f8312f;

    &:hover:not(:disabled) {
      background: rgba(248, 49, 47, 0.2);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [todosCreated, setTodosCreated] = useState(new Set());
  const [creatingTodo, setCreatingTodo] = useState(null);
  const [proposals, setProposals] = useState({});
  const [processingProposal, setProcessingProposal] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/chat/history');
      const data = await response.json();

      if (data.success && data.conversations.length > 0) {
        // Convert conversations to message format
        const historyMessages = data.conversations
          .slice()
          .reverse()
          .map(conv => ({
            id: conv.id,
            role: 'assistant',
            content: conv.content,
            timestamp: conv.createdAt
          }));

        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setIsConnected(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:4001/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage.content })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          id: data.conversationId || Date.now() + 1,
          role: 'assistant',
          content: data.response.content,
          timestamp: data.response.timestamp,
          proposal: data.response.proposal || null
        };

        setMessages(prev => [...prev, aiMessage]);

        // Store proposal if present
        if (data.response.proposal) {
          setProposals(prev => ({
            ...prev,
            [aiMessage.id]: data.response.proposal
          }));
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ Error: ${error.message}. Please check if the backend server is running.`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all conversation history?')) return;

    try {
      await fetch('http://localhost:4001/api/chat/history', {
        method: 'DELETE'
      });
      setMessages([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const handleSuggestion = (suggestion) => {
    setInputValue(suggestion);
  };

  const handleCreateTodo = async (message) => {
    if (todosCreated.has(message.id) || creatingTodo === message.id) return;

    setCreatingTodo(message.id);

    try {
      // Extract a title from the AI message (first line or first 100 chars)
      const lines = message.content.split('\n').filter(l => l.trim());
      let title = lines[0]?.replace(/[*#•]/g, '').trim() || 'AI Suggestion';
      if (title.length > 100) title = title.substring(0, 100) + '...';

      // Determine category based on content
      let category = 'review';
      const contentLower = message.content.toLowerCase();
      if (contentLower.includes('content') || contentLower.includes('post') || contentLower.includes('video')) {
        category = 'posting';
      } else if (contentLower.includes('budget') || contentLower.includes('ad') || contentLower.includes('campaign')) {
        category = 'analysis';
      } else if (contentLower.includes('aso') || contentLower.includes('keyword') || contentLower.includes('ranking')) {
        category = 'configuration';
      } else if (contentLower.includes('revenue') || contentLower.includes('mrr') || contentLower.includes('growth')) {
        category = 'analysis';
      }

      // Determine priority based on content
      let priority = 'medium';
      if (contentLower.includes('urgent') || contentLower.includes('immediate') || contentLower.includes('pause') || contentLower.includes('critical')) {
        priority = 'high';
      } else if (contentLower.includes('important') || contentLower.includes('priority')) {
        priority = 'high';
      }

      const response = await fetch('http://localhost:4001/api/chat/create-todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          description: message.content.substring(0, 500),
          category: category,
          priority: priority,
          relatedStrategyId: message.id,
          estimatedTime: 30
        })
      });

      const data = await response.json();

      if (data.success) {
        setTodosCreated(prev => new Set([...prev, message.id]));
      } else {
        throw new Error(data.error || 'Failed to create todo');
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      alert('Failed to create todo: ' + error.message);
    } finally {
      setCreatingTodo(null);
    }
  };

  const handleApproveProposal = async (messageId) => {
    const proposal = proposals[messageId];
    if (!proposal || processingProposal === messageId) return;

    setProcessingProposal(messageId);

    try {
      const response = await fetch('http://localhost:4001/api/chat/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposalId: messageId,
          proposal: proposal
        })
      });

      const data = await response.json();

      if (data.success) {
        setProposals(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            status: 'approved',
            approvedAt: new Date().toISOString()
          }
        }));
      } else {
        throw new Error(data.error || 'Failed to approve proposal');
      }
    } catch (error) {
      console.error('Error approving proposal:', error);
      alert('Failed to approve proposal: ' + error.message);
    } finally {
      setProcessingProposal(null);
    }
  };

  const handleRejectProposal = async (messageId) => {
    const proposal = proposals[messageId];
    if (!proposal || processingProposal === messageId) return;

    const reason = prompt('Please provide a reason for rejecting this proposal:');

    if (!reason) return;

    setProcessingProposal(messageId);

    try {
      const response = await fetch('http://localhost:4001/api/chat/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposalId: messageId,
          proposal: proposal,
          reason: reason
        })
      });

      const data = await response.json();

      if (data.success) {
        setProposals(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason
          }
        }));
      } else {
        throw new Error(data.error || 'Failed to reject proposal');
      }
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      alert('Failed to reject proposal: ' + error.message);
    } finally {
      setProcessingProposal(null);
    }
  };

  const formatMessage = (content) => {
    // Convert markdown-like syntax to HTML
    let formatted = content;

    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic text
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Lists
    formatted = formatted.replace(/^\- (.*$)/gm, '<li>$1</li>');
    formatted = formatted.replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>');

    // Line breaks
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <div>
          <ChatTitle>
            <span>🤖</span>
            AI Marketing Executive
          </ChatTitle>
          <ChatStatus>
            {isConnected ? '🟢 Online' : '🔴 Offline'} • GLM4.7 Powered
          </ChatStatus>
        </div>
        <ClearButton onClick={handleClearHistory} disabled={messages.length === 0}>
          Clear History
        </ClearButton>
      </ChatHeader>

      <MessagesContainer>
        {messages.length === 0 ? (
          <WelcomeMessage>
            <h3>Welcome to Your AI Marketing Executive! 👋</h3>
            <p>I'm here to help you grow the Blush app from $425 MRR to $10,000/month.</p>
            <p>I can assist with:</p>
            <p>📊 Analytics & Performance • 💰 Revenue Strategy • 📱 Content Planning</p>
            <p>🔍 ASO Optimization • 📈 Paid Ads • 💡 Growth Strategy</p>
            <SuggestionChips>
              <SuggestionChip onClick={() => handleSuggestion('What\'s our current MRR and revenue status?')}>
                💰 Revenue Status
              </SuggestionChip>
              <SuggestionChip onClick={() => handleSuggestion('How can we improve our content strategy?')}>
                📱 Content Strategy
              </SuggestionChip>
              <SuggestionChip onClick={() => handleSuggestion('What\'s the budget utilization and ad performance?')}>
                📊 Budget & Ads
              </SuggestionChip>
              <SuggestionChip onClick={() => handleSuggestion('How are our ASO keywords performing?')}>
                🔍 ASO Status
              </SuggestionChip>
            </SuggestionChips>
          </WelcomeMessage>
        ) : (
          messages.map((msg) => (
            <MessageWrapper key={msg.id} $isUser={msg.role === 'user'}>
              <MessageBubble $isUser={msg.role === 'user'}>
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                <MessageTime>{formatTime(msg.timestamp)}</MessageTime>
                {msg.role === 'assistant' && (
                  <>
                    {proposals[msg.id] ? (
                      <ProposalCard>
                        <ProposalHeader>
                          <span>💼</span>
                          Budget Change Proposal
                          <ProposalStatus $status={proposals[msg.id].status || 'awaiting_approval'}>
                            {proposals[msg.id].status === 'approved' ? '✓ Approved' :
                             proposals[msg.id].status === 'rejected' ? '✗ Rejected' :
                             '⏳ Awaiting Approval'}
                          </ProposalStatus>
                        </ProposalHeader>
                        {proposals[msg.id].status !== 'approved' && proposals[msg.id].status !== 'rejected' && (
                          <ProposalActions>
                            <ProposalButton
                              $variant="approve"
                              onClick={() => handleApproveProposal(msg.id)}
                              disabled={processingProposal === msg.id}
                            >
                              <span>✓</span>
                              {processingProposal === msg.id ? 'Processing...' : 'Approve'}
                            </ProposalButton>
                            <ProposalButton
                              $variant="reject"
                              onClick={() => handleRejectProposal(msg.id)}
                              disabled={processingProposal === msg.id}
                            >
                              <span>✗</span>
                              {processingProposal === msg.id ? 'Processing...' : 'Reject'}
                            </ProposalButton>
                          </ProposalActions>
                        )}
                        {proposals[msg.id].status === 'rejected' && proposals[msg.id].rejectionReason && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                            Reason: {proposals[msg.id].rejectionReason}
                          </div>
                        )}
                      </ProposalCard>
                    ) : (
                      <>
                        {todosCreated.has(msg.id) ? (
                          <TodoCreatedBadge>
                            <span>✓</span>
                            Todo Created
                          </TodoCreatedBadge>
                        ) : (
                          <CreateTodoButton
                            onClick={() => handleCreateTodo(msg)}
                            disabled={creatingTodo === msg.id}
                          >
                            <span>+</span>
                            {creatingTodo === msg.id ? 'Creating...' : 'Create Todo'}
                          </CreateTodoButton>
                        )}
                      </>
                    )}
                  </>
                )}
              </MessageBubble>
            </MessageWrapper>
          ))
        )}
        {isLoading && (
          <MessageWrapper $isUser={false}>
            <MessageBubble $isUser={false}>
              <LoadingDots>Thinking</LoadingDots>
            </MessageBubble>
          </MessageWrapper>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <MessageInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about your marketing strategy..."
          disabled={isLoading}
        />
        <SendButton onClick={handleSend} disabled={!inputValue.trim() || isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
}

export default Chat;
