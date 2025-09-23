using System.ComponentModel.DataAnnotations;
using Setlist.Core.Enums;

namespace Setlist.Core.Entities;

/// <summary>
/// Represents a song in the band's repertoire
/// </summary>
public class Song
{
    /// <summary>
    /// Unique identifier for the song
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Name of the song
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Artist who performs the song
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Artist { get; set; } = string.Empty;

    /// <summary>
    /// Duration of the song in seconds
    /// </summary>
    [Required]
    public int DurationSeconds { get; set; }

    /// <summary>
    /// Current readiness status of the song
    /// </summary>
    [Required]
    public ReadinessStatus ReadinessStatus { get; set; } = ReadinessStatus.WishList;

    /// <summary>
    /// Optional notes about the song
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Optional genre of the song
    /// </summary>
    public string? Genre { get; set; }

    /// <summary>
    /// When the song was added to the repertoire
    /// </summary>
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the song was last updated
    /// </summary>
    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property for set songs
    /// </summary>
    public virtual ICollection<SetSong> SetSongs { get; set; } = new List<SetSong>();
}