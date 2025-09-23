using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Setlist.Data.Context;
using Setlist.Tests.Helpers;

namespace Setlist.Tests.Integration;

public class SetlistApiWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the app's ApplicationDbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<SetlistDbContext>));

            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Add ApplicationDbContext using an in-memory database for testing
            services.AddDbContext<SetlistDbContext>(options =>
            {
                options.UseInMemoryDatabase("InMemoryDbForTesting");
            });

            // Build the service provider
            var sp = services.BuildServiceProvider();

            // Create a scope to obtain a reference to the database context
            using var scope = sp.CreateScope();
            var scopedServices = scope.ServiceProvider;
            var db = scopedServices.GetRequiredService<SetlistDbContext>();

            // Ensure the database is created
            db.Database.EnsureCreated();

            // Seed the database with test data
            SeedTestData(db);
        });

        builder.UseEnvironment("Testing");
    }

    private static void SeedTestData(SetlistDbContext context)
    {
        // Clear existing data
        context.SetSongs.RemoveRange(context.SetSongs);
        context.Sets.RemoveRange(context.Sets);
        context.Gigs.RemoveRange(context.Gigs);
        context.Songs.RemoveRange(context.Songs);
        context.SaveChanges();

        // Use the same seeding method as TestDbContextFactory
        TestDbContextFactory.SeedTestData(context);
    }
}
