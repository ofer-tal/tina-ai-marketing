import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { marked } from 'marked';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
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
  ${props => !props.$isUser ? 'position: relative;' : ''}
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
  max-width: 90%;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  ${props => props.$isUser ? `
    background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
    color: white;
    border-bottom-right-radius: 4px;
  ` : props.$isLoading ? `
    background: rgba(233, 69, 96, 0.1);
    border: 2px dashed #e94560;
    color: #eaeaea;
    border-bottom-left-radius: 4px;
    animation: pulse-border 2s ease-in-out infinite;
  ` : `
    background: #1a1a2e;
    border: 1px solid #2d3561;
    color: #eaeaea;
    border-bottom-left-radius: 4px;
  `}
  line-height: 1.6;
  word-wrap: break-word;

  ${props => props.$isLoading && `
    @keyframes pulse-border {
      0%, 100% { border-color: rgba(233, 69, 96, 0.3); }
      50% { border-color: #e94560; }
    }
  `}

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

  /* Markdown Headers */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: ${props => props.$isUser ? 'white' : '#e94560'};
  }

  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.1rem; }

  /* Markdown Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    font-size: 0.9rem;
  }

  th, td {
    border: 1px solid ${props => props.$isUser ? 'rgba(255,255,255,0.2)' : '#2d3561'};
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  th {
    background: ${props => props.$isUser ? 'rgba(255,255,255,0.1)' : 'rgba(233, 69, 96, 0.2)'};
    font-weight: 600;
    color: ${props => props.$isUser ? 'white' : '#e94560'};
  }

  tr:nth-child(even) {
    background: ${props => props.$isUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'};
  }

  /* Markdown blockquotes */
  blockquote {
    border-left: 3px solid #e94560;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #a0a0a0;
    font-style: italic;
  }

  /* Markdown horizontal rule */
  hr {
    border: none;
    border-top: 1px solid ${props => props.$isUser ? 'rgba(255,255,255,0.2)' : '#2d3561'};
    margin: 1rem 0;
  }

  /* Preformatted code blocks */
  pre {
    background: ${props => props.$isUser ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.4)'};
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1rem 0;
  }

  pre code {
    background: none;
    padding: 0;
  }
`;

const MessageTime = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin-top: 0.5rem;
  text-align: right;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 4px;
  color: #e94560;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: all 0.2s;
  z-index: 10;

  ${MessageWrapper}:hover & {
    opacity: 1;
  }

  &:hover {
    background: rgba(233, 69, 96, 0.2);
    border-color: rgba(233, 69, 96, 0.5);
  }

  &:active {
    transform: scale(0.95);
  }

  &.copied {
    background: rgba(0, 210, 106, 0.2);
    border-color: #00d26a;
    color: #00d26a;
    opacity: 1;
  }
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

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
`;

const ChatLoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid rgba(233, 69, 96, 0.2);
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  font-weight: 600;
  color: #e94560;
  font-size: 0.95rem;
`;

const LoadingSubText = styled.div`
  font-size: 0.8rem;
  color: #a0a0a0;
  font-style: italic;
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

const SearchButton = styled.button`
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const ChatCloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  transition: background 0.2s;
  line-height: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const SearchModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const SearchModalContent = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SearchModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #2d3561;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SearchModalTitle = styled.h3`
  margin: 0;
  color: #eaeaea;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #a0a0a0;
  cursor: pointer;
  font-size: 1.5rem;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #eaeaea;
  }
`;

const SearchModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;

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

const SearchInput = styled.input`
  width: 100%;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-family: inherit;
  margin-bottom: 1rem;
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

const SearchResults = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SearchResultItem = styled.div`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
    background: rgba(233, 69, 96, 0.05);
    transform: translateX(4px);
  }
`;

const SearchResultTitle = styled.div`
  font-weight: 600;
  color: #e94560;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SearchResultHighlight = styled.div`
  color: #a0a0a0;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.5rem;

  mark {
    background: rgba(233, 69, 96, 0.3);
    color: #eaeaea;
    padding: 0.1rem 0.2rem;
    border-radius: 2px;
  }
`;

const SearchResultMeta = styled.div`
  font-size: 0.75rem;
  color: #7b2cbf;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NoResults = styled.div`
  text-align: center;
  color: #a0a0a0;
  padding: 2rem;
`;

const LegacyLoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: #e94560;
`;

// Tool Proposal Card Components
const ToolProposalCard = styled.div`
  background: rgba(233, 69, 96, 0.1);
  border: 2px solid #e94560;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.75rem;
`;

const ToolProposalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;

  > span:first-child {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #e94560;
    flex: 1;
  }
`;

const ToolProposalTitle = styled.div`
  font-weight: 600;
  color: #e94560;
  margin-bottom: 0.5rem;
`;

const ToolProposalDetails = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
  margin-bottom: 0.5rem;
  line-height: 1.5;

  strong {
    color: #e94560;
  }
`;

const ToolProposalReasoning = styled.div`
  font-size: 0.875rem;
  color: #b0b0b0;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-style: italic;
  line-height: 1.4;

  strong {
    color: #e94560;
    font-style: normal;
  }
`;

const ToolProposalParams = styled.div`
  font-size: 0.875rem;
  color: #eaeaea;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;

  strong {
    color: #e94560;
  }
`;

const ParamsList = styled.ul`
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  list-style-type: disc;
`;

const ParamsItem = styled.li`
  margin: 0.25rem 0;
  line-height: 1.4;
`;

const ParamName = styled.code`
  color: #7dd3fc;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8rem;
`;

const ParamValue = styled.span`
  color: #eaeaea;
`;

const ToolProposalActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`;

const ToolProposalButton = styled.button`
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

  ${props => {
    switch (props.$variant) {
      case 'approve':
        return `
          background: linear-gradient(135deg, #00d26a 0%, #00a854 100%);
          color: white;

          &:hover:not(:disabled) {
            box-shadow: 0 3px 8px rgba(0, 210, 106, 0.3);
            transform: translateY(-1px);
          }
        `;
      case 'reject':
        return `
          background: rgba(248, 49, 47, 0.1);
          border: 1px solid #f8312f;
          color: #f8312f;

          &:hover:not(:disabled) {
            background: rgba(248, 49, 47, 0.2);
          }
        `;
      case 'discuss':
        return `
          background: rgba(123, 44, 191, 0.1);
          border: 1px solid #7b2cbf;
          color: #b388ff;

          &:hover:not(:disabled) {
            background: rgba(123, 44, 191, 0.2);
          }
        `;
      default:
        return '';
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const ToolProposalStatus = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'executed':
        return 'rgba(0, 210, 106, 0.2)';
      case 'rejected':
        return 'rgba(248, 49, 47, 0.2)';
      default:
        return 'rgba(255, 176, 32, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'executed':
        return '#00d26a';
      case 'rejected':
        return '#f8312f';
      default:
        return '#ffb020';
    }
  }};
`;

function Chat({ onClose }) {
  // Load messages from localStorage on mount
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('tina_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [todosCreated, setTodosCreated] = useState(new Set());
  const [creatingTodo, setCreatingTodo] = useState(null);
  const [proposals, setProposals] = useState({});
  const [toolProposals, setToolProposals] = useState({});
  const [processingProposal, setProcessingProposal] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Load pending proposals from backend on mount
  useEffect(() => {
    const loadPendingProposals = async () => {
      try {
        const response = await fetch('/api/chat/proposals/pending');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.proposals) {
            console.log('[Chat] Loaded pending proposals:', data.proposals);
            // Map proposals to state format
            const proposalsMap = {};
            data.proposals.forEach((proposal, index) => {
              const key = `pending_${proposal._id || index}`;
              proposalsMap[key] = {
                key,
                id: proposal._id,
                toolName: proposal.toolName,
                parameters: proposal.toolParameters,
                reasoning: proposal.reasoning,
                status: proposal.status,
                requiresApproval: proposal.requiresApproval,
                // Build actionDisplay from tool data
                actionDisplay: {
                  description: getToolDescription(proposal.toolName, proposal.toolParameters),
                  exampleImpact: proposal.expectedImpact || 'This action should help improve our marketing performance.'
                },
                // Link to the latest AI message (we'll use the latest assistant message)
                messageId: 'pending'
              };
            });
            setToolProposals(proposalsMap);
          }
        }
      } catch (error) {
        console.log('[Chat] No pending proposals to load or error loading them:', error.message);
      }
    };

    loadPendingProposals();
  }, []);
  const searchTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('tina_messages', JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save messages to localStorage:', error);
    }
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/chat/history');
      const data = await response.json();

      if (data.success && data.conversations.length > 0) {
        // Convert conversations to message format
        const historyMessages = [];

        data.conversations.forEach(conv => {
          // If the conversation has a messages array, expand it
          if (conv.messages && conv.messages.length > 0) {
            conv.messages.forEach(msg => {
              historyMessages.push({
                id: `${conv.id}_${msg.role}_${msg.timestamp}`,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
              });
            });
          } else {
            // Fallback: use the content field directly (AI response only)
            historyMessages.push({
              id: conv.id,
              role: 'assistant',
              content: conv.content,
              timestamp: conv.createdAt
            });
          }
        });

        // Sort all messages by timestamp to ensure correct chronological order
        historyMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        setMessages(historyMessages);
      } else {
        // No history - load daily briefing
        loadDailyBriefing();
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setIsConnected(false);
      // On error, try to load daily briefing
      loadDailyBriefing();
    }
  };

  const loadDailyBriefing = async () => {
    try {
      const response = await fetch('/api/chat/daily-briefing');
      const data = await response.json();

      if (data.success && data.briefing) {
        const b = data.briefing;
        let briefingContent = `**☀️ Good Morning! ${b.dayOfWeek} Daily Briefing**

---

**📊 Yesterday's Performance:**
- Posts: ${b.yesterday.posts}
- Views: ${b.yesterday.views.toLocaleString()}
- Avg Engagement: ${b.yesterday.avgEngagement}%

---

**💰 Today's Metrics:**
- MRR: $${b.todayMetrics.mrr}
- Subscribers: ${b.todayMetrics.subscribers}
- Budget Utilization: ${b.todayMetrics.budgetUtilization}%

---

**🎯 Today's Priorities:**
${b.priorities.map(p => `- **${p.title}** (${p.priority}): ${p.description}`).join('\n')}`;

        if (b.alerts && b.alerts.length > 0) {
          briefingContent += `

---

**⚠️ Alerts Needing Attention:**
${b.alerts.map(a => `- **${a.title}**: ${a.message}`).join('\n')}`;
        }

        if (b.weeklySummary) {
          briefingContent += `

---

**📈 Weekly Summary (Last Week):**
- Total Views: ${b.weeklySummary.totalViews.toLocaleString()}
- Avg Engagement: ${b.weeklySummary.avgEngagement}%
- Top Category: ${b.weeklySummary.topCategory[0]} (${b.weeklySummary.topCategory[1].toLocaleString()} views)`;
        }

        briefingContent += `

---

What would you like to focus on today?`;

        const briefingMessage = {
          id: 'daily-briefing',
          role: 'assistant',
          content: briefingContent,
          timestamp: b.date
        };

        setMessages([briefingMessage]);
      }
    } catch (error) {
      console.error('Error loading daily briefing:', error);
      // Fallback to welcome message if briefing fails
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Good morning! I'm your AI Marketing Executive. I'm here to help you grow the Blush app. What would you like to work on today?`,
        timestamp: new Date().toISOString()
      }]);
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
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: currentConversationId
        })
      });

      console.log('[Chat] Sent message:', {
        message: userMessage.content.substring(0, 50),
        conversationId: currentConversationId
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          id: data.conversationId || Date.now() + 1,
          role: 'assistant',
          content: data.response.content,
          timestamp: data.response.timestamp,
          proposal: data.response.proposal || null,
          toolProposal: data.response.toolProposal || null,
          toolProposals: data.response.toolProposals || null  // NEW: Array of proposals
        };

        setMessages(prev => [...prev, aiMessage]);

        // Store conversation ID for multi-turn conversations
        if (data.conversationId && !currentConversationId) {
          setCurrentConversationId(data.conversationId);
        }

        // Store proposal if present (legacy budget proposals)
        if (data.response.proposal) {
          setProposals(prev => ({
            ...prev,
            [aiMessage.id]: data.response.proposal
          }));
        }

        // Store tool proposal if present (new tool use system)
        // Handle both single object (legacy) and array (new)
        if (data.response.toolProposals && Array.isArray(data.response.toolProposals)) {
          // NEW: Multiple proposals - store each with a unique key
          const proposalsMap = {};
          data.response.toolProposals.forEach((proposal, index) => {
            const proposalKey = `${aiMessage.id}_proposal_${index}`;
            proposalsMap[proposalKey] = {
              ...proposal,
              index,
              messageId: aiMessage.id,
              status: proposal.status || 'pending_approval'  // Ensure status field exists
            };
          });
          console.log('[Chat] Storing tool proposals:', {
            aiMessageId: aiMessage.id,
            proposalsCount: data.response.toolProposals.length,
            proposalsMap
          });
          setToolProposals(prev => ({
            ...prev,
            ...proposalsMap
          }));
        } else if (data.response.toolProposal) {
          // Legacy: Single proposal
          setToolProposals(prev => ({
            ...prev,
            [aiMessage.id]: data.response.toolProposal
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
      await fetch('/api/chat/history', {
        method: 'DELETE'
      });
      setMessages([]);
      setCurrentConversationId(null); // Reset conversation ID
      localStorage.removeItem('tina_messages'); // Clear localStorage
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

      const response = await fetch('/api/chat/create-todo', {
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
      const response = await fetch('/api/chat/approve', {
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
      const response = await fetch('/api/chat/reject', {
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

  // ============================================================================
  // TOOL PROPOSAL HANDLERS
  // ============================================================================

  const handleApproveTool = async (messageId) => {
    const toolProposal = toolProposals[messageId];
    if (!toolProposal || processingProposal === messageId) return;

    setProcessingProposal(messageId);

    try {
      const response = await fetch('/api/chat/tools/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposalId: toolProposal.id
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update tool proposal status using the proposal key (messageId parameter is actually the proposal key)
        setToolProposals(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            status: 'executed',
            executedAt: new Date().toISOString(),
            result: data.result
          }
        }));

        // Note: The proposal is keyed by proposalKey (e.g., "123_proposal_0")
        // and contains a `messageId` property pointing to the original message
        // The cleanup isn't needed since proposals are filtered by messageId when rendering

        // Add a confirmation message
        setMessages(prev => [...prev, {
          id: `tool_result_${toolProposal.id}`,
          role: 'assistant',
          content: `✅ Done! ${data.result.message || `Tool "${data.toolName}" executed successfully`}`,
          timestamp: new Date().toISOString()
        }]);
      } else {
        throw new Error(data.error || 'Failed to execute tool');
      }
    } catch (error) {
      console.error('Error approving tool:', error);
      alert('Failed to execute tool: ' + error.message);

      // Add error message
      setMessages(prev => [...prev, {
        id: `tool_error_${toolProposal.id}`,
        role: 'assistant',
        content: `❌ Error executing tool: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setProcessingProposal(null);
    }
  };

  const handleRejectTool = async (messageId) => {
    const toolProposal = toolProposals[messageId];
    if (!toolProposal || processingProposal === messageId) return;

    const reason = prompt('Please provide a reason for rejecting this action:');

    if (!reason) return;

    setProcessingProposal(messageId);

    try {
      const response = await fetch('/api/chat/tools/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposalId: toolProposal.id,
          reason: reason
        })
      });

      const data = await response.json();

      if (data.success) {
        setToolProposals(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason
          }
        }));

        // Add notification message
        setMessages(prev => [...prev, {
          id: `tool_rejected_${toolProposal.id}`,
          role: 'assistant',
          content: `Got it. I won't execute that action. Let me know if you'd like to discuss alternatives.`,
          timestamp: new Date().toISOString()
        }]);
      } else {
        throw new Error(data.error || 'Failed to reject tool proposal');
      }
    } catch (error) {
      console.error('Error rejecting tool:', error);
      alert('Failed to reject tool: ' + error.message);
    } finally {
      setProcessingProposal(null);
    }
  };

  const handleDiscussTool = (messageId, toolProposal) => {
    // Pre-fill input with a discussion starter
    const toolName = formatToolName(toolProposal.toolName);
    setInputValue(`Before we do that, I have some questions about ${toolName}...`);
  };

  const handleCopyMessage = async (messageId, content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);

      // Reset the "copied" state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (err) {
        console.error('Fallback copy also failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const formatToolName = (toolName) => {
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatParamValue = (value) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getToolDescription = (toolName, parameters = {}) => {
    const descriptions = {
      create_strategy: parameters.name
        ? `Create strategy: ${parameters.name}`
        : 'Create a new marketing strategy',
      update_strategy: parameters.strategyId
        ? `Update strategy ${parameters.strategyId}`
        : 'Update strategy status',
      complete_strategy: 'Complete strategy with outcomes',
      pause_strategy: 'Pause active strategy',
      resume_strategy: 'Resume paused strategy',
      create_content_experiment: parameters.name
        ? `Create experiment: ${parameters.name}`
        : 'Create A/B test experiment',
      get_strategies: 'Get marketing strategies',
      get_strategy_details: 'Get strategy details',
      get_strategy_history: 'Get strategy history'
    };

    return descriptions[toolName] || formatToolName(toolName);
  };

  const formatMessage = (content) => {
    // Use marked for proper markdown rendering
    return marked.parse(content);
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

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/chat/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results || []);
      } else {
        console.error('Search failed:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching chat history:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadConversation = (conversation) => {
    // Convert conversation messages to message format, sorted by timestamp
    const historyMessages = [];

    if (conversation.messages && conversation.messages.length > 0) {
      // Sort messages by timestamp to ensure correct order
      const sortedMessages = [...conversation.messages].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      sortedMessages.forEach(msg => {
        historyMessages.push({
          id: `${conversation.id}_${msg.role}_${msg.timestamp}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        });
      });
    } else {
      // Fallback: use content field
      historyMessages.push({
        id: conversation.id,
        role: 'assistant',
        content: conversation.highlight || conversation.content,
        timestamp: conversation.createdAt
      });
    }

    setMessages(historyMessages);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <div>
          <ChatTitle>Tina</ChatTitle>
          <ChatStatus>
            {isConnected ? '🟢 Online' : '🔴 Offline'} • GLM4.7 Powered • Relentless & Data-Driven
          </ChatStatus>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <SearchButton onClick={() => setShowSearch(true)}>
            <span>🔍</span>
            Search
          </SearchButton>
          <ClearButton onClick={handleClearHistory} disabled={messages.length === 0}>
            Clear History
          </ClearButton>
          {onClose && (
            <ChatCloseButton onClick={onClose} title="Close panel">
              ×
            </ChatCloseButton>
          )}
        </div>
      </ChatHeader>

      <MessagesContainer>
        {messages.length === 0 ? (
          <WelcomeMessage>
            <h3>Hi, I'm Tina 👩‍💼</h3>
            <p>I'm your veteran AI Marketing Executive with 15+ years launching apps from unknown to successful using guerrilla marketing.</p>
            <p>I'm direct, relentless about results, and I'll tell you honestly what's working and what's not.</p>
            <p><strong>My expertise:</strong></p>
            <p>📱 Viral Content • 💰 Guerrilla Marketing • 📈 Organic Growth • 🔍 ASO • 💡 Community Building</p>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#e94560' }}>
              <em>"Organic content outperforms paid ads 10:1 when done right. Let's build what works."</em>
            </p>
            <SuggestionChips>
              <SuggestionChip onClick={() => handleSuggestion('What\'s your honest assessment of our current marketing?')}>
                🔍 Assessment
              </SuggestionChip>
              <SuggestionChip onClick={() => handleSuggestion('What should we focus on this week to grow MRR?')}>
                🎯 This Week's Focus
              </SuggestionChip>
              <SuggestionChip onClick={() => handleSuggestion('How can we improve our content strategy?')}>
                📱 Content Strategy
              </SuggestionChip>
              <SuggestionChip onClick={() => handleSuggestion('What\'s working and what\'s wasting money?')}>
                💰 ROI Analysis
              </SuggestionChip>
            </SuggestionChips>
          </WelcomeMessage>
        ) : (
          messages.map((msg) => {
            // Get all proposals for this message (both direct match and those with messageId)
            // Use a Map to deduplicate by proposal ID in case the filter matches the same proposal multiple ways
            const proposalsMap = new Map();
            Object.entries(toolProposals).forEach(([key, p]) => {
              const matches = key === msg.id || p.messageId === msg.id || p.originalMessageId === msg.id;
              if (matches) {
                // Use the proposal's _id (or key if _id doesn't exist) as unique identifier
                const uniqueKey = p._id || p.key || key;
                if (!proposalsMap.has(uniqueKey)) {
                  proposalsMap.set(uniqueKey, { key, ...p });
                }
              }
            });

            const msgProposals = Array.from(proposalsMap.values());

            if (msgProposals.length > 0) {
              console.log('[Chat] Found proposals for message:', { msgId: msg.id, count: msgProposals.length, proposals: msgProposals.map(p => ({ key: p.key, toolName: p.toolName, requiresApproval: p.requiresApproval, status: p.status })) });
            }

            const hasProposals = msgProposals.length > 0;
            const hasLegacyProposal = proposals[msg.id] && !hasProposals;

            return (
              <MessageWrapper key={msg.id} $isUser={msg.role === 'user'}>
                {msg.role === 'assistant' ? (
                  <>
                    <CopyButton
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className={copiedMessageId === msg.id ? 'copied' : ''}
                      title="Copy to clipboard"
                    >
                      <span>{copiedMessageId === msg.id ? '✓' : '📋'}</span>
                    </CopyButton>
                    <MessageBubble>
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                      <MessageTime>{formatTime(msg.timestamp)}</MessageTime>
                      <>
                      {/* Tool Proposals - Render all proposals for this message */}
                      {hasProposals && msgProposals.map((proposal) => (
                        <ToolProposalCard key={proposal._id || `${proposal.key}-${proposal.toolName}`}>
                          <ToolProposalHeader>
                            <span>
                              <span>🔧</span>
                              <span>
                                <strong>Tina wants to:</strong> {formatToolName(proposal.toolName)}
                              </span>
                            </span>
                            <ToolProposalStatus $status={proposal.status || 'pending'}>
                              {proposal.status === 'executed' ? '✓ Executed' :
                               proposal.status === 'rejected' ? '✗ Rejected' :
                               '⏳ Awaiting Approval'}
                            </ToolProposalStatus>
                          </ToolProposalHeader>

                          {/* Action Description */}
                          {proposal.actionDisplay?.description && (
                            <ToolProposalDetails>
                              <strong>What:</strong> {proposal.actionDisplay.description}
                            </ToolProposalDetails>
                          )}

                          {/* Expected Impact */}
                          {proposal.actionDisplay?.exampleImpact && (
                            <ToolProposalDetails>
                              <strong>Expected Impact:</strong> {proposal.actionDisplay.exampleImpact}
                            </ToolProposalDetails>
                          )}

                          {/* Reasoning */}
                          {proposal.reasoning && (
                            <ToolProposalReasoning>
                              <strong>Why:</strong> {proposal.reasoning}
                            </ToolProposalReasoning>
                          )}

                          {/* Parameters (formatted nicely) */}
                          {proposal.parameters && Object.keys(proposal.parameters).length > 0 && (
                            <ToolProposalParams>
                              <strong>Details:</strong>
                              <ParamsList>
                                {Object.entries(proposal.parameters).map(([key, value]) => (
                                  <ParamsItem key={key}>
                                    <ParamName>{key}:</ParamName>{' '}
                                    <ParamValue>{formatParamValue(value)}</ParamValue>
                                  </ParamsItem>
                                ))}
                              </ParamsList>
                            </ToolProposalParams>
                          )}

                          {/* Action Buttons */}
                          {proposal.status !== 'executed' && proposal.status !== 'rejected' && proposal.requiresApproval && (
                            <ToolProposalActions>
                              <ToolProposalButton
                                $variant="approve"
                                onClick={() => handleApproveTool(proposal.key)}
                                disabled={processingProposal === proposal.key}
                              >
                                <span>✓</span>
                                {processingProposal === proposal.key ? 'Executing...' : 'Approve'}
                              </ToolProposalButton>
                              <ToolProposalButton
                                $variant="reject"
                                onClick={() => handleRejectTool(proposal.key)}
                                disabled={processingProposal === proposal.key}
                              >
                                <span>✗</span>
                                {processingProposal === proposal.key ? 'Processing...' : 'Reject'}
                              </ToolProposalButton>
                              <ToolProposalButton
                                $variant="discuss"
                                onClick={() => handleDiscussTool(proposal.key, proposal)}
                                disabled={processingProposal === proposal.key}
                              >
                                <span>💬</span>
                                Discuss First
                              </ToolProposalButton>
                            </ToolProposalActions>
                          )}
                          {proposal.status === 'rejected' && proposal.rejectionReason && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#a0a0a0' }}>
                              Reason: {proposal.rejectionReason}
                            </div>
                          )}
                          {proposal.status === 'executed' && proposal.result && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#00d26a' }}>
                              ✓ {proposal.result.message || 'Action completed successfully'}
                            </div>
                          )}
                        </ToolProposalCard>
                      ))}

                      {/* Legacy Budget Proposals */}
                      {hasLegacyProposal && (
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
                    )}

                    {/* Todo Button (Only if no proposals) */}
                    {!hasProposals && !hasLegacyProposal && (
                      todosCreated.has(msg.id) ? (
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
                      )
                    )}
                  </>
                </MessageBubble>
                  </>
                ) : (
              <MessageBubble $isUser={true}>
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                <MessageTime>{formatTime(msg.timestamp)}</MessageTime>
              </MessageBubble>
            )}
            </MessageWrapper>
            );
          })
        )}
        {isLoading && (
          <MessageWrapper $isUser={false}>
            <MessageBubble $isUser={false} $isLoading={true}>
              <LoadingState>
                <ChatLoadingSpinner />
                <LoadingText>Tina is working</LoadingText>
                <LoadingSubText>Analyzing data and formulating response...</LoadingSubText>
              </LoadingState>
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

      {showSearch && (
        <SearchModal>
          <SearchModalContent>
            <SearchModalHeader>
              <SearchModalTitle>
                <span>🔍</span>
                Search Chat History
              </SearchModalTitle>
              <CloseButton onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                ×
              </CloseButton>
            </SearchModalHeader>
            <SearchModalBody>
              <SearchInput
                type="text"
                placeholder="Search for keywords, topics, or questions..."
                value={searchQuery}
                onChange={(e) => {
                  const query = e.target.value;
                  setSearchQuery(query);

                  // Clear existing timeout
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                  }

                  // Debounce search
                  searchTimeoutRef.current = setTimeout(() => {
                    handleSearch(query);
                  }, 300);
                }}
                autoFocus
              />
              {isSearching ? (
                <LoadingSpinner>
                  <LoadingDots>Searching</LoadingDots>
                </LoadingSpinner>
              ) : searchQuery && searchResults.length === 0 ? (
                <NoResults>
                  No results found for "{searchQuery}"
                </NoResults>
              ) : searchQuery && searchResults.length > 0 ? (
                <SearchResults>
                  <div style={{ color: '#a0a0a0', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                  {searchResults.map((result) => (
                    <SearchResultItem
                      key={result.id}
                      onClick={() => loadConversation(result)}
                    >
                      <SearchResultTitle>
                        <span>💬</span>
                        {result.title}
                      </SearchResultTitle>
                      <SearchResultHighlight
                        dangerouslySetInnerHTML={{
                          __html: highlightText(result.highlight, searchQuery)
                        }}
                      />
                      <SearchResultMeta>
                        <span>📅</span>
                        {formatTime(result.createdAt)}
                      </SearchResultMeta>
                    </SearchResultItem>
                  ))}
                </SearchResults>
              ) : null}
            </SearchModalBody>
          </SearchModalContent>
        </SearchModal>
      )}
    </ChatContainer>
  );
}

export default Chat;
