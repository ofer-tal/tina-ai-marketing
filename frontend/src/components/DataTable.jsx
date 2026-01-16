import React, { useState, useMemo } from 'react';
import styled from 'styled-components';

const TableContainer = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  overflow: hidden;
`;

const TableHeader = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'columns'
})`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(150px, 1fr))'};
  gap: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2d3561;
  font-weight: 600;
  color: #eaeaea;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const SortableHeader = styled.button`
  background: none;
  border: none;
  color: ${props => props.active ? '#e94560' : '#eaeaea'};
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  font-weight: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  transition: color 0.2s;

  &:hover {
    color: #e94560;
  }

  &:focus {
    outline: 2px solid #e94560;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const SortIndicator = styled.span`
  font-size: 0.75rem;
  opacity: ${props => props.active ? 1 : 0.3};
`;

const TableRow = styled.div.withConfig({
  shouldForwardProp: (prop) => !['columns', '$hover'].includes(prop)
})`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(150px, 1fr))'};
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #2d3561;
  transition: background 0.2s;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #1f2940;
  }
`;

const TableCell = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  color: #eaeaea;
`;

const StatusBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'status'
})`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;

  ${props => {
    switch (props.status) {
      case 'active':
        return `
          background: rgba(0, 210, 106, 0.2);
          color: #00d26a;
        `;
      case 'paused':
        return `
          background: rgba(255, 176, 32, 0.2);
          color: #ffb020;
        `;
      case 'completed':
        return `
          background: rgba(123, 44, 191, 0.2);
          color: #7b2cbf;
        `;
      case 'draft':
        return `
          background: rgba(160, 160, 160, 0.2);
          color: #a0a0a0;
        `;
      case 'failed':
        return `
          background: rgba(248, 49, 47, 0.2);
          color: #f8312f;
        `;
      default:
        return `
          background: rgba(160, 160, 160, 0.2);
          color: #a0a0a0;
        `;
    }
  }}
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #1a1a2e;
  border-top: 1px solid #2d3561;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PaginationInfo = styled.div`
  color: #a0a0a0;
  font-size: 0.875rem;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const PageButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active'
})`
  padding: 0.5rem 1rem;
  background: ${props => props.active ? '#e94560' : '#16213e'};
  border: 1px solid ${props => props.active ? '#e94560' : '#2d3561'};
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  min-width: 40px;

  &:hover:not(:disabled) {
    background: ${props => props.active ? '#ff6b6b' : '#e94560'};
    border-color: #e94560;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus {
    outline: 2px solid #e94560;
    outline-offset: 2px;
  }
`;

const PageSizeSelector = styled.select`
  padding: 0.5rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #e94560;
  }

  &:focus {
    outline: 2px solid #e94560;
    outline-offset: 2px;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #a0a0a0;
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #a0a0a0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #2d3561;
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

/**
 * DataTable Component - Sortable and paginated data table
 *
 * @param {Array} data - Array of data objects to display
 * @param {Array} columns - Column definitions with key, label, sortable, render, width
 * @param {boolean} loading - Show loading state
 * @param {string} emptyMessage - Message to show when no data
 * @param {Function} onRowClick - Optional click handler for rows
 * @param {boolean} stripeRows - Add striping to rows
 * @param {boolean} hoverRows - Add hover effect to rows
 * @param {string} rowKey - Key to use as unique identifier for rows
 */
const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  emptyMessage = 'No data available',
  onRowClick = null,
  stripeRows = true,
  hoverRows = true,
  rowKey = 'id'
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calculate total pages
  const totalPages = Math.ceil(data.length / pageSize);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (sortConfig.direction === 'asc') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });

    return sorted;
  }, [data, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize]);

  // Handle sort
  const handleSort = (key) => {
    let direction = 'asc';

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        // Third click resets sort
        setSortConfig({ key: null, direction: 'asc' });
        return;
      }
    }

    setSortConfig({ key, direction });
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Handle page size change
  const handlePageSizeChange = (e) => {
    const newPageSize = parseInt(e.target.value, 10);
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
  };

  // Generate grid template columns
  const gridColumns = columns
    .map(col => col.width || '1fr')
    .join(' ');

  // Render cell content
  const renderCell = (column, row, rowIndex) => {
    const value = row[column.key];

    if (column.render) {
      return column.render(value, row, rowIndex);
    }

    // Special rendering for status fields
    if (column.key === 'status' && typeof value === 'string') {
      return <StatusBadge status={value}>{value}</StatusBadge>;
    }

    // Default rendering
    return <TableCell>{value != null ? String(value) : '-'}</TableCell>;
  };

  // Render header cell
  const renderHeaderCell = (column) => {
    if (column.sortable !== false) {
      const isActive = sortConfig.key === column.key;
      const sortIcon = sortConfig.direction === 'asc' ? '↑' : '↓';

      return (
        <SortableHeader
          onClick={() => handleSort(column.key)}
          active={isActive}
          aria-sort={isActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          {column.label}
          <SortIndicator active={isActive}>
            {isActive ? sortIcon : '↕'}
          </SortIndicator>
        </SortableHeader>
      );
    }

    return <div>{column.label}</div>;
  };

  // Show loading state
  if (loading) {
    return (
      <TableContainer>
        <LoadingState>
          <LoadingSpinner />
          <div>Loading data...</div>
        </LoadingState>
      </TableContainer>
    );
  }

  // Show empty state
  if (data.length === 0) {
    return (
      <TableContainer>
        <EmptyState>{emptyMessage}</EmptyState>
      </TableContainer>
    );
  }

  // Calculate pagination info
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, data.length);

  return (
    <TableContainer>
      <TableHeader columns={gridColumns}>
        {columns.map((column) => (
          <div key={column.key}>{renderHeaderCell(column)}</div>
        ))}
      </TableHeader>

      {paginatedData.map((row, index) => (
        <TableRow
          key={row[rowKey] || index}
          columns={gridColumns}
          onClick={() => onRowClick && onRowClick(row)}
          style={{
            cursor: onRowClick ? 'pointer' : 'default',
            background: stripeRows && index % 2 === 0 ? '#16213e' : '#1a2338'
          }}
          $hover={hoverRows}
        >
          {columns.map((column) => (
            <div key={column.key}>
              {renderCell(column, row, index)}
            </div>
          ))}
        </TableRow>
      ))}

      <PaginationContainer>
        <PaginationInfo>
          Showing {startIndex} to {endIndex} of {data.length} entries
        </PaginationInfo>

        <PaginationControls>
          <PageSizeSelector value={pageSize} onChange={handlePageSizeChange}>
            <option value="5">5 / page</option>
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </PageSizeSelector>

          <PageButton
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            ← Prev
          </PageButton>

          {/* Page numbers */}
          {totalPages <= 7 ? (
            // Show all pages if 7 or fewer
            Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <PageButton
                key={page}
                onClick={() => handlePageChange(page)}
                active={currentPage === page}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'true' : undefined}
              >
                {page}
              </PageButton>
            ))
          ) : (
            // Show abbreviated page numbers for more than 7 pages
            <>
              <PageButton
                onClick={() => handlePageChange(1)}
                active={currentPage === 1}
                aria-label="Go to page 1"
              >
                1
              </PageButton>

              {currentPage > 3 && (
                <PageButton disabled>...</PageButton>
              )}

              {currentPage > 2 && currentPage < totalPages - 1 && (
                <PageButton
                  onClick={() => handlePageChange(currentPage - 1)}
                  aria-label={`Go to page ${currentPage - 1}`}
                >
                  {currentPage - 1}
                </PageButton>
              )}

              {currentPage > 1 && currentPage < totalPages && (
                <PageButton
                  onClick={() => handlePageChange(currentPage)}
                  active
                  aria-label={`Go to page ${currentPage}`}
                  aria-current="true"
                >
                  {currentPage}
                </PageButton>
              )}

              {currentPage < totalPages - 1 && currentPage > 2 && (
                <PageButton
                  onClick={() => handlePageChange(currentPage + 1)}
                  aria-label={`Go to page ${currentPage + 1}`}
                >
                  {currentPage + 1}
                </PageButton>
              )}

              {currentPage < totalPages - 2 && (
                <PageButton disabled>...</PageButton>
              )}

              <PageButton
                onClick={() => handlePageChange(totalPages)}
                active={currentPage === totalPages}
                aria-label={`Go to page ${totalPages}`}
              >
                {totalPages}
              </PageButton>
            </>
          )}

          <PageButton
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next →
          </PageButton>
        </PaginationControls>
      </PaginationContainer>
    </TableContainer>
  );
};

export default DataTable;
