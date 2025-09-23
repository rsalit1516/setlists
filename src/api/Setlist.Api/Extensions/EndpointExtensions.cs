using Microsoft.AspNetCore.Mvc;
using Setlist.Core.Interfaces;
using Setlist.Core.DTOs;

namespace Setlist.Api.Extensions;

public static class EndpointExtensions
{
    public static void ConfigureApiEndpoints(this WebApplication app)
    {
        var api = app.MapGroup("/api/v1");

        // Songs endpoints
        ConfigureSongEndpoints(api);

        // Gigs endpoints
        ConfigureGigEndpoints(api);

        // Sets endpoints
        ConfigureSetEndpoints(api);
    }

    private static void ConfigureSongEndpoints(RouteGroupBuilder api)
    {
        var songs = api.MapGroup("/songs").WithTags("Songs");

        songs.MapGet("/", async (
            [FromServices] ISongRepository repository,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null) =>
        {
            var result = await repository.GetSongsAsync(page, pageSize, search);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("GetSongs")
          .WithOpenApi();

        songs.MapGet("/{id:int}", async (
            [FromServices] ISongRepository repository,
            int id) =>
        {
            var result = await repository.GetSongByIdAsync(id);
            if (!result.IsSuccess)
                return Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);

            return result.Data != null
                ? Results.Ok(result)
                : Results.NotFound();
        }).WithName("GetSongById")
          .WithOpenApi();

        songs.MapPost("/", async (
            [FromServices] ISongRepository repository,
            [FromBody] CreateSongDto song) =>
        {
            var result = await repository.CreateSongAsync(song);
            return result.IsSuccess
                ? Results.Created($"/api/v1/songs/{result.Data!.Id}", result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("CreateSong")
          .WithOpenApi();

        songs.MapPut("/{id:int}", async (
            [FromServices] ISongRepository repository,
            int id,
            [FromBody] UpdateSongDto song) =>
        {
            var result = await repository.UpdateSongAsync(id, song);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("UpdateSong")
          .WithOpenApi();

        songs.MapDelete("/{id:int}", async (
            [FromServices] ISongRepository repository,
            int id) =>
        {
            var result = await repository.DeleteSongAsync(id);
            return result.IsSuccess
                ? Results.NoContent()
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("DeleteSong")
          .WithOpenApi();

        songs.MapGet("/search/{name}", async (
            [FromServices] ISongRepository repository,
            string name) =>
        {
            var result = await repository.GetSongsByNameAsync(name);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("SearchSongsByName")
          .WithOpenApi();
    }

    private static void ConfigureGigEndpoints(RouteGroupBuilder api)
    {
        var gigs = api.MapGroup("/gigs").WithTags("Gigs");

        gigs.MapGet("/", async (
            [FromServices] IGigRepository repository,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20) =>
        {
            var result = await repository.GetGigsAsync(page, pageSize);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("GetGigs")
          .WithOpenApi();

        gigs.MapGet("/{id:int}", async (
            [FromServices] IGigRepository repository,
            int id) =>
        {
            var result = await repository.GetGigByIdAsync(id);
            if (!result.IsSuccess)
                return Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);

            return result.Data != null
                ? Results.Ok(result)
                : Results.NotFound();
        }).WithName("GetGigById")
          .WithOpenApi();

        gigs.MapPost("/", async (
            [FromServices] IGigRepository repository,
            [FromBody] CreateGigDto gig) =>
        {
            var result = await repository.CreateGigAsync(gig);
            return result.IsSuccess
                ? Results.Created($"/api/v1/gigs/{result.Data!.Id}", result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("CreateGig")
          .WithOpenApi();

        gigs.MapPut("/{id:int}", async (
            [FromServices] IGigRepository repository,
            int id,
            [FromBody] UpdateGigDto gig) =>
        {
            var result = await repository.UpdateGigAsync(id, gig);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("UpdateGig")
          .WithOpenApi();

        gigs.MapDelete("/{id:int}", async (
            [FromServices] IGigRepository repository,
            int id) =>
        {
            var result = await repository.DeleteGigAsync(id);
            return result.IsSuccess
                ? Results.NoContent()
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("DeleteGig")
          .WithOpenApi();

        gigs.MapGet("/upcoming", async (
            [FromServices] IGigRepository repository) =>
        {
            var result = await repository.GetUpcomingGigsAsync();
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("GetUpcomingGigs")
          .WithOpenApi();
    }

    private static void ConfigureSetEndpoints(RouteGroupBuilder api)
    {
        var sets = api.MapGroup("/sets").WithTags("Sets");

        sets.MapGet("/", async (
            [FromServices] ISetRepository repository,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20) =>
        {
            var result = await repository.GetSetsAsync(page, pageSize);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("GetSets")
          .WithOpenApi();

        sets.MapGet("/{id:int}", async (
            [FromServices] ISetRepository repository,
            int id) =>
        {
            var result = await repository.GetSetByIdAsync(id);
            if (!result.IsSuccess)
                return Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);

            return result.Data != null
                ? Results.Ok(result)
                : Results.NotFound();
        }).WithName("GetSetById")
          .WithOpenApi();

        sets.MapPost("/", async (
            [FromServices] ISetRepository repository,
            [FromBody] CreateSetDto set) =>
        {
            var result = await repository.CreateSetAsync(set);
            return result.IsSuccess
                ? Results.Created($"/api/v1/sets/{result.Data!.Id}", result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("CreateSet")
          .WithOpenApi();

        sets.MapPut("/{id:int}", async (
            [FromServices] ISetRepository repository,
            int id,
            [FromBody] UpdateSetDto set) =>
        {
            var result = await repository.UpdateSetAsync(id, set);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("UpdateSet")
          .WithOpenApi();

        sets.MapDelete("/{id:int}", async (
            [FromServices] ISetRepository repository,
            int id) =>
        {
            var result = await repository.DeleteSetAsync(id);
            return result.IsSuccess
                ? Results.NoContent()
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("DeleteSet")
          .WithOpenApi();

        sets.MapGet("/gig/{gigId:int}", async (
            [FromServices] ISetRepository repository,
            int gigId) =>
        {
            var result = await repository.GetSetsByGigIdAsync(gigId);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("GetSetsByGigId")
          .WithOpenApi();

        sets.MapPost("/{setId:int}/songs/{songId:int}", async (
            [FromServices] ISetRepository repository,
            int setId,
            int songId,
            [FromQuery] int order = 1) =>
        {
            var result = await repository.AddSongToSetAsync(setId, songId, order);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("AddSongToSet")
          .WithOpenApi();

        sets.MapDelete("/{setId:int}/songs/{songId:int}", async (
            [FromServices] ISetRepository repository,
            int setId,
            int songId) =>
        {
            var result = await repository.RemoveSongFromSetAsync(setId, songId);
            return result.IsSuccess
                ? Results.NoContent()
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("RemoveSongFromSet")
          .WithOpenApi();

        sets.MapPut("/{setId:int}/reorder", async (
            [FromServices] ISetRepository repository,
            int setId,
            [FromBody] List<SetSongOrderDto> songOrders) =>
        {
            var result = await repository.ReorderSetSongsAsync(setId, songOrders);
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.Problem(result.ErrorMessage, statusCode: result.StatusCode);
        }).WithName("ReorderSetSongs")
          .WithOpenApi();
    }
}