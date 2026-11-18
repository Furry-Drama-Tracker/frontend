import React from 'react';
import { Empty, Spin, Table } from '@arco-design/web-react';
import { useI18n } from '../contexts/I18nContext';
import useMediaQuery from '../hooks/useMediaQuery';

const getByPath = (record, dataIndex) => {
  if (dataIndex === undefined || dataIndex === null) return undefined;
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((value, key) => (value == null ? value : value[key]), record);
  }
  return record?.[dataIndex];
};

const isEmptyValue = (value) => value === undefined || value === null || value === '';

/**
 * Arco Table on desktop, stacked cards on phones/tablets.
 *
 * Columns keep working as before. On mobile the first data column becomes the
 * card title, the last column becomes the action row, and the rest are rendered
 * as label/value pairs. A column can override this with `mobile: 'title'`,
 * `mobile: 'actions'` or `mobile: 'hidden'`.
 */
const AdminResponsiveTable = ({
  columns = [],
  data = [],
  rowKey = '_id',
  loading = false,
  noDataElement,
  onRow,
  expandedRowRender,
  expandedRowKeys = [],
  expandProps,
  onExpandedRowsChange,
  mobileActions = true,
  ...tableProps
}) => {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!isMobile) {
    return (
      <Table
        columns={columns}
        data={data}
        rowKey={rowKey}
        loading={loading}
        noDataElement={noDataElement}
        onRow={onRow}
        expandedRowRender={expandedRowRender}
        expandedRowKeys={expandedRowKeys}
        expandProps={expandProps}
        onExpandedRowsChange={onExpandedRowsChange}
        {...tableProps}
      />
    );
  }

  const visibleColumns = columns.filter((column) => column && column.title && column.mobile !== 'hidden');
  const explicitActionColumn = columns.find((column) => column.mobile === 'actions');
  const actionColumn = explicitActionColumn
    || (mobileActions ? visibleColumns[visibleColumns.length - 1] : undefined);
  const titleColumn = columns.find((column) => column.mobile === 'title')
    || visibleColumns.find((column) => column !== actionColumn && column.dataIndex !== undefined)
    || visibleColumns.find((column) => column !== actionColumn && column.render)
    || visibleColumns[0];
  const fieldColumns = visibleColumns.filter(
    (column) => column !== titleColumn && column !== actionColumn
  );

  const getRowKey = (record, index) => {
    if (typeof rowKey === 'function') return rowKey(record, index);
    return record?.[rowKey] ?? index;
  };

  const renderCell = (column, record, index) => {
    if (!column) return null;
    const value = getByPath(record, column.dataIndex);
    const content = typeof column.render === 'function'
      ? column.render(value, record, index)
      : value;
    return isEmptyValue(content) ? '-' : content;
  };

  if (loading) {
    return (
      <div className="admin-mobile-loading">
        <Spin />
      </div>
    );
  }

  if (!data.length) {
    return noDataElement || <Empty description={t('common.noData')} />;
  }

  return (
    <div className="admin-mobile-card-list">
      {data.map((record, index) => {
        const key = getRowKey(record, index);
        const rowProps = (onRow && onRow(record, index)) || {};
        const rowStyle = rowProps.style;
        const cardRowProps = { ...rowProps };
        delete cardRowProps.style;
        delete cardRowProps.draggable;
        delete cardRowProps.onDragStart;
        delete cardRowProps.onDragOver;
        delete cardRowProps.onDrop;
        delete cardRowProps.onDragEnd;
        const canExpand = expandedRowKeys.includes(key)
          && (!expandProps?.rowExpandable || expandProps.rowExpandable(record));
        const actionContent = actionColumn ? renderCell(actionColumn, record, index) : null;
        return (
          <div
            key={key}
            className={`admin-mobile-card${canExpand ? ' is-expanded' : ''}`}
            {...cardRowProps}
            style={{ ...rowStyle }}
          >
            <div className="admin-mobile-card-title">
              {renderCell(titleColumn, record, index)}
            </div>

            {fieldColumns.length > 0 && (
              <div className="admin-mobile-card-fields">
                {fieldColumns.map((column, fieldIndex) => (
                  <div className="admin-mobile-card-field" key={column.key || column.dataIndex?.toString() || fieldIndex}>
                    <span className="admin-mobile-card-field-label">{column.title}</span>
                    <span className="admin-mobile-card-field-value">
                      {renderCell(column, record, index)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {actionColumn && actionContent !== '-' && actionContent != null && (
              <div className="admin-mobile-card-actions">
                {actionContent}
              </div>
            )}

            {canExpand && expandedRowRender && (
              <div className="admin-mobile-card-expanded">
                {expandedRowRender(record, index)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminResponsiveTable;
