using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Setlist.Data.Context;

/// <summary>
/// Design-time factory for creating DbContext instances during migrations
/// </summary>
public class SetlistDbContextFactory : IDesignTimeDbContextFactory<SetlistDbContext>
{
    public SetlistDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<SetlistDbContext>();
        
        // Use a default connection string for design time
        // This will be overridden at runtime by the API project
        optionsBuilder.UseSqlServer("Server=localhost,1434;Database=SetlistDb;User Id=SA;Password=SetlistDev123!;TrustServerCertificate=true;");
        
        return new SetlistDbContext(optionsBuilder.Options);
    }
}