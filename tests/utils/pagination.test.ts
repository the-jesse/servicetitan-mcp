import { describe, it, expect } from '@jest/globals';
import { normalizePaginatedResponse, PaginationSchema } from '../../src/utils/pagination.js';

describe('normalizePaginatedResponse', () => {
  it('reads totalCount + items', () => {
    const out = normalizePaginatedResponse({
      totalCount: 45,
      page: 2,
      pageSize: 20,
      items: [{ id: 1 }, { id: 2 }],
    });
    expect(out.total).toBe(45);
    expect(out.page).toBe(2);
    expect(out.pageSize).toBe(20);
    expect(out.items).toHaveLength(2);
    expect(out.hasMore).toBe(true);
  });

  it('falls back to results and total', () => {
    const out = normalizePaginatedResponse({ total: 2, results: [{ id: 'a' }] });
    expect(out.total).toBe(2);
    expect(out.items).toEqual([{ id: 'a' }]);
    expect(out.hasMore).toBe(false);
  });

  it('falls back to customers / jobs / appointments keys', () => {
    expect(normalizePaginatedResponse({ customers: [{ id: 1 }] }).items).toEqual([{ id: 1 }]);
    expect(normalizePaginatedResponse({ jobs: [{ id: 2 }] }).items).toEqual([{ id: 2 }]);
    expect(normalizePaginatedResponse({ appointments: [{ id: 3 }] }).items).toEqual([{ id: 3 }]);
  });

  it('treats a raw array as items with total 0 (unknown count)', () => {
    const out = normalizePaginatedResponse([{ id: 9 }]);
    expect(out.items).toEqual([{ id: 9 }]);
    expect(out.total).toBe(0);
    expect(out.hasMore).toBe(false);
  });
});

describe('PaginationSchema', () => {
  it('defaults page=1 and pageSize=20', () => {
    expect(PaginationSchema.page.parse(undefined)).toBe(1);
    expect(PaginationSchema.pageSize.parse(undefined)).toBe(20);
  });

  it('rejects pageSize above 100', () => {
    expect(() => PaginationSchema.pageSize.parse(101)).toThrow();
  });
});
