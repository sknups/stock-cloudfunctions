import { Request } from '@google-cloud/functions-framework';
import { AppError, SKU_MISSING_FROM_URL_ERROR } from '../app.errors';

export function getSkuFromRequestPath(req: Request) : string {
    const parts = req.path.split('/')

    let sku;

    if (parts.length > 0) {
      sku = parts[parts.length - 1];
    }

    if (!sku || sku.length === 0) {
      throw new AppError(SKU_MISSING_FROM_URL_ERROR)
    }

    return sku;
}