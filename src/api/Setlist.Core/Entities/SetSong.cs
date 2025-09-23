using System.ComponentModel.DataAnnotations;

namespace Setlist.Core.Entities;

/// <summary>
/// Junction table representing songs within sets with their order
/// </summary>
public class SetSong
{
    /// <summary>
    /// Reference to the set
    /// </summary>
    [Required]
    public int SetId { get; set; }

    /// <summary>
    /// Reference to the song
    /// </summary>
    [Required]
    public int SongId { get; set; }

    /// <summary>
    /// Order of the song within the set
    /// </summary>
    [Required]
    [Range(1, int.MaxValue)]
    public int Order { get; set; }

    /// <summary>
    /// Navigation property to the set
    /// </summary>
    public virtual Set Set { get; set; } = null!;

    /// <summary>
    /// Navigation property to the song
    /// </summary>
    public virtual Song Song { get; set; } = null!;
}