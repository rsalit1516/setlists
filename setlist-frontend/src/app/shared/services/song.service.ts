import { Injectable, signal, computed } from '@angular/core';
import { BaseApiService } from './base-api.service';
import {
  Song,
  CreateSong,
  UpdateSong,
  ApiResponse,
  PaginatedResult,
  ReadinessStatus,
} from '../models';
import { firstValueFrom } from 'rxjs';

/**
 * Service for managing songs with signal-based state management
 */
@Injectable({
  providedIn: 'root',
})
export class SongService extends BaseApiService {
  // Private signals for state management
  private readonly _songs = signal<Song[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _pagination = signal<{
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });

  // Public readonly signals
  readonly songs = this._songs.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly readySongs = computed(() =>
    this._songs().filter(
      (song) => song.readinessStatus === ReadinessStatus.Ready
    )
  );

  readonly inProgressSongs = computed(() =>
    this._songs().filter(
      (song) => song.readinessStatus === ReadinessStatus.InProgress
    )
  );

  readonly wishListSongs = computed(() =>
    this._songs().filter(
      (song) => song.readinessStatus === ReadinessStatus.WishList
    )
  );

  readonly hasNextPage = computed(
    () => this._pagination().page < this._pagination().totalPages
  );

  readonly hasPreviousPage = computed(() => this._pagination().page > 1);

  /**
   * Load songs with optional pagination and search
   */
  async loadSongs(
    page: number = 1,
    pageSize: number = 20,
    search?: string
  ): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const params = this.buildParams({ page, pageSize, search });
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PaginatedResult<Song>>>(
          `${this.baseUrl}/songs`,
          { params }
        )
      );

      if (response.isSuccess && response.data) {
        this._songs.set(response.data.items);
        this._pagination.set({
          totalCount: response.data.totalCount,
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages,
        });
      } else {
        this._error.set(response.errorMessage || 'Failed to load songs');
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get a song by ID
   */
  async getSongById(id: number): Promise<Song | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Song>>(`${this.baseUrl}/songs/${id}`)
      );

      if (response.isSuccess && response.data) {
        return response.data;
      }

      this._error.set(response.errorMessage || 'Song not found');
      return null;
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return null;
    }
  }

  /**
   * Create a new song
   */
  async createSong(song: CreateSong): Promise<Song | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<Song>>(`${this.baseUrl}/songs`, song)
      );

      if (response.isSuccess && response.data) {
        // Add to current songs list
        this._songs.update((songs) => [...songs, response.data!]);
        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to create song');
        return null;
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update an existing song
   */
  async updateSong(id: number, song: UpdateSong): Promise<Song | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<Song>>(`${this.baseUrl}/songs/${id}`, song)
      );

      if (response.isSuccess && response.data) {
        // Update in current songs list
        this._songs.update((songs) =>
          songs.map((s) => (s.id === id ? response.data! : s))
        );
        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to update song');
        return null;
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Delete a song
   */
  async deleteSong(id: number): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/songs/${id}`)
      );

      if (response.isSuccess) {
        // Remove from current songs list
        this._songs.update((songs) => songs.filter((s) => s.id !== id));
        return true;
      } else {
        this._error.set(response.errorMessage || 'Failed to delete song');
        return false;
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Search songs by name
   */
  async searchSongsByName(name: string): Promise<Song[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Song[]>>(`${this.baseUrl}/songs/search`, {
          params: { name },
        })
      );

      if (response.isSuccess && response.data) {
        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Search failed');
        return [];
      }
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return [];
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh the current songs list
   */
  async refresh(): Promise<void> {
    const currentPagination = this._pagination();
    await this.loadSongs(currentPagination.page, currentPagination.pageSize);
  }
}
