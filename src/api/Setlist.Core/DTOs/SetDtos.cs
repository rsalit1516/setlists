namespace Setlist.Core.DTOs;

/// <summary>
/// Response DTO for set data
/// </summary>
public record SetDto(
    int Id,
    string Name,
    int GigId,
    string? Notes,
    List<SetSongDto> Songs,
    DateTime CreatedDate,
    DateTime UpdatedDate
);

/// <summary>
/// Request DTO for creating sets
/// </summary>
public record CreateSetDto(
    string Name,
    int GigId,
    string? Notes = null
);

/// <summary>
/// Update DTO for sets
/// </summary>
public record UpdateSetDto(
    string Name,
    string? Notes = null
);

/// <summary>
/// DTO for set song with song details
/// </summary>
public record SetSongDto(
    int SongId,
    string Name,
    string Artist,
    int DurationSeconds,
    int Order
);

/// <summary>
/// DTO for individual song order
/// </summary>
public record SetSongOrderDto(
    int SongId,
    int Order
);