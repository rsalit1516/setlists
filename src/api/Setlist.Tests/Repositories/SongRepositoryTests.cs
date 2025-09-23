using FluentAssertions;
using Setlist.Core.DTOs;
using Setlist.Core.Enums;
using Setlist.Data.Repositories;
using Setlist.Tests.Helpers;

namespace Setlist.Tests.Repositories;

public class SongRepositoryTests : IDisposable
{
    private readonly SongRepository _repository;
    private readonly Data.Context.SetlistDbContext _context;

    public SongRepositoryTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext($"SongRepositoryTests_{Guid.NewGuid()}");
        TestDbContextFactory.SeedTestData(_context);
        _repository = new SongRepository(_context);
    }

    [Fact]
    public async Task GetSongsAsync_ReturnsAllSongs_WhenNoFilters()
    {
        // Act
        var result = await _repository.GetSongsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(3);
        result.Data.TotalCount.Should().Be(3);
        result.Data.Page.Should().Be(1);
        result.Data.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetSongsAsync_ReturnsPaginatedResults_WhenPageSizeIsSpecified()
    {
        // Act
        var result = await _repository.GetSongsAsync(page: 1, pageSize: 2);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(2);
        result.Data.TotalCount.Should().Be(3);
        result.Data.Page.Should().Be(1);
        result.Data.PageSize.Should().Be(2);
    }

    [Fact]
    public async Task GetSongsAsync_FiltersCorrectly_WhenSearchTermProvided()
    {
        // Act
        var result = await _repository.GetSongsAsync(search: "wall");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(1);
        result.Data.Items.First().Name.Should().Be("Wonderwall");
    }

    [Fact]
    public async Task GetSongsAsync_FiltersCorrectly_WhenSearchByArtist()
    {
        // Act
        var result = await _repository.GetSongsAsync(search: "Eagles");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(1);
        result.Data.Items.First().Artist.Should().Be("Eagles");
    }

    [Fact]
    public async Task GetSongsAsync_ReturnsAllSongs_WhenNoReadinessFilter()
    {
        // Act
        var result = await _repository.GetSongsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetSongByIdAsync_ReturnsSong_WhenIdExists()
    {
        // Arrange
        var song = TestDbContextFactory.GetTestSong(_context, "Wonderwall");

        // Act
        var result = await _repository.GetSongByIdAsync(song.Id);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Name.Should().Be("Wonderwall");
        result.Data.Artist.Should().Be("Oasis");
    }

    [Fact]
    public async Task GetSongByIdAsync_ReturnsNull_WhenIdDoesNotExist()
    {
        // Act
        var result = await _repository.GetSongByIdAsync(999);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().BeNull();
    }

    [Fact]
    public async Task CreateSongAsync_CreatesSong_WhenValidData()
    {
        // Arrange
        var createDto = new CreateSongDto(
            "New Song",
            "New Artist",
            240,
            ReadinessStatus.WishList,
            "New song notes",  // Notes parameter
            "Pop"              // Genre parameter
        );

        // Act
        var result = await _repository.CreateSongAsync(createDto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Name.Should().Be("New Song");
        result.Data.Artist.Should().Be("New Artist");
        result.Data.DurationSeconds.Should().Be(240);
        result.Data.ReadinessStatus.Should().Be(ReadinessStatus.WishList);
        result.Data.Notes.Should().Be("New song notes");
        result.Data.Genre.Should().Be("Pop");
        result.Data.Id.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task UpdateSongAsync_UpdatesSong_WhenValidData()
    {
        // Arrange
        var song = TestDbContextFactory.GetTestSong(_context, "Wonderwall");
        var updateDto = new UpdateSongDto(
            "Updated Wonderwall",
            "Updated Oasis",
            300,
            ReadinessStatus.InProgress,
            "Updated notes",    // Notes parameter
            "Updated Rock"      // Genre parameter
        );

        // Act
        var result = await _repository.UpdateSongAsync(song.Id, updateDto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be(song.Id);
        result.Data.Name.Should().Be("Updated Wonderwall");
        result.Data.Artist.Should().Be("Updated Oasis");
        result.Data.DurationSeconds.Should().Be(300);
        result.Data.ReadinessStatus.Should().Be(ReadinessStatus.InProgress);
        result.Data.Notes.Should().Be("Updated notes");
        result.Data.Genre.Should().Be("Updated Rock");
    }

    [Fact]
    public async Task UpdateSongAsync_ReturnsNotFound_WhenIdDoesNotExist()
    {
        // Arrange
        var updateDto = new UpdateSongDto(
            "Updated Song",
            "Updated Artist",
            300,
            ReadinessStatus.Ready,
            "Updated notes",    // Notes parameter
            "Rock"              // Genre parameter
        );

        // Act
        var result = await _repository.UpdateSongAsync(999, updateDto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Song not found");
    }

    [Fact]
    public async Task DeleteSongAsync_DeletesSong_WhenIdExists()
    {
        // Arrange - Create a new song that's not used in any sets
        var createDto = new CreateSongDto(
            "Test Delete Song",
            "Test Artist",
            180,
            ReadinessStatus.WishList,
            "Test notes",
            "Test genre"
        );
        var createResult = await _repository.CreateSongAsync(createDto);
        var songId = createResult.Data!.Id;

        // Act
        var result = await _repository.DeleteSongAsync(songId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().BeTrue();

        // Verify the song is deleted
        var deletedSong = await _repository.GetSongByIdAsync(songId);
        deletedSong.Data.Should().BeNull();
    }

    [Fact]
    public async Task DeleteSongAsync_ReturnsNotFound_WhenIdDoesNotExist()
    {
        // Act
        var result = await _repository.DeleteSongAsync(999);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Song not found");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}