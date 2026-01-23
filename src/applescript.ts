import { spawn } from 'child_process';

export interface AppleScriptError extends Error {
  code?: number;
  stderr?: string;
}

/**
 * Execute AppleScript code and return the result
 */
export async function executeAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-']);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (stderr) {
        console.error('AppleScript stderr:', stderr);
      }

      if (code !== 0) {
        const error = new Error(`AppleScript execution failed: ${stderr || 'unknown error'}`) as AppleScriptError;
        error.code = code ?? undefined;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn osascript: ${err.message}`));
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}

/**
 * Execute compiled AppleScript (.scpt) file
 */
export async function executeCompiledScript(scriptPath: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('osascript', [scriptPath, ...args]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (stderr) {
        console.error('Compiled script stderr:', stderr);
      }

      if (code !== 0) {
        const error = new Error(`Compiled script execution failed: ${stderr || 'unknown error'}`) as AppleScriptError;
        error.code = code ?? undefined;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn osascript: ${err.message}`));
    });
  });
}

/**
 * Escape a string for safe use in AppleScript
 */
export function escapeAppleScriptString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Parse AppleScript list output (e.g., "item1, item2, item3")
 */
export function parseAppleScriptList(output: string): string[] {
  if (!output || output.trim() === '') {
    return [];
  }
  
  return output.split(', ').map(item => item.trim());
}

/**
 * Parse AppleScript record output to JSON
 * Limited implementation - handles simple records
 */
export function parseAppleScriptRecord(output: string): Record<string, any> {
  const result: Record<string, any> = {};
  
  // Very basic parser for simple key:value records
  const matches = output.matchAll(/(\w+):([^,}]+)/g);
  for (const match of matches) {
    const key = match[1].trim();
    const value = match[2].trim();
    result[key] = value;
  }
  
  return result;
}
