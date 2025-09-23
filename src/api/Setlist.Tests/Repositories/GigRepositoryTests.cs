using FluentAssertions;
using Setlist.Core.DTOs;
using Setlist.Data.Repositories;
using Setlist.Tests.Helpers;

namespace Setlist.Tests.Repositories;

public class GigRepositoryTests : IDisposable
{
    private readonly GigRepository _repository;
    private readonly Data.Context.SetlistDbContext _context;

    public GigRepositoryTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext($"GigRepositoryTests_{Guid.NewGuid()}");
        TestDbContextFactory.SeedTestData(_context);
        _repository = new GigRepository(_context);
    }

    [Fact]
    public async Task GetGigsAsync_ReturnsAllGigs_WhenNoFilters()
    {
        // Act
        var result = await _repository.GetGigsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(2);
        result.Data.TotalCount.Should().Be(2);
        result.Data.Page.Should().Be(1);
        result.Data.PageSize.Should().Be(20);

        // Verify sets are included
        var gigWithSets = result.Data.Items.FirstOrDefault(g => g.Id == 1);
        gigWithSets.Should().NotBeNull();
        gigWithSets!.Sets.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetGigsAsync_ReturnsPaginatedResults_WhenPageSizeIsSpecified()
    {
        // Act
        var result = await _repository.GetGigsAsync(page: 1, pageSize: 1);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(1);
        result.Data.TotalCount.Should().Be(2);
        result.Data.TotalPages.Should().Be(2);
    }

    [Fact]
    public async Task GetGigByIdAsync_ReturnsGig_WhenIdExists()
    {
        // Act
        var result = await _repository.GetGigByIdAsync(1);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be(1);
        result.Data.Name.Should().Be("Summer Festival");
        result.Data.Venue.Should().Be("Central Park");
        result.Data.Sets.Should().HaveCount(2);

        // Verify set details
        var openingSet = result.Data.Sets.FirstOrDefault(s => s.Name == "Opening Set");
        openingSet.Should().NotBeNull();
        openingSet!.Songs.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetGigByIdAsync_ReturnsNull_WhenIdDoesNotExist()
    {
        // Act
        var result = await _repository.GetGigByIdAsync(999);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().BeNull();
    }

    [Fact]
    public async Task GetUpcomingGigsAsync_ReturnsOnlyUpcomingGigs()
    {
        // Arrange - Add a past gig
        var pastGig = new Core.Entities.Gig
        {
            Name = "Past Gig",
            Venue = "Old Venue",
            Date = DateTime.UtcNow.AddDays(-10),
            Notes = "Already happened",
            CreatedDate = DateTime.UtcNow.AddDays(-15),
            UpdatedDate = DateTime.UtcNow.AddDays(-15)
        };
        _context.Gigs.Add(pastGig);
        await _context.SaveChangesAsync();

        // Act
        var result = await _repository.GetUpcomingGigsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Should().HaveCount(2); // Only the future gigs
        result.Data.Should().OnlyContain(g => g.Date > DateTime.UtcNow);
    }

    [Fact]
    public async Task CreateGigAsync_CreatesGig_WhenValidData()
    {
        // Arrange
        var createDto = new CreateGigDto(
            "New Gig",
            DateTime.UtcNow.AddDays(45),
            "New Venue",
            "New gig notes"
        );

        // Act
        var result = await _repository.CreateGigAsync(createDto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Name.Should().Be("New Gig");
        result.Data.Venue.Should().Be("New Venue");
        result.Data.Date.Should().Be(createDto.Date);
        result.Data.Notes.Should().Be("New gig notes");
        result.Data.Id.Should().BeGreaterThan(0);
        result.Data.Sets.Should().BeEmpty();
    }

    [Fact]
    public async Task UpdateGigAsync_UpdatesGig_WhenValidData()
    {
        // Arrange
        var updateDto = new UpdateGigDto(
            "Updated Summer Festival",
            DateTime.UtcNow.AddDays(35),
            "Updated Central Park",
            "Updated notes"
        );

        // Act
        var result = await _repository.UpdateGigAsync(1, updateDto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be(1);
        result.Data.Name.Should().Be("Updated Summer Festival");
        result.Data.Venue.Should().Be("Updated Central Park");
        result.Data.Date.Should().Be(updateDto.Date);
        result.Data.Notes.Should().Be("Updated notes");
    }

    [Fact]
    public async Task UpdateGigAsync_ReturnsNotFound_WhenIdDoesNotExist()
    {
        // Arrange
        var updateDto = new UpdateGigDto(
            "Updated Gig",
            DateTime.UtcNow.AddDays(35),
            "Updated Venue",
            "Updated notes"
        );

        // Act
        var result = await _repository.UpdateGigAsync(999, updateDto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Gig not found");
    }

    [Fact]
    public async Task DeleteGigAsync_DeletesGig_WhenIdExists()
    {
        // Act
        var result = await _repository.DeleteGigAsync(2); // Delete the gig without sets

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().BeTrue();

        // Verify gig is deleted
        var getResult = await _repository.GetGigByIdAsync(2);
        getResult.Data.Should().BeNull();
    }

    [Fact]
    public async Task DeleteGigAsync_ReturnsNotFound_WhenIdDoesNotExist()
    {
        // Act
        var result = await _repository.DeleteGigAsync(999);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Gig not found");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
