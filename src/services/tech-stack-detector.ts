/**
 * Tech Stack Detection Service
 * Automatically detects project tech stack based on project files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Simple logging without requiring logger to avoid circular dependency
const colors = {
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const log = {
  info: (msg: string): void => console.log(`${colors.blue}${msg}${colors.reset}`),
  warning: (msg: string): void => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
};

/**
 * Check if a file exists in the project root
 */
function fileExists(projectRoot: string, filename: string): boolean {
  return fs.existsSync(path.join(projectRoot, filename));
}

/**
 * Check if package.json has specific dependencies
 */
function hasPackageJsonDependencies(projectRoot: string, dependencies: string[]): boolean {
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check if all required dependencies exist
    return dependencies.every((dep) => dep in allDependencies);
  } catch (error) {
    log.warning(`Failed to parse package.json: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Check if project has Java files
 */
function hasJavaFiles(projectRoot: string): boolean {
  try {
    const srcPath = path.join(projectRoot, 'src');
    if (!fs.existsSync(srcPath)) {
      return false;
    }

    // Check if there are any .java files in the src directory
    function hasJavaInDirectory(dir: string): boolean {
      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
          // Skip common non-source directories
          if (['node_modules', '.git', 'target', 'build'].includes(file.name)) {
            continue;
          }
          if (hasJavaInDirectory(fullPath)) {
            return true;
          }
        } else if (file.name.endsWith('.java')) {
          return true;
        }
      }

      return false;
    }

    return hasJavaInDirectory(srcPath);
  } catch (error) {
    log.warning(`Failed to check for Java files: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Check if project has Kotlin files
 */
function hasKotlinFiles(projectRoot: string): boolean {
  try {
    const candidates = [
      path.join(projectRoot, 'src'),
      path.join(projectRoot, 'app'),
      path.join(projectRoot, 'app', 'src'),
      path.join(projectRoot, 'app', 'src', 'main'),
      path.join(projectRoot, 'app', 'src', 'main', 'java'),
      path.join(projectRoot, 'app', 'src', 'main', 'kotlin'),
    ];

    const visited = new Set<string>();

    function hasKtInDirectory(dir: string): boolean {
      if (!fs.existsSync(dir)) return false;
      const real = fs.realpathSync(dir);
      if (visited.has(real)) return false;
      visited.add(real);

      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          if (['node_modules', '.git', 'target', 'build', '.gradle', '.idea'].includes(file.name)) {
            continue;
          }
          if (hasKtInDirectory(fullPath)) return true;
        } else if (file.name.endsWith('.kt')) {
          return true;
        }
      }
      return false;
    }

    return candidates.some((dir) => hasKtInDirectory(dir));
  } catch (error) {
    log.warning(`Failed to check for Kotlin files: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Detect if project is a Gradle project using Kotlin (Kotlin/JVM or Android)
 */
function isKotlinGradle(projectRoot: string): boolean {
  try {
    const buildFiles = [
      'build.gradle.kts',
      'settings.gradle.kts',
      'build.gradle',
      'settings.gradle',
    ];

    const hasGradle = buildFiles.some((f) => fileExists(projectRoot, f));
    if (!hasGradle) return false;

    const probeFiles = buildFiles.filter((f) => fileExists(projectRoot, f));
    const content = probeFiles
      .map((f) => {
        try {
          return fs.readFileSync(path.join(projectRoot, f), 'utf8');
        } catch {
          return '';
        }
      })
      .join('\n');

    // Common Kotlin plugin markers
    const kotlinMarkers = [
      'org.jetbrains.kotlin.jvm',
      'org.jetbrains.kotlin.android',
      'kotlin("jvm")',
      'kotlin("android")',
      'id("org.jetbrains.kotlin.jvm")',
      'id("org.jetbrains.kotlin.android")',
      "id 'org.jetbrains.kotlin.jvm'",
      "id 'org.jetbrains.kotlin.android'",
    ];

    return kotlinMarkers.some((m) => content.includes(m));
  } catch (error) {
    log.warning(`Failed to analyze Gradle files for Kotlin: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Detect if project is a Kotlin project
 */
function isKotlinProject(projectRoot: string): boolean {
  if (isKotlinGradle(projectRoot)) {
    if (!hasKotlinFiles(projectRoot)) {
      log.info('Found Gradle with Kotlin plugin but no Kotlin source files detected');
      return false;
    }
    log.info('Detected tech stack: kotlin (Gradle with Kotlin plugin and .kt files)');
    return true;
  }

  // Fallback: presence of Kotlin source files without explicit Gradle marker
  if (hasKotlinFiles(projectRoot)) {
    log.info('Detected tech stack: kotlin (found Kotlin source files)');
    return true;
  }

  return false;
}

/**
 * Detect if project is a Java Gradle project
 */
function isJavaGradle(projectRoot: string): boolean {
  try {
    const buildFiles = [
      'build.gradle',
      'build.gradle.kts',
      'settings.gradle',
      'settings.gradle.kts',
    ];

    const hasGradle = buildFiles.some((f) => fileExists(projectRoot, f));
    if (!hasGradle) {
      return false;
    }

    // Verify it has Java source files
    if (!hasJavaFiles(projectRoot)) {
      log.info('Found Gradle files but no Java source files detected');
      return false;
    }

    // Check if this is NOT a Kotlin project (to avoid false positives)
    const probeFiles = buildFiles.filter((f) => fileExists(projectRoot, f));
    const content = probeFiles
      .map((f) => {
        try {
          return fs.readFileSync(path.join(projectRoot, f), 'utf8');
        } catch {
          return '';
        }
      })
      .join('\n');

    // If it has Kotlin plugin markers, it should be detected as kotlin, not java-gradle
    const kotlinMarkers = [
      'org.jetbrains.kotlin.jvm',
      'org.jetbrains.kotlin.android',
      'kotlin("jvm")',
      'kotlin("android")',
      'id("org.jetbrains.kotlin.jvm")',
      'id("org.jetbrains.kotlin.android")',
      "id 'org.jetbrains.kotlin.jvm'",
      "id 'org.jetbrains.kotlin.android'",
    ];

    const hasKotlinPlugin = kotlinMarkers.some((m) => content.includes(m));
    if (hasKotlinPlugin && hasKotlinFiles(projectRoot)) {
      // This should be detected as kotlin, not java-gradle
      return false;
    }

    log.info('Detected tech stack: java-gradle (found Gradle files and Java source files)');
    return true;
  } catch (error) {
    log.warning(`Failed to detect Java Gradle project: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Detect if project is a Java Maven project
 */
function isJavaMaven(projectRoot: string): boolean {
  // Check for pom.xml
  if (!fileExists(projectRoot, 'pom.xml')) {
    return false;
  }

  // Verify it has Java source files
  if (!hasJavaFiles(projectRoot)) {
    log.info('Found pom.xml but no Java source files detected');
    return false;
  }

  log.info('Detected tech stack: java-maven (found pom.xml and Java files)');
  return true;
}

/**
 * Detect if project is a Next.js TypeScript project
 */
function isNextTypescript(projectRoot: string): boolean {
  // Check for package.json
  if (!fileExists(projectRoot, 'package.json')) {
    return false;
  }

  // Check for both 'next' and 'react' dependencies
  const hasRequiredDeps = hasPackageJsonDependencies(projectRoot, [
    'next',
    'react',
  ]);

  if (!hasRequiredDeps) {
    return false;
  }

  log.info('Detected tech stack: next-ts (found package.json with Next.js and React)');
  return true;
}

/**
 * Detect the project's tech stack
 * Returns the tech stack identifier or null if not detected
 *
 * @param projectRoot - Root directory of the project
 * @returns Tech stack identifier ('kotlin', 'java-gradle', 'java-maven', 'next-ts') or null
 */
export function detectTechStack(projectRoot: string = process.env.CI_PROJECT_DIR || process.cwd()): string | null {
  log.info('Auto-detecting project tech stack...');
  log.info(`Project root: ${projectRoot}`);

  // Check for Kotlin first (to avoid false positives when package.json exists for tooling)
  if (isKotlinProject(projectRoot)) {
    return 'kotlin';
  }

  // Check for Java Gradle (before Maven to prioritize Gradle detection)
  if (isJavaGradle(projectRoot)) {
    return 'java-gradle';
  }

  // Check for Java Maven
  if (isJavaMaven(projectRoot)) {
    return 'java-maven';
  }

  // Check for Next.js TypeScript
  if (isNextTypescript(projectRoot)) {
    return 'next-ts';
  }

  // No matching tech stack found
  log.warning('No matching tech stack detected');
  log.info('Supported tech stacks:');
  log.info('  - kotlin: Kotlin/Gradle projects with Kotlin plugin and .kt files');
  log.info('  - java-gradle: Java projects using Gradle build system');
  log.info('  - java-maven: Requires pom.xml and Java source files');
  log.info('  - next-ts: Requires package.json with "next" and "react" dependencies');

  return null;
}

export {
  isJavaGradle,
  isJavaMaven,
  isNextTypescript,
  isKotlinProject,
};

