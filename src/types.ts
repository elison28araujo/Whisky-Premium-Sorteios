/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Campaign {
  siteName: string;
  active: boolean;
  prizeName: string;
  prizeDescription: string;
  ticketPrice: number;
  totalNumbers: number;
  drawMode: string;
  drawDate: string;
  pixKey: string;
  pixHolder: string;
  rules: string;
  whatsappGroupUrl?: string;
  whatsappContact?: string;
  pixType?: "manual" | "mp_pix" | "simulator";
  mpAccessToken?: string;
  updatedAt?: number;
}

export interface Order {
  id: string;
  name: string;
  cpf: string;
  whatsapp: string;
  birthDate: string;
  numbers: string[];
  amount: number;
  status: "pending" | "approved" | "rejected";
  receiptUrl?: string;
  receiptPath?: string;
  createdAt: any; // Firestore Timestamp or Date
  reviewedAt?: any;
}

export interface QuickFilter {
  id: string;
  label: string;
  action: (numbers: string[]) => string[];
}
