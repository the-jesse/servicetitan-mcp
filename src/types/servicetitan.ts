/*
 * Type definitions for ServiceTitan API responses.
 * These can be expanded with exact shapes from the developer portal
 * or generated from OpenAPI/Swagger if available.
 */

export interface Customer {
  id: number | string;
  name: string;
  primaryPhone?: string;
  email?: string;
  status?: string;
  createdOn?: string;
  // Add more fields as needed
}

export interface Job {
  id: number | string;
  customerId: number | string;
  status: string;
  scheduledDate?: string;
  technicianId?: number | string;
  description?: string;
  // Extend with appointments, lineItems, etc.
}

export interface Appointment {
  id: number | string;
  jobId: number | string;
  technicianId?: number | string;
  startTime?: string;
  endTime?: string;
  status?: string;
}

// Add more interfaces (Technician, Invoice, etc.) as tools are implemented
export interface PaginatedResponse<T> {
  totalCount?: number;
  page?: number;
  pageSize?: number;
  items?: T[];
}
