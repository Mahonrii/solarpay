
'use client';

import React, { useState, useEffect } from 'react';
import { SolarDashboardContent } from '@/components/solar/solar-dashboard-content';
import type { ClientData } from '@/lib/types';
import { findClientByIdGlobally } from '@/lib/client-storage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Search, Loader2, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function StatementPage() {
  const [accountIdInput, setAccountIdInput] = useState('');
  const [currentClientData, setCurrentClientData] = useState<ClientData | null>(null);
  const [clientBranchName, setClientBranchName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleViewStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCurrentClientData(null);
    setClientBranchName(null);
    setIsLoading(true);

    if (!accountIdInput.trim()) {
      setError('Please enter an Account ID.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await findClientByIdGlobally(accountIdInput.trim());
      if (result && result.client) {
        setCurrentClientData(result.client);
        setClientBranchName(result.branchName || result.branchId); // Use branchName if available
      } else {
        setError('Account ID "' + accountIdInput.trim() + '" not found. Please check the ID and try again.');
      }
    } catch (err) {
      console.error("Error fetching client statement:", err);
      setError("An error occurred while fetching the statement. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBackToSearch = () => {
    setCurrentClientData(null);
    setClientBranchName(null);
    setError('');
  }

  if (currentClientData) {
    return (
        <>
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleGoBackToSearch}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Back to search</span>
                </Button>
                <h1 className="text-xl font-semibold">Client Statement {clientBranchName ? ('(' + clientBranchName + ')') : ''}</h1>
            </header>
            <SolarDashboardContent
              initialClientData={currentClientData}
              isAdmin={false}
            />
        </>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl border-primary/20">
        <CardHeader className="p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <Search className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-center text-primary">View Your Statement</CardTitle>
          <CardDescription className="text-center text-muted-foreground pt-2">
            Enter your Account ID to access your solar payment details.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 pt-0">
          <form onSubmit={handleViewStatement} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="accountIdInputStatement" className="text-sm font-medium text-foreground">Account ID</Label>
              <Input
                id="accountIdInputStatement"
                type="text"
                value={accountIdInput}
                onChange={(e) => setAccountIdInput(e.target.value)}
                required
                className="h-12 text-base focus:ring-2 focus:ring-primary focus:border-primary rounded-md shadow-sm"
                placeholder="Enter your Account ID"
                aria-label="Account ID"
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="flex items-center text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/30">
                <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-shadow rounded-md" disabled={isLoading || !accountIdInput.trim()}>
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Searching...</> : 'View Statement'}
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
