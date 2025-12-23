/**
 * File Storage Configuration
 * 
 * Handles local and cloud storage operations
 * Supports AWS S3, Azure Blob Storage, and local filesystem
 */

const env = require('./env');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class StorageManager {
  constructor() {
    this.provider = env.CLOUD_STORAGE.PROVIDER;
    this.initializeProvider();
  }

  initializeProvider() {
    switch (this.provider) {
      case 's3':
        this.initializeS3();
        break;
      case 'azure':
        this.initializeAzure();
        break;
      default:
        this.initializeLocal();
    }
  }

  initializeLocal() {
    logger.info('Initializing local file storage');
    this.uploadDir = env.UPLOAD.DIR;
  }

  initializeS3() {
    try {
      const AWS = require('aws-sdk');
      this.s3 = new AWS.S3({
        accessKeyId: env.CLOUD_STORAGE.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUD_STORAGE.AWS_SECRET_ACCESS_KEY,
        region: env.CLOUD_STORAGE.AWS_REGION,
      });
      this.bucket = env.CLOUD_STORAGE.AWS_BUCKET_NAME;
      logger.info('AWS S3 storage initialized');
    } catch (err) {
      logger.error('Failed to initialize S3 storage:', err);
      throw err;
    }
  }

  initializeAzure() {
    try {
      const { BlobServiceClient } = require('@azure/storage-blob');
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        env.CLOUD_STORAGE.COSMOS_CONNECTION_STRING
      );
      logger.info('Azure Blob Storage initialized');
    } catch (err) {
      logger.error('Failed to initialize Azure storage:', err);
      throw err;
    }
  }

  /**
   * Upload file
   */
  async uploadFile(file, destination) {
    try {
      if (this.provider === 's3') {
        return await this.uploadToS3(file, destination);
      } else if (this.provider === 'azure') {
        return await this.uploadToAzure(file, destination);
      } else {
        return await this.uploadLocal(file, destination);
      }
    } catch (err) {
      logger.error(`File upload failed: ${err.message}`);
      throw err;
    }
  }

  async uploadLocal(file, destination) {
    const fullPath = path.join(this.uploadDir, destination);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    logger.info(`File uploaded locally: ${fullPath}`);
    return {
      url: `/uploads/${destination}`,
      path: fullPath,
      size: file.buffer.length,
    };
  }

  async uploadToS3(file, destination) {
    const params = {
      Bucket: this.bucket,
      Key: destination,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const result = await this.s3.upload(params).promise();
    logger.info(`File uploaded to S3: ${result.Key}`);
    return {
      url: result.Location,
      key: result.Key,
      size: file.buffer.length,
    };
  }

  async uploadToAzure(file, destination) {
    const containerClient = this.blobServiceClient.getContainerClient('procurement-files');
    const blockBlobClient = containerClient.getBlockBlobClient(destination);

    await blockBlobClient.upload(file.buffer, file.buffer.length);

    logger.info(`File uploaded to Azure: ${destination}`);
    return {
      url: blockBlobClient.url,
      name: destination,
      size: file.buffer.length,
    };
  }

  /**
   * Delete file
   */
  async deleteFile(filePath) {
    try {
      if (this.provider === 's3') {
        return await this.deleteFromS3(filePath);
      } else if (this.provider === 'azure') {
        return await this.deleteFromAzure(filePath);
      } else {
        return await this.deleteLocal(filePath);
      }
    } catch (err) {
      logger.error(`File deletion failed: ${err.message}`);
      throw err;
    }
  }

  async deleteLocal(filePath) {
    const fullPath = path.join(this.uploadDir, filePath);
    await fs.unlink(fullPath);
    logger.info(`File deleted locally: ${fullPath}`);
    return true;
  }

  async deleteFromS3(filePath) {
    const params = {
      Bucket: this.bucket,
      Key: filePath,
    };

    await this.s3.deleteObject(params).promise();
    logger.info(`File deleted from S3: ${filePath}`);
    return true;
  }

  async deleteFromAzure(filePath) {
    const containerClient = this.blobServiceClient.getContainerClient('procurement-files');
    const blockBlobClient = containerClient.getBlockBlobClient(filePath);
    await blockBlobClient.delete();
    logger.info(`File deleted from Azure: ${filePath}`);
    return true;
  }

  /**
   * Get file
   */
  async getFile(filePath) {
    try {
      if (this.provider === 's3') {
        return await this.getFromS3(filePath);
      } else if (this.provider === 'azure') {
        return await this.getFromAzure(filePath);
      } else {
        return await this.getLocal(filePath);
      }
    } catch (err) {
      logger.error(`File retrieval failed: ${err.message}`);
      throw err;
    }
  }

  async getLocal(filePath) {
    const fullPath = path.join(this.uploadDir, filePath);
    return await fs.readFile(fullPath);
  }

  async getFromS3(filePath) {
    const params = {
      Bucket: this.bucket,
      Key: filePath,
    };

    const data = await this.s3.getObject(params).promise();
    return data.Body;
  }

  async getFromAzure(filePath) {
    const containerClient = this.blobServiceClient.getContainerClient('procurement-files');
    const blockBlobClient = containerClient.getBlockBlobClient(filePath);
    const download = await blockBlobClient.download();
    return download.readableStreamBody;
  }
}

module.exports = new StorageManager();
