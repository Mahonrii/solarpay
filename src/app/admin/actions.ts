
'use server';

import bcrypt from 'bcrypt';
import type { ClientData } from '@/lib/types';

// This type represents a row in the 'branches' D1 table.
// isSuperAdmin is 0 or 1 in SQLite/D1 for BOOLEAN.
type BranchD1Row = {
  id: string;
  name: string;
  password?: string;
  isSuperAdmin?: 0 | 1;
};

export interface BranchConfig {
  id: string;
  name: string;
  password?: string; 
  isSuperAdmin?: boolean;
}

const SALT_ROUNDS = 10;

// Helper to get the D1 database binding.
// This will be available in the Cloudflare Pages environment.
function getDB() {
  // Types for process.env are not automatically configured for D1 bindings.
  const db = (process.env as any).DB as D1Database | undefined;
  if (!db) {
    throw new Error(
      "D1 database binding 'DB' not found. Please configure it in your Cloudflare Pages project settings and wrangler.toml."
    );
  }
  return db;
}

async function getBranchesFromD1(): Promise<BranchConfig[]> {
  const db = getDB();
  try {
    const { results } = await db.prepare("SELECT * FROM branches").all<BranchD1Row>();
    return (results || []).map(row => ({
      ...row,
      // Convert D1's integer boolean back to a JavaScript boolean.
      isSuperAdmin: row.isSuperAdmin === 1,
    }));
  } catch (e: any) {
    console.error("Failed to fetch branches from D1:", e);
    // If the table doesn't exist, it's a critical setup error.
    if (e.message?.includes('no such table')) {
        throw new Error('The "branches" table does not exist in your D1 database. Please run the schema migration.');
    }
    throw new Error('Could not load branch configuration from database.');
  }
}

// Helper to generate a random password
function generateRandomPassword(length: number = 10): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  return password;
}

export async function verifyAdminPassword(branchId: string, submittedPassword: string): Promise<boolean> {
  const db = getDB();
  const branch = await db.prepare("SELECT password FROM branches WHERE id = ?")
                         .bind(branchId)
                         .first<Pick<BranchConfig, 'password'>>();

  if (!branch || !branch.password) {
    console.error('Branch not found or password not set for branch:', branchId);
    return false;
  }
  
  try {
    // All passwords in D1 should be hashed.
    return await bcrypt.compare(submittedPassword, branch.password);
  } catch (compareError) {
    console.error("Bcrypt comparison error:", compareError);
    return false; 
  }
}

export async function getBranchConfiguration(includePasswords = false): Promise<BranchConfig[]> {
  const branches = await getBranchesFromD1();
  if (includePasswords) {
    return branches;
  }
  // Default: strip passwords for general use (e.g., login dropdown)
  return branches.map(({ password, ...rest }) => rest);
}

export async function updateBranchNameInConfig(branchIdToUpdate: string, newName: string): Promise<{ success: boolean; message: string; updatedName?: string }> {
  if (branchIdToUpdate !== 'cabanatuan') {
    return { success: false, message: "Only the Cabanatuan super admin branch name can be changed." };
  }
  if (!newName || newName.trim().length < 3) {
    return { success: false, message: "New branch name must be at least 3 characters long." };
  }
  
  const trimmedNewName = newName.trim();
  const db = getDB();

  try {
    await db.prepare("UPDATE branches SET name = ? WHERE id = ?")
            .bind(trimmedNewName, branchIdToUpdate)
            .run();
    return { success: true, message: "Branch name updated successfully to " + trimmedNewName + ".", updatedName: trimmedNewName };
  } catch (error: any) {
    console.error("Error updating Cabanatuan branch name in D1:", error);
    return { success: false, message: error.message || "Failed to update branch name." };
  }
}


export async function updateBranchPasswordInConfig(branchIdToUpdate: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: "New password must be at least 6 characters long." };
  }
  
  const db = getDB();
  try {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const info = await db.prepare("UPDATE branches SET password = ? WHERE id = ?")
                         .bind(hashedPassword, branchIdToUpdate)
                         .run();

    if (info.changes > 0) {
        return { success: true, message: "Password updated successfully for branch." };
    } else {
        return { success: false, message: "Branch not found or no change made." };
    }
  } catch (error: any) {
    console.error("Error updating branch password in D1:", error);
    return { success: false, message: error.message || "Failed to update password." };
  }
}

export async function addNewBranch(name: string, id: string): Promise<{ success: boolean; message: string; generatedPassword?: string }> {
  if (!name.trim() || !id.trim()) {
    return { success: false, message: "Branch name and ID cannot be empty." };
  }
  const sanitizedId = id.trim().toLowerCase().replace(/[^a-z0-9_]/gi, '');
  if (!sanitizedId) {
    return { success: false, message: "Branch ID is invalid after sanitization." };
  }

  const db = getDB();
  try {
    const existing = await db.prepare("SELECT id FROM branches WHERE id = ?").bind(sanitizedId).first();
    if (existing) {
      return { success: false, message: "Branch ID already exists." };
    }

    const plainTextPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainTextPassword, SALT_ROUNDS);

    await db.prepare("INSERT INTO branches (id, name, password, isSuperAdmin) VALUES (?, ?, ?, ?)")
            .bind(sanitizedId, name.trim(), hashedPassword, 0) // New branches are never super admin.
            .run();

    return { success: true, message: "Branch " + name.trim() + " added successfully.", generatedPassword: plainTextPassword };
  } catch (error: any) {
    console.error("Error adding new branch to D1:", error);
    return { success: false, message: error.message || "Failed to add new branch." };
  }
}

export async function deleteBranch(branchIdToDelete: string): Promise<{ success: boolean; message: string }> {
  if (branchIdToDelete === 'cabanatuan') { 
    return { success: false, message: "Cannot delete the main super admin branch (Cabanatuan)." };
  }

  const db = getDB();
  try {
    const branchInfo = await db.prepare("SELECT name FROM branches WHERE id = ?").bind(branchIdToDelete).first<{name: string}>();
    if (!branchInfo) {
      return { success: false, message: "Branch not found." };
    }
    
    // With `ON DELETE CASCADE` in the schema, deleting a branch will also delete its clients.
    const deleteInfo = await db.prepare("DELETE FROM branches WHERE id = ?").bind(branchIdToDelete).run();
    
    if (deleteInfo.changes > 0) {
      return { success: true, message: "Branch " + branchInfo.name + " and all its clients deleted successfully." };
    } else {
      return { success: false, message: "Branch could not be deleted." };
    }
  } catch (error: any) {
    console.error("Error deleting branch from D1:", error);
    return { success: false, message: error.message || "Failed to delete branch." };
  }
}

async function initializeDefaultBranchData() {
  const db = getDB();
  try {
    const cabanatuanBranch = await db.prepare("SELECT id FROM branches WHERE id = 'cabanatuan'").first();
    if (!cabanatuanBranch) {
      console.log("No default branches found. Initializing D1 database with default data...");
      
      const cabanatuanPassword = await bcrypt.hash("@@@may21utang", SALT_ROUNDS);
      const cagayanPassword = await bcrypt.hash("cagayanutang2025", SALT_ROUNDS);
      
      const stmt = db.prepare(
        "INSERT INTO branches (id, name, password, isSuperAdmin) VALUES (?, ?, ?, ?), (?, ?, ?, ?)"
      );
      
      await stmt.bind(
        'cabanatuan', 'Cabanatuan Branch', cabanatuanPassword, 1,
        'cagayan', 'Cagayan Branch', cagayanPassword, 0
      ).run();
      
      console.log("Default branches created in D1.");
    }
  } catch (error: any) {
     if (error.message?.includes('no such table')) {
        console.error('Database initialization failed: The "branches" table does not exist. Please create it using the provided schema.');
     } else {
        console.error("Failed to initialize default branch data in D1:", error);
     }
  }
}

// Run initialization logic when the server starts.
initializeDefaultBranchData().catch(console.error);
