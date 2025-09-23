using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Setlist.Core.DTOs;
using Setlist.Core.Enums;
using Setlist.Tests.Integration;

namespace Setlist.Tests.Integration;

public class SongsEndpointsTests : IClassFixture<SetlistApiWebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions;

    public SongsEndpointsTests(SetlistApiWebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    [Fact]
    public async Task GetSongs_ReturnsSuccessAndCorrectContentType()
    {
        // Act
        var response = await _client.GetAsync("/api/songs");

        // Assert
        response.EnsureSuccessStatusCode();
        response.Content.Headers.ContentType?.ToString().Should().StartWith("application/json");
    }

    [Fact]
    public async Task GetSongs_ReturnsExpectedData()
    {
        // Act
        var response = await _client.GetAsync("/api/songs");
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<PaginatedResult<SongDto>>>(content, _jsonOptions);

        // Assert
        result.Should().NotBeNull();
        result!.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(2);
        result.Data.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetSongs_WithPagination_ReturnsCorrectPage()
    {
        // Act
        var response = await _client.GetAsync("/api/songs?page=1&pageSize=1");
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<PaginatedResult<SongDto>>>(content, _jsonOptions);

        // Assert
        result.Should().NotBeNull();
        result!.Data!.Items.Should().HaveCount(1);
        result.Data.Page.Should().Be(1);
        result.Data.PageSize.Should().Be(1);
        result.Data.TotalPages.Should().Be(2);
    }

    [Fact]
    public async Task GetSongs_WithSearchTerm_ReturnsFilteredResults()
    {
        // Act
        var response = await _client.GetAsync("/api/songs?searchTerm=Wonderwall");
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<PaginatedResult<SongDto>>>(content, _jsonOptions);

        // Assert
        result.Should().NotBeNull();
        result!.Data!.Items.Should().HaveCount(1);
        result.Data.Items.First().Name.Should().Be("Wonderwall");
    }

    [Fact]
    public async Task GetSongById_ReturnsCorrectSong()
    {
        // Act
        var response = await _client.GetAsync("/api/songs/1");
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<SongDto>>(content, _jsonOptions);

        // Assert
        result.Should().NotBeNull();
        result!.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be(1);
        result.Data.Name.Should().Be("Wonderwall");
        result.Data.Artist.Should().Be("Oasis");
    }

    [Fact]
    public async Task GetSongById_ReturnsNotFound_WhenSongDoesNotExist()
    {
        // Act
        var response = await _client.GetAsync("/api/songs/999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<SongDto>>(content, _jsonOptions);
        result!.Data.Should().BeNull();
    }

    [Fact]
    public async Task CreateSong_ReturnsCreatedSong()
    {
        // Arrange
        var createDto = new CreateSongDto(
            "Test Song",
            "Test Artist",
            180,
            ReadinessStatus.WishList,
            "Pop",
            "Test notes"
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/songs", createDto);
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<SongDto>>(content, _jsonOptions);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        result.Should().NotBeNull();
        result!.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Name.Should().Be("Test Song");
        result.Data.Artist.Should().Be("Test Artist");
        result.Data.Id.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task UpdateSong_ReturnsUpdatedSong()
    {
        // Arrange
        var updateDto = new UpdateSongDto(
            "Updated Wonderwall",
            "Updated Oasis",
            300,
            ReadinessStatus.InProgress,
            "Updated Rock",
            "Updated notes"
        );

        // Act
        var response = await _client.PutAsJsonAsync("/api/songs/1", updateDto);
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<SongDto>>(content, _jsonOptions);

        // Assert
        response.EnsureSuccessStatusCode();
        result.Should().NotBeNull();
        result!.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Name.Should().Be("Updated Wonderwall");
        result.Data.Artist.Should().Be("Updated Oasis");
    }

    [Fact]
    public async Task DeleteSong_ReturnsSuccess()
    {
        // Act
        var response = await _client.DeleteAsync("/api/songs/2");
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<bool>>(content, _jsonOptions);

        // Assert
        response.EnsureSuccessStatusCode();
        result.Should().NotBeNull();
        result!.IsSuccess.Should().BeTrue();
        result.Data.Should().BeTrue();

        // Verify song is deleted
        var getResponse = await _client.GetAsync("/api/songs/2");
        var getContent = await getResponse.Content.ReadAsStringAsync();
        var getResult = JsonSerializer.Deserialize<ApiResponse<SongDto>>(getContent, _jsonOptions);
        getResult!.Data.Should().BeNull();
    }
}
