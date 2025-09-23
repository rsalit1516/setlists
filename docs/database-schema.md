# Database Schema Documentation

## Overview

The setlist management system uses Azure SQL Database with Entity Framework Core for data access. The schema is designed to support the core functionality while remaining flexible for future enhancements.

## Entity Relationship Diagram

```
Songs (Master Song Library)
├── SongId (PK)
├── Name
├── OriginalArtist
├── MainSinger
├── ReadinessStatus
└── CreatedDate

Gigs (Performance Events)
├── GigId (PK)
├── Name
├── Date
├── Venue
├── Notes
└── CreatedDate

Sets (Performance Sets within Gigs)
├── SetId (PK)
├── GigId (FK → Gigs.GigId)
├── SetNumber (1-3)
├── Name
└── CreatedDate

SetSongs (Songs in Sets with Order)
├── SetSongId (PK)
├── SetId (FK → Sets.SetId)
├── SongId (FK → Songs.SongId)
├── OrderInSet
└── CreatedDate
```

## Table Definitions

### Songs Table

Stores the master library of all songs the band can perform.

| Column          | Type          | Constraints                    | Description                 |
| --------------- | ------------- | ------------------------------ | --------------------------- |
| SongId          | int           | PK, Identity                   | Unique identifier           |
| Name            | nvarchar(200) | NOT NULL                       | Song title                  |
| OriginalArtist  | nvarchar(200) | NOT NULL                       | Original performing artist  |
| MainSinger      | nvarchar(100) | NOT NULL                       | Band member who sings lead  |
| ReadinessStatus | nvarchar(20)  | NOT NULL                       | Ready, InProgress, WishList |
| CreatedDate     | datetime2     | NOT NULL, Default GETUTCDATE() | Record creation timestamp   |
| UpdatedDate     | datetime2     | NULL                           | Last modification timestamp |

**Indexes:**

- Clustered: SongId (Primary Key)
- Non-clustered: Name (for search performance)
- Non-clustered: ReadinessStatus (for filtering)

### Gigs Table

Stores information about performance events.

| Column      | Type           | Constraints                    | Description                 |
| ----------- | -------------- | ------------------------------ | --------------------------- |
| GigId       | int            | PK, Identity                   | Unique identifier           |
| Name        | nvarchar(200)  | NOT NULL                       | Gig/event name              |
| Date        | datetime2      | NOT NULL                       | Performance date and time   |
| Venue       | nvarchar(200)  | NULL                           | Performance location        |
| Notes       | nvarchar(1000) | NULL                           | Additional gig information  |
| CreatedDate | datetime2      | NOT NULL, Default GETUTCDATE() | Record creation timestamp   |
| UpdatedDate | datetime2      | NULL                           | Last modification timestamp |

**Indexes:**

- Clustered: GigId (Primary Key)
- Non-clustered: Date (for chronological queries)

### Sets Table

Stores the sets within each gig (typically 1-3 sets per gig).

| Column      | Type          | Constraints                    | Description               |
| ----------- | ------------- | ------------------------------ | ------------------------- |
| SetId       | int           | PK, Identity                   | Unique identifier         |
| GigId       | int           | FK, NOT NULL                   | Reference to parent gig   |
| SetNumber   | int           | NOT NULL                       | Set sequence (1, 2, 3)    |
| Name        | nvarchar(100) | NULL                           | Optional set name         |
| CreatedDate | datetime2     | NOT NULL, Default GETUTCDATE() | Record creation timestamp |

**Constraints:**

- Foreign Key: GigId → Gigs.GigId (CASCADE DELETE)
- Unique: (GigId, SetNumber) - ensures no duplicate set numbers per gig
- Check: SetNumber BETWEEN 1 AND 3

**Indexes:**

- Clustered: SetId (Primary Key)
- Non-clustered: (GigId, SetNumber)

### SetSongs Table

Junction table storing which songs are in which sets and their order.

| Column      | Type      | Constraints                    | Description               |
| ----------- | --------- | ------------------------------ | ------------------------- |
| SetSongId   | int       | PK, Identity                   | Unique identifier         |
| SetId       | int       | FK, NOT NULL                   | Reference to set          |
| SongId      | int       | FK, NOT NULL                   | Reference to song         |
| OrderInSet  | int       | NOT NULL                       | Song position within set  |
| CreatedDate | datetime2 | NOT NULL, Default GETUTCDATE() | Record creation timestamp |

**Constraints:**

- Foreign Key: SetId → Sets.SetId (CASCADE DELETE)
- Foreign Key: SongId → Songs.SongId (RESTRICT DELETE)
- Unique: (SetId, SongId) - prevents duplicate songs in same set
- Unique: (SetId, OrderInSet) - ensures unique ordering within set

**Indexes:**

- Clustered: SetSongId (Primary Key)
- Non-clustered: (SetId, OrderInSet) - for ordered retrieval
- Non-clustered: SongId - for song usage queries

## Relationships

### One-to-Many Relationships

- **Gigs → Sets**: One gig can have multiple sets (1-3)
- **Sets → SetSongs**: One set can have multiple songs
- **Songs → SetSongs**: One song can be in multiple sets

### Business Rules Enforced by Schema

1. **Set Numbering**: Sets must be numbered 1-3 within each gig
2. **Song Uniqueness**: A song cannot appear twice in the same set
3. **Order Uniqueness**: No two songs can have the same order within a set
4. **Referential Integrity**:
   - Deleting a gig removes all its sets and set songs
   - Deleting a set removes all its set songs
   - Songs cannot be deleted if they're used in any sets

## Sample Data

### Songs

```sql
INSERT INTO Songs (Name, OriginalArtist, MainSinger, ReadinessStatus) VALUES
('Sweet Child O Mine', 'Guns N Roses', 'John', 'Ready'),
('Wonderwall', 'Oasis', 'Mike', 'Ready'),
('Hotel California', 'Eagles', 'Sarah', 'InProgress'),
('Bohemian Rhapsody', 'Queen', 'John', 'WishList');
```

### Gigs

```sql
INSERT INTO Gigs (Name, Date, Venue, Notes) VALUES
('Summer Festival 2025', '2025-07-15 19:00:00', 'Central Park', 'Outdoor stage, 2-hour set'),
('Local Bar Gig', '2025-08-02 21:00:00', 'The Rock House', 'Acoustic setup preferred');
```

### Sets and SetSongs

```sql
-- Sets for Summer Festival
INSERT INTO Sets (GigId, SetNumber, Name) VALUES
(1, 1, 'Opening Set'),
(1, 2, 'Main Set');

-- Songs in Opening Set
INSERT INTO SetSongs (SetId, SongId, OrderInSet) VALUES
(1, 2, 1), -- Wonderwall first
(1, 1, 2); -- Sweet Child O Mine second

-- Songs in Main Set
INSERT INTO SetSongs (SetId, SongId, OrderInSet) VALUES
(2, 3, 1), -- Hotel California first
(2, 1, 2); -- Sweet Child O Mine second
```

## Migration Strategy

### Initial Database Creation

```sql
-- Enable snapshot isolation for better concurrency
ALTER DATABASE [SetlistDB] SET ALLOW_SNAPSHOT_ISOLATION ON;
ALTER DATABASE [SetlistDB] SET READ_COMMITTED_SNAPSHOT ON;
```

### Performance Considerations

- **Connection Pooling**: Use Entity Framework connection pooling
- **Query Optimization**: Indexes on frequently searched columns
- **Pagination**: Implement pagination for song lists
- **Caching**: Consider Redis for frequently accessed data if needed

### Backup and Recovery

- **Point-in-time recovery**: Enable for production
- **Automated backups**: Daily full backup, transaction log backup every 15 minutes
- **Retention**: 30 days for production data

## Future Schema Extensions

### Planned Enhancements

1. **Lyrics Table**: Store song lyrics

   ```sql
   ALTER TABLE Songs ADD LyricsText nvarchar(max) NULL;
   ```

2. **Performance History**: Track actual performances

   ```sql
   CREATE TABLE Performances (
       PerformanceId int IDENTITY(1,1) PRIMARY KEY,
       GigId int NOT NULL,
       ActualDate datetime2 NOT NULL,
       Notes nvarchar(1000) NULL
   );
   ```

3. **User Management**: When authentication is added
   ```sql
   CREATE TABLE Users (
       UserId int IDENTITY(1,1) PRIMARY KEY,
       Email nvarchar(255) NOT NULL,
       DisplayName nvarchar(100) NOT NULL,
       AzureAdObjectId nvarchar(50) NOT NULL
   );
   ```

## Deployment Notes

### Azure SQL Database Configuration

- **Service Tier**: Basic (5 DTU) for development
- **Storage**: 2GB initial allocation
- **Backup**: Geo-redundant backup storage
- **Firewall**: Configure for Azure services and development IPs

### Connection String Format

```
Server=tcp:{server}.database.windows.net,1433;Initial Catalog={database};Persist Security Info=False;User ID={username};Password={password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```
