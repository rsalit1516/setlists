using Microsoft.EntityFrameworkCore;
using Setlist.Core.DTOs;
using Setlist.Core.Entities;
using Setlist.Core.Interfaces;
using Setlist.Data.Context;

namespace Setlist.Data.Repositories;

public class SongRepository : ISongRepository
{
    private readonly SetlistDbContext _context;

    public SongRepository(SetlistDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<PaginatedResult<SongDto>>> GetSongsAsync(int page = 1, int pageSize = 20, string? search = null)
    {
        try
        {
            var query = _context.Songs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(s => s.Name.Contains(search) || s.Artist.Contains(search));
            }

            var totalCount = await query.CountAsync();
            var songs = await query
                .OrderBy(s => s.Artist)
                .ThenBy(s => s.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new SongDto(
                    s.Id,
                    s.Name,
                    s.Artist,
                    s.DurationSeconds,
                    s.ReadinessStatus,
                    s.Notes,
                    s.Genre,
                    s.CreatedDate,
                    s.UpdatedDate
                ))
                .ToListAsync();

            var result = new PaginatedResult<SongDto>
            {
                Items = songs,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };

            return new ApiResponse<PaginatedResult<SongDto>>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<PaginatedResult<SongDto>>(
                $"Error retrieving songs: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<SongDto?>> GetSongByIdAsync(int id)
    {
        try
        {
            var song = await _context.Songs
                .Where(s => s.Id == id)
                .Select(s => new SongDto(
                    s.Id,
                    s.Name,
                    s.Artist,
                    s.DurationSeconds,
                    s.ReadinessStatus,
                    s.Notes,
                    s.Genre,
                    s.CreatedDate,
                    s.UpdatedDate
                ))
                .FirstOrDefaultAsync();

            return new ApiResponse<SongDto?>(song);
        }
        catch (Exception ex)
        {
            return new ApiResponse<SongDto?>(
                $"Error retrieving song: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<SongDto>> CreateSongAsync(CreateSongDto songDto)
    {
        try
        {
            var song = new Song
            {
                Name = songDto.Name,
                Artist = songDto.Artist,
                DurationSeconds = songDto.DurationSeconds,
                ReadinessStatus = songDto.ReadinessStatus,
                Notes = songDto.Notes,
                Genre = songDto.Genre,
                CreatedDate = DateTime.UtcNow,
                UpdatedDate = DateTime.UtcNow
            };

            _context.Songs.Add(song);
            await _context.SaveChangesAsync();

            var result = new SongDto(
                song.Id,
                song.Name,
                song.Artist,
                song.DurationSeconds,
                song.ReadinessStatus,
                song.Notes,
                song.Genre,
                song.CreatedDate,
                song.UpdatedDate
            );

            return new ApiResponse<SongDto>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<SongDto>(
                $"Error creating song: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<SongDto>> UpdateSongAsync(int id, UpdateSongDto songDto)
    {
        try
        {
            var song = await _context.Songs.FindAsync(id);
            if (song == null)
            {
                return new ApiResponse<SongDto>("Song not found", 404);
            }

            song.Name = songDto.Name;
            song.Artist = songDto.Artist;
            song.DurationSeconds = songDto.DurationSeconds;
            song.ReadinessStatus = songDto.ReadinessStatus;
            song.Notes = songDto.Notes;
            song.Genre = songDto.Genre;
            song.UpdatedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var result = new SongDto(
                song.Id,
                song.Name,
                song.Artist,
                song.DurationSeconds,
                song.ReadinessStatus,
                song.Notes,
                song.Genre,
                song.CreatedDate,
                song.UpdatedDate
            );

            return new ApiResponse<SongDto>(result);
        }
        catch (Exception ex)
        {
            return new ApiResponse<SongDto>(
                $"Error updating song: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<bool>> DeleteSongAsync(int id)
    {
        try
        {
            var song = await _context.Songs.FindAsync(id);
            if (song == null)
            {
                return new ApiResponse<bool>("Song not found", 404);
            }

            // Check if song is used in any sets
            var isUsedInSets = await _context.SetSongs.AnyAsync(ss => ss.SongId == id);
            if (isUsedInSets)
            {
                return new ApiResponse<bool>("Cannot delete song that is used in setlists", 400);
            }

            _context.Songs.Remove(song);
            await _context.SaveChangesAsync();

            return new ApiResponse<bool>(true);
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>(
                $"Error deleting song: {ex.Message}",
                500
            );
        }
    }

    public async Task<ApiResponse<List<SongDto>>> GetSongsByNameAsync(string name)
    {
        try
        {
            var songs = await _context.Songs
                .Where(s => s.Name.Contains(name))
                .Select(s => new SongDto(
                    s.Id,
                    s.Name,
                    s.Artist,
                    s.DurationSeconds,
                    s.ReadinessStatus,
                    s.Notes,
                    s.Genre,
                    s.CreatedDate,
                    s.UpdatedDate
                ))
                .ToListAsync();

            return new ApiResponse<List<SongDto>>(songs);
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<SongDto>>(
                $"Error retrieving songs by name: {ex.Message}",
                500
            );
        }
    }
}