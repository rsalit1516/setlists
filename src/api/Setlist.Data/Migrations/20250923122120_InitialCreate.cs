using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Setlist.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Gigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Venue = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Gigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Songs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Artist = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DurationSeconds = table.Column<int>(type: "int", nullable: false),
                    ReadinessStatus = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Genre = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Songs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GigId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sets_Gigs_GigId",
                        column: x => x.GigId,
                        principalTable: "Gigs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SetSongs",
                columns: table => new
                {
                    SetId = table.Column<int>(type: "int", nullable: false),
                    SongId = table.Column<int>(type: "int", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SetSongs", x => new { x.SetId, x.SongId });
                    table.ForeignKey(
                        name: "FK_SetSongs_Sets_SetId",
                        column: x => x.SetId,
                        principalTable: "Sets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SetSongs_Songs_SongId",
                        column: x => x.SongId,
                        principalTable: "Songs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Songs",
                columns: new[] { "Id", "Artist", "CreatedDate", "DurationSeconds", "Genre", "Name", "Notes", "ReadinessStatus", "UpdatedDate" },
                values: new object[,]
                {
                    { 1, "Guns N' Roses", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 356, "Rock", "Sweet Child O' Mine", null, "Ready", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, "Oasis", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 258, "Rock", "Wonderwall", null, "Ready", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, "Eagles", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 391, "Rock", "Hotel California", null, "InProgress", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, "Queen", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 355, "Rock", "Bohemian Rhapsody", null, "WishList", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Gigs_Date",
                table: "Gigs",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Sets_GigId",
                table: "Sets",
                column: "GigId");

            migrationBuilder.CreateIndex(
                name: "IX_SetSongs_SetId_Order",
                table: "SetSongs",
                columns: new[] { "SetId", "Order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SetSongs_SetId_SongId",
                table: "SetSongs",
                columns: new[] { "SetId", "SongId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SetSongs_SongId",
                table: "SetSongs",
                column: "SongId");

            migrationBuilder.CreateIndex(
                name: "IX_Songs_Name",
                table: "Songs",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Songs_ReadinessStatus",
                table: "Songs",
                column: "ReadinessStatus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SetSongs");

            migrationBuilder.DropTable(
                name: "Sets");

            migrationBuilder.DropTable(
                name: "Songs");

            migrationBuilder.DropTable(
                name: "Gigs");
        }
    }
}
