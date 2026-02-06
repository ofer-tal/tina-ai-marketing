import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  margin: 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PageDescription = styled.p`
  color: #a0a0a0;
  margin: 0.5rem 0 0 0;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: #e94560;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff6b6b;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled(Button)`
  background: #2d3561;

  &:hover {
    background: #3d4571;
  }
`;

const DangerButton = styled(Button)`
  background: #dc3545;

  &:hover {
    background: #e74c5c;
  }
`;

const AvatarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
`;

const AvatarCard = styled.div`
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #2d3561;
  transition: all 0.2s;
  position: relative;

  &:hover {
    border-color: #e94560;
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  ${props => props.$inactive && `
    opacity: 0.5;
    border-color: #6c757d;
  `}
`;

const StatusBadge = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => props.$active ? '#40c057' : '#6c757d'};
  color: white;
`;

const AvatarImage = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto 1rem;
  display: block;
  border: 3px solid #e94560;
  background: #2d3561;
`;

const AvatarPlaceholder = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: #2d3561;
  border: 3px solid #e94560;
`;

const AvatarName = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #eaeaea;
  font-size: 1.2rem;
  text-align: center;
`;

const AvatarDescription = styled.p`
  color: #a0a0a0;
  font-size: 0.9rem;
  text-align: center;
  margin: 0 0 1rem 0;
  min-height: 2.5rem;
`;

const AvatarMeta = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const MetaTag = styled.span`
  padding: 0.25rem 0.75rem;
  background: #2d3561;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #eaeaea;
`;

const AvatarStats = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 0.75rem 0;
  border-top: 1px solid #2d3561;
  margin-bottom: 1rem;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #e94560;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #a0a0a0;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.$edit ? `
    background: #2d3561;
    color: #eaeaea;
    &:hover { background: #3d4571; }
  ` : props.$delete ? `
    background: rgba(220, 53, 69, 0.2);
    color: #dc3545;
    &:hover { background: rgba(220, 53, 69, 0.3); }
  ` : props.$activate ? `
    background: rgba(40, 167, 69, 0.2);
    color: #40c057;
    &:hover { background: rgba(40, 167, 69, 0.3); }
  ` : `
    background: rgba(220, 53, 69, 0.2);
    color: #e94560;
    &:hover { background: rgba(233, 69, 96, 0.3); }
  `}
`;

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
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: #16213e;
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ModalTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: #eaeaea;
`;

const FormField = styled.div`
  margin-bottom: 1.25rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #eaeaea;
  font-weight: 600;
`;

const FormLabelRequired = styled.span`
  color: #e94560;
  margin-left: 0.25rem;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #e94560;
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: #e94560;
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  background: #1e2a4a;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #e94560;
  }
`;

const FileUploadArea = styled.div`
  border: 2px dashed #2d3561;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;

  &:hover {
    border-color: #e94560;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.h3`
  color: #eaeaea;
  margin: 0 0 0.5rem 0;
`;

const EmptySubtext = styled.p`
  color: #a0a0a0;
  margin: 0;
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
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
`;

const InfoBox = styled.div`
  padding: 1rem;
  background: rgba(123, 44, 191, 0.1);
  border: 1px solid rgba(123, 44, 191, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  color: #eaeaea;
  font-size: 0.9rem;
`;

function AIAvatars() {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filters, setFilters] = useState({ gender: 'all', style: 'all' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gender: 'neutral',
    style: 'professional',
    isActive: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchAvatars();
  }, [filters]);

  const fetchAvatars = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.gender !== 'all') params.append('gender', filters.gender);
      if (filters.style !== 'all') params.append('style', filters.style);

      const response = await fetch(`/api/ai-avatars?${params}`);
      if (!response.ok) throw new Error('Failed to fetch avatars');

      const data = await response.json();
      setAvatars(data.data.avatars || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAvatar(null);
    setFormData({ name: '', description: '', gender: 'neutral', style: 'professional', isActive: true });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const handleEdit = (avatar) => {
    setEditingAvatar(avatar);
    setFormData({
      name: avatar.name,
      description: avatar.description || '',
      gender: avatar.gender,
      style: avatar.style,
      isActive: avatar.isActive
    });
    setImageFile(null);
    setImagePreview(avatar.imageUrl || null);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData };

      if (editingAvatar) {
        await fetch(`/api/ai-avatars/${editingAvatar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const createResponse = await fetch('/api/ai-avatars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const createData = await createResponse.json();
        const newAvatarId = createData.data.id;

        // Upload image if provided
        if (imageFile) {
          const imageFormData = new FormData();
          imageFormData.append('image', imageFile);
          await fetch(`/api/ai-avatars/${newAvatarId}/image`, {
            method: 'POST',
            body: imageFormData
          });
        }
      }

      // Upload new image if editing and image changed
      if (editingAvatar && imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', imageFile);
        await fetch(`/api/ai-avatars/${editingAvatar.id}/image`, {
          method: 'POST',
          body: imageFormData
        });
      }

      setShowModal(false);
      fetchAvatars();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/ai-avatars/${id}`, { method: 'DELETE' });
      setShowDeleteConfirm(null);
      fetchAvatars();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (avatar) => {
    try {
      const endpoint = avatar.isActive ? 'deactivate' : 'activate';
      await fetch(`/api/ai-avatars/${avatar.id}/${endpoint}`, { method: 'POST' });
      fetchAvatars();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  if (loading) return <PageContainer>Loading...</PageContainer>;

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>AI Avatars</PageTitle>
          <PageDescription>Manage AI avatars for Tier 2 video generation</PageDescription>
        </div>
        <Button onClick={handleCreate}>+ Create Avatar</Button>
      </PageHeader>

      <InfoBox>
        AI Avatars are used for Tier 2 (AI-Avatar) video posts. Create and manage avatars here, then select them when creating Tier 2 content.
      </InfoBox>

      <FilterBar>
        <FilterSelect
          value={filters.gender}
          onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
        >
          <option value="all">All Genders</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="neutral">Neutral</option>
        </FilterSelect>
        <FilterSelect
          value={filters.style}
          onChange={(e) => setFilters({ ...filters, style: e.target.value })}
        >
          <option value="all">All Styles</option>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="playful">Playful</option>
          <option value="elegant">Elegant</option>
          <option value="friendly">Friendly</option>
          <option value="authoritative">Authoritative</option>
        </FilterSelect>
      </FilterBar>

      {error && (
        <div style={{ color: '#e94560', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {avatars.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🎭</EmptyIcon>
          <EmptyText>No AI avatars yet</EmptyText>
          <EmptySubtext>Create your first avatar to get started with Tier 2 videos</EmptySubtext>
        </EmptyState>
      ) : (
        <AvatarGrid>
          {avatars.map(avatar => (
            <AvatarCard key={avatar.id} $inactive={!avatar.isActive}>
              <StatusBadge $active={avatar.isActive}>
                {avatar.isActive ? 'Active' : 'Inactive'}
              </StatusBadge>
              {avatar.imageUrl ? (
                <AvatarImage src={avatar.imageUrl} alt={avatar.name} />
              ) : (
                <AvatarPlaceholder>🎭</AvatarPlaceholder>
              )}
              <AvatarName>{avatar.name}</AvatarName>
              <AvatarDescription>{avatar.description || 'No description'}</AvatarDescription>
              <AvatarMeta>
                <MetaTag>{avatar.gender}</MetaTag>
                <MetaTag>{avatar.style}</MetaTag>
              </AvatarMeta>
              <AvatarStats>
                <StatItem>
                  <StatValue>{avatar.usageCount || 0}</StatValue>
                  <StatLabel>Used</StatLabel>
                </StatItem>
              </AvatarStats>
              <CardActions>
                <ActionButton $edit onClick={() => handleEdit(avatar)}>Edit</ActionButton>
                <ActionButton
                  onClick={() => handleToggleActive(avatar)}
                  $activate={avatar.isActive}
                >
                  {avatar.isActive ? 'Disable' : 'Enable'}
                </ActionButton>
                <ActionButton
                  $delete
                  onClick={() => setShowDeleteConfirm(avatar.id)}
                >
                  Delete
                </ActionButton>
              </CardActions>
            </AvatarCard>
          ))}
        </AvatarGrid>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>{editingAvatar ? 'Edit Avatar' : 'Create Avatar'}</ModalTitle>

            <FormField>
              <FormLabel>Name<FormLabelRequired>*</FormLabelRequired></FormLabel>
              <FormInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sophia - Professional"
              />
            </FormField>

            <FormField>
              <FormLabel>Description</FormLabel>
              <FormTextarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this avatar's personality and use case"
              />
            </FormField>

            <FormField>
              <FormLabel>Gender</FormLabel>
              <FormSelect
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="neutral">Neutral</option>
              </FormSelect>
            </FormField>

            <FormField>
              <FormLabel>Style</FormLabel>
              <FormSelect
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="playful">Playful</option>
                <option value="elegant">Elegant</option>
                <option value="friendly">Friendly</option>
                <option value="authoritative">Authoritative</option>
              </FormSelect>
            </FormField>

            <FormField>
              <FormLabel>Avatar Image</FormLabel>
              <FileUploadArea onClick={() => document.getElementById('avatarImageInput').click()}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '50%' }} />
                ) : (
                  <>
                    <div style={{ fontSize: '2rem' }}>📤</div>
                    <div>Click to upload image</div>
                  </>
                )}
              </FileUploadArea>
              <FileInput
                id="avatarImageInput"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
              />
            </FormField>

            <ModalActions>
              <SecondaryButton onClick={() => setShowModal(false)}>Cancel</SecondaryButton>
              <Button onClick={handleSave} disabled={!formData.name}>
                {editingAvatar ? 'Save Changes' : 'Create Avatar'}
              </Button>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Delete Avatar?</ModalTitle>
            <p style={{ color: '#a0a0a0', marginBottom: '1.5rem' }}>
              Are you sure you want to delete this avatar? This action cannot be undone.
            </p>
            <ModalActions>
              <SecondaryButton onClick={() => setShowDeleteConfirm(null)}>Cancel</SecondaryButton>
              <DangerButton onClick={() => handleDelete(showDeleteConfirm)}>Delete</DangerButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

export default AIAvatars;
