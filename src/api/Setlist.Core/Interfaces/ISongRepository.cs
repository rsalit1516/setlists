using Setlist.Core.Entities;
using Setlist.Core.DTOs;
using Setlist.Core.Enums;

namespace Setlist.Core.Interfaces;

public interface ISongRepository
{
    Task<ApiResponse<PaginatedResult<SongDto>>> GetSongsAsync(int page = 1, int pageSize = 20, string? search = null);
    Task<ApiResponse<SongDto?>> GetSongByIdAsync(int id);
    Task<ApiResponse<SongDto>> CreateSongAsync(CreateSongDto song);
    Task<ApiResponse<SongDto>> UpdateSongAsync(int id, UpdateSongDto song);
    Task<ApiResponse<bool>> DeleteSongAsync(int id);
    Task<ApiResponse<List<SongDto>>> GetSongsByNameAsync(string name);
}