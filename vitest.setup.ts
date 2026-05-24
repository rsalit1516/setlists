// Prevent lib/db.ts from throwing at import time; Prisma doesn't connect until a query runs.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/testdb'

import '@testing-library/jest-dom'
