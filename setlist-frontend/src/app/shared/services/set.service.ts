import { Injectable, signal, computed } from '@angular/core';
import { BaseApiService } from './base-api.service';
import {
  Set,
  CreateSet,
  UpdateSet,
  SetSongOrder,
  ApiResponse,
  PaginatedResult,
} from '../models';
import { firstValueFrom } from 'rxjs';

/**
 * Service for managing sets with signal-based state management
 */
@Injectable({
  providedIn: 'root',
})
export class SetService extends BaseApiService {
  // Private signals for state management
  private readonly _sets = signal<Set[]>([]);
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
  readonly sets = this._sets.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Computed signals
  readonly hasNextPage = computed(
    () => this._pagination().page < this._pagination().totalPages
  );

  readonly hasPreviousPage = computed(() => this._pagination().page > 1);

  /**
   * Load sets with optional pagination
   */
  async loadSets(page: number = 1, pageSize: number = 20): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const params = this.buildParams({ page, pageSize });
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PaginatedResult<Set>>>(
          `${this.baseUrl}/sets`,
          { params }
        )
      );

      if (response.isSuccess && response.data) {
        this._sets.set(response.data.items);
        this._pagination.set({
          totalCount: response.data.totalCount,
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages,
        });
      } else {
        this._error.set(response.errorMessage || 'Failed to load sets');
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
   * Get sets by gig ID
   */
  async getSetsByGigId(gigId: number): Promise<Set[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Set[]>>(`${this.baseUrl}/sets/gig/${gigId}`)
      );

      if (response.isSuccess && response.data) {
        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to load sets for gig');
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
   * Get a set by ID
   */
  async getSetById(id: number): Promise<Set | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Set>>(`${this.baseUrl}/sets/${id}`)
      );

      if (response.isSuccess && response.data) {
        return response.data;
      }

      this._error.set(response.errorMessage || 'Set not found');
      return null;
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : 'An error occurred'
      );
      return null;
    }
  }

  /**
   * Create a new set
   */
  async createSet(set: CreateSet): Promise<Set | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<Set>>(`${this.baseUrl}/sets`, set)
      );

      if (response.isSuccess && response.data) {
        // Add to current sets list
        this._sets.update((sets) => [...sets, response.data!]);
        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to create set');
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
   * Update an existing set
   */
  async updateSet(id: number, set: UpdateSet): Promise<Set | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<Set>>(`${this.baseUrl}/sets/${id}`, set)
      );

      if (response.isSuccess && response.data) {
        // Update in current sets list
        this._sets.update((sets) =>
          sets.map((s) => (s.id === id ? response.data! : s))
        );
        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to update set');
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
   * Delete a set
   */
  async deleteSet(id: number): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/sets/${id}`)
      );

      if (response.isSuccess) {
        // Remove from current sets list
        this._sets.update((sets) => sets.filter((s) => s.id !== id));
        return true;
      } else {
        this._error.set(response.errorMessage || 'Failed to delete set');
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
   * Add a song to a set
   */
  async addSongToSet(
    setId: number,
    songId: number,
    order: number = 1
  ): Promise<Set | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const params = this.buildParams({ order });
      const response = await firstValueFrom(
        this.http.post<ApiResponse<Set>>(
          `${this.baseUrl}/sets/${setId}/songs/${songId}`,
          null,
          { params }
        )
      );

      if (response.isSuccess && response.data) {
        // Update the set in current sets list
        this._sets.update((sets) =>
          sets.map((s) => (s.id === setId ? response.data! : s))
        );
        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to add song to set');
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
   * Remove a song from a set
   */
  async removeSongFromSet(setId: number, songId: number): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<boolean>>(
          `${this.baseUrl}/sets/${setId}/songs/${songId}`
        )
      );

      if (response.isSuccess) {
        // Refresh the set to get updated song list
        const updatedSet = await this.getSetById(setId);
        if (updatedSet) {
          this._sets.update((sets) =>
            sets.map((s) => (s.id === setId ? updatedSet : s))
          );
        }
        return true;
      } else {
        this._error.set(
          response.errorMessage || 'Failed to remove song from set'
        );
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
   * Reorder songs in a set
   */
  async reorderSetSongs(
    setId: number,
    songOrders: SetSongOrder[]
  ): Promise<Set | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<Set>>(
          `${this.baseUrl}/sets/${setId}/reorder`,
          songOrders
        )
      );

      if (response.isSuccess && response.data) {
        // Update the set in current sets list
        this._sets.update((sets) =>
          sets.map((s) => (s.id === setId ? response.data! : s))
        );
        return response.data;
      } else {
        this._error.set(response.errorMessage || 'Failed to reorder songs');
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
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh the current sets list
   */
  async refresh(): Promise<void> {
    const currentPagination = this._pagination();
    await this.loadSets(currentPagination.page, currentPagination.pageSize);
  }
}
