import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
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
      // Ensure iconColor is always set
      const iconColor = dream.iconColor || '#6B7280';
      // Clean the dream data - remove undefined fields
      const cleanDreamData = Object.fromEntries(
        Object.entries({ ...dream, iconColor }).filter(([_, value]) => value !== undefined)
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
      // Ensure iconColor is always set
      const iconColor = updates.iconColor || '#6B7280';
      // Clean the updates data - remove undefined fields
      const cleanUpdates = Object.fromEntries(
        Object.entries({ ...updates, iconColor }).filter(([_, value]) => value !== undefined)
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
      console.log('🔍 Dream ID type:', typeof dreamId);
      console.log('🔍 Dream ID length:', dreamId.length);
      
      // Strategy 1: Try to delete using the ID as a Firebase document ID
      try {
        console.log('🔍 Strategy 1: Trying to delete using Firebase document ID...');
        const dreamRef = doc(db, 'dreams', dreamId);
        console.log('🔍 Created document reference:', dreamRef.path);
        
        // Check if document exists before trying to delete
        const docSnapshot = await getDoc(dreamRef);
        if (docSnapshot.exists()) {
          console.log('✅ Document exists, attempting to delete...');
          await deleteDoc(dreamRef);
          console.log('✅ Dream deleted successfully using Firebase document ID');
          return;
        } else {
          console.log('❌ Document does not exist with Firebase document ID:', dreamId);
          throw new Error('Document not found');
        }
      } catch (firstError) {
        console.log('❓ Failed to delete using Firebase document ID, trying client ID search...');
        console.log('First error:', firstError);
        console.log('Error type:', typeof firstError);
        console.log('Error message:', firstError instanceof Error ? firstError.message : firstError);
      }
      
      // Strategy 2: Search for documents where the 'id' field matches our dreamId
      try {
        console.log('🔍 Strategy 2: Searching for documents with client ID...');
        const dreamsRef = collection(db, 'dreams');
        const q = query(dreamsRef, where('id', '==', dreamId));
        const querySnapshot = await getDocs(q);
        
        console.log(`🔍 Found ${querySnapshot.docs.length} documents with client ID: ${dreamId}`);
        
        if (querySnapshot.empty) {
          // Strategy 3: Search for documents where the document ID matches our dreamId
          console.log('🔍 Strategy 3: No documents found with client ID, trying document ID search...');
          const docRef = doc(db, 'dreams', dreamId);
          const docSnapshot = await getDoc(docRef);
          
          if (docSnapshot.exists()) {
            console.log('✅ Found document with matching document ID, deleting...');
            await deleteDoc(docRef);
            console.log('✅ Dream deleted successfully using document ID search');
            return;
          } else {
            throw new Error(`No dream found with ID: ${dreamId} (tried both client ID and document ID)`);
          }
        }
        
        // Log what we're about to delete
        querySnapshot.docs.forEach(doc => {
          console.log(`🗑️ About to delete document with Firebase ID: ${doc.id}, client ID: ${doc.data().id}, name: ${doc.data().name}`);
        });
        
        // Delete all matching documents (should be only one)
        const deletePromises = querySnapshot.docs.map(doc => {
          console.log(`🗑️ Deleting document: ${doc.id}`);
          return deleteDoc(doc.ref);
        });
        
        await Promise.all(deletePromises);
        console.log(`✅ Dream deleted successfully using client ID search (${querySnapshot.docs.length} documents)`);
        
      } catch (secondError) {
        console.log('❌ Second error:', secondError);
        throw secondError;
      }
      
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

  async diagnoseDreamIds(userId: string): Promise<void> {
    try {
      console.log('🔍 Diagnosing dream ID structure...');
      const dreamsRef = collection(db, 'dreams');
      const q = query(dreamsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      console.log(`📋 Found ${querySnapshot.docs.length} dreams for user ${userId}`);
      
      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Dream ${index + 1}:`);
        console.log(`  Firebase Document ID: ${doc.id}`);
        console.log(`  Client ID (id field): ${data.id || 'MISSING'}`);
        console.log(`  Name: ${data.name || 'unnamed'}`);
        console.log(`  User ID: ${data.userId || 'MISSING'}`);
        console.log(`  Timestamp: ${data.timestamp || 'MISSING'}`);
        console.log('  ---');
      });
      
    } catch (error) {
      console.error('❌ Error diagnosing dream IDs:', error);
      throw error;
    }
  }

  async verifyDreamDeleted(dreamId: string): Promise<boolean> {
    try {
      console.log(`🔍 Verifying if dream ${dreamId} was actually deleted...`);
      
      // Check if document exists with this ID as Firebase document ID
      const docRef = doc(db, 'dreams', dreamId);
      const docSnapshot = await getDoc(docRef);
      
      if (docSnapshot.exists()) {
        console.log(`❌ Dream still exists with Firebase document ID: ${dreamId}`);
        return false;
      }
      
      // Check if document exists with this ID as client ID
      const dreamsRef = collection(db, 'dreams');
      const q = query(dreamsRef, where('id', '==', dreamId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log(`❌ Dream still exists with client ID: ${dreamId}`);
        querySnapshot.docs.forEach(doc => {
          console.log(`  Found document: ${doc.id} with data:`, doc.data());
        });
        return false;
      }
      
      console.log(`✅ Dream ${dreamId} was successfully deleted`);
      return true;
    } catch (error) {
      console.error('❌ Error verifying dream deletion:', error);
      return false;
    }
  }

  async testFirebaseConnection(): Promise<void> {
    try {
      console.log('🧪 Testing Firebase connection and permissions...');
      
      // Test 1: Try to read dreams
      const dreamsRef = collection(db, 'dreams');
      const testQuery = query(dreamsRef, where('userId', '==', 'test'));
      await getDocs(testQuery);
      console.log('✅ Read operation works');
      
      // Test 2: Try to create a test document
      const testDoc = {
        test: true,
        timestamp: Date.now(),
        userId: 'test'
      };
      
      try {
        const docRef = await addDoc(collection(db, 'dreams'), testDoc);
        console.log('✅ Create operation works');
        
        // Test 3: Try to delete the test document
        await deleteDoc(docRef);
        console.log('✅ Delete operation works');
        
      } catch (error) {
        console.log('❌ Create/Delete operations failed:', error);
      }
      
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
    }
  }

  // Notepad sync methods
  async saveNotepadTabs(tabs: any[], userId: string): Promise<void> {
    try {
      console.log('📝 Saving notepad tabs to Firebase...');
      console.log(`📝 User ID: ${userId}`);
      console.log(`📝 Tabs count: ${tabs.length}`);
      console.log(`📝 Tabs data:`, tabs);
      
      const notepadRef = doc(db, 'notepads', userId);
      
      // Use setDoc with merge option to create or update
      await setDoc(notepadRef, {
        userId: userId,
        tabs: tabs,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('✅ Notepad tabs saved successfully to Firebase');
    } catch (error) {
      console.error('❌ Error saving notepad tabs:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Error code:', error.code);
      }
      throw error;
    }
  }

  async getNotepadTabs(userId: string): Promise<any[]> {
    try {
      console.log('📝 Loading notepad tabs from Firebase...');
      const notepadRef = doc(db, 'notepads', userId);
      const docSnapshot = await getDoc(notepadRef);
      
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        console.log('✅ Notepad tabs loaded successfully');
        return data.tabs || [];
      } else {
        console.log('📝 No notepad data found for user');
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading notepad tabs:', error);
      throw error;
    }
  }

  subscribeToNotepadTabs(userId: string, callback: (data: any) => void): Unsubscribe {
    console.log(`📝 Setting up notepad subscription for user: ${userId}`);
    const notepadRef = doc(db, 'notepads', userId);
    
    const unsubscribe = onSnapshot(notepadRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('📝 Notepad tabs updated from Firebase:', data);
        callback(data);
      } else {
        console.log('📝 No notepad data found in Firebase');
        callback([]);
      }
    }, (error) => {
      console.error('❌ Error in notepad subscription:', error);
      console.error('Error details:', error.code, error.message);
      // Return empty array on error to prevent crashes
      callback([]);
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