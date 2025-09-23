using Microsoft.EntityFrameworkCore;
using Setlist.Core.DTOs;
using Setlist.Core.Entities;
using Setlist.Core.Interfaces;
using Setlist.Data.Context;

namespace Setlist.Data.Repositories;

public class SetRepository : ISetRepository
{
    private readonly SetlistDbContext _context;

    public SetRepository(SetlistDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PaginatedResult<SetDto>>> GetSetsAsync(int page = 1, int pageSize = 20)
    {
        try
        {
            var totalCount = await _context.Sets.CountAsync();
            var sets = await _context.Sets
                .Include(s => s.SetSongs)
                    .ThenInclude(ss => ss.Song)
                .OrderByDescending(s => s.CreatedDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new SetDto(
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
                ))
                .ToListAsync();

            var result = new PaginatedResult<SetDto>
            {
                Items = sets,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };

            return new ApiResponse<PaginatedResult<SetDto>>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<PaginatedResult<SetDto>>(
                $"Error retrieving sets: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<SetDto?>> GetSetByIdAsync(int id)
    {
        try
        {
            var set = await _context.Sets
                .Include(s => s.SetSongs)
                    .ThenInclude(ss => ss.Song)
                .Where(s => s.Id == id)
                .Select(s => new SetDto(
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
                ))
                .FirstOrDefaultAsync();

            return new ApiResponse<SetDto?>(set);
        }
        catch (Exception ex)
        {
            return new ApiResponse<SetDto?>(
                $"Error retrieving set: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<SetDto>> CreateSetAsync(CreateSetDto setDto)
    {
        try
        {
            // Verify gig exists
            var gigExists = await _context.Gigs.AnyAsync(g => g.Id == setDto.GigId);
            if (!gigExists)
            {
                return new ApiResponse<SetDto>("Gig not found", 404);
            }

            var set = new Set
            {
                Name = setDto.Name,
                GigId = setDto.GigId,
                Notes = setDto.Notes,
                CreatedDate = DateTime.UtcNow,
                UpdatedDate = DateTime.UtcNow
            };

            _context.Sets.Add(set);
            await _context.SaveChangesAsync();

            var result = new SetDto(
                set.Id,
                set.Name,
                set.GigId,
                set.Notes,
                new List<SetSongDto>(),
                set.CreatedDate,
                set.UpdatedDate
            );

            return new ApiResponse<SetDto>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<SetDto>(
                $"Error creating set: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<SetDto>> UpdateSetAsync(int id, UpdateSetDto setDto)
    {
        try
        {
            var set = await _context.Sets
                .Include(s => s.SetSongs)
                    .ThenInclude(ss => ss.Song)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (set == null)
            {
                return new ApiResponse<SetDto>("Set not found", 404);
            }

            set.Name = setDto.Name;
            set.Notes = setDto.Notes;
            set.UpdatedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = new SetDto(
                set.Id,
                set.Name,
                set.GigId,
                set.Notes,
                set.SetSongs.Select(ss => new SetSongDto(
                    ss.SongId,
                    ss.Song.Name,
                    ss.Song.Artist,
                    ss.Song.DurationSeconds,
                    ss.Order
                )).OrderBy(ss => ss.Order).ToList(),
                set.CreatedDate,
                set.UpdatedDate
            );

            return new ApiResponse<SetDto>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<SetDto>(
                $"Error updating set: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<bool>> DeleteSetAsync(int id)
    {
        try
        {
            var set = await _context.Sets.FindAsync(id);
            if (set == null)
            {
                return new ApiResponse<bool>("Set not found", 404);
            }

            _context.Sets.Remove(set);
            await _context.SaveChangesAsync();

            return new ApiResponse<bool>(true);
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>(
                $"Error deleting set: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<List<SetDto>>> GetSetsByGigIdAsync(int gigId)
    {
        try
        {
            var sets = await _context.Sets
                .Include(s => s.SetSongs)
                    .ThenInclude(ss => ss.Song)
                .Where(s => s.GigId == gigId)
                .Select(s => new SetDto(
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
                ))
                .ToListAsync();

            return new ApiResponse<List<SetDto>>(sets);
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<SetDto>>(
                $"Error retrieving sets for gig: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<SetDto>> AddSongToSetAsync(int setId, int songId, int order)
    {
        try
        {
            var set = await _context.Sets
                .Include(s => s.SetSongs)
                    .ThenInclude(ss => ss.Song)
                .FirstOrDefaultAsync(s => s.Id == setId);

            if (set == null)
            {
                return new ApiResponse<SetDto>("Set not found", 404);
            }

            var song = await _context.Songs.FindAsync(songId);
            if (song == null)
            {
                return new ApiResponse<SetDto>("Song not found", 404);
            }

            // Check if song is already in the set
            var existingSetSong = set.SetSongs.FirstOrDefault(ss => ss.SongId == songId);
            if (existingSetSong != null)
            {
                return new ApiResponse<SetDto>("Song is already in the set", 400);
            }

            // Adjust order numbers if necessary
            var setSongsToUpdate = set.SetSongs.Where(ss => ss.Order >= order).ToList();
            foreach (var setSong in setSongsToUpdate)
            {
                setSong.Order++;
            }

            // Add the new song
            var newSetSong = new SetSong
            {
                SetId = setId,
                SongId = songId,
                Order = order
            };

            _context.SetSongs.Add(newSetSong);
            set.UpdatedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload the set with updated songs
            await _context.Entry(set).ReloadAsync();

            var result = new SetDto(
                set.Id,
                set.Name,
                set.GigId,
                set.Notes,
                set.SetSongs.Select(ss => new SetSongDto(
                    ss.SongId,
                    ss.Song.Name,
                    ss.Song.Artist,
                    ss.Song.DurationSeconds,
                    ss.Order
                )).OrderBy(ss => ss.Order).ToList(),
                set.CreatedDate,
                set.UpdatedDate
            );

            return new ApiResponse<SetDto>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<SetDto>(
                $"Error adding song to set: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<bool>> RemoveSongFromSetAsync(int setId, int songId)
    {
        try
        {
            var setSong = await _context.SetSongs
                .FirstOrDefaultAsync(ss => ss.SetId == setId && ss.SongId == songId);

            if (setSong == null)
            {
                return new ApiResponse<bool>("Song not found in set", 404);
            }

            var removedOrder = setSong.Order;
            _context.SetSongs.Remove(setSong);

            // Adjust order numbers for remaining songs
            var setSongsToUpdate = await _context.SetSongs
                .Where(ss => ss.SetId == setId && ss.Order > removedOrder)
                .ToListAsync();

            foreach (var ss in setSongsToUpdate)
            {
                ss.Order--;
            }

            // Update set timestamp
            var set = await _context.Sets.FindAsync(setId);
            if (set != null)
            {
                set.UpdatedDate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return new ApiResponse<bool>(true);
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>(
                $"Error removing song from set: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<SetDto>> ReorderSetSongsAsync(int setId, List<SetSongOrderDto> songOrders)
    {
        try
        {
            var set = await _context.Sets
                .Include(s => s.SetSongs)
                    .ThenInclude(ss => ss.Song)
                .FirstOrDefaultAsync(s => s.Id == setId);

            if (set == null)
            {
                return new ApiResponse<SetDto>("Set not found", 404);
            }

            // Update the order for each song in the set
            foreach (var orderDto in songOrders)
            {
                var setSong = set.SetSongs.FirstOrDefault(ss => ss.SongId == orderDto.SongId);
                if (setSong != null)
                {
                    setSong.Order = orderDto.Order;
                }
            }

            set.UpdatedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var result = new SetDto(
                set.Id,
                set.Name,
                set.GigId,
                set.Notes,
                set.SetSongs.Select(ss => new SetSongDto(
                    ss.SongId,
                    ss.Song.Name,
                    ss.Song.Artist,
                    ss.Song.DurationSeconds,
                    ss.Order
                )).OrderBy(ss => ss.Order).ToList(),
                set.CreatedDate,
                set.UpdatedDate
            );

            return new ApiResponse<SetDto>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<SetDto>(
                $"Error reordering set songs: {ex.Message}",
                500
            );
        }
    }
}