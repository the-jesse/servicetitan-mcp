# Tool Reference - servicetitan-mcp

This document lists all available tools with descriptions, parameters, and usage notes. It is intended for both developers and AI agents.

## Core / Meta
- `servicetitan___ping` — Health check. No parameters required.

## Customer Tools
- `servicetitan___search_customers`
  - **Description**: Search customers with filters (name, phone, status, etc.).
  - **Parameters**: `query`, `status`, `page`, `pageSize`, `includeRelated`
  - **Returns**: Paginated list of customers.
  - **Notes**: Use before creating jobs or appointments.

- `servicetitan___get_customer`
  - **Description**: Get full details for a customer by ID.
  - **Parameters**: `customerId`, `includeRelated`
  - **Returns**: Detailed customer object.

## Job Tools
- `servicetitan___search_jobs`
  - **Description**: Search jobs with rich filters (status, date range, customer, technician).
  - **Parameters**: `status`, `dateFrom`, `dateTo`, `customerId`, `technicianId`, `page`, `pageSize`, `includeRelated`
  - **Returns**: Paginated jobs.
  - **Notes**: One of the most frequently used tools for operations and reporting.

- `servicetitan___get_job`
  - **Description**: Retrieve full job details including related data.
  - **Parameters**: `jobId`, `includeRelated`
  - **Returns**: Detailed job object.

## Appointment Tools
- `servicetitan___search_appointments`
  - **Description**: Search appointments by date, job, technician, or customer.
  - **Parameters**: `dateFrom`, `dateTo`, `jobId`, `technicianId`, `customerId`, `page`, `pageSize`
  - **Returns**: Paginated appointments.

## Planned / TODO Tools
- `create_job`, `update_job_status`, `assign_technician`
- `create_appointment`, `reschedule_appointment`
- Technician availability and search tools
- Invoice and payment tools
- Webhook registration tools

**Note**: Exact parameter names and response shapes should be verified against the ServiceTitan developer portal for your specific version.