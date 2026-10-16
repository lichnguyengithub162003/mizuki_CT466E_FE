import { apiClient } from '@/api/clients'
import { ensureCsrfCookie } from '@/api/csrf'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  AvatarUploadResult,
  PasswordChangePayload,
  Profile,
  ProfileUpdatePayload,
} from '@/types/profile'

export async function getProfile(): Promise<Profile> {
  const response = await apiClient.get<ApiResponse<Profile>>(ENDPOINTS.authProfile)
  return response.data.data
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<Profile> {
  await ensureCsrfCookie()
  const response = await apiClient.patch<ApiResponse<Profile>>(ENDPOINTS.authProfile, payload)
  return response.data.data
}

export async function stageProfileAvatar(
  image: File,
  onProgress?: (percentage: number) => void,
): Promise<AvatarUploadResult> {
  await ensureCsrfCookie()
  const body = new FormData()
  body.append('image', image)
  const response = await apiClient.post<ApiResponse<AvatarUploadResult>>(
    ENDPOINTS.authProfileAvatarUploads,
    body,
    {
      onUploadProgress: (event) => {
        if (event.total && onProgress) onProgress(Math.round((event.loaded / event.total) * 100))
      },
    },
  )
  return response.data.data
}

export async function promoteProfileAvatar(uploadToken: string): Promise<Profile> {
  await ensureCsrfCookie()
  const response = await apiClient.patch<ApiResponse<Profile>>(ENDPOINTS.authProfileAvatar, {
    avatar_upload_token: uploadToken,
  })
  return response.data.data
}

export async function removeProfileAvatar(): Promise<Profile> {
  await ensureCsrfCookie()
  const response = await apiClient.patch<ApiResponse<Profile>>(ENDPOINTS.authProfileAvatar, {
    avatar: null,
  })
  return response.data.data
}

export async function changeProfilePassword(payload: PasswordChangePayload): Promise<void> {
  await ensureCsrfCookie()
  await apiClient.patch<ApiResponse<null>>(ENDPOINTS.authProfilePassword, payload)
}
