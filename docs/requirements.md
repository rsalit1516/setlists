# Band Setlist Management System - Requirements Document

## Project Overview

A web application for band setlist management that allows band members to organize gigs, manage songs, and create setlists for performances.

## Business Context

- **Users**: 5 band members
- **Usage**: Few gigs per month (low volume)
- **Primary Goal**: Streamline setlist creation and gig management
- **Future Growth**: Anticipate additional functionality requests

## Functional Requirements

### 1. Song Management

- **Song Entity Properties**:

  - Song Name (required)
  - Original Artist (required)
  - Main Singer (required)
  - Readiness Status (Ready, In Progress, Wish List)
  - Future: Lyrics storage capability

- **Functionality**:
  - Create, read, update, delete songs
  - Filter songs by readiness status
  - Search songs by name or artist
  - Assign main singer to songs

### 2. Gig Management

- **Gig Entity Properties**:

  - Gig Name (required)
  - Date (required)
  - Venue (optional)
  - Notes (optional)

- **Functionality**:
  - Create, read, update, delete gigs
  - View upcoming and past gigs
  - Associate multiple sets with a gig

### 3. Set Management

- **Set Entity Properties**:

  - Set Number (1-3 per gig)
  - Set Name (optional, e.g., "Opening Set", "Main Set")
  - Associated Gig

- **Functionality**:
  - Create 1-3 sets per gig
  - Add/remove songs from sets
  - Reorder songs within a set
  - Move songs between sets

### 4. Setlist Organization

- **Core Features**:
  - Drag-and-drop song ordering within sets
  - Copy songs between sets
  - View complete setlist for a gig
  - Print-friendly setlist view

## Non-Functional Requirements

### 1. Performance

- Response time < 2 seconds for typical operations
- Support for concurrent access by 5 users

### 2. Security

- Azure AD B2C authentication
- Role-based access (all band members have equal access initially)
- Secure API endpoints

### 3. Scalability

- Designed for current team size with room for growth
- Database schema flexible for future features

### 4. Cost Optimization

- Minimize Azure hosting costs
- Consider Azure Static Web Apps + Functions vs Container Apps
- Use Azure SQL Basic tier for development

### 5. Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile and desktop

## Technical Requirements

### 1. Frontend

- **Framework**: Angular 18+ (latest version)
- **UI Library**: Angular Material or Bootstrap
- **State Management**: NgRx (if complexity grows)
- **Testing**: Jasmine/Karma for unit tests

### 2. Backend

- **Framework**: .NET 9 Minimal API
- **Database**: Azure SQL Database
- **ORM**: Entity Framework Core
- **Authentication**: JWT with Azure AD B2C
- **Documentation**: OpenAPI/Swagger
- **Testing**: xUnit with good coverage

### 3. Hosting

- **Frontend**: Azure Static Web Apps
- **Backend**: Azure Functions or Azure Container Apps (cost comparison needed)
- **Database**: Azure SQL Database (Basic tier)
- **CI/CD**: GitHub Actions

## User Stories

### Epic 1: Song Library Management

- As a band member, I want to add new songs to our master list so we can track our repertoire
- As a band member, I want to mark song readiness status so we know what's performance-ready
- As a band member, I want to search for songs quickly so I can find them when creating setlists

### Epic 2: Gig Planning

- As a band member, I want to create a new gig so we can start planning our performance
- As a band member, I want to add venue and date information so we can track our bookings
- As a band member, I want to create multiple sets for a gig so we can organize our performance structure

### Epic 3: Setlist Creation

- As a band member, I want to add songs to sets so we can build our performance lineup
- As a band member, I want to reorder songs within a set so we can optimize flow and energy
- As a band member, I want to move songs between sets so we can balance our performance

### Epic 4: Performance Preparation

- As a band member, I want to view the complete setlist so we can prepare for the gig
- As a band member, I want to print setlists so we can have physical copies during performance
- As a band member, I want to see song details (singer, status) so we know who performs what

## Future Enhancements

- Lyrics storage and display
- Song arrangement notes
- Performance history tracking
- Setlist templates
- Song timing/duration tracking
- Mobile app for stage use
- Integration with music streaming services
- Collaborative setlist planning features

## Success Criteria

- All band members can successfully create and manage setlists
- System supports typical gig preparation workflow
- Cost remains under budget constraints
- Zero data loss or corruption
- 95% uptime availability
