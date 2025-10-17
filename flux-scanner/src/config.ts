/**
 * Scanner Configuration Management
 *
 * Provides dynamic configuration for blockchain scanner based on API type.
 * Automatically detects local vs public Blockbook and adjusts scanning parameters.
 */

export type ApiMode = 'local' | 'public' | 'auto';

export interface ScannerConfig {
  /** HTTP request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts for failed requests */
  retryLimit: number;
  /** Scanner batch size (blocks per batch) */
  batchSize: number;
  /** Delay between batches (ms) */
  throttleDelay: number;
  /** Checkpoint save interval (blocks) */
  checkpointInterval: number;
  /** Health check interval (ms) */
  healthCheckInterval: number;
}

/**
 * Local Blockbook Profile (Aggressive)
 * - Used when connected to a local Blockbook instance
 * - Optimized for speed with minimal throttling
 */
export const LOCAL_CONFIG: ScannerConfig = {
  timeout: 10000,              // 10s - local network is fast
  retryLimit: 1,               // Minimal retries - local is reliable
  batchSize: 500,              // Large batches - process more at once
  throttleDelay: 100,          // 100ms - minimal delay
  checkpointInterval: 5000,    // Save state every 5000 blocks
  healthCheckInterval: 30000,  // Check health every 30s
};

/**
 * Public Blockbook Profile (Conservative)
 * - Used when connected to public Blockbook instance
 * - Optimized to avoid rate limiting
 */
export const PUBLIC_CONFIG: ScannerConfig = {
  timeout: 60000,              // 60s - account for network latency
  retryLimit: 3,               // More retries - network can be flaky
  batchSize: 50,               // Smaller batches - be gentle on API
  throttleDelay: 2000,         // 2s - significant delay to avoid rate limits
  checkpointInterval: 1000,    // Save state every 1000 blocks (more frequent saves)
  healthCheckInterval: 60000,  // Check health every 60s
};

/**
 * Current active configuration
 */
let activeConfig: ScannerConfig = PUBLIC_CONFIG;
let currentMode: ApiMode = 'public';

/**
 * Get the current active scanner configuration
 */
export function getScannerConfig(): ScannerConfig {
  return { ...activeConfig };
}

/**
 * Get the current API mode
 */
export function getApiMode(): ApiMode {
  return currentMode;
}

/**
 * Set the API mode and update configuration
 * @param mode - The API mode to use
 */
export function setApiMode(mode: ApiMode): void {
  currentMode = mode;

  switch (mode) {
    case 'local':
      activeConfig = LOCAL_CONFIG;
      console.log('[Scanner Config] Switched to LOCAL mode (aggressive settings)');
      console.log(`  - Batch size: ${activeConfig.batchSize} blocks`);
      console.log(`  - Throttle delay: ${activeConfig.throttleDelay}ms`);
      console.log(`  - Timeout: ${activeConfig.timeout}ms`);
      break;
    case 'public':
      activeConfig = PUBLIC_CONFIG;
      console.log('[Scanner Config] Switched to PUBLIC mode (conservative settings)');
      console.log(`  - Batch size: ${activeConfig.batchSize} blocks`);
      console.log(`  - Throttle delay: ${activeConfig.throttleDelay}ms`);
      console.log(`  - Timeout: ${activeConfig.timeout}ms`);
      break;
    case 'auto':
      // Auto mode will be determined by health check
      console.log('[Scanner Config] Switched to AUTO mode (health-based)');
      break;
  }
}

/**
 * Override specific configuration values
 */
export function overrideConfig(overrides: Partial<ScannerConfig>): void {
  activeConfig = { ...activeConfig, ...overrides };
  console.log('[Scanner Config] Configuration overridden:', overrides);
}

/**
 * Detect API mode based on Blockbook URL
 */
export function detectApiMode(apiUrl: string): ApiMode {
  // Check if URL contains localhost or local network indicators
  const isLocal =
    apiUrl.includes('localhost') ||
    apiUrl.includes('127.0.0.1') ||
    apiUrl.includes('::1') ||
    apiUrl.includes('flux') ||  // Internal Flux component naming
    apiUrl.match(/^http:\/\/10\./) ||
    apiUrl.match(/^http:\/\/192\.168\./) ||
    apiUrl.match(/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
    apiUrl.startsWith('http://flux'); // Flux internal networking

  return isLocal ? 'local' : 'public';
}

/**
 * Initialize configuration from environment
 */
export function initializeConfig(): void {
  const apiUrl = process.env.BLOCKBOOK_API_URL || 'http://fluxblockbook_explorertest2:9158/api/v2';

  // Check for manual mode override
  const manualMode = process.env.API_MODE as ApiMode | undefined;

  if (manualMode === 'local' || manualMode === 'public') {
    setApiMode(manualMode);
  } else {
    // Auto-detect based on URL
    const detectedMode = detectApiMode(apiUrl);
    setApiMode(detectedMode);
    console.log(`[Scanner Config] Auto-detected mode: ${detectedMode.toUpperCase()} (URL: ${apiUrl})`);
  }

  // Check for individual environment overrides
  const overrides: Partial<ScannerConfig> = {};

  if (process.env.API_TIMEOUT) {
    overrides.timeout = parseInt(process.env.API_TIMEOUT);
  }
  if (process.env.API_RETRY_LIMIT) {
    overrides.retryLimit = parseInt(process.env.API_RETRY_LIMIT);
  }
  if (process.env.BATCH_SIZE) {
    overrides.batchSize = parseInt(process.env.BATCH_SIZE);
  }
  if (process.env.THROTTLE_DELAY) {
    overrides.throttleDelay = parseInt(process.env.THROTTLE_DELAY);
  }
  if (process.env.CHECKPOINT_INTERVAL) {
    overrides.checkpointInterval = parseInt(process.env.CHECKPOINT_INTERVAL);
  }

  if (Object.keys(overrides).length > 0) {
    overrideConfig(overrides);
  }
}

// Initialize on import
initializeConfig();
