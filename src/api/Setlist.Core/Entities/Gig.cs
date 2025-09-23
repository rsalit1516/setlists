using System.ComponentModel.DataAnnotations;

namespace Setlist.Core.Entities;

/// <summary>
/// Represents a performance event/gig
/// </summary>
public class Gig
{
    /// <summary>
    /// Unique identifier for the gig
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Name of the gig/event
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Date and time of the performance
    /// </summary>
    [Required]
    public DateTime Date { get; set; }

    /// <summary>
    /// Venue where the performance takes place
    /// </summary>
    [MaxLength(200)]
    public string? Venue { get; set; }

    /// <summary>
    /// Additional notes about the gig
    /// </summary>
    [MaxLength(1000)]
    public string? Notes { get; set; }

    /// <summary>
    /// When the gig was created
    /// </summary>
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the gig was last updated
    /// </summary>
    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property for sets in this gig
    /// </summary>
    public virtual ICollection<Set> Sets { get; set; } = new List<Set>();
}