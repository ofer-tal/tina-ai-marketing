import React, { useState, useRef } from 'react';
import styled from 'styled-components';

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
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #a0a0a0;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #e94560;
  }
`;

const UploadArea = styled.div`
  border: 2px dashed ${props => props.$dragover ? '#e94560' : '#2d3561'};
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$dragover ? 'rgba(233, 69, 96, 0.1)' : 'transparent'};

  &:hover {
    border-color: #e94560;
  }
`;

const UploadIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const UploadText = styled.div`
  font-size: 1.1rem;
  color: #eaeaea;
  margin-bottom: 0.5rem;
`;

const UploadSubtext = styled.div`
  font-size: 0.9rem;
  color: #a0a0a0;
`;

const FileInput = styled.input`
  display: none;
`;

const FileInfo = styled.div`
  padding: 1rem;
  background: #1e2a4a;
  border-radius: 8px;
  margin-top: 1rem;
`;

const FileName = styled.div`
  color: #eaeaea;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const FileSize = styled.div`
  color: #a0a0a0;
  font-size: 0.9rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #2d3561;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e94560, #7b2cbf);
  border-radius: 4px;
  transition: width 0.3s;
  width: ${props => props.$percent}%;
`;

const ScriptPreview = styled.div`
  padding: 1rem;
  background: #1e2a4a;
  border-radius: 8px;
  margin: 1rem 0;
`;

const ScriptLabel = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ScriptText = styled.div`
  color: #eaeaea;
  line-height: 1.5;
  font-size: 0.95rem;
`;

const CopyButton = styled.button`
  padding: 0.5rem 1rem;
  background: #2d3561;
  border: none;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;

  &:hover {
    background: #3d4571;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const Button = styled.button`
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.$primary ? `
    background: #e94560;
    color: white;

    &:hover:not(:disabled) {
      background: #ff6b6b;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
    }
  ` : `
    background: #2d3561;
    color: #eaeaea;

    &:hover:not(:disabled) {
      background: #3d4571;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

const ErrorMessage = styled.div`
  padding: 1rem;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  border-radius: 8px;
  color: #ff6b6b;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 1rem;
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid #28a745;
  border-radius: 8px;
  color: #40c057;
  margin-bottom: 1rem;
`;

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function Tier2VideoUpload({ isOpen, onClose, post, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const script = post?.tierParameters?.script || post?.tierParameters?.get?.('script') || '';

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragover(true);
  };

  const handleDragLeave = () => {
    setDragover(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
      setError('Please select a valid video file (mp4, mov, avi, webm, mkv)');
      return;
    }

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`/api/content/posts/${post._id}/upload-tier2-video`, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload video');
      }

      setUploadProgress(100);
      setSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        onUploadComplete?.();
      }, 1500);

    } catch (err) {
      setError(err.message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setUploadProgress(0);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen || !post) return null;

  return (
    <ModalOverlay onClick={(e) => !uploading && e.target === e.currentTarget && handleClose()}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Upload Tier 2 Video</ModalTitle>
          <CloseButton onClick={handleClose} disabled={uploading}>
            ✕
          </CloseButton>
        </ModalHeader>

        <InfoBox>
          Upload the AI avatar video generated from HeyGen. The video should be 30-60 seconds long and match the script provided below.
        </InfoBox>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>Video uploaded successfully! Redirecting...</SuccessMessage>}

        {script && (
          <ScriptPreview>
            <ScriptLabel>Script for AI Avatar</ScriptLabel>
            <ScriptText>{script}</ScriptText>
            <CopyButton type="button" onClick={handleCopyScript}>
              📋 Copy Script to Clipboard
            </CopyButton>
          </ScriptPreview>
        )}

        {!success && (
          <>
            <UploadArea
              $dragover={dragover}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <UploadIcon>📤</UploadIcon>
              <UploadText>
                {selectedFile ? selectedFile.name : 'Drag & drop video file here'}
              </UploadText>
              <UploadSubtext>
                MP4, MOV, AVI, WebM up to 500MB
              </UploadSubtext>
              <FileInput
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                onChange={handleFileInputChange}
              />
            </UploadArea>

            {selectedFile && (
              <FileInfo>
                <FileName>{selectedFile.name}</FileName>
                <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
              </FileInfo>
            )}

            {uploading && (
              <ProgressBar>
                <ProgressFill $percent={uploadProgress} />
              </ProgressBar>
            )}

            <ButtonGroup>
              <Button type="button" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                type="button"
                $primary
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Video'}
              </Button>
            </ButtonGroup>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
}

export default Tier2VideoUpload;
