#!/bin/bash
# Add approve/reject buttons to modal

INPUT="frontend/src/pages/ContentLibrary.jsx"

cat > /tmp/modal-buttons.txt << 'EOF'
                  {/* Show approve/reject buttons only for non-posted posts */}
                  {selectedVideo.status !== 'posted' && selectedVideo.status !== 'rejected' && (
                    <ModalActions>
                      <ApproveButton onClick={handleApprove}>
                        ✅ Approve
                      </ApproveButton>
                      <RejectButton onClick={handleReject}>
                        ❌ Reject
                      </RejectButton>
                    </ModalActions>
                  )}
EOF

# Insert before line 1098 (before closing ModalInfo tag)
sed -i '1097r /tmp/modal-buttons.txt' "$INPUT"

echo "Added modal buttons"
echo "New line count: $(wc -l < "$INPUT")"
