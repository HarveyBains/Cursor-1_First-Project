import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore'
import { db } from './firebase-config'
import type { AppLocation } from '../types/location'

export class FirestoreService {
  // Get user's locations collection reference
  private getUserLocationsRef(userId: string) {
    return collection(db, 'locations', userId, 'userLocations')
  }

  // Get user's groups collection reference
  private getUserGroupsRef(userId: string) {
    return collection(db, 'groups', userId, 'userGroups')
  }

  // Save or update a location
  async saveLocation(userId: string, location: AppLocation): Promise<string> {
    try {
      const userLocationsRef = this.getUserLocationsRef(userId)
      
      // Convert timestamp to Firestore Timestamp
      const locationData = {
        ...location,
        timestamp: Timestamp.fromMillis(location.timestamp),
      }

      if (location.id && location.id.includes('_')) {
        // Update existing location
        const locationDoc = doc(userLocationsRef, location.id)
        await updateDoc(locationDoc, locationData)
        return location.id
      } else {
        // Add new location
        const docRef = await addDoc(userLocationsRef, locationData)
        return docRef.id
      }
    } catch (error) {
      console.error('Error saving location:', error)
      throw error
    }
  }

  // Delete a location
  async deleteLocation(userId: string, locationId: string): Promise<void> {
    try {
      const locationDoc = doc(this.getUserLocationsRef(userId), locationId)
      await deleteDoc(locationDoc)
    } catch (error) {
      console.error('Error deleting location:', error)
      throw error
    }
  }

  // Get all locations for a user
  async getLocations(userId: string): Promise<AppLocation[]> {
    try {
      const userLocationsRef = this.getUserLocationsRef(userId)
      const q = query(userLocationsRef, orderBy('timestamp', 'desc'))
      const snapshot = await getDocs(q)
      
      const locations: AppLocation[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        locations.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now(),
        } as AppLocation)
      })
      
      return locations
    } catch (error) {
      console.error('Error getting locations:', error)
      throw error
    }
  }

  // Listen to real-time updates for user's locations
  onLocationsSnapshot(userId: string, callback: (locations: AppLocation[]) => void): () => void {
    const userLocationsRef = this.getUserLocationsRef(userId)
    const q = query(userLocationsRef, orderBy('timestamp', 'desc'))
    
    return onSnapshot(q, (snapshot) => {
      const locations: AppLocation[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        locations.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now(),
        } as AppLocation)
      })
      
      callback(locations)
    }, (error) => {
      console.error('Error listening to locations:', error)
    })
  }

  // Save or update a group/category
  async saveGroup(userId: string, groupName: string): Promise<void> {
    try {
      const userGroupsRef = this.getUserGroupsRef(userId)
      await addDoc(userGroupsRef, {
        name: groupName,
        timestamp: Timestamp.now(),
      })
    } catch (error) {
      console.error('Error saving group:', error)
      throw error
    }
  }

  // Get all groups for a user
  async getGroups(userId: string): Promise<string[]> {
    try {
      const userGroupsRef = this.getUserGroupsRef(userId)
      const snapshot = await getDocs(userGroupsRef)
      
      const groups: string[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        groups.push(data.name)
      })
      
      return groups
    } catch (error) {
      console.error('Error getting groups:', error)
      throw error
    }
  }
}

export const firestoreService = new FirestoreService()