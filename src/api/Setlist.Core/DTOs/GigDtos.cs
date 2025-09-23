namespace Setlist.Core.DTOs;

/// <summary>
/// Response DTO for gig data
/// </summary>
public record GigDto(
    int Id,
    string Name,
    DateTime Date,
    string? Venue,
    string? Notes,
    List<SetDto> Sets,
    DateTime CreatedDate,
    DateTime UpdatedDate
);

/// <summary>
/// Request DTO for creating gigs
/// </summary>
public record CreateGigDto(
    string Name,
    DateTime Date,
    string? Venue = null,
    string? Notes = null
);

/// <summary>
/// Update DTO for gigs
/// </summary>
public record UpdateGigDto(
    string Name,
    DateTime Date,
    string? Venue = null,
    string? Notes = null
);