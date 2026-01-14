#!/bin/bash
# Add approve/reject buttons to ContentLibrary modal

INPUT="frontend/src/pages/ContentLibrary.jsx"

# Backup
cp "$INPUT" "${INPUT}.before-approve-buttons"

# Add new styled components after VideoIndicator component (line 533)
# We need to insert these before the function declaration

cat > /tmp/new-components.jsx << 'EOF'
const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #2d3561;
`;

const ApproveButton = styled.button`
  flex: 1;
  padding: 0.75rem 1.5rem;
  background: #00d26a;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #00b35d;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 210, 106, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const RejectButton = styled.button`
  flex: 1;
  padding: 0.75rem 1.5rem;
  background: #ff6b6b;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  }
`;

EOF

# Insert the new components before line 535 (before function declaration)
sed -i '534r /tmp/new-components.jsx' "$INPUT"

echo "Added styled components"
echo "New line count: $(wc -l < "$INPUT")"
