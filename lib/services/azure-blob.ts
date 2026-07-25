import { BlobServiceClient } from '@azure/storage-blob'

// Requires AZURE_STORAGE_CONNECTION_STRING (a connection string for a storage
// account) and AZURE_STORAGE_CONTAINER (a public-read blob container) in .env.

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

let containerClientPromise: ReturnType<typeof initContainerClient> | null = null

async function initContainerClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const containerName = process.env.AZURE_STORAGE_CONTAINER
  if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set')
  if (!containerName) throw new Error('AZURE_STORAGE_CONTAINER is not set')

  const serviceClient = BlobServiceClient.fromConnectionString(connectionString)
  const containerClient = serviceClient.getContainerClient(containerName)
  await containerClient.createIfNotExists({ access: 'blob' })
  return containerClient
}

function getContainerClient() {
  if (!containerClientPromise) containerClientPromise = initContainerClient()
  return containerClientPromise
}

export async function uploadChartFile(
  songId: string,
  file: File
): Promise<{ url: string; type: string; name: string }> {
  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }

  const containerClient = await getContainerClient()
  const extension = file.name.split('.').pop() || 'bin'
  const blobName = `charts/${songId}-${Date.now()}.${extension}`
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  const buffer = Buffer.from(await file.arrayBuffer())
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: file.type },
  })

  return { url: blockBlobClient.url, type: file.type, name: file.name }
}

export async function deleteChartFile(url: string): Promise<void> {
  const containerClient = await getContainerClient()
  const blobName = new URL(url).pathname.split('/').slice(2).join('/')
  if (!blobName) return
  await containerClient.getBlockBlobClient(blobName).deleteIfExists()
}
