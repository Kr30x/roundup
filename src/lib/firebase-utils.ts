import { db, storage } from './firebase';
import { adminDb } from './firebase-admin';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface Squad {
  id: string;
  name: string;
  members: {
    email: string;
    name: string;
    image: string | null;
    role: 'ADMIN' | 'MEMBER';
  }[];
  expenses: {
    id: string;
    amount: number;
    description: string;
    date: string;
    paidById: string;
    paidBy: {
      name: string;
    };
    splits: {
      userId: string;
      amount: number;
    }[];
  }[];
  balances: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    fromUser: {
      name: string;
    };
    toUser: {
      name: string;
    };
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  squadId: string;
  amount: number;
  description: string;
  date: string;
  paidById: string;
  splits: {
    userId: string;
    amount: number;
  }[];
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Squad Operations
export async function getSquads(userEmail: string): Promise<Squad[]> {
  console.log('Querying for user email:', userEmail);
  
  // Get all squads first to debug
  const squadsRef = collection(db, 'squads');
  const allSquads = await getDocs(squadsRef);
  
  console.log('All squads in database:', allSquads.docs.map(doc => ({
    id: doc.id,
    data: doc.data()
  })));

  // Try a different query approach - query by member email field
  const q = query(
    squadsRef,
    where('members', 'array-contains', { email: userEmail })
  );
  
  try {
    const querySnapshot = await getDocs(q);
    console.log('Query results:', {
      total: querySnapshot.docs.length,
      docs: querySnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }))
    });

    // If the query didn't work, try manual filtering
    if (querySnapshot.docs.length === 0) {
      console.log('Query returned no results, trying manual filtering');
      const manuallyFilteredDocs = allSquads.docs.filter(doc => {
        const data = doc.data();
        return data.members?.some((member: any) => member.email === userEmail);
      });

      console.log('Manually filtered results:', {
        total: manuallyFilteredDocs.length,
        docs: manuallyFilteredDocs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      });

      return manuallyFilteredDocs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          members: Array.isArray(data.members) ? data.members.map(member => ({
            email: member.email || '',
            name: member.name || '',
            image: member.image || null,
            role: member.role || 'MEMBER'
          })) : [],
          expenses: Array.isArray(data.expenses) ? data.expenses : [],
          balances: Array.isArray(data.balances) ? data.balances : [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
    }
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        members: Array.isArray(data.members) ? data.members.map(member => ({
          email: member.email || '',
          name: member.name || '',
          image: member.image || null,
          role: member.role || 'MEMBER'
        })) : [],
        expenses: Array.isArray(data.expenses) ? data.expenses : [],
        balances: Array.isArray(data.balances) ? data.balances : [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    console.error('Error in getSquads:', error);
    throw error;
  }
}

export async function getSquad(squadId: string): Promise<Squad | null> {
  const squadRef = doc(db, 'squads', squadId);
  const squadDoc = await getDoc(squadRef);
  
  if (!squadDoc.exists()) return null;
  
  return {
    id: squadDoc.id,
    ...squadDoc.data()
  } as Squad;
}

export async function createSquad(name: string, creator: { email: string; name: string; image: string | null }): Promise<Squad> {
  console.log('Creating squad with data:', { name, creator });
  
  // Create member object with exact structure - no additional properties
  const member = {
    email: creator.email,
    name: creator.name,
    image: creator.image,
    role: 'ADMIN'
  };
  
  console.log('Member object to be saved:', member);
  
  // Create the squad data with the exact structure
  const squadData = {
    name,
    members: [member],
    expenses: [],
    balances: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  console.log('Squad data to be saved:', JSON.stringify(squadData, null, 2));

  try {
    const squadRef = await addDoc(collection(db, 'squads'), squadData);
    console.log('Squad created with ID:', squadRef.id);

    // Get the actual document to verify it was saved correctly
    const savedDoc = await getDoc(squadRef);
    const savedData = savedDoc.data();
    console.log('Saved document data:', {
      id: squadRef.id,
      name: savedData?.name,
      members: savedData?.members,
      memberEmails: savedData?.members?.map(m => m.email)
    });

    // Return the created squad with proper typing
    const squad: Squad = {
      id: squadRef.id,
      name: squadData.name,
      members: squadData.members,
      expenses: [],
      balances: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return squad;
  } catch (error) {
    console.error('Error creating squad:', error);
    throw error;
  }
}

export async function updateSquadName(squadId: string, name: string): Promise<void> {
  const squadRef = doc(db, 'squads', squadId);
  await updateDoc(squadRef, {
    name,
    updatedAt: serverTimestamp()
  });
}

export async function deleteSquad(squadId: string): Promise<void> {
  const squadRef = doc(db, 'squads', squadId);
  await deleteDoc(squadRef);
}

export async function addMemberToSquad(
  squadId: string, 
  member: { email: string; name: string; image: string | null }
): Promise<void> {
  const squadRef = doc(db, 'squads', squadId);
  await updateDoc(squadRef, {
    members: arrayUnion({ ...member, role: 'MEMBER' }),
    updatedAt: serverTimestamp()
  });
}

export async function removeMemberFromSquad(
  squadId: string,
  memberEmail: string
): Promise<void> {
  const squadRef = doc(db, 'squads', squadId);
  const squadDoc = await getDoc(squadRef);
  
  if (!squadDoc.exists()) throw new Error('Squad not found');
  
  const squad = squadDoc.data() as Squad;
  const member = squad.members.find(m => m.email === memberEmail);
  
  if (!member) throw new Error('Member not found');
  
  await updateDoc(squadRef, {
    members: arrayRemove(member),
    updatedAt: serverTimestamp()
  });
}

export async function promoteMemberToAdmin(
  squadId: string,
  memberEmail: string
): Promise<void> {
  const squadRef = doc(db, 'squads', squadId);
  const squadDoc = await getDoc(squadRef);
  
  if (!squadDoc.exists()) throw new Error('Squad not found');
  
  const squad = squadDoc.data() as Squad;
  const memberIndex = squad.members.findIndex(m => m.email === memberEmail);
  
  if (memberIndex === -1) throw new Error('Member not found');
  
  const updatedMembers = [...squad.members];
  updatedMembers[memberIndex] = { ...updatedMembers[memberIndex], role: 'ADMIN' };
  
  await updateDoc(squadRef, {
    members: updatedMembers,
    updatedAt: serverTimestamp()
  });
}

// Helper function to calculate balances from expenses
function calculateBalancesFromExpenses(expenses: Squad['expenses']): Squad['balances'] {
  const netBalances = new Map<string, Map<string, number>>();

  // Process each expense
  for (const expense of expenses) {
    const paidById = expense.paidById;
    
    // Process each split
    for (const split of expense.splits) {
      if (split.userId === paidById) continue; // Skip if paying to self
      
      const [user1, user2] = [paidById, split.userId].sort(); // Consistent key order
      if (!netBalances.has(user1)) {
        netBalances.set(user1, new Map());
      }
      
      // Update net balance between the two users
      const currentBalance = netBalances.get(user1)!.get(user2) || 0;
      const newBalance = user1 === paidById ? 
        currentBalance + split.amount : // payer is first user
        currentBalance - split.amount;  // payer is second user
      
      netBalances.get(user1)!.set(user2, newBalance);
    }
  }

  // Convert to final balance format
  const result: Squad['balances'] = [];
  netBalances.forEach((balances, user1) => {
    balances.forEach((amount, user2) => {
      if (amount !== 0) {
        result.push({
          fromUserId: amount > 0 ? user2 : user1, // person who owes money
          toUserId: amount > 0 ? user1 : user2,   // person who is owed money
          amount: Math.abs(amount),
          fromUser: { name: '' },
          toUser: { name: '' }
        });
      }
    });
  });

  return result;
}

// Expense Operations
export async function uploadExpenseImage(squadId: string, expenseId: string, file: File): Promise<string> {
  console.log('Uploading image to Firebase Storage:', {
    squadId,
    expenseId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  const imageRef = ref(storage, `squads/${squadId}/expenses/${expenseId}/${file.name}`);
  console.log('Storage reference path:', imageRef.fullPath);
  
  await uploadBytes(imageRef, file);
  console.log('File uploaded successfully');
  
  const downloadUrl = await getDownloadURL(imageRef);
  console.log('Generated download URL:', downloadUrl);
  
  return downloadUrl;
}

export async function deleteExpenseImage(squadId: string, expenseId: string, fileName: string): Promise<void> {
  console.log('Deleting image from Firebase Storage:', {
    squadId,
    expenseId,
    fileName
  });

  const imageRef = ref(storage, `squads/${squadId}/expenses/${expenseId}/${fileName}`);
  console.log('Storage reference path:', imageRef.fullPath);
  
  await deleteObject(imageRef);
  console.log('File deleted successfully');
}

export async function addExpense(squadId: string, expense: {
  description: string
  amount: number
  date: string
  paidById: string
  paidBy: {
    name: string
  }
  splits: {
    userId: string
    amount: number
  }[]
  imageUrl?: string
}): Promise<void> {
  const squadRef = doc(db, 'squads', squadId);
  
  await runTransaction(db, async (transaction) => {
    const squadDoc = await transaction.get(squadRef);
    if (!squadDoc.exists()) {
      throw new Error('Squad not found');
    }

    const squad = squadDoc.data();
    const expenses = squad.expenses || [];
    const newExpense = {
      id: crypto.randomUUID(),
      ...expense,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedExpenses = [...expenses, newExpense];
    const updatedBalances = calculateBalancesFromExpenses(updatedExpenses);

    transaction.update(squadRef, {
      expenses: updatedExpenses,
      balances: updatedBalances.map(balance => ({
        ...balance,
        fromUser: { 
          name: squad.members.find(m => m.email === balance.fromUserId)?.name || '' 
        },
        toUser: { 
          name: squad.members.find(m => m.email === balance.toUserId)?.name || '' 
        }
      })),
      updatedAt: serverTimestamp()
    });
  });
}

export async function updateExpense(
  squadId: string,
  expenseId: string,
  updates: {
    description?: string
    amount?: number
    paidById?: string
    splits?: {
      userId: string
      amount: number
    }[]
    imageUrl?: string
  }
): Promise<void> {
  console.log('Updating expense:', {
    squadId,
    expenseId,
    updates
  });

  const squadRef = doc(db, 'squads', squadId);
  
  await runTransaction(db, async (transaction) => {
    const squadDoc = await transaction.get(squadRef);
    if (!squadDoc.exists()) {
      throw new Error('Squad not found');
    }

    const squad = squadDoc.data();
    const expenses = squad.expenses || [];
    const expenseIndex = expenses.findIndex((e: { id: string }) => e.id === expenseId);
    
    if (expenseIndex === -1) {
      throw new Error('Expense not found');
    }

    console.log('Found expense at index:', expenseIndex);
    console.log('Current expense data:', expenses[expenseIndex]);

    const updatedExpenses = [...expenses];
    updatedExpenses[expenseIndex] = {
      ...updatedExpenses[expenseIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    console.log('Updated expense data:', updatedExpenses[expenseIndex]);

    const updatedBalances = calculateBalancesFromExpenses(updatedExpenses);

    transaction.update(squadRef, {
      expenses: updatedExpenses,
      balances: updatedBalances.map(balance => ({
        ...balance,
        fromUser: { 
          name: squad.members.find(m => m.email === balance.fromUserId)?.name || '' 
        },
        toUser: { 
          name: squad.members.find(m => m.email === balance.toUserId)?.name || '' 
        }
      })),
      updatedAt: serverTimestamp()
    });

    console.log('Transaction completed successfully');
  });
}

export async function deleteExpense(squadId: string, expenseId: string): Promise<void> {
  const squadRef = doc(db, 'squads', squadId);
  
  await runTransaction(db, async (transaction) => {
    const squadDoc = await transaction.get(squadRef);
    if (!squadDoc.exists()) {
      throw new Error('Squad not found');
    }

    const squad = squadDoc.data();
    const expenses = squad.expenses || [];
    const updatedExpenses = expenses.filter((e: { id: string }) => e.id !== expenseId);
    const updatedBalances = calculateBalancesFromExpenses(updatedExpenses);

    // Update both expenses and balances
    transaction.update(squadRef, {
      expenses: updatedExpenses,
      balances: updatedBalances.map(balance => ({
        ...balance,
        fromUser: { 
          name: squad.members.find(m => m.email === balance.fromUserId)?.name || '' 
        },
        toUser: { 
          name: squad.members.find(m => m.email === balance.toUserId)?.name || '' 
        }
      })),
      updatedAt: serverTimestamp()
    });
  });
}

export async function settleUp(squadId: string, userId: string): Promise<void> {
  const squadRef = doc(db, 'squads', squadId);
  
  await runTransaction(db, async (transaction) => {
    const squadDoc = await transaction.get(squadRef);
    if (!squadDoc.exists()) {
      throw new Error('Squad not found');
    }

    const squad = squadDoc.data();
    const expenses = squad.expenses || [];
    
    // Find the balance between the two users
    const balance = squad.balances.find(b => 
      (b.fromUserId === userId || b.toUserId === userId)
    );

    if (!balance) return;

    // Add settlement expense
    const settlement = {
      id: crypto.randomUUID(),
      amount: balance.amount,
      description: 'Settlement',
      date: new Date().toISOString(),
      paidById: balance.fromUserId, // Person who owed money pays
      paidBy: {
        name: squad.members.find(m => m.email === balance.fromUserId)?.name || ''
      },
      splits: [
        { userId: balance.toUserId, amount: balance.amount } // Full amount goes to person who was owed
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedExpenses = [...expenses, settlement];
    const updatedBalances = calculateBalancesFromExpenses(updatedExpenses);

    transaction.update(squadRef, {
      expenses: updatedExpenses,
      balances: updatedBalances.map(balance => ({
        ...balance,
        fromUser: { 
          name: squad.members.find(m => m.email === balance.fromUserId)?.name || '' 
        },
        toUser: { 
          name: squad.members.find(m => m.email === balance.toUserId)?.name || '' 
        }
      })),
      updatedAt: serverTimestamp()
    });
  });
} 