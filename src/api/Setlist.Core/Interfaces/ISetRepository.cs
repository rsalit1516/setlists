using Setlist.Core.Entities;
using Setlist.Core.DTOs;

namespace Setlist.Core.Interfaces;

public interface ISetRepository
{
    Task<ApiResponse<PaginatedResult<SetDto>>> GetSetsAsync(int page = 1, int pageSize = 20);
    Task<ApiResponse<SetDto?>> GetSetByIdAsync(int id);
    Task<ApiResponse<SetDto>> CreateSetAsync(CreateSetDto set);
    Task<ApiResponse<SetDto>> UpdateSetAsync(int id, UpdateSetDto set);
    Task<ApiResponse<bool>> DeleteSetAsync(int id);
    Task<ApiResponse<List<SetDto>>> GetSetsByGigIdAsync(int gigId);
    Task<ApiResponse<SetDto>> AddSongToSetAsync(int setId, int songId, int order);
    Task<ApiResponse<bool>> RemoveSongFromSetAsync(int setId, int songId);
    Task<ApiResponse<SetDto>> ReorderSetSongsAsync(int setId, List<SetSongOrderDto> songOrders);
}