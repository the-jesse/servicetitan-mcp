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
  - **Parameters**: `status`, `dateFrom`, `dateTo`, `customerId`, `technicianId`, `page`, `pageSize`
  - **Returns**: Paginated jobs.
  - **Notes**: One of the most frequently used tools for operations and reporting.

- `servicetitan___get_job`
  - **Description**: Retrieve full job details including related data.
  - **Parameters**: `jobId`, `includeRelated`
  - **Returns**: Detailed job object.

- `servicetitan___create_job`
  - **Description**: Create a new job for a customer with optional technician assignment and scheduling.
  - **Parameters**: `customerId` (required), `jobTypeId`, `priority`, `summary`, `technicianId`, `scheduledStart`, `scheduledEnd`, `locationId`
  - **Returns**: Created job object.
  - **Notes**: Use `search_customers` first to confirm the customer ID.

- `servicetitan___update_job_status`
  - **Description**: Update the status of an existing job (e.g., InProgress, Completed, Canceled).
  - **Parameters**: `jobId` (required), `status` (required), `note`
  - **Returns**: Updated job object.

- `servicetitan___assign_technician`
  - **Description**: Assign a technician to a job or specific appointment.
  - **Parameters**: `jobId` (required), `technicianId` (required), `appointmentId`
  - **Returns**: Updated assignment result.
  - **Notes**: Use `list_technicians` to find available technicians before assigning.

## Appointment Tools
- `servicetitan___search_appointments`
  - **Description**: Search appointments by date, job, technician, or customer.
  - **Parameters**: `dateFrom`, `dateTo`, `jobId`, `technicianId`, `customerId`, `page`, `pageSize`
  - **Returns**: Paginated appointments.

## Technician Tools
- `servicetitan___list_technicians`
  - **Description**: List technicians with optional status filter and pagination.
  - **Parameters**: `status`, `page`, `pageSize`
  - **Returns**: Paginated list of technicians.
  - **Notes**: Use before assigning technicians to jobs or appointments.

## Webhook Tools
- `servicetitan___register_webhook`
  - **Description**: Register a new webhook endpoint for ServiceTitan event subscriptions.
  - **Parameters**: `url` (required, HTTPS), `events` (required, array of event names), `active`
  - **Returns**: Registered webhook details.
  - **Notes**: Supported events include `job.created`, `job.updated`, `appointment.completed`. May require coordination with ServiceTitan support.

- `servicetitan___list_webhooks`
  - **Description**: List currently registered webhooks for the tenant.
  - **Parameters**: None
  - **Returns**: List of registered webhooks.

## Invoice Tools
- `servicetitan___search_invoices`
  - **Description**: Search invoices with filters (status, date range, customer, job).
  - **Parameters**: `status`, `customerId`, `jobId`, `dateFrom`, `dateTo`, `page`, `pageSize`
  - **Returns**: Paginated invoices.
  - **Notes**: High value for financial automation and collections workflows.

## Planned / TODO Tools
- `create_appointment`, `reschedule_appointment`
- `get_technician`, `get_availability`, `find_available_technicians`
- `create_invoice_from_job`, `record_payment`, `get_invoice`

**Note**: Exact parameter names and response shapes should be verified against the ServiceTitan developer portal for your specific version.