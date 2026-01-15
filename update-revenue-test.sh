#!/bin/bash

# This script adds daily aggregates functionality to RevenueAttributionTest.jsx

FILE="frontend/src/pages/RevenueAttributionTest.jsx"

# Backup the file
cp "$FILE" "${FILE}.backup3"

echo "Adding daily aggregates styled components..."

# Insert new styled components after line 163 (after RefreshButton)
sed -i '164i\
const DailyAggregateGrid = styled.div`\
  display: grid;\
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\
  gap: 1rem;\
  margin-bottom: 1.5rem;\
`;\
\
const DailyAggregateCard = styled.div`\
  background: #1f1f3a;\
  padding: 1.25rem;\
  border-radius: 10px;\
  border: 1px solid #2d3561;\
  cursor: pointer;\
  transition: all 0.2s;\
\
  &:hover {\
    background: #252545;\
    border-color: #e94560;\
    transform: translateY(-2px);\
  }\
`;\
\
const AggregateDate = styled.div`\
  font-size: 0.9rem;\
  color: #a0a0a0;\
  margin-bottom: 0.5rem;\
`;\
\
const AggregateRevenue = styled.div`\
  font-size: 1.8rem;\
  font-weight: 700;\
  color: #00d26a;\
  margin-bottom: 0.5rem;\
`;\
\
const AggregateTransactions = styled.div`\
  font-size: 0.9rem;\
  color: #7b2cbf;\
`;\
\
const AggregateCustomers = styled.div`\
  font-size: 0.85rem;\
  color: #a0a0a0;\
  margin-top: 0.5rem;\
`;\
\
const AggregateDetails = styled.div`\
  display: flex;\
  gap: 1rem;\
  margin-top: 0.75rem;\
  padding-top: 0.75rem;\
  border-top: 1px solid #2d3561;\
`;\
\
const AggregateDetailItem = styled.div`\
  flex: 1;\
`;\
\
const AggregateDetailLabel = styled.div`\
  font-size: 0.75rem;\
  color: #a0a0a0;\
`;\
\
const AggregateDetailValue = styled.div`\
  font-size: 1rem;\
  font-weight: 600;\
  color: \${props => props.color || '"'"'#eaeaea'"'"'};\
`;\
\
const Modal = styled.div`\
  display: \${props => props.show ? '"'"'flex'"'"' : '"'"'none'"'"'};\
  position: fixed;\
  top: 0;\
  left: 0;\
  right: 0;\
  bottom: 0;\
  background: rgba(0, 0, 0, 0.8);\
  justify-content: center;\
  align-items: center;\
  z-index: 1000;\
`;\
\
const ModalContent = styled.div`\
  background: #16213e;\
  border-radius: 16px;\
  padding: 2rem;\
  max-width: 900px;\
  width: 90%;\
  max-height: 80vh;\
  overflow-y: auto;\
  border: 1px solid #2d3561;\
`;\
\
const ModalHeader = styled.div`\
  display: flex;\
  justify-content: space-between;\
  align-items: center;\
  margin-bottom: 1.5rem;\
`;\
\
const ModalTitle = styled.h2`\
  font-size: 1.5rem;\
  margin: 0;\
  color: #eaeaea;\
`;\
\
const CloseButton = styled.button`\
  background: none;\
  border: none;\
  font-size: 1.5rem;\
  color: #a0a0a0;\
  cursor: pointer;\
  padding: 0.5rem;\
\
  &:hover {\
    color: #eaeaea;\
  }\
`;\
\
const TransactionTable = styled.div`\
  margin-top: 1.5rem;\
`;\
\
const TransactionTableHeader = styled.div`\
  display: grid;\
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;\
  gap: 1rem;\
  padding: 1rem;\
  background: #1a1a2e;\
  border-radius: 8px;\
  font-weight: 600;\
  color: #a0a0a0;\
  font-size: 0.9rem;\
`;\
\
const TransactionTableRow = styled.div`\
  display: grid;\
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;\
  gap: 1rem;\
  padding: 1rem;\
  background: #1f1f3a;\
  border-radius: 8px;\
  margin-bottom: 0.5rem;\
  font-size: 0.9rem;\
\
  &:hover {\
    background: #252545;\
  }\
`;\
\
const TransactionCell = styled.div`\
  display: flex;\
  flex-direction: column;\
  justify-content: center;\
  word-break: break-word;\
`;\
' "$FILE"

echo "Styled components added. Please manually add the state, functions, and JSX sections."
echo "See add-daily-aggregates-ui.js for the complete code to add."
