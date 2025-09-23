using Microsoft.EntityFrameworkCore;
using Setlist.Core.Entities;
using Setlist.Core.Enums;

namespace Setlist.Data.Context;

/// <summary>
/// Entity Framework context for the setlist application
/// </summary>
public class SetlistDbContext : DbContext
{
    public SetlistDbContext(DbContextOptions<SetlistDbContext> options) : base(options)
    {
    }

    // DbSets for entities
    public DbSet<Song> Songs { get; set; }
    public DbSet<Gig> Gigs { get; set; }
    public DbSet<Set> Sets { get; set; }
    public DbSet<SetSong> SetSongs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations from separate files
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SetlistDbContext).Assembly);

        // Configure enum conversions
        modelBuilder.Entity<Song>()
            .Property(s => s.ReadinessStatus)
            .HasConversion<string>();

        // Configure indexes for performance
        modelBuilder.Entity<Song>()
            .HasIndex(s => s.Name)
            .HasDatabaseName("IX_Songs_Name");

        modelBuilder.Entity<Song>()
            .HasIndex(s => s.ReadinessStatus)
            .HasDatabaseName("IX_Songs_ReadinessStatus");

        modelBuilder.Entity<Gig>()
            .HasIndex(g => g.Date)
            .HasDatabaseName("IX_Gigs_Date");

        modelBuilder.Entity<SetSong>()
            .HasIndex(ss => new { ss.SetId, ss.SongId })
            .IsUnique()
            .HasDatabaseName("IX_SetSongs_SetId_SongId");

        modelBuilder.Entity<SetSong>()
            .HasIndex(ss => new { ss.SetId, ss.Order })
            .IsUnique()
            .HasDatabaseName("IX_SetSongs_SetId_Order");

        // Configure relationships
        ConfigureRelationships(modelBuilder);

        // Seed initial data (if needed)
        SeedData(modelBuilder);
    }

    private static void ConfigureRelationships(ModelBuilder modelBuilder)
    {
        // Gig -> Sets (One-to-Many)
        modelBuilder.Entity<Set>()
            .HasOne(s => s.Gig)
            .WithMany(g => g.Sets)
            .HasForeignKey(s => s.GigId)
            .OnDelete(DeleteBehavior.Cascade);

        // Set -> SetSongs (One-to-Many)
        modelBuilder.Entity<SetSong>()
            .HasOne(ss => ss.Set)
            .WithMany(s => s.SetSongs)
            .HasForeignKey(ss => ss.SetId)
            .OnDelete(DeleteBehavior.Cascade);

        // Song -> SetSongs (One-to-Many)
        modelBuilder.Entity<SetSong>()
            .HasOne(ss => ss.Song)
            .WithMany(s => s.SetSongs)
            .HasForeignKey(ss => ss.SongId)
            .OnDelete(DeleteBehavior.Restrict); // Prevent deleting songs that are in setlists
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        // Seed some initial songs for development
        modelBuilder.Entity<Song>().HasData(
            new Song
            {
                Id = 1,
                Name = "Sweet Child O' Mine",
                Artist = "Guns N' Roses",
                DurationSeconds = 356,
                ReadinessStatus = ReadinessStatus.Ready,
                Genre = "Rock",
                CreatedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Song
            {
                Id = 2,
                Name = "Wonderwall",
                Artist = "Oasis",
                DurationSeconds = 258,
                ReadinessStatus = ReadinessStatus.Ready,
                Genre = "Rock",
                CreatedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Song
            {
                Id = 3,
                Name = "Hotel California",
                Artist = "Eagles",
                DurationSeconds = 391,
                ReadinessStatus = ReadinessStatus.InProgress,
                Genre = "Rock",
                CreatedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Song
            {
                Id = 4,
                Name = "Bohemian Rhapsody",
                Artist = "Queen",
                DurationSeconds = 355,
                ReadinessStatus = ReadinessStatus.WishList,
                Genre = "Rock",
                CreatedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is Song song)
            {
                song.UpdatedDate = DateTime.UtcNow;
            }
            else if (entry.Entity is Gig gig)
            {
                gig.UpdatedDate = DateTime.UtcNow;
            }
            else if (entry.Entity is Set set)
            {
                set.UpdatedDate = DateTime.UtcNow;
            }
        }
    }
}