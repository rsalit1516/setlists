using System.ComponentModel.DataAnnotations;

namespace Setlist.Core.Entities;

/// <summary>
/// Represents a set within a gig (typically 1-3 sets per gig)
/// </summary>
public class Set
{
    /// <summary>
    /// Unique identifier for the set
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Reference to the parent gig
    /// </summary>
    [Required]
    public int GigId { get; set; }

    /// <summary>
    /// Name for the set (e.g., "Opening Set", "Main Set")
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional notes about the set
    /// </summary>
    [MaxLength(1000)]
    public string? Notes { get; set; }

    /// <summary>
    /// When the set was created
    /// </summary>
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the set was last updated
    /// </summary>
    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the parent gig
    /// </summary>
    public virtual Gig Gig { get; set; } = null!;

    /// <summary>
    /// Navigation property for songs in this set
    /// </summary>
    public virtual ICollection<SetSong> SetSongs { get; set; } = new List<SetSong>();
}