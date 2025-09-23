namespace Setlist.Core.DTOs;

/// <summary>
/// Generic API response wrapper
/// </summary>
/// <typeparam name="T">Type of data being returned</typeparam>
public class ApiResponse<T>
{
    public bool IsSuccess { get; set; }
    public T? Data { get; set; }
    public string? ErrorMessage { get; set; }
    public int StatusCode { get; set; }

    public ApiResponse(T data)
    {
        IsSuccess = true;
        Data = data;
        StatusCode = 200;
    }

    public ApiResponse(string errorMessage, int statusCode = 500)
    {
        IsSuccess = false;
        ErrorMessage = errorMessage;
        StatusCode = statusCode;
    }
}