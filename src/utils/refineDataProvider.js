import adminApi from './adminApi';
import { API_BASE_URL } from './apiBase';

// Refine data provider for the admin console.
// Keeps all HTTP traffic on the shared axios instance (cookies + CSRF interceptor).
const RESOURCES = {
  'admin-users': {
    list: '/api/admin/users',
    create: '/api/admin/register',
    deleteOne: (id) => `/api/admin/users/${id}`,
    listKey: 'list',
    serverPagination: true,
  },
  'friend-links': {
    list: '/api/friend-links/all',
    create: '/api/friend-links',
    update: (id) => `/api/friend-links/${id}`,
    deleteOne: (id) => `/api/friend-links/${id}`,
    clientSide: true,
  },
  'episode-trash': {
    list: '/api/episode-trash',
    deleteOne: (id) => `/api/episode-trash/${id}`,
    listKey: 'list',
    serverPagination: true,
  },
  episodes: {
    list: '/api/episodes',
    create: '/api/episodes',
    update: (id) => `/api/episodes/${id}`,
    deleteOne: (id) => `/api/episodes/${id}`,
    listKey: 'episodes',
    serverPagination: true,
  },
  'my-episodes': {
    list: '/api/creator/my-episodes',
    listKey: 'list',
    serverPagination: true,
  },
  'review-pending': {
    list: '/api/review/pending',
    listKey: 'list',
    serverPagination: true,
  },
  'review-all': {
    list: '/api/review/all',
    listKey: 'list',
    serverPagination: true,
  },
  creators: {
    list: '/api/admin/creators',
    clientSide: true,
  },
  categories: {
    list: '/api/categories',
    clientSide: true,
  },
};

const SORTER_PARAMS = {
  'admin-users': { createdAt: { sort: 'createdAt', order: 'desc' } },
  episodes: {
    updatedAt: { sort: 'latest', order: 'desc' },
    createdAt: { sort: 'latest', order: 'desc' },
    views: { sort: 'views', order: 'desc' },
    premiereDate: { sort: 'premiere', order: 'desc' },
    averageRating: { sort: 'rating', order: 'desc' },
  },
};

const getConfig = (resource) => RESOURCES[resource] || { list: `/api/${resource}` };

const getRecordValue = (record, field) => {
  if (!record || !field) return undefined;
  return field.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), record);
};

const toComparable = (value) => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(',');
  return String(value);
};

const matchesFilter = (record, filter) => {
  if (!filter || !filter.field) return true;
  const recordValue = getRecordValue(record, filter.field);
  const filterValue = filter.value;

  switch (filter.operator) {
    case 'eq':
      return recordValue === filterValue;
    case 'ne':
      return recordValue !== filterValue;
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(recordValue);
    case 'nin':
      return Array.isArray(filterValue) && !filterValue.includes(recordValue);
    case 'contains':
      return Array.isArray(recordValue)
        ? recordValue.some((item) => toComparable(item).toLowerCase().includes(toComparable(filterValue).toLowerCase()))
        : toComparable(recordValue).toLowerCase().includes(toComparable(filterValue).toLowerCase());
    case 'ncontains':
      return !toComparable(recordValue).toLowerCase().includes(toComparable(filterValue).toLowerCase());
    case 'startswith':
      return toComparable(recordValue).toLowerCase().startsWith(toComparable(filterValue).toLowerCase());
    case 'endswith':
      return toComparable(recordValue).toLowerCase().endsWith(toComparable(filterValue).toLowerCase());
    case 'gt':
      return recordValue > filterValue;
    case 'gte':
      return recordValue >= filterValue;
    case 'lt':
      return recordValue < filterValue;
    case 'lte':
      return recordValue <= filterValue;
    case 'null':
      return recordValue == null;
    case 'nnull':
      return recordValue != null;
    default:
      return true;
  }
};

const friendLinkStatus = (record) => {
  if (record.status) return record.status;
  return record.isActive ? 'approved' : 'pending';
};

const matchesFriendLinkFilter = (record, filter) => {
  if (filter?.field === 'status') {
    return friendLinkStatus(record) === filter.value;
  }
  return matchesFilter(record, filter);
};

const applyClientFilters = (records, filters, resource) => {
  const activeFilters = (filters || []).filter((filter) => filter && filter.field);
  if (activeFilters.length === 0) return records;
  return records.filter((record) =>
    activeFilters.every((filter) =>
      resource === 'friend-links'
        ? matchesFriendLinkFilter(record, filter)
        : matchesFilter(record, filter),
    ),
  );
};

const applyClientSorters = (records, sorters) => {
  const activeSorters = (sorters || []).filter((sorter) => sorter && sorter.field);
  if (activeSorters.length === 0) return records;
  return [...records].sort((a, b) => {
    for (const sorter of activeSorters) {
      const left = getRecordValue(a, sorter.field);
      const right = getRecordValue(b, sorter.field);
      if (left === right) continue;
      if (left == null) return 1;
      if (right == null) return -1;
      const result = left > right ? 1 : -1;
      return sorter.order === 'asc' ? result : -result;
    }
    return 0;
  });
};

const buildServerParams = ({ pagination, filters, sorters, resource }) => {
  const params = {};
  if (pagination && pagination.mode !== 'off') {
    params.page = pagination.currentPage || 1;
    params.limit = pagination.pageSize || 20;
  }
  (filters || []).forEach((filter) => {
    if (!filter || !filter.field) return;
    if (filter.field === 'search' && filter.value) {
      params.search = filter.value;
    } else if (filter.value !== undefined && filter.value !== '') {
      params[filter.field] = filter.value;
    }
  });
  const sorterMap = SORTER_PARAMS[resource] || {};
  const sorter = (sorters || []).find((item) => sorterMap[item?.field]);
  if (sorter) {
    const mapped = sorterMap[sorter.field];
    params.sort = mapped.sort;
    params.order = sorter.order || mapped.order;
  }
  return params;
};

const extractList = (payload, config) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (config.listKey && Array.isArray(payload[config.listKey])) return payload[config.listKey];
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const dataProvider = {
  getApiUrl: () => API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : ''),

  getList: async ({ resource, pagination, filters, sorters }) => {
    const config = getConfig(resource);
    const response = await adminApi.get(config.list, {
      params: config.clientSide ? undefined : buildServerParams({ pagination, filters, sorters, resource }),
    });
    const payload = response.data;
    let records = extractList(payload, config);

    if (config.clientSide) {
      records = applyClientFilters(records, filters, resource);
      records = applyClientSorters(records, sorters);
    }

    let total = records.length;
    if (!config.clientSide) {
      const serverTotal = Number(payload?.total);
      if (Number.isFinite(serverTotal)) {
        total = serverTotal;
      } else if (payload?.totalPages) {
        total = Number(payload.totalPages) * Number(pagination?.pageSize || 20);
      }
    }

    if (config.clientSide && pagination && pagination.mode !== 'off') {
      const page = pagination.currentPage || 1;
      const pageSize = pagination.pageSize || 10;
      records = records.slice((page - 1) * pageSize, page * pageSize);
    }

    return { data: records, total };
  },

  getOne: async ({ resource, id, meta }) => {
    const config = getConfig(resource);
    const endpoint = meta?.endpoint || (typeof config.getOne === 'function' ? config.getOne(id) : `${config.list}/${id}`);
    const response = await adminApi.get(endpoint);
    return { data: response.data?.data ?? response.data };
  },

  create: async ({ resource, variables, meta }) => {
    const config = getConfig(resource);
    const endpoint = meta?.endpoint || config.create || config.list;
    const response = await adminApi.post(endpoint, variables);
    return { data: response.data?.data ?? response.data };
  },

  update: async ({ resource, id, variables, meta }) => {
    const config = getConfig(resource);
    const endpoint = meta?.endpoint
      || (typeof config.update === 'function' ? config.update(id) : `${config.list}/${id}`);
    const response = await adminApi.put(endpoint, variables);
    return { data: response.data?.data ?? response.data };
  },

  deleteOne: async ({ resource, id, meta }) => {
    const config = getConfig(resource);
    const endpoint = meta?.endpoint
      || (typeof config.deleteOne === 'function' ? config.deleteOne(id) : `${config.list}/${id}`);
    const response = await adminApi.delete(endpoint);
    return { data: response.data?.data ?? response.data };
  },

  custom: async ({ url, method = 'get', payload, query, headers }) => {
    const response = await adminApi.request({
      url,
      method,
      data: payload,
      params: query,
      headers,
    });
    return { data: response.data?.data ?? response.data };
  },
};

export default dataProvider;
