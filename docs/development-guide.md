# Development Guide

## Getting Started

This guide covers setting up the development environment, coding standards, testing practices, and development workflows for the Setlist Management System.

## Prerequisites

### Required Software

- **.NET 9 SDK**: [Download here](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Node.js 18+**: [Download here](https://nodejs.org/)
- **Angular CLI 18+**: `npm install -g @angular/cli@latest`
- **Azure CLI**: [Installation guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- **Git**: [Download here](https://git-scm.com/)

### Development Tools

- **Visual Studio Code** or **Visual Studio 2022**
- **Azure Data Studio** or **SQL Server Management Studio**
- **Postman** or **Thunder Client** (for API testing)

### Azure Services (Development)

- Azure AD B2C tenant
- Azure SQL Database (Basic tier)
- Azure Storage Account (optional for local development)

## Project Structure

```
setlist/
├── src/
│   ├── api/                     # .NET 9 Minimal API
│   │   ├── Setlist.Api/         # Main API project
│   │   ├── Setlist.Core/        # Business logic and entities
│   │   ├── Setlist.Data/        # Data access layer
│   │   └── Setlist.Tests/       # Unit and integration tests
│   └── frontend/                # Angular 18 application
│       ├── src/
│       │   ├── app/
│       │   ├── assets/
│       │   └── environments/
│       ├── package.json
│       └── angular.json
├── docs/                        # Documentation
├── .github/workflows/           # CI/CD pipelines
├── README.md
└── setlist.sln                 # Solution file
```

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/{username}/setlist.git
cd setlist
```

### 2. Backend Setup (.NET API)

#### Install Dependencies

```bash
cd src/api
dotnet restore
```

#### Database Setup

```bash
# Install Entity Framework tools
dotnet tool install --global dotnet-ef

# Create local database (using LocalDB)
dotnet ef database update --project Setlist.Data --startup-project Setlist.Api

# Or use Azure SQL Database for development
# Update connection string in appsettings.Development.json
```

#### Configuration

Create `src/api/Setlist.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=SetlistDB;Trusted_Connection=true;MultipleActiveResultSets=true"
  },
  "AzureAdB2C": {
    "Domain": "your-tenant.onmicrosoft.com",
    "TenantId": "your-tenant-id",
    "ClientId": "your-api-client-id",
    "SignUpSignInPolicyId": "B2C_1_SignUpSignIn"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Cors": {
    "AllowedOrigins": ["http://localhost:4200"]
  }
}
```

#### Run API

```bash
cd src/api/Setlist.Api
dotnet run
# API will be available at https://localhost:7000
```

### 3. Frontend Setup (Angular)

#### Install Dependencies

```bash
cd src/frontend
npm install
```

#### Configuration

Update `src/frontend/src/environments/environment.development.ts`:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: "https://localhost:7000/api/v1",
  azureAdB2C: {
    tenantName: "your-tenant",
    clientId: "your-frontend-client-id",
    signUpSignInPolicy: "B2C_1_SignUpSignIn",
    redirectUri: "http://localhost:4200/auth/callback",
  },
};
```

#### Run Frontend

```bash
cd src/frontend
ng serve
# Application will be available at http://localhost:4200
```

## Development Workflow

### Git Workflow

1. **Feature Branches**: Create feature branches from `main`
2. **Naming Convention**: `feature/song-management`, `bugfix/auth-issue`
3. **Pull Requests**: All changes must go through PR review
4. **Commit Messages**: Use conventional commits format

#### Conventional Commits Format

```
type(scope): description

feat(api): add song CRUD endpoints
fix(frontend): resolve authentication redirect issue
docs(readme): update setup instructions
test(api): add unit tests for song service
```

### Development Tasks

#### Backend Development

```bash
# Create new migration
dotnet ef migrations add AddSongEntity --project Setlist.Data --startup-project Setlist.Api

# Update database
dotnet ef database update --project Setlist.Data --startup-project Setlist.Api

# Run tests
dotnet test

# Run with watch mode
dotnet watch run --project Setlist.Api
```

#### Frontend Development

```bash
# Generate new component
ng generate component components/song-list

# Generate new service
ng generate service services/song

# Generate new model
ng generate interface models/song

# Run tests
npm test

# Run e2e tests
npm run e2e

# Build for production
npm run build:prod
```

## Coding Standards

### .NET API Standards

#### Project Structure

```
Setlist.Api/
├── Controllers/         # API controllers (if needed)
├── Endpoints/          # Minimal API endpoint definitions
├── Middleware/         # Custom middleware
├── Extensions/         # Extension methods
└── Program.cs          # Application entry point

Setlist.Core/
├── Entities/           # Domain entities
├── Services/           # Business logic services
├── Interfaces/         # Service contracts
├── DTOs/              # Data transfer objects
├── Validators/         # Input validation
└── Exceptions/         # Custom exceptions

Setlist.Data/
├── Context/            # Entity Framework context
├── Configurations/     # Entity configurations
├── Repositories/       # Data access repositories
├── Migrations/         # EF migrations
└── Seed/              # Database seeding
```

#### Naming Conventions

- **Classes**: PascalCase (`SongService`, `GigRepository`)
- **Methods**: PascalCase (`GetSongAsync`, `CreateGig`)
- **Properties**: PascalCase (`SongId`, `Name`)
- **Parameters**: camelCase (`songId`, `gigName`)
- **Private fields**: \_camelCase (`_logger`, `_context`)

#### Code Style

```csharp
// Use explicit types for clarity
Song song = new Song();

// Use var for obvious types
var songs = new List<Song>();

// Async methods should return Task/Task<T>
public async Task<Song> GetSongAsync(int songId)
{
    return await _context.Songs.FindAsync(songId);
}

// Use nullable reference types
public class Song
{
    public int SongId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
```

### Angular Frontend Standards

#### Project Structure

```
src/app/
├── core/               # Core module (singleton services)
│   ├── services/       # Core services (auth, http interceptors)
│   ├── guards/         # Route guards
│   └── interceptors/   # HTTP interceptors
├── shared/             # Shared module (reusable components)
│   ├── components/     # Reusable components
│   ├── pipes/          # Custom pipes
│   └── validators/     # Custom validators
├── features/           # Feature modules
│   ├── songs/          # Song management feature
│   ├── gigs/           # Gig management feature
│   └── setlists/       # Setlist management feature
├── models/             # TypeScript interfaces/types
└── environments/       # Environment configurations
```

#### Naming Conventions

- **Components**: kebab-case (`song-list.component.ts`)
- **Services**: camelCase (`songService`)
- **Interfaces**: PascalCase with 'I' prefix (`ISong`, `IGig`)
- **Variables**: camelCase (`songName`, `gigDate`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)

#### Code Style

```typescript
// Use interfaces for type safety
interface Song {
  songId: number;
  name: string;
  originalArtist: string;
  mainSinger: string;
  readinessStatus: ReadinessStatus;
}

// Use enums for constants
enum ReadinessStatus {
  Ready = 'Ready',
  InProgress = 'InProgress',
  WishList = 'WishList'
}

// Use reactive forms
createSongForm(): FormGroup {
  return this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    originalArtist: ['', [Validators.required, Validators.maxLength(200)]],
    mainSinger: ['', [Validators.required, Validators.maxLength(100)]],
    readinessStatus: [ReadinessStatus.Ready, Validators.required]
  });
}
```

## Testing Standards

### Backend Testing (.NET)

#### Unit Testing Setup

```csharp
// Use xUnit, FluentAssertions, and Moq
[Fact]
public async Task GetSongAsync_WithValidId_ReturnsSong()
{
    // Arrange
    var songId = 1;
    var expectedSong = new Song { SongId = songId, Name = "Test Song" };
    _mockRepository.Setup(r => r.GetByIdAsync(songId))
                  .ReturnsAsync(expectedSong);

    // Act
    var result = await _songService.GetSongAsync(songId);

    // Assert
    result.Should().NotBeNull();
    result.SongId.Should().Be(songId);
    result.Name.Should().Be("Test Song");
}
```

#### Integration Testing

```csharp
[Collection("DatabaseCollection")]
public class SongEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public SongEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetSongs_ReturnsSuccessStatusCode()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/songs");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

### Frontend Testing (Angular)

#### Unit Testing with Jasmine/Karma

```typescript
describe("SongListComponent", () => {
  let component: SongListComponent;
  let fixture: ComponentFixture<SongListComponent>;
  let mockSongService: jasmine.SpyObj<SongService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj("SongService", ["getSongs"]);

    TestBed.configureTestingModule({
      declarations: [SongListComponent],
      providers: [{ provide: SongService, useValue: spy }],
    });

    fixture = TestBed.createComponent(SongListComponent);
    component = fixture.componentInstance;
    mockSongService = TestBed.inject(
      SongService
    ) as jasmine.SpyObj<SongService>;
  });

  it("should load songs on init", () => {
    // Arrange
    const mockSongs: Song[] = [
      {
        songId: 1,
        name: "Test Song",
        originalArtist: "Test Artist",
        mainSinger: "John",
        readinessStatus: ReadinessStatus.Ready,
      },
    ];
    mockSongService.getSongs.and.returnValue(of(mockSongs));

    // Act
    component.ngOnInit();

    // Assert
    expect(component.songs).toEqual(mockSongs);
    expect(mockSongService.getSongs).toHaveBeenCalled();
  });
});
```

#### E2E Testing with Cypress

```typescript
describe("Song Management", () => {
  beforeEach(() => {
    cy.visit("/songs");
    cy.login(); // Custom command for authentication
  });

  it("should create a new song", () => {
    cy.get("[data-cy=add-song-button]").click();
    cy.get("[data-cy=song-name-input]").type("Test Song");
    cy.get("[data-cy=original-artist-input]").type("Test Artist");
    cy.get("[data-cy=main-singer-select]").select("John");
    cy.get("[data-cy=readiness-status-select]").select("Ready");
    cy.get("[data-cy=save-button]").click();

    cy.get("[data-cy=song-list]").should("contain", "Test Song");
  });
});
```

## API Testing

### Postman Collection

Create comprehensive Postman collections for:

- Authentication flows
- CRUD operations for all entities
- Error scenarios
- Performance testing

### Example Test Scripts

```javascript
// Postman test script example
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has correct structure", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("success");
  pm.expect(jsonData).to.have.property("data");
  pm.expect(jsonData.success).to.be.true;
});

pm.test("Song has required properties", function () {
  const song = pm.response.json().data;
  pm.expect(song).to.have.property("songId");
  pm.expect(song).to.have.property("name");
  pm.expect(song).to.have.property("originalArtist");
});
```

## Performance Guidelines

### Backend Performance

- Use async/await for all I/O operations
- Implement pagination for list endpoints
- Use Entity Framework query optimization
- Add response caching where appropriate
- Monitor database query performance

### Frontend Performance

- Use OnPush change detection strategy
- Implement lazy loading for feature modules
- Use trackBy functions in \*ngFor loops
- Optimize bundle size with tree shaking
- Implement service worker for caching

## Security Guidelines

### Backend Security

- Validate all input data
- Use parameterized queries (Entity Framework handles this)
- Implement proper error handling (don't expose sensitive information)
- Use HTTPS in all environments
- Implement rate limiting
- Add security headers

### Frontend Security

- Sanitize user input
- Use Angular's built-in XSS protection
- Implement Content Security Policy
- Validate data from API responses
- Secure authentication token storage

## Debugging

### Backend Debugging

```bash
# Enable detailed logging
export ASPNETCORE_ENVIRONMENT=Development

# Debug Entity Framework queries
export Logging__LogLevel__Microsoft.EntityFrameworkCore=Information

# Use VS Code debugging
# Create launch.json configuration for API debugging
```

### Frontend Debugging

```bash
# Enable Angular debugging
ng serve --source-map

# Use browser developer tools
# Install Angular DevTools extension
# Use Redux DevTools for state management
```

## Common Issues and Solutions

### Database Connection Issues

```bash
# Test connection string
dotnet ef database update --verbose

# Check firewall rules for Azure SQL
# Verify authentication method (SQL auth vs Azure AD)
```

### CORS Issues

```csharp
// Ensure CORS is properly configured
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
```

### Authentication Issues

```typescript
// Check token expiration
// Verify B2C configuration
// Ensure redirect URIs match exactly
```

## Resources

### Documentation

- [.NET 9 Documentation](https://docs.microsoft.com/en-us/dotnet/)
- [Angular Documentation](https://angular.io/docs)
- [Azure AD B2C Documentation](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)
- [Entity Framework Core Documentation](https://docs.microsoft.com/en-us/ef/core/)

### Tools

- [.NET CLI Reference](https://docs.microsoft.com/en-us/dotnet/core/tools/)
- [Angular CLI Reference](https://angular.io/cli)
- [Azure CLI Reference](https://docs.microsoft.com/en-us/cli/azure/)

### Best Practices

- [.NET API Guidelines](https://github.com/microsoft/api-guidelines)
- [Angular Style Guide](https://angular.io/guide/styleguide)
- [REST API Design Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)
