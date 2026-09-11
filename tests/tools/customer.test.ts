import { describe, it, expect } from '@jest/globals';
import { registerCustomerTools } from '../../src/tools/customer.tools.js';

describe('Customer Tools module', () => {
  it('exports registerCustomerTools', () => {
    expect(typeof registerCustomerTools).toBe('function');
  });
});
