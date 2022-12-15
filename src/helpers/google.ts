import axios from 'axios';

const _axios = axios.create();

/**
 *
 */
export function inGoogleCloudRun (): boolean {
  return !!process.env.K_SERVICE;
}

/**
 *
 */
export async function getGoogleProjectId (): Promise<string> {
  if (process.env.GCLOUD_PROJECT) {
    return process.env.GCLOUD_PROJECT;
  }

  return await _getMetadata('computeMetadata/v1/project/project-id');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _getMetadata (path: string): Promise<any> {
  const metadataUrl = `http://metadata/${path}`;
  const options = {
    headers: {
      'Metadata-Flavor': 'Google'
    }
  };

  return (await _axios.get(metadataUrl, options)).data;
}
