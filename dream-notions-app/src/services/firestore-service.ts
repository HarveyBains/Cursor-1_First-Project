import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  type Unsubscribe 
} from 'firebase/firestore';
import { db } from './firebase-config';
import { type DreamEntry } from '../types/DreamEntry';

export class FirestoreService {
  private static instance: FirestoreService;
  private unsubscribes: Unsubscribe[] = [];

  static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  async getUserDreams(userId: string): Promise<DreamEntry[]> {
    try {
      const dreamsRef = collection(db, 'dreams');
      const q = query(
        dreamsRef, 
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const dreams = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DreamEntry));
      
      // Sort by timestamp (fallback to createdAt)
      dreams.sort((a, b) => {
        const aTime = a.timestamp || new Date(a.createdAt || 0).getTime();
        const bTime = b.timestamp || new Date(b.createdAt || 0).getTime();
        return bTime - aTime; // Newest first
      });
      
      return dreams;
    } catch (error) {
      console.error('Error fetching dreams:', error);
      throw error;
    }
  }

  async saveDream(dream: Omit<DreamEntry, 'id'>, userId: string): Promise<string> {
    try {
      const dreamData = {
        ...dream,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'dreams'), dreamData);
      return docRef.id;
    } catch (error) {
      console.error('Error saving dream:', error);
      throw error;
    }
  }

  async updateDream(dreamId: string, updates: Partial<DreamEntry>): Promise<void> {
    try {
      const dreamRef = doc(db, 'dreams', dreamId);
      await updateDoc(dreamRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating dream:', error);
      throw error;
    }
  }

  async deleteDream(dreamId: string): Promise<void> {
    try {
      const dreamRef = doc(db, 'dreams', dreamId);
      await deleteDoc(dreamRef);
    } catch (error) {
      console.error('Error deleting dream:', error);
      throw error;
    }
  }

  async deleteAllUserDreams(userId: string): Promise<void> {
    try {
      const dreamsRef = collection(db, 'dreams');
      const q = query(dreamsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all dreams:', error);
      throw error;
    }
  }

  subscribeToUserDreams(userId: string, callback: (dreams: DreamEntry[]) => void): Unsubscribe {
    const dreamsRef = collection(db, 'dreams');
    const q = query(
      dreamsRef, 
      where('userId', '==', userId)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('📡 Firestore snapshot received, docs count:', querySnapshot.docs.length);
      
      const dreams = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DreamEntry));
      
      // Sort by timestamp (fallback to createdAt)
      dreams.sort((a, b) => {
        const aTime = a.timestamp || new Date(a.createdAt || 0).getTime();
        const bTime = b.timestamp || new Date(b.createdAt || 0).getTime();
        return bTime - aTime; // Newest first
      });
      
      console.log('📋 Processed dreams:', dreams.map(d => `${d.name} (${d.id})`));
      callback(dreams);
    }, (error) => {
      console.error('❌ Error in dreams subscription:', error);
      console.error('Error details:', error.code, error.message);
    });

    this.unsubscribes.push(unsubscribe);
    return unsubscribe;
  }

  cleanup(): void {
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes = [];
  }
}

export const firestoreService = FirestoreService.getInstance();