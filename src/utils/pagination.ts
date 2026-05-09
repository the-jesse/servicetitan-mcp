import { z } from 'zod';

// Shared pagination schema for reuse across tools
export const PaginationSchema = {
  page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
  pageSize: z.number().int().min(1).max(100).default(20).describe('Number of results per page (max 100)'),
};

// Helper to normalize paginated responses from ServiceTitan
export function normalizePaginatedResponse(data: any) {
  return {
    total: data.totalCount || data.total || data.count || 0,
    page: data.page || 1,
    pageSize: data.pageSize || data.limit || 20,
    items: data.items || data.results || data.customers || data.jobs || data.appointments || data || [],
    hasMore: (data.page || 1) * (data.pageSize || 20) < (data.totalCount || data.total || 0),
  };
}

// Zod schema for common filters
export const CommonFiltersSchema = {
  dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD or ISO)'),
  dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD or ISO)'),
  status: z.string().optional().describe('Status filter'),
  search: z.string().optional().describe('General search term'),
};