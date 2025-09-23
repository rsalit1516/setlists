using Setlist.Core.Enums;

namespace Setlist.Core.DTOs;

/// <summary>
/// Response DTO for song data
/// </summary>
public record SongDto(
    int Id,
    string Name,
    string Artist,
    int DurationSeconds,
    ReadinessStatus ReadinessStatus,
    string? Notes,
    string? Genre,
    DateTime CreatedDate,
    DateTime UpdatedDate
);

/// <summary>
/// Request DTO for creating songs
/// </summary>
public record CreateSongDto(
    string Name,
    string Artist,
    int DurationSeconds,
    ReadinessStatus ReadinessStatus,
    string? Notes = null,
    string? Genre = null
);

/// <summary>
/// Update DTO for songs
/// </summary>
public record UpdateSongDto(
    string Name,
    string Artist,
    int DurationSeconds,
    ReadinessStatus ReadinessStatus,
    string? Notes = null,
    string? Genre = null
);