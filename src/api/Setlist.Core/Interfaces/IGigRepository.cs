using Setlist.Core.Entities;
using Setlist.Core.DTOs;

namespace Setlist.Core.Interfaces;

public interface IGigRepository
{
    Task<ApiResponse<PaginatedResult<GigDto>>> GetGigsAsync(int page = 1, int pageSize = 20);
    Task<ApiResponse<GigDto?>> GetGigByIdAsync(int id);
    Task<ApiResponse<GigDto>> CreateGigAsync(CreateGigDto gig);
    Task<ApiResponse<GigDto>> UpdateGigAsync(int id, UpdateGigDto gig);
    Task<ApiResponse<bool>> DeleteGigAsync(int id);
    Task<ApiResponse<List<GigDto>>> GetUpcomingGigsAsync();
}