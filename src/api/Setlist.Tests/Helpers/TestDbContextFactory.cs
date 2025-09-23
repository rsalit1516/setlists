using Microsoft.EntityFrameworkCore;
using Setlist.Core.Entities;
using Setlist.Core.Enums;
using Setlist.Data.Context;

namespace Setlist.Tests.Helpers;

public static class TestDbContextFactory
{
    public static SetlistDbContext CreateInMemoryContext(string databaseName = "")
    {
        if (string.IsNullOrEmpty(databaseName))
        {
            databaseName = Guid.NewGuid().ToString();
        }

        var options = new DbContextOptionsBuilder<SetlistDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        var context = new SetlistDbContext(options);
        context.Database.EnsureCreated();

        // Clear any existing data from HasData seeding
        ClearExistingData(context);

        return context;
    }

    public static SetlistDbContext CreateContextWithSeedData()
    {
        var context = CreateInMemoryContext();
        SeedTestData(context);
        return context;
    }

    private static void ClearExistingData(SetlistDbContext context)
    {
        // Remove all existing data
        context.SetSongs.RemoveRange(context.SetSongs);
        context.Sets.RemoveRange(context.Sets);
        context.Gigs.RemoveRange(context.Gigs);
        context.Songs.RemoveRange(context.Songs);
        context.SaveChanges();
    }

    public static void SeedTestData(SetlistDbContext context)
    {
        // Add test songs
        var songs = new List<Song>
        {
            new()
            {
                Name = "Wonderwall",
                Artist = "Oasis",
                DurationSeconds = 258,
                ReadinessStatus = ReadinessStatus.Ready,
                Genre = "Rock",
                Notes = "Crowd favorite",
                CreatedDate = DateTime.UtcNow.AddDays(-30),
                UpdatedDate = DateTime.UtcNow.AddDays(-30)
            },
            new()
            {
                Name = "Sweet Child O' Mine",
                Artist = "Guns N' Roses",
                DurationSeconds = 356,
                ReadinessStatus = ReadinessStatus.Ready,
                Genre = "Rock",
                Notes = "Great guitar solo",
                CreatedDate = DateTime.UtcNow.AddDays(-25),
                UpdatedDate = DateTime.UtcNow.AddDays(-25)
            },
            new()
            {
                Name = "Hotel California",
                Artist = "Eagles",
                DurationSeconds = 391,
                ReadinessStatus = ReadinessStatus.InProgress,
                Genre = "Rock",
                Notes = "Working on the solo",
                CreatedDate = DateTime.UtcNow.AddDays(-20),
                UpdatedDate = DateTime.UtcNow.AddDays(-5)
            }
        };

        context.Songs.AddRange(songs);
        context.SaveChanges();

        // Add test gigs
        var gigs = new List<Gig>
        {
            new()
            {
                Name = "Summer Festival",
                Venue = "Central Park",
                Date = DateTime.UtcNow.AddDays(30),
                Notes = "Outdoor venue",
                CreatedDate = DateTime.UtcNow.AddDays(-10),
                UpdatedDate = DateTime.UtcNow.AddDays(-10)
            },
            new()
            {
                Name = "Club Night",
                Venue = "The Rock Club",
                Date = DateTime.UtcNow.AddDays(15),
                Notes = "Intimate venue",
                CreatedDate = DateTime.UtcNow.AddDays(-8),
                UpdatedDate = DateTime.UtcNow.AddDays(-8)
            }
        };

        context.Gigs.AddRange(gigs);
        context.SaveChanges();

        // Add test sets
        var sets = new List<Set>
        {
            new()
            {
                Name = "Opening Set",
                GigId = gigs[0].Id,
                Notes = "High energy songs",
                CreatedDate = DateTime.UtcNow.AddDays(-7),
                UpdatedDate = DateTime.UtcNow.AddDays(-7)
            },
            new()
            {
                Name = "Main Set",
                GigId = gigs[0].Id,
                Notes = "Best songs",
                CreatedDate = DateTime.UtcNow.AddDays(-6),
                UpdatedDate = DateTime.UtcNow.AddDays(-6)
            }
        };

        context.Sets.AddRange(sets);
        context.SaveChanges();

        // Add test set songs
        var setSongs = new List<SetSong>
        {
            new() { SetId = sets[0].Id, SongId = songs[0].Id, Order = 1 },
            new() { SetId = sets[0].Id, SongId = songs[1].Id, Order = 2 },
            new() { SetId = sets[1].Id, SongId = songs[1].Id, Order = 1 },
            new() { SetId = sets[1].Id, SongId = songs[2].Id, Order = 2 }
        };

        context.SetSongs.AddRange(setSongs);
        context.SaveChanges();
    }

    public static Song GetTestSong(SetlistDbContext context, string name)
    {
        return context.Songs.First(s => s.Name == name);
    }

    public static Gig GetTestGig(SetlistDbContext context, string name)
    {
        return context.Gigs.First(g => g.Name == name);
    }

    public static Set GetTestSet(SetlistDbContext context, string name)
    {
        return context.Sets.First(s => s.Name == name);
    }
}
