using FluentAssertions;
using Setlist.Core.DTOs;
using Setlist.Data.Repositories;
using Setlist.Tests.Helpers;

namespace Setlist.Tests.Repositories;

public class SetRepositoryTests : IDisposable
{
    private readonly SetRepository _repository;
    private readonly Data.Context.SetlistDbContext _context;

    public SetRepositoryTests()
    {
        _context = TestDbContextFactory.CreateInMemoryContext($"SetRepositoryTests_{Guid.NewGuid()}");
        TestDbContextFactory.SeedTestData(_context);
        _repository = new SetRepository(_context);
    }

    [Fact]
    public async Task GetSetsAsync_ReturnsAllSets_WhenNoFilters()
    {
        // Act
        var result = await _repository.GetSetsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(2);
        result.Data.TotalCount.Should().Be(2);
        result.Data.Page.Should().Be(1);
        result.Data.PageSize.Should().Be(20);

        // Verify songs are included
        var setWithSongs = result.Data.Items.FirstOrDefault(s => s.Id == 1);
        setWithSongs.Should().NotBeNull();
        setWithSongs!.Songs.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetSetsAsync_ReturnsPaginatedResults_WhenPageSizeIsSpecified()
    {
        // Act
        var result = await _repository.GetSetsAsync(page: 1, pageSize: 1);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(1);
        result.Data.TotalCount.Should().Be(2);
        result.Data.TotalPages.Should().Be(2);
    }

    [Fact]
    public async Task GetSetByIdAsync_ReturnsSet_WhenIdExists()
    {
        // Act
        var result = await _repository.GetSetByIdAsync(1);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be(1);
        result.Data.Name.Should().Be("Opening Set");
        result.Data.GigId.Should().Be(1);
        result.Data.Songs.Should().HaveCount(2);

        // Verify songs are ordered correctly
        result.Data.Songs.Should().BeInAscendingOrder(s => s.Order);
        result.Data.Songs.First().Order.Should().Be(1);
        result.Data.Songs.Last().Order.Should().Be(2);
    }

    [Fact]
    public async Task GetSetByIdAsync_ReturnsNull_WhenIdDoesNotExist()
    {
        // Act
        var result = await _repository.GetSetByIdAsync(999);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().BeNull();
    }

    [Fact]
    public async Task GetSetsByGigIdAsync_ReturnsSetsByGig()
    {
        // Act
        var result = await _repository.GetSetsByGigIdAsync(1);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Should().HaveCount(2);
        result.Data.Should().OnlyContain(s => s.GigId == 1);

        // Verify both sets are returned
        var setNames = result.Data.Select(s => s.Name).ToList();
        setNames.Should().Contain("Opening Set");
        setNames.Should().Contain("Main Set");
    }

    [Fact]
    public async Task GetSetsByGigIdAsync_ReturnsEmptyList_WhenGigHasNoSets()
    {
        // Act
        var result = await _repository.GetSetsByGigIdAsync(2); // Gig 2 has no sets in seed data

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateSetAsync_CreatesSet_WhenValidData()
    {
        // Arrange
        var createDto = new CreateSetDto(
            "New Set",
            1, // Existing gig
            "New set notes"
        );

        // Act
        var result = await _repository.CreateSetAsync(createDto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Name.Should().Be("New Set");
        result.Data.GigId.Should().Be(1);
        result.Data.Notes.Should().Be("New set notes");
        result.Data.Id.Should().BeGreaterThan(0);
        result.Data.Songs.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateSetAsync_ReturnsNotFound_WhenGigDoesNotExist()
    {
        // Arrange
        var createDto = new CreateSetDto(
            "New Set",
            999, // Non-existent gig
            "New set notes"
        );

        // Act
        var result = await _repository.CreateSetAsync(createDto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Gig not found");
    }

    [Fact]
    public async Task UpdateSetAsync_UpdatesSet_WhenValidData()
    {
        // Arrange
        var updateDto = new UpdateSetDto(
            "Updated Opening Set",
            "Updated notes"
        );

        // Act
        var result = await _repository.UpdateSetAsync(1, updateDto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be(1);
        result.Data.Name.Should().Be("Updated Opening Set");
        result.Data.Notes.Should().Be("Updated notes");
        result.Data.Songs.Should().HaveCount(2); // Songs should remain
    }

    [Fact]
    public async Task UpdateSetAsync_ReturnsNotFound_WhenIdDoesNotExist()
    {
        // Arrange
        var updateDto = new UpdateSetDto(
            "Updated Set",
            "Updated notes"
        );

        // Act
        var result = await _repository.UpdateSetAsync(999, updateDto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Set not found");
    }

    [Fact]
    public async Task DeleteSetAsync_DeletesSet_WhenIdExists()
    {
        // Act
        var result = await _repository.DeleteSetAsync(1);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().BeTrue();

        // Verify set is deleted
        var getResult = await _repository.GetSetByIdAsync(1);
        getResult.Data.Should().BeNull();
    }

    [Fact]
    public async Task DeleteSetAsync_ReturnsNotFound_WhenIdDoesNotExist()
    {
        // Act
        var result = await _repository.DeleteSetAsync(999);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Set not found");
    }

    [Fact]
    public async Task AddSongToSetAsync_AddsSong_WhenValidData()
    {
        // Act - Add song 3 to set 1 at position 3
        var result = await _repository.AddSongToSetAsync(1, 3, 3);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Songs.Should().HaveCount(3);

        var addedSong = result.Data.Songs.FirstOrDefault(s => s.SongId == 3);
        addedSong.Should().NotBeNull();
        addedSong!.Order.Should().Be(3);
    }

    [Fact]
    public async Task AddSongToSetAsync_InsertsAtCorrectPosition_WhenOrderExistsAlready()
    {
        // Act - Add song 3 to set 1 at position 2 (between existing songs)
        var result = await _repository.AddSongToSetAsync(1, 3, 2);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Songs.Should().HaveCount(3);

        // Verify the order adjustment
        var songs = result.Data.Songs.OrderBy(s => s.Order).ToList();
        songs[0].Order.Should().Be(1); // Original first song
        songs[1].Order.Should().Be(2); // New song inserted
        songs[1].SongId.Should().Be(3);
        songs[2].Order.Should().Be(3); // Original second song moved
    }

    [Fact]
    public async Task AddSongToSetAsync_ReturnsNotFound_WhenSetDoesNotExist()
    {
        // Act
        var result = await _repository.AddSongToSetAsync(999, 1, 1);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Set not found");
    }

    [Fact]
    public async Task AddSongToSetAsync_ReturnsNotFound_WhenSongDoesNotExist()
    {
        // Act
        var result = await _repository.AddSongToSetAsync(1, 999, 1);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Song not found");
    }

    [Fact]
    public async Task AddSongToSetAsync_ReturnsBadRequest_WhenSongAlreadyInSet()
    {
        // Act - Try to add song 1 which is already in set 1
        var result = await _repository.AddSongToSetAsync(1, 1, 3);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(400);
        result.ErrorMessage.Should().Be("Song is already in the set");
    }

    [Fact]
    public async Task RemoveSongFromSetAsync_RemovesSong_WhenSongExists()
    {
        // Act - Remove song 1 from set 1
        var result = await _repository.RemoveSongFromSetAsync(1, 1);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().BeTrue();

        // Verify song is removed and order is adjusted
        var setResult = await _repository.GetSetByIdAsync(1);
        setResult.Data!.Songs.Should().HaveCount(1);
        setResult.Data.Songs.First().Order.Should().Be(1); // Remaining song should be order 1
    }

    [Fact]
    public async Task RemoveSongFromSetAsync_ReturnsNotFound_WhenSongNotInSet()
    {
        // Act - Try to remove song 3 which is not in set 1
        var result = await _repository.RemoveSongFromSetAsync(1, 3);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Song not found in set");
    }

    [Fact]
    public async Task ReorderSetSongsAsync_ReordersSongs_WhenValidData()
    {
        // Arrange - Reorder songs in set 1 (swap order)
        var newOrder = new List<SetSongOrderDto>
        {
            new(2, 1), // Song 2 becomes first
            new(1, 2)  // Song 1 becomes second
        };

        // Act
        var result = await _repository.ReorderSetSongsAsync(1, newOrder);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();

        var orderedSongs = result.Data!.Songs.OrderBy(s => s.Order).ToList();
        orderedSongs[0].SongId.Should().Be(2);
        orderedSongs[0].Order.Should().Be(1);
        orderedSongs[1].SongId.Should().Be(1);
        orderedSongs[1].Order.Should().Be(2);
    }

    [Fact]
    public async Task ReorderSetSongsAsync_ReturnsNotFound_WhenSetDoesNotExist()
    {
        // Arrange
        var newOrder = new List<SetSongOrderDto> { new(1, 1) };

        // Act
        var result = await _repository.ReorderSetSongsAsync(999, newOrder);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.StatusCode.Should().Be(404);
        result.ErrorMessage.Should().Be("Set not found");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
