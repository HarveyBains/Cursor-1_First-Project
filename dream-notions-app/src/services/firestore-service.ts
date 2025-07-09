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
      // Clean the dream data - remove undefined fields
      const cleanDreamData = Object.fromEntries(
        Object.entries(dream).filter(([_, value]) => value !== undefined)
      );
      
      const dreamData = {
        ...cleanDreamData,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('🔥 Attempting to save dream to Firestore:', dreamData);
      const docRef = await addDoc(collection(db, 'dreams'), dreamData);
      console.log('✅ Dream saved successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error saving dream to Firestore:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Error code:', error.code);
      }
      throw error;
    }
  }

  async updateDream(dreamId: string, updates: Partial<DreamEntry>): Promise<void> {
    try {
      // Clean the updates data - remove undefined fields
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      const dreamRef = doc(db, 'dreams', dreamId);
      await updateDoc(dreamRef, {
        ...cleanUpdates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating dream:', error);
      throw error;
    }
  }

  async deleteDream(dreamId: string): Promise<void> {
    try {
      console.log('🗑️ Attempting to delete dream with ID:', dreamId);
      
      const dreamRef = doc(db, 'dreams', dreamId);
      await deleteDoc(dreamRef);
      console.log('✅ Dream deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting dream:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Error code:', error.code);
      }
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

  async repairDreamsWithoutUserId(userId: string): Promise<void> {
    try {
      console.log('🔧 Repairing dreams without userId...');
      
      // Get all dreams (with permissive rules)
      const dreamsRef = collection(db, 'dreams');
      const allDreamsSnapshot = await getDocs(dreamsRef);
      
      console.log(`Found ${allDreamsSnapshot.docs.length} total dreams`);
      
      let repairedCount = 0;
      let skippedCount = 0;
      
      for (const docSnapshot of allDreamsSnapshot.docs) {
        const dreamData = docSnapshot.data();
        
        // Check if this dream belongs to the current user but is missing userId
        if (!dreamData.userId) {
          // This dream needs repair - add userId
          console.log(`🔧 Repairing dream: ${dreamData.name || 'unnamed'} (${docSnapshot.id})`);
          
          await updateDoc(docSnapshot.ref, {
            userId: userId,
            updatedAt: new Date().toISOString()
          });
          
          repairedCount++;
        } else if (dreamData.userId === userId) {
          // This dream already belongs to the user and has userId
          skippedCount++;
        }
        // Dreams belonging to other users are ignored
      }
      
      console.log(`✅ Repair complete: ${repairedCount} dreams repaired, ${skippedCount} dreams already correct`);
      
    } catch (error) {
      console.error('❌ Error repairing dreams:', error);
      throw error;
    }
  }

  async getAllDreamsForRepair(): Promise<DreamEntry[]> {
    try {
      console.log('🔍 Getting all dreams for repair...');
      const dreamsRef = collection(db, 'dreams');
      const allDreamsSnapshot = await getDocs(dreamsRef);
      
      const dreams = allDreamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DreamEntry));
      
      console.log(`📋 Found ${dreams.length} total dreams`);
      return dreams;
    } catch (error) {
      console.error('❌ Error getting all dreams:', error);
      throw error;
    }
  }

  cleanup(): void {
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes = [];
  }
}

export const firestoreService = FirestoreService.getInstance();