# Setlist Management API Specification

## Overview

RESTful API for managing band setlists, gigs, and songs. Built with .NET 9 Minimal API and documented using OpenAPI 3.0.

**Base URL**: `https://api.setlist.{domain}/api/v1`  
**Authentication**: Bearer JWT tokens from Azure AD B2C  
**Content-Type**: `application/json`

## Authentication

All endpoints require authentication via JWT Bearer tokens obtained from Azure AD B2C.

```http
Authorization: Bearer {jwt_token}
```

### Error Responses

- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Valid token but insufficient permissions

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

## Songs API

### GET /songs

Retrieve paginated list of songs with optional filtering.

**Query Parameters:**

- `page` (integer, default: 1): Page number
- `pageSize` (integer, default: 20, max: 100): Items per page
- `search` (string): Search by song name or artist
- `readinessStatus` (string): Filter by Ready, InProgress, WishList
- `singer` (string): Filter by main singer

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "songId": 1,
        "name": "Sweet Child O Mine",
        "originalArtist": "Guns N Roses",
        "mainSinger": "John",
        "readinessStatus": "Ready",
        "createdDate": "2025-01-15T10:30:00Z",
        "updatedDate": "2025-01-20T14:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### GET /songs/{id}

Retrieve a specific song by ID.

**Path Parameters:**

- `id` (integer): Song ID

**Response:**

```json
{
  "success": true,
  "data": {
    "songId": 1,
    "name": "Sweet Child O Mine",
    "originalArtist": "Guns N Roses",
    "mainSinger": "John",
    "readinessStatus": "Ready",
    "createdDate": "2025-01-15T10:30:00Z",
    "updatedDate": "2025-01-20T14:15:00Z"
  }
}
```

### POST /songs

Create a new song.

**Request Body:**

```json
{
  "name": "Wonderwall",
  "originalArtist": "Oasis",
  "mainSinger": "Mike",
  "readinessStatus": "Ready"
}
```

**Validation Rules:**

- `name`: Required, 1-200 characters
- `originalArtist`: Required, 1-200 characters
- `mainSinger`: Required, 1-100 characters
- `readinessStatus`: Required, must be "Ready", "InProgress", or "WishList"

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "songId": 25,
    "name": "Wonderwall",
    "originalArtist": "Oasis",
    "mainSinger": "Mike",
    "readinessStatus": "Ready",
    "createdDate": "2025-09-22T15:30:00Z",
    "updatedDate": null
  }
}
```

### PUT /songs/{id}

Update an existing song.

**Path Parameters:**

- `id` (integer): Song ID

**Request Body:**

```json
{
  "name": "Wonderwall (Acoustic)",
  "originalArtist": "Oasis",
  "mainSinger": "Mike",
  "readinessStatus": "Ready"
}
```

**Response:** `200 OK` with updated song data

### DELETE /songs/{id}

Delete a song. Returns error if song is used in any setlists.

**Path Parameters:**

- `id` (integer): Song ID

**Response:** `204 No Content` or `409 Conflict` if song is in use

## Gigs API

### GET /gigs

Retrieve paginated list of gigs with optional filtering.

**Query Parameters:**

- `page` (integer, default: 1): Page number
- `pageSize` (integer, default: 20): Items per page
- `fromDate` (string, ISO 8601): Filter gigs from this date
- `toDate` (string, ISO 8601): Filter gigs until this date
- `venue` (string): Filter by venue name

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "gigId": 1,
        "name": "Summer Festival 2025",
        "date": "2025-07-15T19:00:00Z",
        "venue": "Central Park",
        "notes": "Outdoor stage, 2-hour set",
        "setsCount": 2,
        "createdDate": "2025-06-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 12,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

### GET /gigs/{id}

Retrieve a specific gig with its sets and songs.

**Path Parameters:**

- `id` (integer): Gig ID

**Response:**

```json
{
  "success": true,
  "data": {
    "gigId": 1,
    "name": "Summer Festival 2025",
    "date": "2025-07-15T19:00:00Z",
    "venue": "Central Park",
    "notes": "Outdoor stage, 2-hour set",
    "sets": [
      {
        "setId": 1,
        "setNumber": 1,
        "name": "Opening Set",
        "songs": [
          {
            "setSongId": 1,
            "orderInSet": 1,
            "song": {
              "songId": 2,
              "name": "Wonderwall",
              "originalArtist": "Oasis",
              "mainSinger": "Mike",
              "readinessStatus": "Ready"
            }
          }
        ]
      }
    ],
    "createdDate": "2025-06-01T10:00:00Z"
  }
}
```

### POST /gigs

Create a new gig.

**Request Body:**

```json
{
  "name": "Local Bar Gig",
  "date": "2025-08-02T21:00:00Z",
  "venue": "The Rock House",
  "notes": "Acoustic setup preferred"
}
```

**Validation Rules:**

- `name`: Required, 1-200 characters
- `date`: Required, valid ISO 8601 datetime
- `venue`: Optional, max 200 characters
- `notes`: Optional, max 1000 characters

**Response:** `201 Created` with gig data

### PUT /gigs/{id}

Update an existing gig.

### DELETE /gigs/{id}

Delete a gig and all associated sets/setlists.

## Sets API

### GET /gigs/{gigId}/sets

Retrieve all sets for a specific gig.

**Path Parameters:**

- `gigId` (integer): Gig ID

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "setId": 1,
      "setNumber": 1,
      "name": "Opening Set",
      "gigId": 1,
      "songsCount": 5,
      "createdDate": "2025-06-01T11:00:00Z"
    }
  ]
}
```

### POST /gigs/{gigId}/sets

Create a new set for a gig.

**Path Parameters:**

- `gigId` (integer): Gig ID

**Request Body:**

```json
{
  "setNumber": 2,
  "name": "Main Set"
}
```

**Validation Rules:**

- `setNumber`: Required, 1-3, unique within gig
- `name`: Optional, max 100 characters

### PUT /sets/{id}

Update set details (name only, setNumber cannot be changed).

### DELETE /sets/{id}

Delete a set and all its songs.

## Set Songs API

### POST /sets/{setId}/songs

Add a song to a set.

**Path Parameters:**

- `setId` (integer): Set ID

**Request Body:**

```json
{
  "songId": 15,
  "orderInSet": 3
}
```

**Validation Rules:**

- `songId`: Required, must exist
- `orderInSet`: Required, positive integer, unique within set

### PUT /sets/{setId}/songs/{setSongId}

Update song order within a set.

**Request Body:**

```json
{
  "orderInSet": 1
}
```

### DELETE /sets/{setId}/songs/{setSongId}

Remove a song from a set.

### PUT /sets/{setId}/songs/reorder

Reorder multiple songs within a set.

**Request Body:**

```json
{
  "songOrders": [
    {
      "setSongId": 1,
      "orderInSet": 3
    },
    {
      "setSongId": 2,
      "orderInSet": 1
    },
    {
      "setSongId": 3,
      "orderInSet": 2
    }
  ]
}
```

## Health Check API

### GET /health

System health check endpoint.

**Response:**

```json
{
  "status": "Healthy",
  "version": "1.0.0",
  "timestamp": "2025-09-22T15:30:00Z",
  "components": {
    "database": "Healthy",
    "authentication": "Healthy"
  }
}
```

## Error Codes

| Code                    | Description                       |
| ----------------------- | --------------------------------- |
| `VALIDATION_ERROR`      | Request validation failed         |
| `NOT_FOUND`             | Requested resource not found      |
| `DUPLICATE_ENTRY`       | Resource already exists           |
| `DEPENDENCY_CONFLICT`   | Cannot delete due to dependencies |
| `AUTHENTICATION_FAILED` | Invalid or expired token          |
| `AUTHORIZATION_FAILED`  | Insufficient permissions          |
| `DATABASE_ERROR`        | Database operation failed         |
| `INTERNAL_ERROR`        | Unexpected server error           |

## Rate Limiting

- **Rate Limit**: 100 requests per minute per user
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)

## API Versioning

- **Current Version**: v1
- **Header**: `Accept: application/vnd.setlist.v1+json`
- **URL**: `/api/v1/`

## Testing

### Example cURL Commands

```bash
# Get all songs
curl -H "Authorization: Bearer {token}" \
     "https://api.setlist.{domain}/api/v1/songs"

# Create a new song
curl -X POST \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Song","originalArtist":"Test Artist","mainSinger":"John","readinessStatus":"Ready"}' \
     "https://api.setlist.{domain}/api/v1/songs"

# Get gig with setlists
curl -H "Authorization: Bearer {token}" \
     "https://api.setlist.{domain}/api/v1/gigs/1"
```

### Postman Collection

A complete Postman collection is available at `/docs/postman-collection.json` with example requests for all endpoints.
