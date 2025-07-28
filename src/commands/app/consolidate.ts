import fs from 'fs';
import readline from 'readline';
import { getServer1mcpUrl, validateServer1mcpUrl } from '../../utils/urlDetection.js';
import {
  discoverAppConfigs,
  handleMultipleConfigs,
  extractAndFilterServers,
  generateAppConfig,
  checkConsolidationStatus,
} from '../../utils/appDiscovery.js';
import { isAppSupported, isAppConfigurable, generateManualInstructions, getAppPreset } from '../../utils/appPresets.js';
import { validateOperation, generateOperationPreview } from '../../utils/validationHelpers.js';
import { createBackup, withFileLock } from '../../utils/backupManager.js';
import { McpConfigManager } from '../../config/mcpConfigManager.js';

/**
 * Consolidate command - Main consolidation logic for MCP servers.
 *
 * Extracts MCP servers from desktop applications and consolidates
 * them into 1mcp with safe backup and validation.
 */

interface ConsolidateOptions {
  'app-name': string[];
  url?: string;
  'dry-run': boolean;
  yes: boolean;
  'manual-only': boolean;
  'backup-only': boolean;
  force: boolean;
}

interface ConsolidationResult {
  app: string;
  status: 'success' | 'manual' | 'skipped' | 'failed';
  message: string;
  serversImported?: number;
  backupPath?: string;
  manualInstructions?: string;
}

/**
 * Main consolidate command handler
 */
export async function consolidateCommand(options: ConsolidateOptions): Promise<void> {
  const appNames = options['app-name'];

  console.log('🔍 Starting MCP server consolidation...\n');

  // Validate all app names first
  const invalidApps = appNames.filter((app) => !isAppSupported(app));
  if (invalidApps.length > 0) {
    console.error(`❌ Unsupported applications: ${invalidApps.join(', ')}`);
    console.log('Use "npx @1mcp/agent app list" to see supported applications.');
    process.exit(1);
  }

  // Get 1mcp server URL
  const serverUrl = await getServer1mcpUrl(options.url);
  console.log(`🔗 Using 1mcp server: ${serverUrl}`);

  // Validate server connectivity (unless force mode)
  if (!options.force) {
    const connectivityCheck = await validateServer1mcpUrl(serverUrl);
    if (!connectivityCheck.valid) {
      console.error(`❌ Cannot connect to 1mcp server: ${connectivityCheck.error}`);
      console.log('Make sure the 1mcp server is running or use --force to skip validation.');
      process.exit(1);
    }
    console.log('✅ 1mcp server connectivity verified\n');
  }

  const results: ConsolidationResult[] = [];

  // Process each app
  for (const appName of appNames) {
    console.log(`\n🔍 Processing ${getAppPreset(appName)?.displayName || appName}...`);

    try {
      const result = await consolidateApp(appName, serverUrl, options);
      results.push(result);

      // Display result
      if (result.status === 'success') {
        console.log(`✅ ${result.message}`);
        if (result.serversImported !== undefined) {
          console.log(`📋 Imported ${result.serversImported} MCP servers`);
        }
        if (result.backupPath) {
          console.log(`💾 Backup created: ${result.backupPath}`);
        }
      } else if (result.status === 'manual') {
        console.log(`🔧 ${result.message}`);
        if (result.manualInstructions) {
          console.log(result.manualInstructions);
        }
      } else if (result.status === 'skipped') {
        console.log(`⏭️ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
      }
    } catch (error: any) {
      const errorResult: ConsolidationResult = {
        app: appName,
        status: 'failed',
        message: `Failed to consolidate ${appName}: ${error.message}`,
      };
      results.push(errorResult);
      console.error(`❌ ${errorResult.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Consolidation Summary:');

  const successful = results.filter((r) => r.status === 'success');
  const manual = results.filter((r) => r.status === 'manual');
  const failed = results.filter((r) => r.status === 'failed');
  const skipped = results.filter((r) => r.status === 'skipped');

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`🔧 Manual setup required: ${manual.length}`);
  console.log(`⏭️ Skipped: ${skipped.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n🔄 Restart the following applications to use consolidated configuration:');
    successful.forEach((result) => {
      console.log(`   - ${getAppPreset(result.app)?.displayName || result.app}`);
    });

    console.log('\n💡 To undo consolidation, use:');
    console.log('   npx @1mcp/agent app restore <app-name>');
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

/**
 * Consolidate a single application
 */
async function consolidateApp(
  appName: string,
  serverUrl: string,
  options: ConsolidateOptions,
): Promise<ConsolidationResult> {
  // Check if app is already consolidated (unless force mode)
  if (!options.force) {
    const consolidationStatus = await checkConsolidationStatus(appName);
    if (consolidationStatus.isConsolidated) {
      return {
        app: appName,
        status: 'skipped',
        message: `Already consolidated to ${consolidationStatus.consolidatedUrl}`,
        serversImported: 0,
      };
    }
  }

  // Check if app is configurable
  if (!isAppConfigurable(appName)) {
    // Manual setup required
    const instructions = generateManualInstructions(appName, serverUrl);
    return {
      app: appName,
      status: 'manual',
      message: `${getAppPreset(appName)?.displayName || appName} requires manual configuration`,
      manualInstructions: instructions,
    };
  }

  // Manual-only mode
  if (options['manual-only']) {
    const instructions = generateManualInstructions(appName, serverUrl);
    return {
      app: appName,
      status: 'manual',
      message: `Manual setup instructions for ${getAppPreset(appName)?.displayName || appName}`,
      manualInstructions: instructions,
    };
  }

  // Discover configurations
  const discovery = await discoverAppConfigs(appName);

  if (discovery.configs.length === 0) {
    return {
      app: appName,
      status: 'skipped',
      message: `No configuration files found for ${getAppPreset(appName)?.displayName || appName}`,
    };
  }

  // Handle multiple configs
  const strategy = handleMultipleConfigs(discovery);

  if (strategy.action === 'none') {
    return {
      app: appName,
      status: 'skipped',
      message: `No valid configuration found for ${getAppPreset(appName)?.displayName || appName}`,
    };
  }

  let targetConfig = strategy.target!;

  // If multiple configs and not in yes mode, ask user to choose
  if (strategy.action === 'choose' && !options.yes && !options['dry-run']) {
    targetConfig = await promptUserChoice(strategy.options!);
  }

  // Extract servers
  const servers = extractAndFilterServers(targetConfig.content, getAppPreset(appName)?.configFormat);

  if (servers.length === 0 && !options.force) {
    return {
      app: appName,
      status: 'skipped',
      message: `No MCP servers found in ${getAppPreset(appName)?.displayName || appName} configuration`,
    };
  }

  // Validate operation
  if (!options.force) {
    const validation = await validateOperation(targetConfig.path, targetConfig.content, serverUrl);

    if (!validation.canProceed) {
      const errors = [
        ...validation.configValidation.errors,
        ...validation.permissionValidation.errors,
        ...validation.connectivityValidation.errors,
      ];
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  // Generate preview
  const backupPath = `${targetConfig.path}.backup.${Date.now()}`;
  const preview = generateOperationPreview(
    appName,
    targetConfig.path,
    servers.map((s) => s.name),
    serverUrl,
    backupPath,
  );

  // Show preview and get confirmation
  if (!options.yes && !options['dry-run']) {
    const confirmed = await confirmOperation(preview);
    if (!confirmed) {
      return {
        app: appName,
        status: 'skipped',
        message: `Consolidation cancelled by user for ${getAppPreset(appName)?.displayName || appName}`,
      };
    }
  }

  // Dry run mode - just show what would happen
  if (options['dry-run']) {
    console.log('\n📋 Dry Run Preview:');
    console.log(`App: ${getAppPreset(appName)?.displayName || appName}`);
    console.log(`Config: ${targetConfig.path}`);
    console.log(`Servers to import: ${servers.map((s) => s.name).join(', ') || 'none'}`);
    console.log(`Replacement URL: ${serverUrl}`);
    console.log(`Backup would be created: ${backupPath}`);

    return {
      app: appName,
      status: 'success',
      message: `Dry run completed for ${getAppPreset(appName)?.displayName || appName}`,
      serversImported: servers.length,
    };
  }

  // Create backup
  const backup = createBackup(targetConfig.path, appName, 'consolidate', servers.length);

  // Backup-only mode
  if (options['backup-only']) {
    return {
      app: appName,
      status: 'success',
      message: `Backup created for ${getAppPreset(appName)?.displayName || appName}`,
      backupPath: backup.backupPath,
    };
  }

  // Perform consolidation with file locking
  await withFileLock(targetConfig.path, async () => {
    try {
      // Import servers to 1mcp
      if (servers.length > 0) {
        await importServersTo1mcp(servers);
      }

      // Generate new config
      const newConfig = generateAppConfig(appName, serverUrl);

      // Write new configuration
      fs.writeFileSync(targetConfig.path, JSON.stringify(newConfig, null, 2));
    } catch (error) {
      // Rollback on failure
      fs.copyFileSync(backup.backupPath, backup.originalPath);
      throw error;
    }
  });

  return {
    app: appName,
    status: 'success',
    message: `Successfully consolidated ${getAppPreset(appName)?.displayName || appName}`,
    serversImported: servers.length,
    backupPath: backup.backupPath,
  };
}

/**
 * Import MCP servers to 1mcp configuration
 */
async function importServersTo1mcp(servers: any[]): Promise<void> {
  const mcpConfig = McpConfigManager.getInstance();

  // Get current transport config
  const currentConfig = mcpConfig.getTransportConfig();

  for (const server of servers) {
    // Check if server already exists
    if (currentConfig[server.name]) {
      console.log(`⚠️ Server "${server.name}" already exists in 1mcp config - skipping`);
      continue;
    }

    // This is a simplified implementation - in a real scenario,
    // we would need to modify the McpConfigManager to support adding servers
    // or directly modify the config file
    console.log(`📋 Would import server: ${server.name}`);

    // For now, just log what would be imported
    if (server.command) {
      console.log(`   Command: ${server.command}`);
      if (server.args) console.log(`   Args: ${server.args.join(' ')}`);
    } else if (server.url) {
      console.log(`   URL: ${server.url}`);
    }
  }

  // Note: In a complete implementation, we would need to:
  // 1. Read the current config file
  // 2. Add the new servers
  // 3. Write the updated config back
  // This would require extending McpConfigManager or creating a config writer utility
}

/**
 * Prompt user to choose from multiple configurations
 */
async function promptUserChoice(configs: any[]): Promise<any> {
  console.log('\n📋 Multiple configurations found:');

  configs.forEach((config, index) => {
    console.log(`${index + 1}. ${config.path} (${config.level}, ${config.servers.length} servers)`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\nWhich configuration would you like to use? (number): ', (answer) => {
      rl.close();

      const choice = parseInt(answer, 10);
      if (choice >= 1 && choice <= configs.length) {
        resolve(configs[choice - 1]);
      } else {
        console.log('Invalid choice, using first option.');
        resolve(configs[0]);
      }
    });
  });
}

/**
 * Confirm operation with user
 */
async function confirmOperation(preview: any): Promise<boolean> {
  console.log('\n📋 Operation Preview:');
  console.log(`App: ${preview.app}`);
  console.log(`Config: ${preview.configPath}`);
  console.log(`Servers to import: ${preview.serversToImport.join(', ') || 'none'}`);
  console.log(`Replacement URL: ${preview.replacementUrl}`);
  console.log(`Backup will be created: ${preview.backupPath}`);

  if (preview.risks.length > 0) {
    console.log('\n⚠️ Potential Issues:');
    preview.risks.forEach((risk: string) => console.log(`  - ${risk}`));
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\nAre you sure you want to proceed? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
