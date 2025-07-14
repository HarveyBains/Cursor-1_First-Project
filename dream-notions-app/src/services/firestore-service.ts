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
      const dreamData = {
        ...dream,
        iconColor: dream.iconColor || '#6B7280',
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Remove undefined values
      const cleanDreamData = Object.fromEntries(
        Object.entries(dreamData).filter(([_, value]) => value !== undefined)
      );
      
      const docRef = await addDoc(collection(db, 'dreams'), cleanDreamData);
      console.log('✅ Dream saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error saving dream:', error);
      throw error;
    }
  }

  async updateDream(dreamId: string, updates: Partial<DreamEntry>): Promise<void> {
    try {
      console.log('🔄 Attempting to update dream with ID:', dreamId);
      
      const updateData = {
        ...updates,
        iconColor: updates.iconColor || '#6B7280',
        updatedAt: new Date().toISOString()
      };

      // Remove undefined values
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      // Strategy 1: Try to update using the ID as a Firebase document ID
      try {
        const dreamRef = doc(db, 'dreams', dreamId);
        
        // Check if document exists first
        const docSnapshot = await getDoc(dreamRef);
        if (docSnapshot.exists()) {
          await updateDoc(dreamRef, cleanUpdateData);
          console.log('✅ Dream updated successfully using direct document ID');
          return;
        } else {
          console.log('⚠️ Document not found with direct ID, trying client ID lookup...');
        }
      } catch (error) {
        console.log('❌ Strategy 1 failed:', error);
      }
      
      // Strategy 2: Try to find by client ID field and update
      try {
        const dreamsRef = collection(db, 'dreams');
        const q = query(dreamsRef, where('id', '==', dreamId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const actualDoc = querySnapshot.docs[0];
          await updateDoc(actualDoc.ref, cleanUpdateData);
          console.log('✅ Dream updated successfully using client ID lookup');
          return;
        } else {
          console.log('❌ No dream found with client ID:', dreamId);
        }
      } catch (error) {
        console.log('❌ Strategy 2 failed:', error);
      }
      
      // If all strategies fail, throw an error
      throw new Error(`No dream found with ID: ${dreamId}. Unable to update.`);
      
    } catch (error) {
      console.error('❌ Error updating dream:', error);
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
      console.log(`🗑️ Starting deleteAllUserDreams for userId: ${userId}`);
      const dreamsRef = collection(db, 'dreams');
      
      // First, let's check all dreams to see what we have
      const allDreamsSnapshot = await getDocs(dreamsRef);
      console.log(`🗑️ Total dreams in database: ${allDreamsSnapshot.docs.length}`);
      
      // Log all dreams to see userId distribution
      allDreamsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🗑️ All Dream ${index + 1}: ID=${doc.id}, userId="${data.userId}", name=${data.name}`);
      });
      
      // Now query specifically for this user's dreams
      const q = query(dreamsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      console.log(`🗑️ Found ${querySnapshot.docs.length} dreams to delete for user "${userId}"`);
      
      if (querySnapshot.docs.length === 0) {
        console.log('🗑️ No dreams found to delete for this specific user');
        return;
      }
      
      // Log the dreams being deleted for debugging
      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🗑️ Deleting Dream ${index + 1}: ID=${doc.id}, userId="${data.userId}", name=${data.name}`);
      });
      
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      console.log(`✅ Successfully deleted ${querySnapshot.docs.length} dreams for user "${userId}"`);
    } catch (error) {
      console.error('❌ Error deleting all dreams:', error);
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
      console.log(`📡 Firestore snapshot received for user ${userId}, docs count:`, querySnapshot.docs.length);
      
      // Log the dreams for debugging
      if (querySnapshot.docs.length > 0) {
        querySnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`📡 Dream ${index + 1}: ID=${doc.id}, userId=${data.userId}, name=${data.name}`);
        });
      } else {
        console.log('📡 No dreams found in snapshot');
      }
      
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
  async saveNotepadContent(content: string, userId: string): Promise<void> {
    try {
      const notepadRef = doc(db, 'notepads', userId);
      await setDoc(notepadRef, { 
        content,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Notepad content saved successfully');
    } catch (error) {
      console.error('❌ Error saving notepad content:', error);
      throw error;
    }
  }

  async getNotepadContent(userId: string): Promise<string> {
    try {
      const notepadRef = doc(db, 'notepads', userId);
      const docSnapshot = await getDoc(notepadRef);
      if (docSnapshot.exists()) {
        return docSnapshot.data().content || '';
      } else {
        return '';
      }
    } catch (error) {
      console.error('❌ Error loading notepad content:', error);
      throw error;
    }
  }

  subscribeToNotepadContent(userId: string, callback: (content: string) => void): Unsubscribe {
    const notepadRef = doc(db, 'notepads', userId);
    const unsubscribe = onSnapshot(notepadRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data().content || '');
      } else {
        callback('');
      }
    }, (error) => {
      console.error('❌ Error in notepad subscription:', error);
      callback('');
    });

    this.unsubscribes.push(unsubscribe);
    return unsubscribe;
  }

  // Save a dream with a specific ID (for migration)
  async saveDreamWithId(dream: DreamEntry, userId: string): Promise<void> {
    try {
      console.log('💾 Saving dream with specific ID:', dream.id, 'iconColor:', dream.iconColor);
      
      const iconColor = dream.iconColor || '#6B7280';
      const cleanDreamData = Object.fromEntries(
        Object.entries({ ...dream, iconColor }).filter(([_, value]) => value !== undefined)
      );
      const dreamData = {
        ...cleanDreamData,
        userId,
        createdAt: dream.createdAt || new Date().toISOString(),
        updatedAt: dream.updatedAt || new Date().toISOString(),
        iconColor: dream.iconColor || '#6B7280'
      };
      
      console.log('🔥 Saving dream with ID to Firestore with iconColor:', dreamData.iconColor);
      await setDoc(doc(db, 'dreams', dream.id), dreamData);
      console.log('✅ Dream saved successfully with specific ID:', dream.id);
    } catch (error) {
      console.error('❌ Error saving dream with specific ID to Firestore:', error);
      throw error;
    }
  }

  cleanup(): void {
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes = [];
  }
}

export const firestoreService = FirestoreService.getInstance();