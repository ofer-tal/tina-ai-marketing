import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #a0a0a0;
  font-size: 1.1rem;
`;

const Section = styled.section`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
  color: #eaeaea;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
`;

const DemoButton = styled.button`
  padding: 1rem 1.5rem;
  background: #16213e;
  border: 2px solid #2d3561;
  border-radius: 12px;
  color: #eaeaea;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: #1a2a4a;
    border-color: #e94560;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ButtonIcon = styled.span`
  font-size: 1.5rem;
  margin-right: 0.5rem;
`;

const ButtonLabel = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const ButtonDescription = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  font-weight: 400;
`;

const BackButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 2px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2rem;

  &:hover {
    background: #2d3561;
    border-color: #3d4561;
  }
`;

const CodeBlock = styled.pre`
  background: #0d1221;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.5rem;
  overflow-x: auto;
  margin-top: 1rem;
  font-size: 0.85rem;
  line-height: 1.6;
`;

const CodeComment = styled.span`
  color: #6a9955;
`;

const CodeString = styled.span`
  color: #ce9178;
`;

const CodeKeyword = styled.span`
  color: #569cd6;
`;

const CodeFunction = styled.span`
  color: #dcdcaa;
`;

const ModalDemo = () => {
  const navigate = useNavigate();

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showNavigateModal, setShowNavigateModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDangerousModal, setShowDangerousModal] = useState(false);
  const [hideCancelModal, setHideCancelModal] = useState(false);

  // Handlers
  const handleDelete = () => {
    setShowDeleteModal(false);
    alert('Item deleted! (Demo)');
  };

  const handleSave = () => {
    setShowSaveModal(false);
    alert('Changes saved! (Demo)');
  };

  const handleNavigate = () => {
    setShowNavigateModal(false);
    navigate('/dashboard');
  };

  const handleWarning = () => {
    setShowWarningModal(false);
    alert('Warning acknowledged! (Demo)');
  };

  const handlePublish = () => {
    setShowPublishModal(false);
    alert('Content published! (Demo)');
  };

  const handleDangerous = () => {
    setShowDangerousModal(false);
    alert('Dangerous action executed! (Demo)');
  };

  return (
    <PageContainer>
      <BackButton onClick={() => navigate(-1)}>
        ← Back
      </BackButton>

      <Header>
        <Title>Modal Dialog Demo</Title>
        <Subtitle>Confirmation modal component with various configurations</Subtitle>
      </Header>

      {/* Section 1: Delete Actions */}
      <Section>
        <SectionTitle>🗑️ Delete Actions</SectionTitle>
        <ButtonGrid>
          <DemoButton onClick={() => setShowDeleteModal(true)}>
            <ButtonIcon>🗑️</ButtonIcon>
            <ButtonLabel>Delete Item</ButtonLabel>
            <ButtonDescription>Standard delete confirmation</ButtonDescription>
          </DemoButton>

          <DemoButton onClick={() => setShowDangerousModal(true)}>
            <ButtonIcon>⚠️</ButtonIcon>
            <ButtonLabel>Dangerous Action</ButtonLabel>
            <ButtonDescription>High-risk operation with detail text</ButtonDescription>
          </DemoButton>
        </ButtonGrid>
      </Section>

      {/* Section 2: Save Actions */}
      <Section>
        <SectionTitle>💾 Save Actions</SectionTitle>
        <ButtonGrid>
          <DemoButton onClick={() => setShowSaveModal(true)}>
            <ButtonIcon>💾</ButtonIcon>
            <ButtonLabel>Save Changes</ButtonLabel>
            <ButtonDescription>Confirm before saving</ButtonDescription>
          </DemoButton>

          <DemoButton onClick={() => setShowPublishModal(true)}>
            <ButtonIcon>🚀</ButtonIcon>
            <ButtonLabel>Publish Content</ButtonLabel>
            <ButtonDescription>Publish confirmation</ButtonDescription>
          </DemoButton>
        </ButtonGrid>
      </Section>

      {/* Section 3: Warning Actions */}
      <Section>
        <SectionTitle>⚠️ Warning Actions</SectionTitle>
        <ButtonGrid>
          <DemoButton onClick={() => setShowWarningModal(true)}>
            <ButtonIcon>⚠️</ButtonIcon>
            <ButtonLabel>Unsaved Changes</ButtonLabel>
            <ButtonDescription>Warning variant modal</ButtonDescription>
          </DemoButton>
        </ButtonGrid>
      </Section>

      {/* Section 4: Navigation */}
      <Section>
        <SectionTitle>🧭 Navigation Actions</SectionTitle>
        <ButtonGrid>
          <DemoButton onClick={() => setShowNavigateModal(true)}>
            <ButtonIcon>🔀</ButtonIcon>
            <ButtonLabel>Navigate Away</ButtonLabel>
            <ButtonDescription>Confirm before leaving page</ButtonDescription>
          </DemoButton>
        </ButtonGrid>
      </Section>

      {/* Section 5: Special Configurations */}
      <Section>
        <SectionTitle>⚙️ Special Configurations</SectionTitle>
        <ButtonGrid>
          <DemoButton onClick={() => setHideCancelModal(true)}>
            <ButtonIcon>✅</ButtonIcon>
            <ButtonLabel>No Cancel Button</ButtonLabel>
            <ButtonDescription>Hide cancel, only confirm</ButtonDescription>
          </DemoButton>
        </ButtonGrid>
      </Section>

      {/* Section 6: Usage Example */}
      <Section>
        <SectionTitle>📝 Usage Example</SectionTitle>
        <CodeBlock>
{`<CodeKeyword>import</CodeFunction> ConfirmationModal <CodeKeyword>from</CodeFunction> <CodeString>'./components/ConfirmationModal'</CodeString>;

<CodeKeyword>function</CodeFunction> <CodeFunction>MyComponent</CodeFunction>() {
  <CodeKeyword>const</CodeFunction> [showModal, setShowModal] = useState(<CodeKeyword>false</CodeKeyword>);

  <CodeKeyword>return</CodeFunction> (
    <>
      <CodeComment>// Your content here</CodeComment>
      <button onClick={() => setShowModal(<CodeKeyword>true</CodeKeyword>)}>
        Delete Item
      </button>

      <CodeComment>// Confirmation modal</CodeComment>
      <ConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(<CodeKeyword>false</CodeKeyword>)}
        onConfirm={() => {
          <CodeComment>// Handle delete action</CodeComment>
          setShowModal(<CodeKeyword>false</CodeKeyword>);
        }}
        title=<CodeString>"Delete this item?"</CodeString>
        message=<CodeString>"This action cannot be undone."</CodeString>
        detail=<CodeString>"Item: Example Item Name"</CodeString>
        icon=<CodeString>"🗑️"</CodeString>
        confirmText=<CodeString>"Delete"</CodeString>
        variant=<CodeString>"danger"</CodeString>
      />
    </>
  );
}`}
        </CodeBlock>
      </Section>

      {/* ===== MODALS ===== */}

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete this item?"
        message="This action cannot be undone. The item will be permanently removed."
        detail="Item: Example Item #12345"
        icon="🗑️"
        confirmText="Delete"
        variant="danger"
      />

      {/* Dangerous Action Modal */}
      <ConfirmationModal
        isOpen={showDangerousModal}
        onClose={() => setShowDangerousModal(false)}
        onConfirm={handleDangerous}
        title="Dangerous Action"
        message="You are about to perform a critical operation that affects multiple users."
        detail="This will delete all data for 50 users and cannot be undone!"
        icon="⚠️"
        confirmText="I understand, proceed"
        variant="danger"
      />

      {/* Save Changes Modal */}
      <ConfirmationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onConfirm={handleSave}
        title="Save changes?"
        message="You have unsaved changes. Would you like to save them now?"
        icon="💾"
        confirmText="Save Changes"
        variant="default"
      />

      {/* Publish Modal */}
      <ConfirmationModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={handlePublish}
        title="Publish content?"
        message="This will make the content live for all users to see."
        detail='Content: "Summer Romance Collection" (5 stories)'
        icon="🚀"
        confirmText="Publish Now"
        variant="default"
      />

      {/* Unsaved Changes Warning Modal */}
      <ConfirmationModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onConfirm={handleWarning}
        title="You have unsaved changes"
        message="If you leave this page, your changes will be lost."
        icon="⚠️"
        confirmText="Leave Anyway"
        variant="warning"
      />

      {/* Navigate Away Modal */}
      <ConfirmationModal
        isOpen={showNavigateModal}
        onClose={() => setShowNavigateModal(false)}
        onConfirm={handleNavigate}
        title="Navigate away?"
        message="You're viewing a page with unsaved changes. Are you sure you want to leave?"
        detail="Changes will be lost if you navigate away."
        icon="🔀"
        confirmText="Leave Page"
        variant="warning"
      />

      {/* No Cancel Button Modal */}
      <ConfirmationModal
        isOpen={hideCancelModal}
        onClose={() => setHideCancelModal(false)}
        onConfirm={() => {
          setHideCancelModal(false);
          alert('Acknowledged!');
        }}
        title="Important Notice"
        message="This is a critical update that requires your attention."
        icon="ℹ️"
        confirmText="I Understand"
        hideCancel={true}
      />
    </PageContainer>
  );
};

export default ModalDemo;
