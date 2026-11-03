import type {CabFloApi} from '../../data/api/types';
import type {MediaRepository} from '../../data/repositories/MediaRepository';
import {nextAttemptAt} from '../../shared/lib/backoff';
import {logger} from '../../shared/lib/logger';
import {getAppConfig} from '../../shared/config/env';

export interface MediaUploadQueueDeps {
  api: CabFloApi;
  media: MediaRepository;
  /** Optional compressor — stub returns same path. */
  compress?: (localPath: string) => Promise<{path: string; byteSize: number}>;
  /** Read file bytes for upload — stub uses placeholder payload. */
  readChunk?: (
    localPath: string,
    offset: number,
    length: number,
  ) => Promise<string>;
}

/**
 * Separate media upload queue: local-first save, compress, resume interrupted
 * uploads via offset tracking. One failure does not block the rest.
 *
 * TODO(media): polish resume against real RNFS + multipart Cab Flo endpoints.
 */
export class MediaUploadQueue {
  constructor(private readonly deps: MediaUploadQueueDeps) {}

  async flush(limit = 5): Promise<number> {
    const pending = (await this.deps.media.listPendingUploads()).slice(0, limit);
    let uploaded = 0;

    for (const asset of pending) {
      try {
        await this.deps.media.updateUploadProgress(asset.clientId, {
          uploadStatus: 'syncing',
        });

        let localPath = asset.localPath;
        let byteSize = asset.byteSize;
        if (!asset.compressed && this.deps.compress) {
          const compressed = await this.deps.compress(localPath);
          localPath = compressed.path;
          byteSize = compressed.byteSize;
          await this.deps.media.updateUploadProgress(asset.clientId, {
            compressed: true,
            localPath,
            byteSize,
          });
        } else if (!asset.compressed) {
          // Stub compress marker — real pipeline uses image-picker quality + RNFS.
          await this.deps.media.updateUploadProgress(asset.clientId, {
            compressed: true,
          });
        }

        const init = await this.deps.api.initMediaUpload({
          clientId: asset.clientId,
          auditClientId: asset.auditClientId,
          mimeType: asset.mimeType,
          byteSize,
        });

        let offset = Math.max(init.resumeOffset, asset.bytesUploaded);
        const chunkSize = 64 * 1024;
        let remoteUrl: string | undefined;

        while (offset < byteSize) {
          const length = Math.min(chunkSize, byteSize - offset);
          const data = this.deps.readChunk
            ? await this.deps.readChunk(localPath, offset, length)
            : 'x'.repeat(length);

          const result = await this.deps.api.uploadMediaChunk({
            uploadUrl: init.uploadUrl,
            data,
            offset,
            totalSize: byteSize,
          });

          offset = result.nextOffset;
          await this.deps.media.updateUploadProgress(asset.clientId, {
            bytesUploaded: offset,
          });

          if (result.complete) {
            remoteUrl = result.remoteUrl;
            break;
          }
        }

        await this.deps.media.updateUploadProgress(asset.clientId, {
          uploadStatus: 'synced',
          remoteUrl: remoteUrl ?? null,
          bytesUploaded: byteSize,
          lastError: null,
        });
        uploaded += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        logger.warn('Media upload failed', {id: asset.clientId, message});
        const attempts = asset.uploadAttempts + 1;
        await this.deps.media.updateUploadProgress(asset.clientId, {
          uploadStatus: 'failed',
          uploadAttempts: attempts,
          nextAttemptAt: nextAttemptAt(attempts),
          lastError: message,
        });
      }
    }

    return uploaded;
  }

  /** Demo helper: pretend compress using config quality metadata. */
  static stubCompress(localPath: string): Promise<{path: string; byteSize: number}> {
    const {mediaJpegQuality} = getAppConfig();
    return Promise.resolve({
      path: localPath.replace(/(\.\w+)?$/, `_q${Math.round(mediaJpegQuality * 100)}.jpg`),
      byteSize: 120_000,
    });
  }
}
