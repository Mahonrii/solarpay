
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SolarDashboardContent } from '@/components/solar/solar-dashboard-content';
import type { ClientData } from '@/lib/types';
import { addClient, getClientById, getAllClients, updateClient as updateClientStorage, deleteClientStorage } from '@/lib/client-storage';
import { verifyAdminPassword, getBranchConfiguration, updateBranchPasswordInConfig, addNewBranch, deleteBranch, updateBranchNameInConfig, type BranchConfig } from './actions';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Package2, ShieldAlert, UserPlus, Search, Trash2, Edit, LogOut, Home, Loader2, XCircle, Building, KeyRound, PlusCircle, Eye, EyeOff, Edit3 as EditIcon, UserCog } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import Link from 'next/link';

type NewClientFormState = {
  name: string;
  address: string;
  solarType: string;
  totalAmount: string;
  downPayment: string;
  paymentTermMonths: string;
  penaltyRate: string;
  startDate: string | undefined;
};

const defaultNewClientForm: NewClientFormState = {
  name: "",
  address: "",
  solarType: "",
  totalAmount: "",
  downPayment: "0",
  paymentTermMonths: "",
  penaltyRate: "0.05",
  startDate: undefined,
};

export default function AdminPage() {
  const [allBranches, setAllBranches] = useState<BranchConfig[]>([]);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedBranchLogin, setSelectedBranchLogin] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedBranch, setAuthenticatedBranch] = useState<BranchConfig | null>(null);
  const [authError, setAuthError] = useState('');
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState('');

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [newClientForm, setNewClientForm] = useState<NewClientFormState>(defaultNewClientForm);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);

  // Branch Management States (Super Admin)
  const [showManageBranchDialog, setShowManageBranchDialog] = useState(false);
  const [targetBranchForPasswordUpdate, setTargetBranchForPasswordUpdate] = useState<BranchConfig | null>(null); // For super admin updating OTHERS' passwords
  const [newBranchPassword, setNewBranchPassword] = useState(''); // For super admin updating OTHERS' passwords
  const [confirmNewBranchPassword, setConfirmNewBranchPassword] = useState(''); // For super admin updating OTHERS' passwords
  const [showNewBranchDialog, setShowNewBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchId, setNewBranchId] = useState('');
  const [generatedPasswordForNewBranch, setGeneratedPasswordForNewBranch] = useState('');
  const [showViewPasswordDialog, setShowViewPasswordDialog] = useState(false);
  const [passwordToView, setPasswordToView] = useState('');

  // Edit Super Admin Branch Name States
  const [showEditSuperAdminNameDialog, setShowEditSuperAdminNameDialog] = useState(false);
  const [editingSuperAdminBranchName, setEditingSuperAdminBranchName] = useState('');

  // Delete Confirmation Dialog States
  const [showDeleteClientDialog, setShowDeleteClientDialog] = useState(false);
  const [clientToDeleteDetails, setClientToDeleteDetails] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteBranchDialog, setShowDeleteBranchDialog] = useState(false);
  const [branchToDeleteDetails, setBranchToDeleteDetails] = useState<{ id: string; name: string } | null>(null);

  // Change Own Password States (for any logged-in admin)
  const [showChangeOwnPasswordDialog, setShowChangeOwnPasswordDialog] = useState(false);
  const [currentOwnPassword, setCurrentOwnPassword] = useState('');
  const [newOwnPassword, setNewOwnPassword] = useState('');
  const [confirmNewOwnPassword, setConfirmNewOwnPassword] = useState('');


  useEffect(() => {
    async function fetchBranchesForLogin() {
      try {
        const branches = await getBranchConfiguration(false); 
        setAllBranches(branches);
        if (branches.length > 0 && !selectedBranchLogin) {
             const defaultBranch = branches.find(b => b.isSuperAdmin) || branches.find(b => b.id === 'cabanatuan') || branches[0];
             if (defaultBranch) setSelectedBranchLogin(defaultBranch.id);
        }
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        toast({ title: "Error", description: "Could not load branch list for login.", variant: "destructive" });
      }
    }
    if (!isAuthenticated) {
      fetchBranchesForLogin();
    }
  }, [toast, selectedBranchLogin, isAuthenticated]);

  const loadClients = useCallback(async (branchId: string) => {
    if (!branchId) {
      setClients([]);
      setIsLoadingClients(false);
      return;
    }
    setIsLoadingClients(true);
    setSearchError('');
    try {
      const storedClients = await getAllClients(branchId);
      setClients(storedClients);
    } catch (error) {
      console.error("Failed to load clients for branch " + branchId + ":", error);
      toast({ title: "Error", description: "Failed to load client list for " + branchId + ".", variant: "destructive" });
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, [toast]);

 useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAuth = sessionStorage.getItem('solarAdminAuthenticated');
      const storedBranchJSON = sessionStorage.getItem('solarAdminBranch');
      if (storedAuth === 'true' && storedBranchJSON) {
         try {
           const storedBranchObj = JSON.parse(storedBranchJSON) as BranchConfig;
            getBranchConfiguration(true).then(currentBranches => { // Always fetch full details for session validation
                const validBranch = currentBranches.find(b => b.id === storedBranchObj.id);
                if (validBranch) {
                    setIsAuthenticated(true);
                    setAuthenticatedBranch(validBranch); 
                    setAllBranches(currentBranches); 
                } else {
                    handleLogout(); // Full logout if branch is no longer valid
                }
            }).catch(() => {
                handleLogout();
            });
         } catch (e) {
            handleLogout();
         }
      } else {
         getBranchConfiguration(false).then(setAllBranches);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (isAuthenticated && authenticatedBranch) {
      loadClients(authenticatedBranch.id);
    } else {
      setClients([]);
      setSelectedClient(null);
      setSearchId('');
    }
  }, [isAuthenticated, authenticatedBranch, loadClients]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchLogin) {
      setAuthError('Please select a branch.');
      return;
    }
    setIsLoggingIn(true);
    setAuthError('');

    try {
      const isValidPassword = await verifyAdminPassword(selectedBranchLogin, passwordInput);
      if (isValidPassword) {
        const branchesWithDetails = await getBranchConfiguration(true); 
        const branchDetails = branchesWithDetails.find(b => b.id === selectedBranchLogin);
        
        setAllBranches(branchesWithDetails); 
        setIsAuthenticated(true);
        setAuthenticatedBranch(branchDetails || null);
        setAuthError('');
        if (typeof window !== 'undefined' && branchDetails) {
          sessionStorage.setItem('solarAdminAuthenticated', 'true');
          sessionStorage.setItem('solarAdminBranch', JSON.stringify(branchDetails));
        }
      } else {
        setAuthError('Invalid password for the selected branch. Please try again.');
        setIsAuthenticated(false);
        setAuthenticatedBranch(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('solarAdminAuthenticated');
          sessionStorage.removeItem('solarAdminBranch');
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setAuthError('An error occurred during login. Please try again.');
      setIsAuthenticated(false);
      setAuthenticatedBranch(null);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthenticatedBranch(null);
    setPasswordInput('');
    setSelectedBranchLogin(''); 
    setSelectedClient(null);
    setClients([]);
    setSearchId('');
    setAuthError('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('solarAdminAuthenticated');
      sessionStorage.removeItem('solarAdminBranch');
    }
    // Fetch non-sensitive branch data for login screen
    getBranchConfiguration(false).then(setAllBranches);
  };

  const handleSearchClient = async () => {
    if (!authenticatedBranch) return;
    setSearchError('');
    if (!searchId.trim()) {
      setSearchError('Please enter a Client ID to search.');
      return;
    }
    setIsSearching(true);
    setSelectedClient(null);
    try {
      const client = await getClientById(authenticatedBranch.id, searchId.trim());
      if (client) {
        setSelectedClient(client);
      } else {
        setSearchError('Client ID "' + searchId.trim() + '" not found in ' + authenticatedBranch.name + '.');
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("An error occurred while searching for the client.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClientSelectChange = async (clientId: string) => {
    if (!authenticatedBranch) return;
    if (!clientId) {
      setSelectedClient(null);
      setSearchId('');
      setSearchError('');
      return;
    }
    setIsLoadingClients(true);
    setSelectedClient(null);
    setSearchId(clientId);
    setSearchError('');
    try {
      const client = await getClientById(authenticatedBranch.id, clientId);
      if (client) {
        setSelectedClient(client);
      } else {
        toast({ title: "Not Found", description: "Client with ID " + clientId + " not found in " + authenticatedBranch.name + ". It might have been deleted.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error selecting client:", error);
      toast({ title: "Error", description: "Failed to load selected client details.", variant: "destructive" });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleOpenAddClientDialog = (clientToEdit: ClientData | null = null) => {
    if (clientToEdit) {
      setEditingClient(clientToEdit);
      setNewClientForm({
        name: clientToEdit.name,
        address: clientToEdit.address,
        solarType: clientToEdit.solarType,
        totalAmount: String(clientToEdit.totalAmount),
        downPayment: String(clientToEdit.downPayment),
        paymentTermMonths: String(clientToEdit.paymentTermMonths),
        penaltyRate: String(clientToEdit.penaltyRate),
        startDate: clientToEdit.startDate instanceof Date ? clientToEdit.startDate.toISOString().split('T')[0] : clientToEdit.startDate as string,
      });
    } else {
      setEditingClient(null);
      setNewClientForm(defaultNewClientForm);
    }
    setShowAddClientDialog(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewClientForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setNewClientForm(prev => ({ ...prev, startDate: date ? date.toISOString().split('T')[0] : undefined }));
  };

  const handleSaveClient = async () => {
    if (!authenticatedBranch) return;
    if (!newClientForm.name || !newClientForm.startDate) {
      toast({ title: "Validation Error", description: "Client Name and Start Date are required.", variant: "destructive" }); return;
    }

    const totalAmountNum = Number(newClientForm.totalAmount);
    const downPaymentNum = Number(newClientForm.downPayment);
    const paymentTermMonthsNum = Number(newClientForm.paymentTermMonths);
    const penaltyRateNum = Number(newClientForm.penaltyRate);

    if (isNaN(totalAmountNum) || totalAmountNum <= 0) {
      toast({ title: "Validation Error", description: "Total Amount must be a number greater than 0.", variant: "destructive" }); return;
    }
    if (isNaN(downPaymentNum) || downPaymentNum < 0) {
      toast({ title: "Validation Error", description: "Downpayment must be a non-negative number.", variant: "destructive" }); return;
    }
    if (totalAmountNum < downPaymentNum) {
      toast({ title: "Validation Error", description: "Downpayment cannot be greater than Total Amount.", variant: "destructive" }); return;
    }
    if (isNaN(paymentTermMonthsNum) || paymentTermMonthsNum <= 0 || !Number.isInteger(paymentTermMonthsNum)) {
      toast({ title: "Validation Error", description: "Payment Term must be a positive whole number of months.", variant: "destructive" }); return;
    }
    if (isNaN(penaltyRateNum) || penaltyRateNum < 0) {
      toast({ title: "Validation Error", description: "Penalty Rate must be a non-negative number.", variant: "destructive" }); return;
    }

    const loanBalance = totalAmountNum - downPaymentNum;
    let calculatedMonthlyPayment = 0;

    if (loanBalance > 0) {
      if (paymentTermMonthsNum > 0) {
        calculatedMonthlyPayment = loanBalance / paymentTermMonthsNum;
      } else {
        toast({ title: "Validation Error", description: "Payment Term (Months) must be greater than 0 if there's a loan balance.", variant: "destructive" });
        return;
      }
      if (calculatedMonthlyPayment < 0.01 && loanBalance > 0) {
        toast({ title: "Validation Error", description: "Calculated monthly payment is too low. Check amounts and term.", variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);
    const clientDataCore: Omit<ClientData, 'id' | 'paymentOverrides'> & { paymentOverrides?: ClientData['paymentOverrides'] } = {
      name: newClientForm.name,
      address: newClientForm.address,
      solarType: newClientForm.solarType,
      startDate: new Date(newClientForm.startDate),
      totalAmount: totalAmountNum,
      downPayment: downPaymentNum,
      paymentTermMonths: paymentTermMonthsNum,
      monthlyPayment: calculatedMonthlyPayment,
      penaltyRate: penaltyRateNum,
      paymentOverrides: editingClient ? editingClient.paymentOverrides : {},
    };

    try {
      let success = false;
      let clientToUpdateOrAdd: ClientData | null = null;
      let newClientId: string | null = null;

      if (editingClient) {
        success = await updateClientStorage(authenticatedBranch.id, editingClient.id, clientDataCore);
        if(success) clientToUpdateOrAdd = await getClientById(authenticatedBranch.id, editingClient.id);
      } else {
        newClientId = await addClient(authenticatedBranch.id, clientDataCore);
        if (newClientId) {
          success = true;
          clientToUpdateOrAdd = await getClientById(authenticatedBranch.id, newClientId);
        }
      }
      
      if (success && clientToUpdateOrAdd) {
        // Update local client list directly for immediate UI feedback
        setClients(prevClients => {
          const existingIndex = prevClients.findIndex(c => c.id === clientToUpdateOrAdd!.id);
          if (existingIndex > -1) {
            const updated = [...prevClients];
            updated[existingIndex] = clientToUpdateOrAdd!;
            return updated;
          }
          return [...prevClients, clientToUpdateOrAdd!];
        });
        setSelectedClient(clientToUpdateOrAdd); 
        if(!editingClient && newClientId) setSearchId(newClientId); // Set search ID for newly added client
        toast({ title: editingClient ? "Client Updated" : "Client Added", description: clientDataCore.name + (editingClient ? "'s details have been updated." : " added with ID: " + (newClientId || clientToUpdateOrAdd.id)) });

      } else {
        toast({ title: "Error", description: 'Failed to ' + (editingClient ? 'update' : 'add') + ' client.', variant: "destructive" });
      }
      setShowAddClientDialog(false);
      setEditingClient(null);
    } catch (error) {
      console.error("Error saving client:", error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClientDataUpdate = async (updatedClientDataProp: ClientData) => {
    if (!authenticatedBranch) return;
    setIsSaving(true);
    const { id, ...clientDataCore } = updatedClientDataProp;
    try {
      const success = await updateClientStorage(authenticatedBranch.id, id, clientDataCore);
      if (success) {
        const refreshedClient = await getClientById(authenticatedBranch.id, id);
        if (refreshedClient) {
          setSelectedClient(refreshedClient);
          setClients(prevClients => prevClients.map(c => c.id === id ? refreshedClient : c));
        } else {
          // Client might have been deleted by another process, remove from local list
          setClients(prevClients => prevClients.filter(c => c.id !== id));
          setSelectedClient(null);
        }
        toast({ title: "Client Data Saved", description: "Changes for " + updatedClientDataProp.name + " saved." });
      } else {
        toast({ title: "Save Error", description: "Failed to save changes for " + updatedClientDataProp.name + ".", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating client data:", error);
      toast({ title: "Save Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const promptDeleteClient = (client: ClientData) => {
    if (!client) return;
    setClientToDeleteDetails({ id: client.id, name: client.name });
    setShowDeleteClientDialog(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDeleteDetails || !authenticatedBranch) return;
    setIsDeleting(true);
    try {
      const success = await deleteClientStorage(authenticatedBranch.id, clientToDeleteDetails.id);
      if (success) {
        toast({ title: "Client Deleted", description: "Client " + clientToDeleteDetails.name + " deleted." });
        setClients(prevClients => prevClients.filter(c => c.id !== clientToDeleteDetails.id));
        if (selectedClient?.id === clientToDeleteDetails.id) {
          setSelectedClient(null);
          setSearchId('');
        }
      } else {
        toast({ title: "Error", description: "Failed to delete client " + clientToDeleteDetails.name + ".", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteClientDialog(false);
      setClientToDeleteDetails(null);
    }
  };

  const handleClearSelection = () => {
    setSelectedClient(null);
    setSearchId('');
    setSearchError('');
  };

  // Branch Management Handlers (Super Admin)
  const refreshBranchListForManagement = async (includePasswordsForSuperAdmin = false) => {
    try {
      const branches = await getBranchConfiguration(includePasswordsForSuperAdmin && authenticatedBranch?.id === 'cabanatuan');
      setAllBranches(branches); 
      
      if (authenticatedBranch) {
          const currentAuthBranchInList = branches.find(b => b.id === authenticatedBranch.id);
          if (currentAuthBranchInList) {
              setAuthenticatedBranch(currentAuthBranchInList);
              if(typeof window !== 'undefined') sessionStorage.setItem('solarAdminBranch', JSON.stringify(currentAuthBranchInList));
          } else {
             handleLogout(); // Log out if the current branch was deleted
             toast({title: "Branch Deleted", description: "The branch you were managing has been deleted. You have been logged out.", variant: "destructive"});
          }
      }
    } catch (error) {
      toast({ title: "Error refreshing branches", description: (error as Error).message, variant: "destructive" });
    }
  };
  
  const handleOpenEditSuperAdminNameDialog = () => {
    if (authenticatedBranch && authenticatedBranch.id === 'cabanatuan') { // Also check isSuperAdmin for safety, though id check is primary
        setEditingSuperAdminBranchName(authenticatedBranch.name);
        setShowEditSuperAdminNameDialog(true);
    }
  };

  const handleSaveSuperAdminBranchName = async () => {
    if (!authenticatedBranch || authenticatedBranch.id !== 'cabanatuan' || !editingSuperAdminBranchName.trim()) {
      toast({ title: "Error", description: "Invalid operation or name empty.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const result = await updateBranchNameInConfig(authenticatedBranch.id, editingSuperAdminBranchName);
    toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
    if (result.success && result.updatedName) {
      await refreshBranchListForManagement(true); // Refresh list to get updated name
      setShowEditSuperAdminNameDialog(false);
    }
    setIsSaving(false);
  };


  const handleUpdateBranchPasswordBySuperAdmin = async () => { 
    if (!targetBranchForPasswordUpdate || !newBranchPassword || newBranchPassword !== confirmNewBranchPassword) {
      toast({ title: "Error", description: "Passwords do not match or new password is empty.", variant: "destructive" });
      return;
    }
     if (newBranchPassword.length < 6) {
        toast({ title: "Error", description: "New password must be at least 6 characters long.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    const result = await updateBranchPasswordInConfig(targetBranchForPasswordUpdate.id, newBranchPassword);
    toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
    if (result.success) {
      setTargetBranchForPasswordUpdate(null);
      setNewBranchPassword('');
      setConfirmNewBranchPassword('');
      refreshBranchListForManagement(true); // Refresh list (passwords are not shown in list but good practice)
    }
    setIsSaving(false);
  };

  const handleCreateNewBranch = async () => {
    if (!newBranchName.trim() || !newBranchId.trim()) {
      toast({ title: "Error", description: "New branch name and ID are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const result = await addNewBranch(newBranchName, newBranchId);
    toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
    if (result.success) {
      setGeneratedPasswordForNewBranch(result.generatedPassword || 'Error generating password.');
      refreshBranchListForManagement(true); // Refresh list to include new branch
      // Don't close dialog immediately, show generated password
    } else {
        setGeneratedPasswordForNewBranch('');
    }
    setIsSaving(false);
  };
  
  const promptDeleteBranch = (branch: BranchConfig) => {
    if (branch.id === authenticatedBranch?.id) {
      toast({title: "Action Denied", description: "You cannot delete the branch you are currently logged into.", variant: "destructive"});
      return;
    }
    if (branch.id === 'cabanatuan') { 
        toast({title: "Action Denied", description: "Cannot delete the Cabanatuan super admin branch.", variant: "destructive"});
        return;
    }
    // Additional check using isSuperAdmin from config if branch is other than Cabanatuan
    if (branch.isSuperAdmin) {
        toast({title: "Action Denied", description: "Super admin branches cannot be deleted this way.", variant: "destructive"});
        return;
    }
    setBranchToDeleteDetails({ id: branch.id, name: branch.name });
    setShowDeleteBranchDialog(true);
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDeleteDetails) return;
    setIsDeleting(true);
    const result = await deleteBranch(branchToDeleteDetails.id);
    toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
    if (result.success) {
      refreshBranchListForManagement(true); // Refresh list to remove deleted branch
    }
    setIsDeleting(false);
    setShowDeleteBranchDialog(false);
    setBranchToDeleteDetails(null);
  };

  const handleViewPassword = (branch: BranchConfig) => {
    // This functionality expects plain text passwords if not hashed.
    // Since all passwords should be hashed now or transitioned, this might show the hash or nothing.
    // For prototype purposes, if it's not a hash, we show it.
    const targetBranch = allBranches.find(b => b.id === branch.id); // Ensure we use the latest from allBranches
    if (targetBranch?.password && !(targetBranch.password.startsWith('$2b$') || targetBranch.password.startsWith('$2a$') || targetBranch.password.startsWith('$2y$'))) {
        setPasswordToView(targetBranch.password);
        setShowViewPasswordDialog(true);
    } else {
        toast({title: "Info", description: "Password for this branch is hashed and cannot be viewed directly. You can update it.", variant: "default"});
    }
  };

  // Change Own Password Handler
  const handleChangeOwnPassword = async () => {
    if (!authenticatedBranch) {
      toast({ title: "Error", description: "No authenticated branch.", variant: "destructive" });
      return;
    }
    if (!currentOwnPassword) {
      toast({ title: "Error", description: "Current password is required.", variant: "destructive" });
      return;
    }
    if (!newOwnPassword || newOwnPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters long.", variant: "destructive" });
      return;
    }
    if (newOwnPassword !== confirmNewOwnPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const isCurrentPasswordValid = await verifyAdminPassword(authenticatedBranch.id, currentOwnPassword);
      if (!isCurrentPasswordValid) {
        toast({ title: "Error", description: "Current password incorrect.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      const result = await updateBranchPasswordInConfig(authenticatedBranch.id, newOwnPassword);
      toast({ title: result.success ? "Password Updated" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
      
      if (result.success) {
        setShowChangeOwnPasswordDialog(false);
        setCurrentOwnPassword('');
        setNewOwnPassword('');
        setConfirmNewOwnPassword('');
        // Password is changed, for immediate effect, update session's authenticatedBranch if it contained the old password.
        // However, since we don't store passwords in authenticatedBranch state, this is not strictly needed for UI.
        // The next login will use the new password.
      }
    } catch (error: any) {
      console.error("Error changing own password:", error);
      toast({ title: "Error", description: error.message || "Failed to change password.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  if (!isAuthenticated || !authenticatedBranch) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-background p-4">
        <Card className="w-full max-w-md shadow-2xl rounded-xl border-primary/20">
          <CardHeader className="p-6 sm:p-8">
            <div className="flex justify-center mb-6"><ShieldAlert className="h-16 w-16 text-primary" /></div>
            <CardTitle className="text-3xl font-bold text-center text-primary">Admin Access</CardTitle>
            <CardDescription className="text-center text-muted-foreground pt-2">Select branch and enter password for SolarPay Tracker dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 pt-0">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="branchSelectLogin" className="text-sm font-medium">Branch</Label>
                <Select onValueChange={setSelectedBranchLogin} value={selectedBranchLogin} disabled={allBranches.filter(b => b.id).length === 0 || isLoggingIn}>
                  <SelectTrigger id="branchSelectLogin" className="h-12 text-base">
                    <SelectValue placeholder={allBranches.filter(b => b.id).length === 0 ? "Loading branches..." : "Select a branch"} />
                  </SelectTrigger>
                  <SelectContent>
                    {allBranches.filter(b => b.id).length > 0 ? allBranches.filter(b => b.id).map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    )) : <SelectItem value="loading" disabled>Loading branches...</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordInputAdmin" className="text-sm font-medium">Password</Label>
                <Input id="passwordInputAdmin" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required className="h-12 text-base focus:ring-primary" placeholder="Admin password" disabled={!selectedBranchLogin || isLoggingIn}/>
              </div>
              {authError && <div className="flex items-center text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/30"><AlertCircle className="mr-2 h-5 w-5 shrink-0" /><span>{authError}</span></div>}
              <Button type="submit" className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!selectedBranchLogin || !passwordInput || isLoggingIn}>
                {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
              </Button>
            </form>
             <div className="mt-6 text-center">
                <Button variant="outline" asChild className="text-primary border-primary hover:bg-primary/5">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package2 className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block text-lg">
              SolarPay Tracker <span className="text-sm text-muted-foreground">(Admin: {authenticatedBranch.name})</span>
            </span>
          </div>
           <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {setShowChangeOwnPasswordDialog(true); setCurrentOwnPassword(''); setNewOwnPassword(''); setConfirmNewOwnPassword('');} }>
                <UserCog className="mr-1 h-4 w-4" /> Change My Password
              </Button>
              {authenticatedBranch.id === 'cabanatuan' && ( // Only Cabanatuan ID can access Manage Branches
                <Button variant="outline" size="sm" onClick={() => {setShowManageBranchDialog(true); refreshBranchListForManagement(true); }}>
                  <KeyRound className="mr-1 h-4 w-4" /> Manage Branches
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 h-4 w-4" /> Logout
              </Button>
            </div>
        </div>
      </header>
      <div className="p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Admin Controls for {authenticatedBranch.name}</CardTitle>
            <CardDescription>Manage client accounts and view statements for this branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-grow w-full sm:w-auto">
                <Label htmlFor="clientSearchId">Search by Client ID ({authenticatedBranch.name})</Label>
                <div className="flex gap-2">
                  <Input id="clientSearchId" type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Enter Client ID" disabled={isSearching} />
                  <Button onClick={handleSearchClient} disabled={!searchId.trim() || isSearching}>
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Search
                  </Button>
                </div>
              </div>
              <div className="flex-grow w-full sm:w-auto">
                <Label htmlFor="clientSelect">Or Select Client ({authenticatedBranch.name})</Label>
                <Select onValueChange={handleClientSelectChange} value={selectedClient?.id || ""} disabled={isLoadingClients}>
                  <SelectTrigger id="clientSelect" className="w-full">
                    <SelectValue placeholder={isLoadingClients ? "Loading clients..." : (clients.length === 0 ? "No clients in this branch" : "Select a client")} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingClients && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {!isLoadingClients && clients.length === 0 && <SelectItem value="no-clients" disabled>No clients for {authenticatedBranch.name}</SelectItem>}
                    {!isLoadingClients && clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name} ({client.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleOpenAddClientDialog()} variant="outline" className="w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" /> Add New Client to {authenticatedBranch.name}
              </Button>
            </div>
            {searchError && <p className="text-sm text-destructive flex items-center"><AlertCircle className="mr-1 h-4 w-4" />{searchError}</p>}
            {selectedClient && (
              <div className="mt-2 p-3 border rounded-md bg-muted/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="text-sm font-medium">Selected: {selectedClient.name} ({selectedClient.id})</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end items-center w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={handleClearSelection} disabled={isSaving || isDeleting}>
                        <XCircle className="mr-1 h-3 w-3" /> Clear Selection
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenAddClientDialog(selectedClient)} className="mr-2" disabled={isSaving || isDeleting}>
                        <Edit className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => promptDeleteClient(selectedClient)} disabled={isSaving || isDeleting || !selectedClient}>
                        {isDeleting && clientToDeleteDetails?.id === selectedClient.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                        Delete Client
                    </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedClient ? (
          <SolarDashboardContent
            key={selectedClient.id + '-' + authenticatedBranch.id} 
            initialClientData={selectedClient}
            isAdmin={true}
            onClientDataSave={handleClientDataUpdate}
          />
        ) : (
          isLoadingClients || isSearching ? (
            <Card className="mt-6">
              <CardContent className="p-10 text-center text-muted-foreground">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary/50" />
                <p>{isSearching ? "Searching for client..." : "Loading client data..."}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardContent className="p-10 text-center text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                <p>No client selected. Please add a new client or search/select an existing one for {authenticatedBranch.name} to view their dashboard.</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Add/Edit Client Dialog */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client Account" : "Add New Client Account (to " + authenticatedBranch.name + ")"}</DialogTitle>
            <DialogDescription>
              {editingClient ? "Update the client's details below." : "Fill in the details for the new client."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {[
              { label: "Client Name", name: "name" as keyof NewClientFormState, type: "text", required: true },
              { label: "Address", name: "address" as keyof NewClientFormState, type: "text", required: true },
              { label: "Solar System Type", name: "solarType" as keyof NewClientFormState, type: "text", required: true },
              { label: "Total Amount (PHP)", name: "totalAmount" as keyof NewClientFormState, type: "number", step: "0.01", required: true, placeholder: "e.g. 150000", min: "0.01" },
              { label: "Downpayment (PHP)", name: "downPayment" as keyof NewClientFormState, type: "number", step: "0.01", required: false, placeholder: "e.g. 10000", min: "0" },
              { label: "Payment Term (Months)", name: "paymentTermMonths" as keyof NewClientFormState, type: "number", step: "1", required: true, placeholder: "e.g. 24", min: "1" },
              { label: "Penalty Rate (e.g., 0.05 for 5%)", name: "penaltyRate" as keyof NewClientFormState, type: "number", step: "0.01", required: false, placeholder: "e.g. 0.05", min: "0" },
            ].map(field => (
              <div className="grid grid-cols-4 items-center gap-4" key={field.name}>
                <Label htmlFor={field.name} className="text-right col-span-1">{field.label}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  value={newClientForm[field.name as keyof Omit<NewClientFormState, 'startDate'>] === undefined ? '' : String(newClientForm[field.name as keyof Omit<NewClientFormState, 'startDate'>])}
                  onChange={handleFormChange}
                  className="col-span-3"
                  step={field.step || undefined}
                  required={field.required}
                  placeholder={field.placeholder || ""}
                  min={field.min}
                  disabled={isSaving}
                />
              </div>
            ))}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right col-span-1">Start Date</Label>
              <DatePicker
                date={newClientForm.startDate ? new Date(newClientForm.startDate) : undefined}
                onDateChange={handleDateChange}
                buttonClassName="col-span-3"
                disabled={isSaving}
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right col-span-1 text-muted-foreground">Monthly Payment</Label>
                <div className="col-span-3 text-sm text-muted-foreground">
                    (Automatically calculated based on Total Amount, Downpayment, and Payment Term)
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveClient} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingClient ? "Save Changes" : "Add Client")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Branch Management Dialog (for Super Admin) */}
      {authenticatedBranch.id === 'cabanatuan' && (
        <Dialog open={showManageBranchDialog} onOpenChange={setShowManageBranchDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Branch Management</DialogTitle>
              <DialogDescription>Manage branches, update passwords, and create new branches. Passwords are hashed for security.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
              <div className="flex justify-end">
                <Button onClick={() => { setShowNewBranchDialog(true); setGeneratedPasswordForNewBranch(''); setNewBranchName(''); setNewBranchId(''); }} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Branch
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Existing Branches</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allBranches.filter(b => b.id).map(branch => ( 
                    <div key={branch.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                      <div>
                        <p className="font-semibold">{branch.name} <span className="text-xs text-muted-foreground">({branch.id})</span></p>
                        {branch.isSuperAdmin && <Badge variant="secondary" className="mt-1">Super Admin</Badge>}
                      </div>
                      <div className="flex gap-1 sm:gap-2 flex-wrap items-center">
                        {branch.id === 'cabanatuan' && ( // Only Cabanatuan (super admin) can edit its own name
                            <Button variant="outline" size="sm" onClick={handleOpenEditSuperAdminNameDialog}>
                                <EditIcon className="mr-1 h-3 w-3" /> Edit Name
                            </Button>
                        )}
                        {branch.password && !(branch.password.startsWith('$2b$') || branch.password.startsWith('$2a$') || branch.password.startsWith('$2y$')) && ( 
                            <Button variant="outline" size="sm" onClick={() => handleViewPassword(branch)}>
                                <Eye className="mr-1 h-3 w-3" /> View Pass
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => { setTargetBranchForPasswordUpdate(branch); setNewBranchPassword(''); setConfirmNewBranchPassword(''); }}>
                          <KeyRound className="mr-1 h-3 w-3" /> Update Pass
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => promptDeleteBranch(branch)}
                          disabled={(branch.id === 'cabanatuan') || (isDeleting && branchToDeleteDetails?.id === branch.id) } 
                        >
                          {isDeleting && branchToDeleteDetails?.id === branch.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                           Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                   {allBranches.filter(b => b.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No branches configured yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Super Admin Branch Name Dialog */}
        {showEditSuperAdminNameDialog && authenticatedBranch?.id === 'cabanatuan' && (
            <Dialog open={showEditSuperAdminNameDialog} onOpenChange={setShowEditSuperAdminNameDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Branch Name for {authenticatedBranch.name}</DialogTitle>
                        <DialogDescription>Update the display name for the Cabanatuan super admin branch.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1">
                            <Label htmlFor="superAdminBranchName">New Branch Name</Label>
                            <Input 
                                id="superAdminBranchName" 
                                value={editingSuperAdminBranchName} 
                                onChange={(e) => setEditingSuperAdminBranchName(e.target.value)} 
                                disabled={isSaving}
                                placeholder="Enter new name for Cabanatuan branch" 
                            />
                             <p className="text-xs text-muted-foreground">Name must be at least 3 characters long.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditSuperAdminNameDialog(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSaveSuperAdminBranchName} disabled={isSaving || editingSuperAdminBranchName.trim().length < 3}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Name"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}


      {/* Update Branch Password Dialog (for Super Admin updating OTHERS) */}
      {targetBranchForPasswordUpdate && (
        <Dialog open={!!targetBranchForPasswordUpdate} onOpenChange={() => setTargetBranchForPasswordUpdate(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Password for {targetBranchForPasswordUpdate.name}</DialogTitle>
              <DialogDescription>Enter a new password for this branch. The password will be securely hashed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="newBranchPass">New Password</Label>
                <Input id="newBranchPass" type="password" value={newBranchPassword} onChange={(e) => setNewBranchPassword(e.target.value)} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmNewBranchPass">Confirm New Password</Label>
                <Input id="confirmNewBranchPass" type="password" value={confirmNewBranchPassword} onChange={(e) => setConfirmNewBranchPassword(e.target.value)} disabled={isSaving} />
              </div>
               <p className="text-xs text-muted-foreground">Passwords should be at least 6 characters long.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTargetBranchForPasswordUpdate(null)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleUpdateBranchPasswordBySuperAdmin} disabled={isSaving || !newBranchPassword || newBranchPassword !== confirmNewBranchPassword || newBranchPassword.length < 6}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Change Own Password Dialog (for ANY logged-in admin) */}
      <Dialog open={showChangeOwnPasswordDialog} onOpenChange={setShowChangeOwnPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change My Password for {authenticatedBranch?.name}</DialogTitle>
            <DialogDescription>Update your password for accessing this branch. This change is permanent and will be hashed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="currentOwnPass">Current Password</Label>
              <Input id="currentOwnPass" type="password" value={currentOwnPassword} onChange={(e) => setCurrentOwnPassword(e.target.value)} disabled={isSaving} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newOwnPass">New Password</Label>
              <Input id="newOwnPass" type="password" value={newOwnPassword} onChange={(e) => setNewOwnPassword(e.target.value)} disabled={isSaving} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmNewOwnPass">Confirm New Password</Label>
              <Input id="confirmNewOwnPass" type="password" value={confirmNewOwnPassword} onChange={(e) => setConfirmNewOwnPassword(e.target.value)} disabled={isSaving} />
            </div>
            <p className="text-xs text-muted-foreground">New password must be at least 6 characters long.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeOwnPasswordDialog(false)} disabled={isSaving}>Cancel</Button>
            <Button 
              onClick={handleChangeOwnPassword} 
              disabled={isSaving || !currentOwnPassword || !newOwnPassword || newOwnPassword.length < 6 || newOwnPassword !== confirmNewOwnPassword}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save New Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Branch Dialog (Super Admin) */}
      <Dialog open={showNewBranchDialog} onOpenChange={(isOpen) => { if(!isOpen) {setNewBranchName(''); setNewBranchId(''); setGeneratedPasswordForNewBranch('');} setShowNewBranchDialog(isOpen); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>A password will be auto-generated and hashed for the new branch.</DialogDescription>
          </DialogHeader>
          {generatedPasswordForNewBranch ? (
            <div className="py-4 space-y-3">
              <p className="text-green-600 font-semibold">Branch created successfully!</p>
              <p>Branch Name: <span className="font-medium">{newBranchName}</span></p>
              <p>Branch ID: <span className="font-medium">{newBranchId.trim().toLowerCase().replace(/[^a-z0-9_]/gi, '')}</span></p>
              <p>Generated Password (Plain Text): <span className="font-bold text-lg bg-muted p-2 rounded select-all">{generatedPasswordForNewBranch}</span></p>
              <p className="text-sm text-destructive">Please save this password securely. It will not be shown again. The actual password stored is hashed.</p>
               <DialogFooter>
                 <Button onClick={() => { setShowNewBranchDialog(false); setNewBranchName(''); setNewBranchId(''); setGeneratedPasswordForNewBranch(''); }}>Close</Button>
               </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="newBranchNameInput">Branch Name</Label>
                  <Input id="newBranchNameInput" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="e.g. Pampanga Branch" disabled={isSaving}/>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newBranchIdInput">Branch ID (short, lowercase, no spaces, e.g., pampanga)</Label>
                  <Input id="newBranchIdInput" value={newBranchId} onChange={(e) => setNewBranchId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/gi, ''))} placeholder="e.g. pampanga" disabled={isSaving}/>
                   <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and underscores. Will be auto-formatted.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowNewBranchDialog(false); setGeneratedPasswordForNewBranch(''); setNewBranchName(''); setNewBranchId(''); }} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleCreateNewBranch} disabled={isSaving || !newBranchName.trim() || !newBranchId.trim()}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Branch"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Password Dialog (for transitional plain-text passwords - Super Admin) */}
        {showViewPasswordDialog && (
            <Dialog open={showViewPasswordDialog} onOpenChange={setShowViewPasswordDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>View Plain Text Password</DialogTitle>
                        <DialogDescription>
                            This password is shown in plain text because it has not yet been updated to a hashed format. 
                            It's recommended to update it via the "Update Pass" feature.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-lg font-mono bg-muted p-3 rounded select-all">{passwordToView}</p>
                        <p className="text-xs text-destructive mt-2">This password will be hashed once updated.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowViewPasswordDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        {/* Delete Client Confirmation Dialog */}
        <AlertDialog open={showDeleteClientDialog} onOpenChange={setShowDeleteClientDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently delete the client account for <strong className="text-foreground">{clientToDeleteDetails?.name}</strong> (ID: <strong className="text-foreground">{clientToDeleteDetails?.id}</strong>). This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setClientToDeleteDetails(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteClient} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Client"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Delete Branch Confirmation Dialog (Super Admin) */}
        <AlertDialog open={showDeleteBranchDialog} onOpenChange={setShowDeleteBranchDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently delete the branch <strong className="text-foreground">{branchToDeleteDetails?.name}</strong> (ID: <strong className="text-foreground">{branchToDeleteDetails?.id}</strong>) and all of its associated client data. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setBranchToDeleteDetails(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteBranch} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                         {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Branch"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

