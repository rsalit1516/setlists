using Microsoft.EntityFrameworkCore;
using Setlist.Core.DTOs;
using Setlist.Core.Entities;
using Setlist.Core.Interfaces;
using Setlist.Data.Context;

namespace Setlist.Data.Repositories;

public class GigRepository : IGigRepository
{
    private readonly SetlistDbContext _context;

    public GigRepository(SetlistDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PaginatedResult<GigDto>>> GetGigsAsync(int page = 1, int pageSize = 20)
    {
        try
        {
            var totalCount = await _context.Gigs.CountAsync();
            var gigs = await _context.Gigs
                .Include(g => g.Sets)
                .OrderByDescending(g => g.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(g => new GigDto(
                    g.Id,
                    g.Name,
                    g.Date,
                    g.Venue,
                    g.Notes,
                    g.Sets.Select(s => new SetDto(
                        s.Id,
                        s.Name,
                        s.GigId,
                        s.Notes,
                        s.SetSongs.Select(ss => new SetSongDto(
                            ss.SongId,
                            ss.Song.Name,
                            ss.Song.Artist,
                            ss.Song.DurationSeconds,
                            ss.Order
                        )).OrderBy(ss => ss.Order).ToList(),
                        s.CreatedDate,
                        s.UpdatedDate
                    )).ToList(),
                    g.CreatedDate,
                    g.UpdatedDate
                ))
                .ToListAsync();

            var result = new PaginatedResult<GigDto>
            {
                Items = gigs,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };

            return new ApiResponse<PaginatedResult<GigDto>>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<PaginatedResult<GigDto>>(
                $"Error retrieving gigs: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<GigDto?>> GetGigByIdAsync(int id)
    {
        try
        {
            var gig = await _context.Gigs
                .Include(g => g.Sets)
                    .ThenInclude(s => s.SetSongs)
                        .ThenInclude(ss => ss.Song)
                .Where(g => g.Id == id)
                .Select(g => new GigDto(
                    g.Id,
                    g.Name,
                    g.Date,
                    g.Venue,
                    g.Notes,
                    g.Sets.Select(s => new SetDto(
                        s.Id,
                        s.Name,
                        s.GigId,
                        s.Notes,
                        s.SetSongs.Select(ss => new SetSongDto(
                            ss.SongId,
                            ss.Song.Name,
                            ss.Song.Artist,
                            ss.Song.DurationSeconds,
                            ss.Order
                        )).OrderBy(ss => ss.Order).ToList(),
                        s.CreatedDate,
                        s.UpdatedDate
                    )).ToList(),
                    g.CreatedDate,
                    g.UpdatedDate
                ))
                .FirstOrDefaultAsync();

            return new ApiResponse<GigDto?>(gig);
        }
        catch (Exception ex)
        {
            return new ApiResponse<GigDto?>(
                $"Error retrieving gig: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<GigDto>> CreateGigAsync(CreateGigDto gigDto)
    {
        try
        {
            var gig = new Gig
            {
                Name = gigDto.Name,
                Date = gigDto.Date,
                Venue = gigDto.Venue,
                Notes = gigDto.Notes,
                CreatedDate = DateTime.UtcNow,
                UpdatedDate = DateTime.UtcNow
            };

            _context.Gigs.Add(gig);
            await _context.SaveChangesAsync();

            var result = new GigDto(
                gig.Id,
                gig.Name,
                gig.Date,
                gig.Venue,
                gig.Notes,
                new List<SetDto>(),
                gig.CreatedDate,
                gig.UpdatedDate
            );

            return new ApiResponse<GigDto>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<GigDto>(
                $"Error creating gig: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<GigDto>> UpdateGigAsync(int id, UpdateGigDto gigDto)
    {
        try
        {
            var gig = await _context.Gigs
                .Include(g => g.Sets)
                    .ThenInclude(s => s.SetSongs)
                        .ThenInclude(ss => ss.Song)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (gig == null)
            {
                return new ApiResponse<GigDto>("Gig not found", 404);
            }

            gig.Name = gigDto.Name;
            gig.Date = gigDto.Date;
            gig.Venue = gigDto.Venue;
            gig.Notes = gigDto.Notes;
            gig.UpdatedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = new GigDto(
                gig.Id,
                gig.Name,
                gig.Date,
                gig.Venue,
                gig.Notes,
                gig.Sets.Select(s => new SetDto(
                    s.Id,
                    s.Name,
                    s.GigId,
                    s.Notes,
                    s.SetSongs.Select(ss => new SetSongDto(
                        ss.SongId,
                        ss.Song.Name,
                        ss.Song.Artist,
                        ss.Song.DurationSeconds,
                        ss.Order
                    )).OrderBy(ss => ss.Order).ToList(),
                    s.CreatedDate,
                    s.UpdatedDate
                )).ToList(),
                gig.CreatedDate,
                gig.UpdatedDate
            );

            return new ApiResponse<GigDto>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<GigDto>(
                $"Error updating gig: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<bool>> DeleteGigAsync(int id)
    {
        try
        {
            var gig = await _context.Gigs
                .Include(g => g.Sets)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (gig == null)
            {
                return new ApiResponse<bool>("Gig not found", 404);
            }

            // This will cascade delete sets and set songs due to our EF configuration
            _context.Gigs.Remove(gig);
            await _context.SaveChangesAsync();

            return new ApiResponse<bool>(true);
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>(
                $"Error deleting gig: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<List<GigDto>>> GetUpcomingGigsAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            var gigs = await _context.Gigs
                .Include(g => g.Sets)
                    .ThenInclude(s => s.SetSongs)
                        .ThenInclude(ss => ss.Song)
                .Where(g => g.Date >= now)
                .OrderBy(g => g.Date)
                .Select(g => new GigDto(
                    g.Id,
                    g.Name,
                    g.Date,
                    g.Venue,
                    g.Notes,
                    g.Sets.Select(s => new SetDto(
                        s.Id,
                        s.Name,
                        s.GigId,
                        s.Notes,
                        s.SetSongs.Select(ss => new SetSongDto(
                            ss.SongId,
                            ss.Song.Name,
                            ss.Song.Artist,
                            ss.Song.DurationSeconds,
                            ss.Order
                        )).OrderBy(ss => ss.Order).ToList(),
                        s.CreatedDate,
                        s.UpdatedDate
                    )).ToList(),
                    g.CreatedDate,
                    g.UpdatedDate
                ))
                .ToListAsync();

            return new ApiResponse<List<GigDto>>(gigs);
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<GigDto>>(
                $"Error retrieving upcoming gigs: {ex.Message}",
                500
            );
        }
    }
}