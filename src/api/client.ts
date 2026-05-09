import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getAccessToken } from '../auth/oauth.js';
import { config } from 'dotenv';

config();

const ST_ENV = process.env.ST_ENV || 'sandbox';
// Base URL - adjust based on official docs / your sandbox (common patterns: api.servicetitan.io or api-integration.servicetitan.io)
const BASE_URL = ST_ENV === 'production'
  ? 'https://api.servicetitan.io'
  : 'https://api-integration.servicetitan.io';

export class ServiceTitanClient {
  private axiosInstance: AxiosInstance;
  private tenantId: string;

  constructor(tenantId?: string) {
    this.tenantId = tenantId || process.env.ST_TENANT_ID || '';
    if (!this.tenantId) {
      console.warn('No ST_TENANT_ID provided - some calls may fail');
    }

    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth + app key + tenant
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await getAccessToken();
      const appKey = process.env.ST_APP_KEY;

      if (!appKey) {
        throw new Error('ST_APP_KEY is required');
      }

      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
      config.headers['ST-App-Key'] = appKey;

      // Inject tenant into path if not already present and tenantId exists
      if (this.tenantId && config.url && !config.url.includes('/tenant/')) {
        // Many endpoints follow /namespace/v2/tenant/{tenant}/resource
        // This is a simple helper; refine per actual endpoint structure
        if (!config.url.startsWith('/')) config.url = '/' + config.url;
      }

      return config;
    });

    // Response interceptor for basic error logging
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('ServiceTitan API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  // Helper to build tenant-scoped URL (customize based on exact namespace)
  buildUrl(namespace: string, resource: string, id?: string | number): string {
    let url = `/${namespace}/v2/tenant/${this.tenantId}/${resource}`;
    if (id) url += `/${id}`;
    return url;
  }

  // TODO: Add delete, put if needed. Add pagination helper wrapper.
}

// Default export for convenience
export const createClient = (tenantId?: string) => new ServiceTitanClient(tenantId);