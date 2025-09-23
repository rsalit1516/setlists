namespace Setlist.Core.Enums;

/// <summary>
/// Represents the readiness status of a song
/// </summary>
public enum ReadinessStatus
{
    /// <summary>
    /// Song is ready for performance
    /// </summary>
    Ready,

    /// <summary>
    /// Song is being learned/practiced
    /// </summary>
    InProgress,

    /// <summary>
    /// Song is on the wish list to learn
    /// </summary>
    WishList
}