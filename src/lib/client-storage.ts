
'use server';

import type { ClientData } from './types';
import { getBranchConfiguration } from '@/app/admin/actions';

// This type represents a row in the 'clients' D1 table.
// Dates are stored as ISO strings, and objects are stored as JSON strings.
type ClientD1Row = Omit<ClientData, 'startDate' | 'paymentOverrides'> & {
  startDate: string;
  paymentOverrides: string | null;
  branchId: string;
};

// Helper to get the D1 database binding.
function getDB() {
  const db = (process.env as any).DB as D1Database | undefined;
  if (!db) {
    throw new Error(
      "D1 database binding 'DB' not found. Please configure it in your Cloudflare Pages project settings and wrangler.toml."
    );
  }
  return db;
}

// Helper function to convert a raw D1 client row to the application's ClientData type.
const d1RowToClientData = (row: any): ClientData => {
  const paymentOverridesRaw = row.paymentOverrides ? JSON.parse(row.paymentOverrides) : {};
  const paymentOverridesParsed: Record<number, { status: 'Paid'; paymentDate?: Date }> = {};
  
  // Parse paymentDate strings within paymentOverrides into Date objects
  for (const key in paymentOverridesRaw) {
    const override = paymentOverridesRaw[key];
    paymentOverridesParsed[Number(key)] = {
      ...override,
      paymentDate: override.paymentDate ? new Date(override.paymentDate) : undefined,
    };
  }

  return {
    ...row,
    startDate: new Date(row.startDate),
    paymentOverrides: paymentOverridesParsed,
  };
};


export const getAllClients = async (branchId: string): Promise<ClientData[]> => {
  if (!branchId) {
    console.warn("getAllClients called with no branchId. Returning empty array.");
    return [];
  }
  const db = getDB();
  try {
    const { results } = await db.prepare("SELECT * FROM clients WHERE branchId = ? ORDER BY name ASC")
                                .bind(branchId)
                                .all<ClientD1Row>();
    return (results || []).map(d1RowToClientData);
  } catch (e: any) {
    console.error(`Failed to fetch clients for branch ${branchId} from D1:`, e);
    if (e.message?.includes('no such table')) {
        throw new Error('The "clients" table does not exist in your D1 database. Please run the schema migration.');
    }
    return [];
  }
};

const isIdGloballyUnique = async (idToCheck: string): Promise<boolean> => {
  const db = getDB();
  const clientCheck = await db.prepare("SELECT id FROM clients WHERE id = ?").bind(idToCheck).first();
  return !clientCheck;
};

export const addClient = async (branchId: string, client: Omit<ClientData, 'id'>): Promise<string | null> => {
  if (!branchId) {
    console.error("addClient called with no branchId.");
    return null;
  }
  
  const db = getDB();
  try {
    // Unique ID Generation Logic
    let newId = '';
    let isUnique = false;
    const maxAttempts = 50;
    for (let attempts = 0; attempts < maxAttempts && !isUnique; attempts++) {
      const letterPart = Array(3).fill(0).map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]).join('');
      const numberPart = Array(4).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
      newId = `${letterPart}-${numberPart}`;
      isUnique = await isIdGloballyUnique(newId);
    }
    if (!isUnique) {
      newId = `fallback-${Date.now()}`; // Fallback ID
    }

    const newClient: ClientData = {
      ...client,
      id: newId,
      startDate: new Date(client.startDate),
      paymentOverrides: client.paymentOverrides || {},
    };

    await db.prepare(
      "INSERT INTO clients (id, branchId, name, address, solarType, totalAmount, downPayment, paymentTermMonths, monthlyPayment, startDate, penaltyRate, paymentOverrides) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      newClient.id,
      branchId,
      newClient.name,
      newClient.address,
      newClient.solarType,
      newClient.totalAmount,
      newClient.downPayment,
      newClient.paymentTermMonths,
      newClient.monthlyPayment,
      newClient.startDate.toISOString(),
      newClient.penaltyRate,
      JSON.stringify(newClient.paymentOverrides)
    ).run();
    
    return newId;
  } catch (error: any) {
    console.error('Error adding client for branch ' + branchId + ' to D1:', error);
    return null;
  }
};

export const getClientById = async (branchId: string, id: string): Promise<ClientData | null> => {
  if (!branchId) {
    console.warn("getClientById called with no branchId.");
    return null;
  }
  const db = getDB();
  try {
    const row = await db.prepare("SELECT * FROM clients WHERE branchId = ? AND id = ?")
                        .bind(branchId, id)
                        .first<ClientD1Row>();
    return row ? d1RowToClientData(row) : null;
  } catch (error: any) {
    console.error('Error getting client by ID for branch ' + branchId + ' from D1:', error);
    return null;
  }
};

export const findClientByIdGlobally = async (id: string): Promise<{ client: ClientData; branchId: string; branchName: string } | null> => {
  const db = getDB();
  try {
    // Use a JOIN to get the branch name in a single query.
    const row = await db.prepare(`
      SELECT c.*, b.name as branchName 
      FROM clients c 
      JOIN branches b ON c.branchId = b.id 
      WHERE c.id = ?
    `).bind(id).first<ClientD1Row & { branchName: string }>();

    if (!row) return null;

    const { branchName, ...clientRow } = row;
    const client = d1RowToClientData(clientRow);
    
    return { client, branchId: client.branchId, branchName };
  } catch (error: any) {
    console.error('Error finding client globally in D1:', error);
    return null;
  }
};

export const updateClient = async (branchId: string, clientId: string, updatedData: Partial<Omit<ClientData, 'id'>>): Promise<boolean> => {
  if (!branchId) {
    console.error("updateClient called with no branchId.");
    return false;
  }
  const db = getDB();
  try {
    const existingClient = await getClientById(branchId, clientId);
    if (!existingClient) {
      return false;
    }
    
    // Merge existing data with updated data
    const clientToUpdate: ClientData = {
      ...existingClient,
      ...updatedData,
      startDate: updatedData.startDate ? new Date(updatedData.startDate) : existingClient.startDate,
      paymentOverrides: updatedData.paymentOverrides || existingClient.paymentOverrides,
    };
    
    const info = await db.prepare(`
      UPDATE clients 
      SET name = ?, address = ?, solarType = ?, totalAmount = ?, downPayment = ?, paymentTermMonths = ?, monthlyPayment = ?, startDate = ?, penaltyRate = ?, paymentOverrides = ?
      WHERE id = ? AND branchId = ?
    `).bind(
      clientToUpdate.name,
      clientToUpdate.address,
      clientToUpdate.solarType,
      clientToUpdate.totalAmount,
      clientToUpdate.downPayment,
      clientToUpdate.paymentTermMonths,
      clientToUpdate.monthlyPayment,
      clientToUpdate.startDate.toISOString(),
      clientToUpdate.penaltyRate,
      JSON.stringify(clientToUpdate.paymentOverrides),
      clientId,
      branchId
    ).run();

    return info.success && info.changes > 0;
  } catch (error: any) {
    console.error('Error updating client for branch ' + branchId + ' in D1:', error);
    return false;
  }
};

export const deleteClientStorage = async (branchId: string, id: string): Promise<boolean> => {
  if (!branchId) {
    console.error("deleteClientStorage called with no branchId.");
    return false;
  }
  const db = getDB();
  try {
    const info = await db.prepare("DELETE FROM clients WHERE id = ? AND branchId = ?")
                         .bind(id, branchId)
                         .run();
    return info.success && info.changes > 0;
  } catch (error: any) {
    console.error('Error deleting client for branch ' + branchId + ' from D1:', error);
    return false;
  }
};
